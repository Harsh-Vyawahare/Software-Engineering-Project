import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Home,
  BookOpen,
  QrCode,
  FileText,
  User,
  Radio,
  FileSpreadsheet,
  Calendar,
  Users,
  Settings,
  ShieldAlert,
  ClipboardList,
  MapPin,
  LogOut,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  let navItems: Array<{ to: string; label: string; icon: any }> = [];

  if (user.role === 'STUDENT') {
    navItems = [
      { to: '/student', label: 'Dashboard', icon: Home },
      { to: '/student/mark', label: 'Mark Attendance', icon: QrCode },
      { to: '/student/courses', label: 'Enrolled Courses', icon: BookOpen },
      { to: '/student/timetable', label: 'My Timetable', icon: Calendar },
      { to: '/student/leaves', label: 'Leave Requests', icon: FileText },
      { to: '/student/profile', label: 'Student Profile', icon: User },
    ];
  } else if (user.role === 'FACULTY') {
    navItems = [
      { to: '/faculty', label: 'Dashboard', icon: Home },
      { to: '/faculty/live', label: 'Live Attendance Session', icon: Radio },
      { to: '/faculty/leaves', label: 'Leave Inbox', icon: FileText },
      { to: '/faculty/reports', label: 'Attendance Reports', icon: FileSpreadsheet },
      { to: '/faculty/timetable', label: 'Faculty Timetable', icon: Calendar },
    ];
  } else if (user.role === 'ADMIN') {
    navItems = [
      { to: '/admin', label: 'Institution Overview', icon: Home },
      { to: '/admin/students', label: 'Manage Students', icon: Users },
      { to: '/admin/faculty', label: 'Faculty Roster', icon: User },
      { to: '/admin/classrooms', label: 'Classrooms & GPS', icon: MapPin },
      { to: '/admin/overrides', label: 'Attendance Overrides', icon: ShieldAlert },
      { to: '/admin/settings', label: 'System Configuration', icon: Settings },
      { to: '/admin/audit', label: 'Audit Trail & Logs', icon: ClipboardList },
      { to: '/faculty/reports', label: 'Institutional Reports', icon: FileSpreadsheet },
    ];
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md min-h-[calc(100vh-4rem)] p-4 space-y-6">
      {/* Student/User Pill in sidebar */}
      {user.student && (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-spit-maroon-50 to-rose-50/50 dark:from-slate-800/80 dark:to-spit-maroon-950/30 border border-spit-maroon-100 dark:border-slate-700">
          <div className="text-[11px] font-bold uppercase tracking-wider text-spit-maroon-700 dark:text-rose-400">
            Enrolled Division
          </div>
          <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
            {user.student.division} · Batch {user.student.batch}
          </div>
          {user.student.mdmElective && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Elective: {user.student.mdmElective} ({user.student.mdmBatch || 'Core'})
            </div>
          )}
        </div>
      )}

      {/* Navigation links */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/student' || item.to === '/faculty' || item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-spit-maroon-700 text-white shadow-md shadow-spit-maroon-900/20 dark:bg-rose-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Logout Button */}
      <div className="pt-4 mt-auto border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => logout()}
          className="flex items-center justify-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:text-white dark:text-rose-300 bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900 transition-all shadow-sm active:scale-95 group"
          title="Sign out and return to login page"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Log Out to Login Page</span>
        </button>
      </div>
    </aside>
  );
};
