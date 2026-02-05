# Claude Code Web UI

A web-based interface for the `claude` command line tool that provides streaming responses in a chat interface.

## Service Configuration

- **PM2 process**: Runs as `claude-code-webui` (cwd: `backend/`, script: `start.sh`, port 8080)
- **PM2 config**: `ecosystem.config.cjs` at project root
- **Cloudflare tunnel**: Exposed at `claude.ghost0x.com` via cloudflared (see `setup-tunnel.sh`). For tunnel management, reference the `cloudflare-tunnel` skill.
- **ElevenLabs**: Not integrated.

After completing changes and verifying the app compiles/runs, restart the service with `pm2 restart claude-code-webui`. If configuration changes were made that affect the service, update the PM2 configuration in `ecosystem.config.cjs` accordingly.

For frontend changes, a rebuild is required before restarting:

```bash
cd frontend && npm run build && cd ../backend && node scripts/copy-frontend.js && pm2 restart claude-code-webui
```

## Code Quality

This project uses automated quality checks to ensure consistent code standards:

- **Lefthook**: Git hooks manager that runs `make check` before every commit
- **Quality Commands**: Use `make check` to run all quality checks manually
- **CI/CD**: GitHub Actions runs the same quality checks on every push

The pre-commit hook prevents commits with formatting, linting, or test failures.

### Setup for New Contributors

1. **Install Lefthook**:

   ```bash
   # macOS
   brew install lefthook

   # Or download from https://github.com/evilmartians/lefthook/releases
   ```

2. **Install hooks**:

   ```bash
   lefthook install
   ```

3. **Verify setup**:
   ```bash
   lefthook run pre-commit
   ```

The `.lefthook.yml` configuration is tracked in the repository, ensuring consistent quality checks across all contributors.

## Architecture

This project consists of three main components:

### Backend (Deno/Node.js)

- **Location**: `backend/`
- **Port**: 8080 (configurable via CLI argument or PORT environment variable)
- **Technology**: TypeScript + Hono framework with runtime abstraction supporting both Deno and Node.js
- **Purpose**: Executes `claude` commands and streams JSON responses to frontend

**Key Features**:

- **Runtime Abstraction**: Clean separation between business logic and platform-specific code
- **Modular Architecture**: CLI, application core, and runtime layers clearly separated
- **Structured Logging**: LogTape-based logging system with debug mode control via `--debug` flag
- Command line interface with `--port`, `--help`, `--version`, `--debug` options
- Universal Claude CLI path detection with tracing-based approach
- Startup validation to check Claude CLI availability
- Executes `claude --output-format stream-json --verbose -p <message>`
- Streams raw Claude JSON responses without modification
- Sets working directory to project root for claude command execution
- Provides CORS headers for frontend communication
- Single binary distribution support
- Session continuity support using Claude Code SDK's resume functionality
- **Comprehensive Testing**: Mock runtime enables full unit testing without external dependencies

**API Endpoints**:

- `GET /api/projects` - Retrieves list of available project directories
  - Response: `{ projects: ProjectInfo[] }` - Array of project info objects with path and encodedName
- `POST /api/chat` - Accepts chat messages and returns streaming responses
  - Request body: `{ message: string, sessionId?: string, requestId: string, allowedTools?: string[], workingDirectory?: string }`
  - `requestId` is required for request tracking and abort functionality
  - Optional `sessionId` enables conversation continuity within the same chat session
  - Optional `allowedTools` array restricts which tools Claude can use
  - Optional `workingDirectory` specifies the project directory for Claude execution
- `POST /api/abort/:requestId` - Aborts an ongoing request by request ID
- `GET /api/projects/:encodedProjectName/histories` - Retrieves list of conversation histories for a project
  - Response: `{ conversations: ConversationSummary[] }` - Array of conversation summaries with session metadata
- `GET /api/projects/:encodedProjectName/histories/:sessionId` - Retrieves detailed conversation history for a specific session
  - Response: `ConversationHistory` - Complete conversation with messages and metadata
- `/*` - Serves static frontend files (in single binary mode)

### Frontend (React)

- **Location**: `frontend/`
- **Port**: 3000 (configurable via `--port` CLI argument to `npm run dev`)
- **Technology**: Vite + React + SWC + TypeScript + TailwindCSS + React Router
- **Purpose**: Provides project selection and chat interface with streaming responses

**Key Features**:

