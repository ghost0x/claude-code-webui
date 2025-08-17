import type { Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import type { ConfigContext } from "../middleware/config.ts";
import { validateCredentials, generateSessionToken } from "../middleware/auth.ts";
import type { AuthRequest, AuthResponse, AuthStatusResponse } from "../../shared/types.ts";

/**
 * Handle login requests
 */
export async function handleLoginRequest(c: Context<ConfigContext>): Promise<Response> {
  const config = c.get("config");
  
  // If auth is not enabled, return error
  if (!config.authEnabled) {
    const response: AuthResponse = { 
      success: false, 
      error: "Authentication is not enabled" 
    };
    return c.json(response, 400);
  }

  try {
    const body = await c.req.json() as AuthRequest;
    const { username, password } = body;

    if (!username || !password) {
      const response: AuthResponse = { 
        success: false, 
        error: "Username and password are required" 
      };
      return c.json(response, 400);
    }

    // Validate credentials
    if (!validateCredentials(config, username, password)) {
      const response: AuthResponse = { 
        success: false, 
        error: "Invalid username or password" 
      };
      return c.json(response, 401);
    }

    // Generate session token
    const sessionToken = generateSessionToken(username);
    
    // Set secure cookie
    setCookie(c, "auth-session", sessionToken, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "Strict",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    const response: AuthResponse = { success: true };
    return c.json(response);
  } catch (error) {
    const response: AuthResponse = { 
      success: false, 
      error: "Invalid request format" 
    };
    return c.json(response, 400);
  }
}

/**
 * Handle logout requests
 */
export async function handleLogoutRequest(c: Context<ConfigContext>): Promise<Response> {
  // Clear the session cookie
  deleteCookie(c, "auth-session", { path: "/" });
  
  const response: AuthResponse = { success: true };
  return c.json(response);
}

/**
 * Handle authentication status requests
 */
export async function handleAuthStatusRequest(c: Context<ConfigContext>): Promise<Response> {
  const config = c.get("config");
  
  // If auth is not enabled, user is always "authenticated"
  if (!config.authEnabled) {
    const response: AuthStatusResponse = { 
      authenticated: true, 
      authEnabled: false 
    };
    return c.json(response);
  }

  // Check if user has valid session
  const sessionToken = getCookie(c, "auth-session");
  let hasValidSession = false;
  
  if (sessionToken) {
    // Validate the session token
    const expectedToken = generateSessionToken(config.authUsername || "");
    hasValidSession = sessionToken === expectedToken;
  }
  
  const response: AuthStatusResponse = { 
    authenticated: hasValidSession, 
    authEnabled: true 
  };
  return c.json(response);
}