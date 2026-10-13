import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Home, BookOpen, QrCode, FileText, User, Radio, FileSpreadsheet, Users, Settings } from 'lucide-react';

export const MobileNavbar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  let links: Array<{ to: string; label: string; icon: any; highlight?: boolean }> = [];

  if (user.role === 'STUDENT') {
    links = [
      { to: '/student', label: 'Home', icon: Home },
      { to: '/student/courses', label: 'Courses', icon: BookOpen },
      { to: '/student/mark', label: 'Scan', icon: QrCode, highlight: true },
      { to: '/student/leaves', label: 'Leaves', icon: FileText },
      { to: '/student/profile', label: 'Profile', icon: User },
    ];
  } else if (user.role === 'FACULTY') {
    links = [
      { to: '/faculty', label: 'Home', icon: Home },
      { to: '/faculty/live', label: 'Live Session', icon: Radio, highlight: true },
      { to: '/faculty/leaves', label: 'Leaves', icon: FileText },
      { to: '/faculty/reports', label: 'Reports', icon: FileSpreadsheet },
    ];
  } else if (user.role === 'ADMIN') {
    links = [
      { to: '/admin', label: 'Overview', icon: Home },
      { to: '/admin/students', label: 'Students', icon: Users },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ];
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          if (link.highlight) {
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `-mt-5 flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-spit-maroon-700 to-rose-600 text-white shadow-xl border-4 border-white dark:border-slate-900 transition-transform ${
                    isActive ? 'scale-110' : 'hover:scale-105'
                  }`
                }
              >
                <Icon className="w-6 h-6" />
              </NavLink>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/student' || link.to === '/faculty' || link.to === '/admin'}
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition-colors ${
                  isActive
                    ? 'text-spit-maroon-700 dark:text-rose-400 font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