- **Project Directory Selection**: Choose working directory before starting chat sessions
- **Routing System**: Separate pages for project selection, chat interface, and demo mode
- **Conversation History**: Browse and restore previous chat sessions with full message history
- **Demo Mode**: Interactive demonstration system with automated scenarios and mock responses
- Real-time streaming response display with modular message processing
- Parses different Claude JSON message types (system, assistant, result, tool messages)
- TailwindCSS utility-first styling for responsive design
- Light/dark theme toggle with system preference detection and localStorage persistence
- Bottom-to-top message flow layout (messages start at bottom like modern chat apps)
- Auto-scroll to bottom with smart scroll detection (only auto-scrolls when user is near bottom)
- Accessibility features with ARIA attributes for screen readers
- Responsive chat interface with component-based architecture
- Comprehensive component testing with Vitest and Testing Library
- Automatic session tracking for conversation continuity within the same chat instance
- Request abort functionality with real-time cancellation
- Permission dialog handling for Claude tool permissions
- Enhanced error handling and user feedback
- Modular hook architecture for state management and business logic separation
- Reusable UI components with consistent design patterns
- **History Management**: View conversation summaries, timestamps, and message previews
- **Demo Automation**: Automated demo recording and playback for presentations
- **Enter Key Behavior**: Configurable Enter key behavior (Send vs Newline) with persistent user preference

### Shared Types

- **Location**: `shared/`
- **Purpose**: TypeScript type definitions shared between backend and frontend

**Key Types**:

- `StreamResponse` - Backend streaming response format with support for claude_json, error, done, and aborted types
- `ChatRequest` - Chat request structure for API communication
  - `message: string` - User's message content
  - `sessionId?: string` - Optional session ID for conversation continuity
  - `requestId: string` - Required unique identifier for request tracking and abort functionality
  - `allowedTools?: string[]` - Optional array to restrict which tools Claude can use
  - `workingDirectory?: string` - Optional project directory path for Claude execution
- `AbortRequest` - Request structure for aborting ongoing operations
  - `requestId: string` - ID of the request to abort
- `ProjectInfo` - Project information structure
  - `path: string` - Full file system path to the project directory
  - `encodedName: string` - URL-safe encoded project name
- `ProjectsResponse` - Response structure for project directory list
  - `projects: ProjectInfo[]` - Array of project information objects
- `ConversationSummary` - Summary information for conversation history
  - `sessionId: string` - Unique session identifier
  - `startTime: string` - ISO timestamp of first message
  - `lastTime: string` - ISO timestamp of last message
  - `messageCount: number` - Total number of messages in conversation
  - `lastMessagePreview: string` - Preview text of the last message
- `HistoryListResponse` - Response structure for conversation history list
  - `conversations: ConversationSummary[]` - Array of conversation summaries
- `ConversationHistory` - Complete conversation history structure
  - `sessionId: string` - Session identifier
  - `messages: unknown[]` - Array of timestamped SDK messages (typed as unknown[] to avoid frontend dependency)
  - `metadata: object` - Conversation metadata with startTime, endTime, and messageCount

**Note**: Enhanced message types (`ChatMessage`, `SystemMessage`, `ToolMessage`, `ToolResultMessage`, etc.) are defined in `frontend/src/types.ts` for comprehensive frontend message handling.

## Claude Command Integration

The backend uses the Claude Code SDK to execute claude commands. The SDK internally handles the claude command execution with appropriate parameters including:

- `--output-format stream-json` - Returns streaming JSON responses
- `--verbose` - Includes detailed execution information
- `-p <message>` - Prompt mode with user message

The SDK returns three types of JSON messages:

1. **System messages** (`type: "system"`) - Initialization and setup information
2. **Assistant messages** (`type: "assistant"`) - Actual response content
3. **Result messages** (`type: "result"`) - Execution summary with costs and usage

### Claude CLI Path Detection

The application includes robust Claude CLI path detection to handle various installation methods:

#### Universal Detection Approach

- **Tracing-based detection**: Uses temporary node wrapper to capture actual script paths
- **Cross-platform support**: Handles Windows (.bat), macOS, and Linux installations
- **Installation method agnostic**: Works with npm, pnpm, asdf, yarn, and other package managers

#### Detection Process

1. **Auto-discovery**: Searches for `claude` in system PATH using `runtime.findExecutable()`
2. **Script path tracing**: Creates temporary node wrapper to intercept and trace node execution
3. **Version validation**: Executes `claude --version` to verify functionality and capture version info
4. **Fallback handling**: Uses original path if detection fails, with appropriate logging

#### Supported Installation Scenarios

- **npm global**: `/usr/local/bin/claude` → actual script in `node_modules`
- **pnpm global**: Similar to npm but with pnpm-specific paths
- **asdf**: Version-managed installations with shim resolution
- **yarn global**: Yarn-managed global installations
- **Custom paths**: Manual installations via `--claude-path` option

