import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { ConfigContext } from "./config.ts";

/**
 * Authentication middleware that protects API routes
 * Checks for valid session token in cookies
 */
export function createAuthMiddleware() {
  return createMiddleware<ConfigContext>(async (c, next) => {
    const config = c.get("config");
    
    // Skip authentication if not enabled
    if (!config.authEnabled) {
      await next();
      return;
    }

    // Allow auth endpoints to bypass authentication check
    const path = c.req.path;
    if (path.startsWith("/api/auth/")) {
      await next();
      return;
    }

    // Check for session token in cookie
    const sessionToken = getCookie(c, "auth-session");
    
    if (!sessionToken) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Simple session validation - in a real app, you'd want to store sessions in memory/database
    // For simplicity, we're using a signed token approach
    const expectedToken = generateSessionToken(config.authUsername || "");
    
    if (sessionToken !== expectedToken) {
      return c.json({ error: "Invalid session" }, 401);
    }

    await next();
  });
}

/**
 * Generate a simple session token based on username
 * In production, this should be more secure with proper signing/encryption
 */
export function generateSessionToken(username: string): string {
  // Simple hash-based token - in production, use proper JWT or session management
  const secret = "claude-code-webui-secret"; // In production, use environment variable
  const payload = `${username}:${secret}`;
  
  // Create a simple hash (not cryptographically secure, but sufficient for demo)
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Validate credentials against configured username/password
 */
export function validateCredentials(config: { authUsername?: string; authPassword?: string }, username: string, password: string): boolean {
  return config.authUsername === username && config.authPassword === password;
}