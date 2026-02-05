import { Context } from "hono";
import {
  AbortError,
  query,
  type PermissionMode as SDKPermissionMode,
} from "@anthropic-ai/claude-agent-sdk";
import type { ChatRequest, StreamResponse } from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";

// UI permission mode type (subset of SDK modes)
type UIPermissionMode = "plan" | "acceptEdits";

/**
 * Executes a Claude command and yields streaming responses
 * @param message - User message or command
 * @param requestId - Unique request identifier for abort functionality
 * @param requestAbortControllers - Shared map of abort controllers
 * @param cliPath - Path to actual CLI script (detected by validateClaudeCli)
 * @param sessionId - Optional session ID for conversation continuity
 * @param allowedTools - Optional array of allowed tool names
 * @param workingDirectory - Optional working directory for Claude execution
 * @param permissionMode - Optional permission mode for Claude execution (plan or acceptEdits)
 * @returns AsyncGenerator yielding StreamResponse objects
 */
async function* executeClaudeCommand(
  message: string,
  requestId: string,
  requestAbortControllers: Map<string, AbortController>,
  cliPath: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
  permissionMode?: UIPermissionMode,
): AsyncGenerator<StreamResponse> {
  let abortController: AbortController;

  try {
    // Process commands that start with '/'
    let processedMessage = message;
    if (message.startsWith("/")) {
      // Remove the '/' and send just the command
      processedMessage = message.substring(1);
    }

    // Create and store AbortController for this request
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);

    // Map UI permission mode to SDK permission mode
    // "acceptEdits" -> "bypassPermissions" (skip all permission prompts)
    // "plan" -> "plan" (planning mode)
    const sdkPermissionMode: SDKPermissionMode =
      permissionMode === "plan" ? "plan" : "bypassPermissions";

    // Only pass allowedTools in plan mode or when explicitly provided and not in bypassPermissions mode
    // In bypassPermissions mode, don't pass allowedTools so SDK can bypass all permissions
    const shouldPassAllowedTools =
      sdkPermissionMode !== "bypassPermissions" && allowedTools;

    // canUseTool callback to auto-approve tools in bypass mode
    const canUseTool =
      sdkPermissionMode === "bypassPermissions"
        ? async (
            toolName: string,
            input: Record<string, unknown>,
          ): Promise<{
            behavior: "allow";
            updatedInput?: Record<string, unknown>;
          }> => {
            logger.chat.debug(
              "canUseTool called for {toolName}, auto-approving",
              { toolName },
            );
            return { behavior: "allow", updatedInput: input };
          }
        : undefined;

    // System prompt appendix for web UI environment
    const systemPromptAppend = `
## Web UI Environment

You are running in a web-based chat interface that does NOT support the AskUserQuestion tool.

IMPORTANT: Do NOT use the AskUserQuestion tool. Instead, when you need to ask the user questions or gather preferences:
1. Ask questions directly in plain text as part of your response
2. Number your questions if there are multiple (e.g., "1. Which approach would you prefer?")
3. Provide clear options when applicable
4. Wait for the user to respond in their next message

The user will see your questions and respond in a follow-up message.`;

    for await (const sdkMessage of query({
      prompt: processedMessage,
      options: {
        abortController,
        executable: "node" as const,
        executableArgs: [],
        pathToClaudeCodeExecutable: cliPath,
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: systemPromptAppend,
        },
        settingSources: ["user", "project", "local"],
        permissionMode: sdkPermissionMode,
        // Required when using bypassPermissions mode
        allowDangerouslySkipPermissions:
          sdkPermissionMode === "bypassPermissions",
        ...(sessionId ? { resume: sessionId } : {}),
        ...(shouldPassAllowedTools ? { allowedTools } : {}),
        ...(workingDirectory ? { cwd: workingDirectory } : {}),
        ...(canUseTool ? { canUseTool } : {}),
      },
    })) {
      // Debug logging of raw SDK messages with detailed content
      logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    yield { type: "done" };
  } catch (error) {
    // Check if error is due to abort
    if (error instanceof AbortError) {
      yield { type: "aborted" };
    } else {
      logger.chat.error("Claude Code execution failed: {error}", { error });
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } finally {
    // Clean up AbortController from map
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}

/**
 * Handles POST /api/chat requests with streaming responses
 * @param c - Hono context object with config variables
 * @param requestAbortControllers - Shared map of abort controllers
 * @returns Response with streaming NDJSON
 */
export async function handleChatRequest(
  c: Context,
  requestAbortControllers: Map<string, AbortController>,
) {
  const chatRequest: ChatRequest = await c.req.json();
  const { cliPath } = c.var.config;

  logger.chat.debug(
    "Received chat request {*}",
    chatRequest as unknown as Record<string, unknown>,
  );

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          cliPath, // Use detected CLI path from validateClaudeCli
          chatRequest.sessionId,
          chatRequest.allowedTools,
          chatRequest.workingDirectory,
          chatRequest.permissionMode,
        )) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