#### Technical Implementation

- **File**: `backend/cli/validation.ts`
- **Key functions**: `detectClaudeCliPath()`, `validateClaudeCli()`
- **Platform abstraction**: Uses Runtime interface for cross-platform compatibility
- **Temporary directory**: Automatic cleanup of trace files and wrapper scripts

## Session Continuity

The application supports conversation continuity within the same chat session using Claude Code SDK's built-in session management.

### How It Works

1. **Initial Message**: First message in a chat session starts a new Claude session
2. **Session Tracking**: Frontend automatically extracts `session_id` from incoming SDK messages
3. **Continuation**: Subsequent messages include the `session_id` to maintain conversation context
4. **Backend Integration**: Backend passes `session_id` to Claude Code SDK via `options.resume` parameter

### Technical Implementation

- **Frontend**: Tracks `currentSessionId` state and includes it in API requests
- **Backend**: Accepts optional `sessionId` in `ChatRequest` and uses it with SDK's `resume` option
- **Streaming**: Session IDs are extracted from all SDK message types (`system`, `assistant`, `result`)
- **Automatic**: No user intervention required - session continuity is handled transparently

### Benefits

- **Context Preservation**: Maintains conversation context across multiple messages
- **Improved UX**: Users can reference previous messages and build on earlier discussions
- **Efficient**: Leverages Claude Code SDK's native session management
- **Seamless**: Works automatically without user configuration

## MCP Integration (Model Context Protocol)

This project includes Playwright MCP server integration to enable automated browser testing and demo verification capabilities.

### Playwright MCP Server

The project is configured with Microsoft's official Playwright MCP server, providing Claude Code with browser automation capabilities:

- **Automated Demo Testing**: Take screenshots and verify demo page functionality
- **Interactive Browser Control**: Navigate, click, fill forms, and interact with web elements
- **Visual Verification**: Capture screenshots at different states for manual review
- **Authentication Support**: Manual login in visible browser window with persistent sessions

### Configuration

The Playwright MCP server is configured at project level in `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

This configuration is shared across all project contributors and automatically loaded when using Claude Code in this directory.

### Usage Instructions

1. **Initial Setup**: The MCP server is already configured - no additional setup required
2. **Explicit Usage**: When first using browser automation, explicitly say "**playwright mcp**" in your request
3. **Browser Window**: A visible Chrome browser window will open that you can see and interact with
4. **Authentication**: If authentication is needed, you can manually log in through the visible browser window

### Available Tools

The Playwright MCP server provides comprehensive browser automation tools including:

- **Navigation**: `goto()`, `goBack()`, `goForward()`, `reload()`
- **Interaction**: `click()`, `fill()`, `select()`, `hover()`, `dragAndDrop()`
- **Screenshots**: `screenshot()` for full page or element-specific captures
- **Content**: `getPageContent()`, `evaluate()` for JavaScript execution
- **File Operations**: `upload()`, `download()`
- **Tab Management**: `newPage()`, `closePage()`, `switchToPage()`
- **Dialog Handling**: Handle alerts, confirmss, prompts

### Demo Page Testing Workflow

Common workflow for testing the demo page:

1. **Start Application**: Ensure frontend and backend are running
2. **Request Browser Test**: Ask Claude Code to test demo page functionality using "playwright mcp"
3. **Automated Navigation**: Claude will open browser, navigate to `http://localhost:3000`
4. **Interactive Testing**: Claude can simulate user interactions (clicking, typing, etc.)
5. **Screenshot Verification**: Take screenshots at key states for visual confirmation
6. **Automated Validation**: Verify expected elements and behaviors are working

### Example Usage

```
Please use playwright mcp to test our demo page. Navigate to http://localhost:3000,
take a screenshot of the initial state, then test the basic demo interaction flow
and take another screenshot to verify it works correctly.
```

### Technical Notes

- **Accessibility Tree**: Uses Chrome accessibility tree for reliable element interaction (not pixel-based)
- **No Vision Models**: Operates purely on structured data, avoiding screenshot interpretation ambiguity
- **Session Persistence**: Cookies and session data persist for the duration of the browser session
- **Cross-Platform**: Works on macOS, Linux, and Windows (wherever Playwright is supported)

## Development

### Prerequisites

- **Backend**: Either Deno or Node.js (20.0.0+)
- **Frontend**: Node.js (for development)
- Claude CLI tool installed and configured
- dotenvx (for .env file processing): `npm install -g @dotenvx/dotenvx`

### Port Configuration

The application supports flexible port configuration for development:

#### Unified Backend Port Management

