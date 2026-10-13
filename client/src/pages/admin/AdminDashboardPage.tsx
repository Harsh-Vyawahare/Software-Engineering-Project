import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  MapPin,
  Radio,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await apiRequest('/admin/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleResetData = async () => {
    if (!window.confirm('Reset all demo attendance records and restore initial seed?')) return;
    try {
      const res = await apiRequest('/admin/reset-demo-data', { method: 'POST' });
      alert(res.message);
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  const counts = data?.counts;
  const atRiskStudents = data?.atRiskStudents || [];
  const liveSessions = data?.liveSessions || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-7 h-7 text-spit-maroon-700 dark:text-rose-400" />
            <span>Administrator Control Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            SPIT Attend Central Administration · Sardar Patel Institute of Technology
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold text-xs transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data to Seed</span>
        </button>
      </div>

      {/* Institution Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Enrolled Students</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{counts?.students}</div>
          <div className="text-[11px] text-slate-400">Class TE D (Division D)</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Faculty Roster</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{counts?.faculty}</div>
          <div className="text-[11px] text-slate-400">Teaching Staff Members</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Course Subjects</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{counts?.courses}</div>
          <div className="text-[11px] text-slate-400">Theory + Lab Offerings</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Active Classrooms</span>
            <MapPin className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{counts?.classrooms}</div>
          <div className="text-[11px] text-slate-400">GPS Geofenced Venues</div>
        </div>
      </div>

      {/* Live Sessions Today */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
          <span>Live Sessions In Progress ({liveSessions.length})</span>
        </h2>

        {liveSessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No live attendance sessions open at this moment. Faculty can start sessions from their dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveSessions.map((s: any) => (
              <div key={s.id} className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{s.subjectName} ({s.type})</div>
                  <div className="text-slate-500">{s.facultyName} · Room {s.roomName} · Audience: {s.audienceRef}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600">{s.presentCount} Present</div>
                  <div className="text-[10px] text-slate-400">Started {new Date(s.startedAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* At-Risk Students Below 75% Threshold (BR-1) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>At-Risk Students Below 75% Attendance (BR-1 Alert)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Students falling below the institutional 75% threshold are flagged for examination debarment.
            </p>
          </div>
          <Link
            to="/admin/students"
            className="text-xs font-bold text-spit-maroon-700 dark:text-rose-400 hover:underline flex items-center gap-1"
          >
            Manage All Students <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {atRiskStudents.length === 0 ? (
          <div className="text-center py-6 text-xs text-emerald-600 font-semibold">
            All enrolled students are currently above the 75% threshold.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {atRiskStudents.map((st: any) => (
              <div key={st.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {st.name} ({st.rollNumber})
                  </div>
                  <div className="text-slate-500">
                    {st.division} · Batch {st.batch} · Attended {st.attended} of {st.total} sessions
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    {st.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
