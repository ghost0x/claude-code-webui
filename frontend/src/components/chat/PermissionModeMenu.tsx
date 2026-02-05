import { useState, useRef, useEffect } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import type { PermissionMode } from "../../types";

interface PermissionModeMenuProps {
  permissionMode?: PermissionMode;
  onPermissionModeChange?: (mode: PermissionMode) => void;
}

export function PermissionModeMenu({
  permissionMode = "acceptEdits",
  onPermissionModeChange,
}: PermissionModeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleModeSelect = (mode: PermissionMode) => {
    console.log("[PermissionModeMenu] Mode selected:", mode);
    onPermissionModeChange?.(mode);
    setIsOpen(false);
  };

  const getModeLabel = (mode: PermissionMode): string => {
    switch (mode) {
      case "plan":
        return "📋 Plan Mode";
      case "acceptEdits":
        return "✅ Accept Edits";
      default:
        return "Mode";
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        title="Permission mode settings"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Cog6ToothIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden min-w-[240px]">
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            Permission Mode
          </div>

          <button
            type="button"
            onClick={() => handleModeSelect("acceptEdits")}
            className={`flex flex-col gap-1 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full text-left ${
              permissionMode === "acceptEdits"
                ? "bg-blue-50 dark:bg-blue-900/20"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ✅ Accept Edits
              </span>
              {permissionMode === "acceptEdits" && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Active
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Auto-accept edits without prompting
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSelect("plan")}
            className={`flex flex-col gap-1 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full text-left ${
              permissionMode === "plan" ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                📋 Plan Mode
              </span>
              {permissionMode === "plan" && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Active
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Claude will use planning workflows
            </span>
          </button>

          <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            Current: {getModeLabel(permissionMode)}
          </div>
        </div>
      )}
    </div>
  );
}