Create a `.env` file in the project root to set the backend port:

```bash
# .env
PORT=9000
```

Both backend startup and frontend proxy configuration will automatically use this port:

```bash
# Deno backend
cd backend && deno task dev     # Uses dotenvx to read ../.env and starts backend on port 9000

# Node.js backend
cd backend && npm run dev       # Uses dotenvx to read ../.env and starts backend on port 9000

# Frontend
cd frontend && npm run dev      # Configures proxy to localhost:9000
```

#### Alternative Configuration Methods

- **Environment Variable**: `PORT=9000 deno task dev` or `PORT=9000 npm run dev`
- **CLI Argument (Deno)**: `dotenvx run --env-file=../.env -- deno run --allow-net --allow-run --allow-read --allow-env cli/deno.ts --port 9000`
- **CLI Argument (Node.js)**: `node dist/cli/node.js --port 9000`
- **Frontend Port**: `npm run dev -- --port 4000` (for frontend UI port)

### Running the Application

1. **Start Backend**:

   ```bash
   # Deno
   cd backend
   deno task dev

   # Or Node.js
   cd backend
   npm run dev

   # With debug logging enabled
   deno task dev --debug
   npm run dev -- --debug
   ```

2. **Start Frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**:
   - Frontend: http://localhost:3000 (or custom port via `npm run dev -- --port XXXX`)
   - Backend API: http://localhost:8080 (or PORT from .env file)

### Deploying Changes (PM2 Production)

When the application is running via PM2 in production mode, **PM2 only restarts the backend process** - it does NOT rebuild the frontend. After making frontend changes:

```bash
# 1. Build the frontend (from project root or frontend/)
cd frontend && npm run build

# 2. Copy built files to backend's static directory
cd ../backend && node scripts/copy-frontend.js

# 3. Restart PM2 to serve updated files
pm2 restart claude-code-webui
```

**One-liner for deploying frontend changes:**

```bash
cd frontend && npm run build && cd ../backend && node scripts/copy-frontend.js && pm2 restart claude-code-webui
```

**Important notes:**

- Frontend changes require rebuild (`npm run build`) before they take effect
- Backend-only changes just need `pm2 restart claude-code-webui`
- Users may need to hard refresh (Cmd+Shift+R / Ctrl+Shift+R) to clear browser cache after frontend updates

### Project Structure

