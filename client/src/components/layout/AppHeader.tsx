import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { LogOut, Sun, Moon, Bell, Shield, User, GraduationCap } from 'lucide-react';
import spitLogo from '../../assets/spit-logo.png';

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <GraduationCap className="w-3.5 h-3.5" />
            Student
          </span>
        );
      case 'FACULTY':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <User className="w-3.5 h-3.5" />
            Faculty
          </span>
        );
      case 'ADMIN':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-spit-maroon-100 text-spit-maroon-800 dark:bg-spit-maroon-950/60 dark:text-spit-maroon-300 border border-spit-maroon-200 dark:border-spit-maroon-800">
            <Shield className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src={spitLogo} alt="SPIT Logo" className="w-10 h-10 object-contain drop-shadow" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-spit-maroon-700 via-rose-700 to-amber-600 bg-clip-text text-transparent dark:from-rose-400 dark:to-amber-400">
                SPIT Attend
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Sardar Patel Institute of Technology
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User pill & Role */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              {user.student?.referencePhotoUrl ? (
                <img
                  src={user.student.referencePhotoUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-spit-maroon-600 dark:border-rose-400 shadow-sm"
                />
              ) : null}

              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.name}</span>
                {user.student ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    UID: {user.student.rollNumber}
                  </span>
                ) : user.faculty ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ID: {user.faculty.employeeId}
                  </span>
                ) : null}
              </div>

              {getRoleBadge(user.role)}

              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold transition-all shadow-sm active:scale-95 hover:shadow"
                title="Log out and return to login page"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
