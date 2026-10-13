import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Radio,
  Play,
  FileText,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export const FacultyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await apiRequest('/faculty/dashboard');
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

  const handleStartSession = async (sectionId: string) => {
    setStartingSessionId(sectionId);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/faculty/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ courseSectionId: sectionId }),
      });
      navigate(`/faculty/live/${res.session.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start session. Check 15-minute grace window.');
    } finally {
      setStartingSessionId(null);
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  const todaySessions = data?.todaySessions || [];
  const pendingLeaves = data?.pendingLeaveCount || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Faculty ID: <strong>{user?.faculty?.employeeId}</strong> · SPIT Computer Engineering Department
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/faculty/leaves"
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-sm"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Leave Inbox</span>
            {pendingLeaves > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                {pendingLeaves}
              </span>
            )}
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Session Launcher Banner */}
      {data?.allAssignedSections && data.allAssignedSections.length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-spit-maroon-700 via-rose-800 to-spit-maroon-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">
              Live QR Generator
            </span>
            <h2 className="text-xl font-black tracking-tight">
              Launch Live Attendance QR Code
            </h2>
            <p className="text-xs text-rose-100/90 max-w-xl">
              Click any subject below to immediately generate the classroom rotating QR code and open the live attendance tracking screen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.allAssignedSections.map((s: any) => (
              <button
                key={s.id}
                onClick={() => handleStartSession(s.id)}
                disabled={startingSessionId === s.id}
                className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-amber-300 font-extrabold text-xs shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current text-spit-maroon-700" />
                <span>{s.subjectName} ({s.audienceRef})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Teaching Schedule (FR-DASH-02) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-spit-maroon-700" />
              <span>Today's Assigned Sessions ({data?.currentDay})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Start attendance during the 15-minute scheduled window (FR-SESS-01).
            </p>
          </div>
        </div>

        {todaySessions.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No teaching sessions scheduled for you today ({data?.currentDay}). Use the Quick QR Generator above or the courses table below to launch a session.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySessions.map((sec: any) => (
              <div
                key={sec.sectionId}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">
                      {sec.startTime} - {sec.endTime}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: sec.color }}
                    >
                      {sec.type} ({sec.audienceRef})
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {sec.subjectName}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Room {sec.roomName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {sec.enrolledCount} Enrolled
                    </span>
                  </div>
                </div>

                <div>
                  {sec.sessionStatus === 'OPEN' ? (
                    <Link
                      to={`/faculty/live/${sec.sessionId}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md animate-pulse"
                    >
                      <Radio className="w-4 h-4" />
                      <span>Resume Live Session ({sec.presentCount}/{sec.enrolledCount})</span>
                    </Link>
                  ) : sec.sessionStatus === 'CLOSED' ? (
                    <Link
                      to={`/faculty/live/${sec.sessionId}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Completed ({sec.presentCount}/{sec.enrolledCount} Present)</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleStartSession(sec.sectionId)}
                      disabled={startingSessionId === sec.sectionId}
                      className="w-full py-2.5 px-4 rounded-xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{startingSessionId === sec.sectionId ? 'Starting...' : 'Start Attendance Session'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Assigned Course Sections */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-spit-maroon-700" />
          <span>All Courses & Batches You Teach</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l-xl">Subject</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Audience Batch</th>
                <th className="py-2.5 px-3">Day & Time</th>
                <th className="py-2.5 px-3">Room</th>
                <th className="py-2.5 px-3">Enrolled</th>
                <th className="py-2.5 px-3 rounded-r-xl text-right">Action / Generate QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.allAssignedSections?.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                    {s.subjectName} ({s.subjectCode})
                  </td>
                  <td className="py-3 px-3 font-semibold">{s.type}</td>
                  <td className="py-3 px-3 font-bold text-spit-maroon-700 dark:text-rose-400">
                    {s.audienceRef}
                  </td>
                  <td className="py-3 px-3">{s.dayOfWeek} · {s.startTime}-{s.endTime}</td>
                  <td className="py-3 px-3">Room {s.classroomName}</td>
                  <td className="py-3 px-3 font-bold">{s.enrolledCount} students</td>
                  <td className="py-3 px-3 text-right">
                    {s.openSessionId ? (
                      <Link
                        to={`/faculty/live/${s.openSessionId}`}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] inline-flex items-center gap-1.5 shadow-sm animate-pulse"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Resume Live QR</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleStartSession(s.id)}
                        disabled={startingSessionId === s.id}
                        className="px-3.5 py-1.5 rounded-xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white font-extrabold text-[11px] inline-flex items-center gap-1.5 shadow-sm hover:scale-105 transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{startingSessionId === s.id ? 'Starting...' : 'Generate Live QR'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