```
├── backend/           # Backend server with runtime abstraction (Deno/Node.js)
│   ├── deno.json     # Deno configuration with permissions
│   ├── package.json  # Node.js configuration and dependencies
│   ├── app.ts        # Runtime-agnostic core application
│   ├── types.ts      # Backend-specific type definitions
│   ├── VERSION       # Version file for releases
│   ├── cli/          # CLI-specific entry points
│   │   ├── deno.ts           # Deno entry point and server startup
│   │   ├── node.ts           # Node.js entry point and server startup
│   │   ├── args.ts           # CLI argument parsing with runtime abstraction
│   │   ├── validation.ts     # Shared CLI validation utilities
│   │   └── version.ts        # Version reporting utility
│   ├── runtime/      # Runtime abstraction layer
│   │   ├── types.ts          # Runtime interface definitions
│   │   ├── deno.ts           # Deno runtime implementation
│   │   └── node.ts           # Node.js runtime implementation
│   ├── handlers/     # API handlers using runtime abstraction
│   │   ├── abort.ts         # Request abortion handler
│   │   ├── chat.ts          # Chat streaming handler
│   │   ├── conversations.ts # Conversation details handler
│   │   ├── histories.ts     # History listing handler
│   │   └── projects.ts      # Project listing handler
│   ├── history/      # History processing utilities
│   │   ├── conversationLoader.ts  # Load specific conversations
│   │   ├── grouping.ts             # Group conversation files
│   │   ├── parser.ts               # Parse history files
│   │   ├── pathUtils.ts            # Path validation utilities
│   │   └── timestampRestore.ts     # Restore message timestamps
│   ├── middleware/   # Middleware modules
│   │   └── config.ts        # Configuration middleware with runtime injection
│   ├── utils/        # Utility modules
│   │   └── logger.ts        # LogTape-based logging system with debug mode support
│   ├── scripts/      # Build and packaging scripts
│   │   ├── build-bundle.js      # Bundle creation for distribution
│   │   ├── copy-frontend.js     # Frontend static file copying
│   │   ├── generate-version.js  # Version file generation
│   │   └── prepack.js           # NPM package preparation
│   ├── tests/        # Test files
│   │   └── node/            # Node.js-specific tests
│   ├── pathUtils.test.ts    # Path utility tests with mock runtime
│   └── dist/         # Frontend build output (copied during build)
├── frontend/         # React frontend application
│   ├── src/
│   │   ├── App.tsx   # Main application component with routing
│   │   ├── main.tsx  # Application entry point
│   │   ├── types.ts  # Frontend-specific type definitions
│   │   ├── config/
│   │   │   └── api.ts                 # API configuration and URLs
│   │   ├── utils/
│   │   │   ├── constants.ts           # UI and application constants
│   │   │   ├── messageTypes.ts        # Type guard functions for messages
│   │   │   ├── toolUtils.ts           # Tool-related utility functions
│   │   │   ├── time.ts                # Time utilities
│   │   │   ├── id.ts                  # ID generation utilities
│   │   │   ├── messageConversion.ts   # Message conversion utilities
│   │   │   └── mockResponseGenerator.ts # Demo response generator
│   │   ├── hooks/
│   │   │   ├── useClaudeStreaming.ts  # Simplified streaming interface
│   │   │   ├── useTheme.ts            # Theme management hook
│   │   │   ├── useHistoryLoader.ts    # History loading hook
│   │   │   ├── useMessageConverter.ts # Message conversion hook
│   │   │   ├── useDemoAutomation.ts   # Demo automation hook
│   │   │   ├── useEnterBehavior.ts    # Enter key behavior management
│   │   │   ├── chat/
│   │   │   │   ├── useChatState.ts    # Chat state management
│   │   │   │   ├── usePermissions.ts  # Permission handling logic
│   │   │   │   └── useAbortController.ts # Request abortion logic
│   │   │   └── streaming/
│   │   │       ├── useMessageProcessor.ts # Message creation and processing
│   │   │       ├── useToolHandling.ts     # Tool-specific message handling
│   │   │       └── useStreamParser.ts     # Stream parsing and routing
│   │   ├── components/
│   │   │   ├── ChatPage.tsx           # Main chat interface page
│   │   │   ├── ProjectSelector.tsx    # Project directory selection page
│   │   │   ├── MessageComponents.tsx  # Message display components
│   │   │   ├── PermissionDialog.tsx   # Permission handling dialog
│   │   │   ├── TimestampComponent.tsx # Timestamp display
│   │   │   ├── HistoryView.tsx        # Conversation history view
│   │   │   ├── DemoPage.tsx           # Demo mode page
│   │   │   ├── DemoPermissionDialogWrapper.tsx # Demo permission wrapper
│   │   │   ├── chat/
│   │   │   │   ├── ThemeToggle.tsx          # Theme toggle button
│   │   │   │   ├── ChatInput.tsx            # Chat input component
│   │   │   │   ├── ChatMessages.tsx         # Chat messages container
│   │   │   │   ├── HistoryButton.tsx        # History access button
│   │   │   │   ├── EnterBehaviorToggle.tsx  # Enter behavior toggle button
│   │   │   │   └── EnterModeMenu.tsx        # Enter mode selection menu
│   │   │   └── messages/
│   │   │       ├── MessageContainer.tsx   # Reusable message wrapper
│   │   │       └── CollapsibleDetails.tsx # Collapsible content component
│   │   ├── types/
│   │   │   ├── window.d.ts      # Window type extensions
│   │   │   └── enterBehavior.ts # Enter behavior type definitions
│   │   ├── contexts/           # React contexts
│   │   │   ├── EnterBehaviorContext.tsx        # Enter behavior context provider
│   │   │   └── EnterBehaviorContextDefinition.ts # Context definition
│   │   ├── scripts/            # Demo recording scripts
│   │   │   ├── record-demo.ts         # Demo recorder
│   │   │   ├── demo-constants.ts      # Demo configuration
│   │   │   └── compare-demo-videos.ts # Demo comparison
│   │   ├── tests/              # End-to-end tests
│   │   │   └── demo-validation.spec.ts # Demo validation tests
│   │   ├── package.json
│   │   └── vite.config.ts     # Vite config with @tailwindcss/vite plugin
├── shared/           # Shared TypeScript types
│   └── types.ts
├── CLAUDE.md        # Technical documentation
└── README.md        # User documentation
```

## Key Design Decisions

1. **Runtime Abstraction Architecture**: Complete separation between business logic and platform-specific code using a minimal Runtime interface. All handlers, utilities, and CLI components use runtime abstraction instead of direct Deno APIs, enabling comprehensive testing with mock runtime and future platform flexibility.

2. **Modular Entry Points**: CLI-specific code separated into `cli/` directory with `deno.ts` and `node.ts` as runtime-specific entry points, while `app.ts` contains the runtime-agnostic core application. This enables clean separation of concerns and cross-platform compatibility.

