import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage.js';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.js';

// Student Pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage.js';
import { StudentMarkAttendancePage } from './pages/student/StudentMarkAttendancePage.js';
import { StudentCoursesPage } from './pages/student/StudentCoursesPage.js';
import { StudentSubjectDetailPage } from './pages/student/StudentSubjectDetailPage.js';
import { StudentTimetablePage } from './pages/student/StudentTimetablePage.js';
import { StudentLeavesPage } from './pages/student/StudentLeavesPage.js';
import { StudentProfilePage } from './pages/student/StudentProfilePage.js';

// Faculty Pages
import { FacultyDashboardPage } from './pages/faculty/FacultyDashboardPage.js';
import { FacultyLiveSessionPage } from './pages/faculty/FacultyLiveSessionPage.js';
import { FacultyLeaveInboxPage } from './pages/faculty/FacultyLeaveInboxPage.js';
import { FacultyReportsPage } from './pages/faculty/FacultyReportsPage.js';
import { FacultyTimetablePage } from './pages/faculty/FacultyTimetablePage.js';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage.js';
import { AdminFacultyPage } from './pages/admin/AdminFacultyPage.js';
import { AdminClassroomsPage } from './pages/admin/AdminClassroomsPage.js';
import { AdminOverridesPage } from './pages/admin/AdminOverridesPage.js';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.js';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: string }> = ({
  children,
  allowedRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-4 border-spit-maroon-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole && user.role !== 'ADMIN') {
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
    if (user.role === 'FACULTY') return <Navigate to="/faculty" replace />;
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-4 border-spit-maroon-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
  if (user.role === 'FACULTY') return <Navigate to="/faculty" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Authenticated Layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute allowedRole="STUDENT"><StudentDashboardPage /></ProtectedRoute>} />
          <Route path="/student/mark" element={<ProtectedRoute allowedRole="STUDENT"><StudentMarkAttendancePage /></ProtectedRoute>} />
          <Route path="/student/courses" element={<ProtectedRoute allowedRole="STUDENT"><StudentCoursesPage /></ProtectedRoute>} />
          <Route path="/student/courses/:subjectId" element={<ProtectedRoute allowedRole="STUDENT"><StudentSubjectDetailPage /></ProtectedRoute>} />
          <Route path="/student/timetable" element={<ProtectedRoute allowedRole="STUDENT"><StudentTimetablePage /></ProtectedRoute>} />
          <Route path="/student/leaves" element={<ProtectedRoute allowedRole="STUDENT"><StudentLeavesPage /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRole="STUDENT"><StudentProfilePage /></ProtectedRoute>} />

          {/* Faculty Routes */}
          <Route path="/faculty" element={<ProtectedRoute allowedRole="FACULTY"><FacultyDashboardPage /></ProtectedRoute>} />
          <Route path="/faculty/live" element={<ProtectedRoute allowedRole="FACULTY"><FacultyDashboardPage /></ProtectedRoute>} />
          <Route path="/faculty/live/:sessionId" element={<ProtectedRoute allowedRole="FACULTY"><FacultyLiveSessionPage /></ProtectedRoute>} />
          <Route path="/faculty/leaves" element={<ProtectedRoute allowedRole="FACULTY"><FacultyLeaveInboxPage /></ProtectedRoute>} />
          <Route path="/faculty/reports" element={<ProtectedRoute allowedRole="FACULTY"><FacultyReportsPage /></ProtectedRoute>} />
          <Route path="/faculty/timetable" element={<ProtectedRoute allowedRole="FACULTY"><FacultyTimetablePage /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRole="ADMIN"><AdminStudentsPage /></ProtectedRoute>} />
          <Route path="/admin/faculty" element={<ProtectedRoute allowedRole="ADMIN"><AdminFacultyPage /></ProtectedRoute>} />
          <Route path="/admin/classrooms" element={<ProtectedRoute allowedRole="ADMIN"><AdminClassroomsPage /></ProtectedRoute>} />
          <Route path="/admin/overrides" element={<ProtectedRoute allowedRole="ADMIN"><AdminOverridesPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRole="ADMIN"><AdminSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute allowedRole="ADMIN"><AdminAuditLogPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
