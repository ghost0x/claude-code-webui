import { useAuth } from "../../contexts/AuthContext";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const { logout, authEnabled } = useAuth();

  // Don't show logout button if auth is not enabled
  if (!authEnabled) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <button
      onClick={handleLogout}
      className={`p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md group ${className}`}
      title="Sign out"
      aria-label="Sign out"
    >
      <svg
        className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    </button>
  );
}