3. **Universal CLI Path Detection**: Tracing-based approach using temporary node wrappers to detect actual Claude script paths regardless of installation method (npm, pnpm, asdf, yarn). This eliminates complex installation-specific logic and works universally across all package managers and platforms.

4. **Structured Logging System**: LogTape-based logging with cross-runtime compatibility (Deno/Node.js), debug mode control via `--debug` flag, ANSI color formatting, and shortened category names for improved terminal readability.

5. **Raw JSON Streaming**: Backend passes Claude JSON responses without modification to allow frontend flexibility in handling different message types.

6. **Configurable Ports**: Backend port configurable via PORT environment variable or CLI argument, frontend port via CLI argument to allow independent development and deployment.

7. **TypeScript Throughout**: Consistent TypeScript usage across all components with shared type definitions.

8. **TailwindCSS Styling**: Uses @tailwindcss/vite plugin for utility-first CSS without separate CSS files.

9. **Theme System**: Light/dark theme toggle with automatic system preference detection and localStorage persistence.

10. **Project Directory Selection**: Users choose working directory before starting chat sessions, with support for both configured projects and custom directory selection.

11. **Routing Architecture**: React Router separates project selection and chat interfaces for better user experience.

12. **Dynamic Working Directory**: Claude commands execute in user-selected project directories for contextual file access.

13. **Request Management**: Unique request IDs enable request tracking and abort functionality for better user control.

14. **Tool Permission Handling**: Frontend permission dialog allows users to grant/deny tool access with proper state management.

15. **Comprehensive Error Handling**: Enhanced error states and user feedback for better debugging and user experience.

16. **Modular Architecture**: Frontend code is organized into specialized hooks and components for better maintainability and testability.

17. **Separation of Concerns**: Business logic, UI components, and utilities are clearly separated into different modules.

18. **Configuration Management**: Centralized configuration for API endpoints and application constants.

19. **Reusable Components**: Common UI patterns are extracted into reusable components to reduce duplication.

20. **Hook Composition**: Complex functionality is built by composing smaller, focused hooks that each handle a specific concern.

21. **Enter Key Behavior**: Configurable Enter key behavior with persistent user preferences, supporting both traditional (Enter=Send) and modern (Enter=Newline) interaction patterns.

## Claude Code SDK Types Reference

**SDK Types**: `frontend/node_modules/@anthropic-ai/claude-code/sdk.d.ts`

### Common Patterns

```typescript
// Type extraction
const systemMsg = sdkMessage as Extract<SDKMessage, { type: "system" }>;
const assistantMsg = sdkMessage as Extract<SDKMessage, { type: "assistant" }>;
const resultMsg = sdkMessage as Extract<SDKMessage, { type: "result" }>;

// Assistant content access (nested structure!)
for (const item of assistantMsg.message.content) {
  if (item.type === "text") {
    const text = (item as { text: string }).text;
  } else if (item.type === "tool_use") {
    const toolUse = item as { name: string; input: Record<string, unknown> };
  }
}

// System message (no .message property)
console.log(systemMsg.cwd); // Direct access, no nesting
```

### Key Points

- **System**: Fields directly on object (`systemMsg.cwd`, `systemMsg.tools`)
- **Assistant**: Content nested under `message.content`
- **Result**: Has `subtype` field (`success` | `error_max_turns` | `error_during_execution`)
- **Type Safety**: Always use `Extract<SDKMessage, { type: "..." }>` for narrowing

## Frontend Architecture Benefits

The modular frontend architecture provides several key benefits:

### Code Organization

- **Reduced File Size**: Main App.tsx reduced from 467 to 262 lines (44% reduction)
- **Focused Responsibilities**: Each file has a single, clear purpose
- **Logical Grouping**: Related functionality is organized into coherent modules

### Maintainability

- **Easier Debugging**: Issues can be isolated to specific modules
- **Simplified Testing**: Individual components and hooks can be tested in isolation
- **Clear Dependencies**: Import structure clearly shows component relationships

### Reusability

- **Shared Components**: `MessageContainer` and `CollapsibleDetails` reduce UI duplication
- **Utility Functions**: Common operations are centralized and reusable
- **Configuration**: API endpoints and constants are easily configurable

### Developer Experience

- **Type Safety**: Enhanced TypeScript coverage with stricter type definitions
- **IntelliSense**: Better IDE support with smaller, focused modules
- **Hot Reload**: Faster development cycles with smaller change surfaces

### Performance

- **Bundle Optimization**: Tree-shaking is more effective with modular code
- **Code Splitting**: Easier to implement lazy loading for large features
- **Memory Efficiency**: Reduced memory footprint with focused hooks

