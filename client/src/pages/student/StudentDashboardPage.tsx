import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { AttendanceRing } from '../../components/dashboard/AttendanceRing.js';
import { LiveSessionCard } from '../../components/dashboard/LiveSessionCard.js';
import { useSocket } from '../../context/SocketContext.js';
import {
  BookOpen,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await apiRequest('/student/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Real-time automatic reflection when teacher starts/rotates/closes session
  useEffect(() => {
    if (!socket) return;
    const handleSessionChange = () => {
      fetchDashboard();
    };

    socket.on('session_started', handleSessionChange);
    socket.on('session_closed', handleSessionChange);
    socket.on('roster_updated', handleSessionChange);

    return () => {
      socket.off('session_started', handleSessionChange);
      socket.off('session_closed', handleSessionChange);
      socket.off('roster_updated', handleSessionChange);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  const student = data?.student;
  const summary = data?.summary;
  const liveSession = data?.liveSessionCard;
  const nextScheduled = data?.nextScheduledCard;
  const todayTimeline = data?.todayTimeline || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header greeting & Student Chip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {user?.student?.referencePhotoUrl && (
            <img
              src={user.student.referencePhotoUrl}
              alt={user.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-spit-maroon-600 dark:border-rose-400 shadow-md shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Good day, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Welcome to SPIT Attend · Academic Year 2026-27 ODD Semester
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-2xl bg-spit-maroon-100 dark:bg-spit-maroon-950/60 border border-spit-maroon-200 dark:border-spit-maroon-800 text-spit-maroon-800 dark:text-rose-300 font-extrabold text-xs shadow-sm">
            {student?.division} · Batch {student?.batch}
          </span>
          {student?.mdmElective && (
            <span className="px-3 py-1.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-bold text-xs">
              MDM: {student.mdmElective}
            </span>
          )}
        </div>
      </div>

      {/* Biometric setup notice if no photo */}
      {student && !student.hasReferencePhoto && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-amber-900 dark:text-amber-200">
                Biometric Setup Incomplete
              </div>
              <div className="text-[11px] text-amber-800 dark:text-amber-300">
                You must enroll your reference face photograph before attendance can be marked.
              </div>
            </div>
          </div>
          <Link
            to="/student/profile"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs text-center shrink-0 shadow-sm"
          >
            Enroll Photo Now
          </Link>
        </div>
      )}

      {/* 2. Live Lecture / Lab Hero Card */}
      <LiveSessionCard liveSession={liveSession} nextScheduled={nextScheduled} />

      {/* 3. Overall Attendance Ring with Bunk-o-meter */}
      {summary?.overall && (
        <AttendanceRing
          percentage={summary.overall.percentage}
          attended={summary.overall.attended}
          conducted={summary.overall.conducted}
          excused={summary.overall.excused}
          bunkOMeter={summary.overall.bunkOMeter}
        />
      )}

      {/* 4. Today's Schedule Timeline */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Today's Schedule ({data?.currentDay})
            </h2>
            <p className="text-xs text-slate-500">
              Personalized lectures and Batch {student?.batch} labs for {data?.currentDate}
            </p>
          </div>
          <Link
            to="/student/timetable"
            className="text-xs font-bold text-spit-maroon-700 dark:text-rose-400 hover:underline flex items-center gap-1"
          >
            Full Week Grid <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todayTimeline.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No scheduled sessions found for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayTimeline.map((slot: any) => {
              let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
              if (slot.status === 'LIVE') badgeColor = 'bg-rose-500 text-white animate-pulse';
              else if (slot.status === 'PRESENT') badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
              else if (slot.status === 'ABSENT') badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
              else if (slot.status === 'EXCUSED') badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';

              return (
                <div
                  key={slot.sectionId}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2 hover:border-spit-maroon-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">{slot.startTime} - {slot.endTime}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${badgeColor}`}>
                      {slot.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {slot.subjectName}
                    </h3>
                    <div className="text-xs text-slate-500">
                      {slot.type === 'LAB' ? `Lab (${slot.audienceRef})` : 'Lecture'} · Room {slot.classroomName}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Faculty: {slot.facultyName}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. My Enrolled Courses Breakdown (Theory %, Lab %, Combined %) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Enrolled Course Sections
            </h2>
            <p className="text-xs text-slate-500">
              Component-level attendance tracking for Theory and Lab
            </p>
          </div>
          <Link
            to="/student/courses"
            className="text-xs font-bold text-spit-maroon-700 dark:text-rose-400 hover:underline flex items-center gap-1"
          >
            All Course Details <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary?.subjects?.map((sub: any) => (
            <div
              key={sub.subjectId}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: sub.color }}
                    />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {sub.subjectName}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {sub.facultyNames.theory && <span>Theory: {sub.facultyNames.theory} </span>}
                    {sub.facultyNames.lab && <span>· Lab: {sub.facultyNames.lab}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xl font-black ${sub.combined.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {sub.combined.percentage}%
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Combined</div>
                </div>
              </div>

              {/* Component breakdown progress bars */}
              <div className="space-y-2.5 pt-1 text-xs">
                {sub.theory && (
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Theory Component</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {sub.theory.percentage}% ({sub.theory.attended}/{sub.theory.conducted})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, sub.theory.percentage)}%` }}
                      />
                    </div>
                  </div>
                )}

                {sub.lab && (
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Lab Component (Batch {student?.batch})</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {sub.lab.percentage}% ({sub.lab.attended}/{sub.lab.conducted})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, sub.lab.percentage)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {sub.isBelowThreshold && (
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Below 75% threshold! Need {sub.bunkOMeter.neededToTarget} consecutive sessions.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
