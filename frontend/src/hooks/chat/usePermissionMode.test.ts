import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePermissionMode } from "./usePermissionMode";

describe("usePermissionMode", () => {
  it("should initialize with acceptEdits permission mode (bypasses permissions)", () => {
    const { result } = renderHook(() => usePermissionMode());

    expect(result.current.permissionMode).toBe("acceptEdits");
    expect(result.current.isAcceptEditsMode).toBe(true);
    expect(result.current.isPlanMode).toBe(false);
  });

  it("should update permission mode to plan correctly", () => {
    const { result } = renderHook(() => usePermissionMode());

    act(() => {
      result.current.setPermissionMode("plan");
    });

    expect(result.current.permissionMode).toBe("plan");
    expect(result.current.isPlanMode).toBe(true);
    expect(result.current.isAcceptEditsMode).toBe(false);
  });

  it("should update permission mode to acceptEdits correctly", () => {
    const { result } = renderHook(() => usePermissionMode());

    // First switch to plan mode
    act(() => {
      result.current.setPermissionMode("plan");
    });

    // Then switch back to acceptEdits
    act(() => {
      result.current.setPermissionMode("acceptEdits");
    });

    expect(result.current.permissionMode).toBe("acceptEdits");
    expect(result.current.isAcceptEditsMode).toBe(true);
    expect(result.current.isPlanMode).toBe(false);
  });

  it("should persist state across re-renders", () => {
    const { result, rerender } = renderHook(() => usePermissionMode());

    act(() => {
      result.current.setPermissionMode("plan");
    });

    rerender();

    expect(result.current.permissionMode).toBe("plan");
    expect(result.current.isPlanMode).toBe(true);
  });

  it("should reset to acceptEdits on new hook instance", () => {
    const { result: result1 } = renderHook(() => usePermissionMode());

    act(() => {
      result1.current.setPermissionMode("plan");
    });

    // Create a new hook instance (simulating page reload)
    const { result: result2 } = renderHook(() => usePermissionMode());

    expect(result2.current.permissionMode).toBe("acceptEdits");
    expect(result2.current.isAcceptEditsMode).toBe(true);
  });
});