## Testing

The project includes comprehensive test suites for both frontend and backend components:

### Frontend Testing

- **Framework**: Vitest with Testing Library
- **Coverage**: Component testing, hook testing, and integration tests
- **Location**: Tests are co-located with source files (`*.test.ts`, `*.test.tsx`)
- **Run**: `make test-frontend` or `cd frontend && npm run test:run`

### Backend Testing

- **Framework**: Deno's built-in test runner with std/assert
- **Coverage**: Path encoding utilities, API handlers, and integration tests
- **Location**: `backend/pathUtils.test.ts` and other `*.test.ts` files
- **Run**: `make test-backend` or `cd backend && deno task test`

### Unified Testing

- **All Tests**: `make test` - Runs both frontend and backend tests
- **Quality Checks**: `make check` - Includes tests in pre-commit quality validation
- **CI Integration**: GitHub Actions automatically runs all tests on push/PR

## Single Binary Distribution

The project supports creating self-contained executables for all major platforms:

### Local Building

```bash
# Build for current platform
cd backend && deno task build

# Cross-platform builds are handled by GitHub Actions
```

### Automated Releases

- **Trigger**: Push git tags (e.g., `git tag v1.0.0 && git push origin v1.0.0`)
- **Platforms**: Linux (x64/ARM64), macOS (x64/ARM64)
- **Output**: GitHub Releases with downloadable binaries
- **Features**: Frontend is automatically bundled into each binary

## Claude Agent SDK Dependency Management

### Current Version Policy

Both frontend and backend use **fixed versions** (without caret `^`) to ensure consistency:

- **Frontend**: `frontend/package.json` - `"@anthropic-ai/claude-agent-sdk": "0.2.27"`
- **Backend**:
  - Deno: `backend/deno.json` imports - `"@anthropic-ai/claude-agent-sdk": "npm:@anthropic-ai/claude-agent-sdk@0.2.27"`
  - Node.js: `backend/package.json` - `"@anthropic-ai/claude-agent-sdk": "^0.2.27"`

### Version Update Procedure

When updating to a new Claude Agent SDK version (e.g., 0.2.28):

1. **Check current versions**:

   ```bash
   # Frontend
   grep "@anthropic-ai/claude-agent-sdk" frontend/package.json

   # Backend
   grep "@anthropic-ai/claude-agent-sdk" backend/deno.json
   ```

2. **Update Frontend**:

   ```bash
   # Edit frontend/package.json - change version number
   # "@anthropic-ai/claude-agent-sdk": "0.2.XX"
   cd frontend && npm install
   ```

3. **Update Backend**:

   ```bash
   # For Deno: Edit backend/deno.json imports - change version number
   # "@anthropic-ai/claude-agent-sdk": "npm:@anthropic-ai/claude-agent-sdk@0.2.XX"
   cd backend && rm deno.lock && deno cache cli/deno.ts

   # For Node.js: Edit backend/package.json - change version number
   # "@anthropic-ai/claude-agent-sdk": "^0.2.XX"
   cd backend && npm install
   ```

4. **Verify and test**:
   ```bash
   make check
   ```

### Version Consistency Check

Ensure all environments use the same version:

```bash
# Should show the same version number across all package configs
grep "@anthropic-ai/claude-agent-sdk" frontend/package.json backend/deno.json backend/package.json
```

## Commands for Claude

### Unified Commands (from project root)

- **Format**: `make format` - Format both frontend and backend
- **Lint**: `make lint` - Lint both frontend and backend
- **Type Check**: `make typecheck` - Type check both frontend and backend
- **Test**: `make test` - Run both frontend and backend tests
- **Quality Check**: `make check` - Run all quality checks before commit
- **Format Specific Files**: `make format-files FILES="file1 file2"` - Format specific files with prettier

### Individual Commands

- **Development**: `make dev-backend` / `make dev-frontend`
- **Testing**: `make test-frontend` / `make test-backend`
- **Build Binary**: `make build-backend`
- **Build Frontend**: `make build-frontend`

**Note**: Lefthook automatically runs `make check` before every commit. GitHub Actions will also run all quality checks on push and pull requests.

## Development Workflow

### Pull Request Process

1. Create a feature branch from `main`: `git checkout -b feature/your-feature-name`
2. Make your changes and commit them (Lefthook runs `make check` automatically)
3. Push your branch and create a pull request
4. **Add appropriate labels** to categorize the changes (see Labels section below)
5. **Include essential PR information** as outlined in the Labels section
6. Request review and address feedback
7. Merge after approval and CI passes

