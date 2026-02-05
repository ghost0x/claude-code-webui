import { Context } from "hono";
import { logger } from "../utils/logger.ts";

/**
 * Type for user question answers
 */
export interface UserQuestionAnswers {
  answers: Record<string, string>;
}

/**
 * Type for pending question resolver
 */
interface PendingQuestion {
  resolve: (answers: UserQuestionAnswers) => void;
  reject: (error: Error) => void;
  toolUseId: string;
}

/**
 * Map of pending user questions by request ID
 * When AskUserQuestion is called, we store a Promise resolver here
 * The answer endpoint resolves the promise with the user's answers
 */
export const pendingUserQuestions = new Map<string, PendingQuestion>();

/**
 * Wait for user question answer
 * Called by canUseTool when AskUserQuestion is detected
 * Returns a Promise that resolves when the user submits their answer
 */
export function waitForUserQuestionAnswer(
  requestId: string,
  toolUseId: string,
): Promise<UserQuestionAnswers> {
  return new Promise((resolve, reject) => {
    pendingUserQuestions.set(requestId, {
      resolve,
      reject,
      toolUseId,
    });

    logger.chat.debug(
      "Waiting for user question answer for request {requestId}, tool {toolUseId}",
      { requestId, toolUseId },
    );
  });
}

/**
 * Clean up pending question on request abort or completion
 */
export function cleanupPendingQuestion(requestId: string): void {
  const pending = pendingUserQuestions.get(requestId);
  if (pending) {
    pending.reject(new Error("Request aborted or completed"));
    pendingUserQuestions.delete(requestId);
    logger.chat.debug("Cleaned up pending question for request {requestId}", {
      requestId,
    });
  }
}

/**
 * Request body type for answer endpoint
 */
interface AnswerRequest {
  answers: Record<string, string>;
}

/**
 * Handles POST /api/answer/:requestId requests
 * Called when user submits their answers to a user question
 */
export async function handleAnswerRequest(c: Context): Promise<Response> {
  const requestId = c.req.param("requestId");
  const body: AnswerRequest = await c.req.json();

  logger.chat.debug("Received answer for request {requestId}: {answers}", {
    requestId,
    answers: body.answers,
  });

  const pending = pendingUserQuestions.get(requestId);
  if (!pending) {
    logger.chat.warn("No pending question found for request {requestId}", {
      requestId,
    });
    return c.json({ error: "No pending question found" }, 404);
  }

  // Resolve the pending promise with the user's answers
  pending.resolve({ answers: body.answers });
  pendingUserQuestions.delete(requestId);

  logger.chat.debug(
    "Resolved pending question for request {requestId} with answers",
    { requestId },
  );

  return c.json({ success: true });
}
