import { useState, useCallback } from "react";
import type { PermissionMode } from "../../types";

export interface UsePermissionModeResult {
  permissionMode: PermissionMode;
  setPermissionMode: (mode: PermissionMode) => void;
  isPlanMode: boolean;
  isAcceptEditsMode: boolean;
}

/**
 * Hook for managing PermissionMode state within a browser session.
 * State is preserved across component re-renders but resets on page reload.
 * No localStorage persistence - simple React state management.
 * Defaults to "acceptEdits" which bypasses all permission prompts.
 */
export function usePermissionMode(): UsePermissionModeResult {
  const [permissionMode, setPermissionModeState] =
    useState<PermissionMode>("acceptEdits");

  const setPermissionMode = useCallback((mode: PermissionMode) => {
    console.log("[usePermissionMode] Setting mode to:", mode);
    setPermissionModeState(mode);
  }, []);

  // Log initial mode on mount
  console.log("[usePermissionMode] Current mode:", permissionMode);

  return {
    permissionMode,
    setPermissionMode,
    isPlanMode: permissionMode === "plan",
    isAcceptEditsMode: permissionMode === "acceptEdits",
  };
}