#### Creating Pull Requests

Create pull requests with appropriate labels and essential information:

```bash
gh pr create --title "Your PR Title" \
  --label "appropriate,labels" \
  --body "Brief description"
```

**Note**: CHANGELOG.md is now automatically managed by tagpr - no manual updates needed!

### Labels

The project uses the following labels for categorizing pull requests and issues:

- 🐛 **`bug`** - Bug fixes (non-breaking changes that fix issues)
- ✨ **`feature`** - New features (non-breaking changes that add functionality)
- 💥 **`breaking`** - Breaking changes (changes that would cause existing functionality to not work as expected)
- 📚 **`documentation`** - Documentation improvements or additions
- ⚡ **`performance`** - Performance improvements
- 🔨 **`refactor`** - Code refactoring (no functional changes)
- 🧪 **`test`** - Adding or updating tests
- 🔧 **`chore`** - Maintenance, dependencies, tooling updates
- 🖥️ **`backend`** - Backend-related changes
- 🎨 **`frontend`** - Frontend-related changes

**For Claude**: When creating PRs, always include:

1. **Type of Change checkboxes**: Include the checkbox list from the template to categorize changes:
   ```
   - [ ] 🐛 `bug` - Bug fix (non-breaking change which fixes an issue)
   - [ ] ✨ `feature` - New feature (non-breaking change which adds functionality)
   - [ ] 💥 `breaking` - Breaking change
   - [ ] 📚 `documentation` - Documentation update
   - [ ] ⚡ `performance` - Performance improvement
   - [ ] 🔨 `refactor` - Code refactoring
   - [ ] 🧪 `test` - Adding or updating tests
   - [ ] 🔧 `chore` - Maintenance, dependencies, tooling
   - [ ] 🖥️ `backend` - Backend-related changes
   - [ ] 🎨 `frontend` - Frontend-related changes
   ```
2. **Description**: Brief summary of what changed and why
3. **GitHub labels**: Add corresponding labels using `--label` flag: `gh pr create --label "feature,documentation"`
4. **Test plan**: Include testing information if relevant

Multiple labels can be applied if the PR covers multiple areas.

### Release Process (Automated with tagpr)

1. **Feature PRs merged to main** → tagpr automatically creates/updates release PR
2. **Add version labels** to PRs if needed:
   - No label = patch version (v1.0.0 → v1.0.1)
   - `minor` label = minor version (v1.0.0 → v1.1.0)
   - `major` label = major version (v1.0.0 → v2.0.0)
3. **Review and merge release PR** → tagpr creates git tag automatically
4. **GitHub Actions builds binaries** and creates GitHub Release automatically
5. Update documentation if needed

**Manual override**: Edit version in `backend/package.json` directly if specific version needed

### GitHub Sub-Issues API

**For Claude**: When creating sub-issues to break down larger features:

```bash
# 1. Create the sub-issue normally
gh issue create --title "Sub-issue title" --body "..." --label "feature,enhancement"

# 2. Get the sub-issue ID
SUB_ISSUE_ID=$(gh api repos/sugyan/claude-code-webui/issues/ISSUE_NUMBER --jq '.id')

# 3. Add it as sub-issue to parent issue
gh api repos/sugyan/claude-code-webui/issues/PARENT_ISSUE_NUMBER/sub_issues \
  --method POST \
  --field sub_issue_id=$SUB_ISSUE_ID

# 4. Verify the relationship
gh api repos/sugyan/claude-code-webui/issues/PARENT_ISSUE_NUMBER/sub_issues
```

**Key points**:

- Use issue **ID** (not number) for `sub_issue_id` parameter
- Endpoint is `/sub_issues` (plural) for POST operations
- Parent issue will show `sub_issues_summary` with total/completed counts
- Sub-issues automatically link to parent in GitHub UI

### Viewing Copilot Review Comments

**For Claude**: Copilot inline review comments are not shown in regular `gh pr view` output. To see them:

```bash
# View all inline review comments from Copilot
gh api repos/sugyan/claude-code-webui/pulls/PR_NUMBER/comments

# Example for this repository
gh api repos/sugyan/claude-code-webui/pulls/39/comments
```

**Why this matters**:

- Copilot provides valuable code improvement suggestions
- These comments include security, performance, and code quality feedback
- They appear as inline comments on specific lines of code
- Missing these can lead to suboptimal code being merged
- Always check for Copilot feedback when reviewing PRs

**Important for Claude**: Always run commands from the project root directory. When using `cd` commands for backend/frontend, use full paths like `cd /path/to/project/backend` to avoid getting lost in subdirectories.
