import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useSocket } from '../../context/SocketContext.js';
import QRCode from 'qrcode';
import {
  Radio,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Maximize2,
  Minimize2,
  Edit3,
  X,
  StopCircle,
  Users,
} from 'lucide-react';

export const FacultyLiveSessionPage: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { socket, joinSession, leaveSession } = useSocket();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [countdown, setCountdown] = useState(60);
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual mark modal state
  const [manualModalStudent, setManualModalStudent] = useState<any | null>(null);
  const [manualStatus, setManualStatus] = useState<'PRESENT' | 'ABSENT' | 'EXCUSED'>('PRESENT');
  const [manualReason, setManualReason] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const res = await apiRequest(`/faculty/sessions/${sessionId}`);
      setData(res);
      generateQrImage(res.session.qrCurrentToken);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  // Join WebSocket session room
  useEffect(() => {
    if (sessionId) {
      joinSession(sessionId);
    }
    return () => {
      if (sessionId) leaveSession(sessionId);
    };
  }, [sessionId, socket]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleRosterUpdated = (payload: any) => {
      setData((prev: any) => {
        if (!prev) return prev;
        const newRoster = prev.roster.map((st: any) => {
          if (st.studentId === payload.studentId) {
            return {
              ...st,
              status: payload.status,
              method: payload.method,
              gpsDistanceM: payload.gpsDistanceM,
              faceScore: payload.faceScore,
              markedAt: payload.markedAt || new Date().toISOString(),
              manualReason: payload.reason || st.manualReason,
            };
          }
          return st;
        });

        const presentCount = newRoster.filter((r: any) => r.status === 'PRESENT').length;
        const totalCount = newRoster.length;

        return {
          ...prev,
          counts: {
            present: presentCount,
            total: totalCount,
            percentage: totalCount > 0 ? Math.round((presentCount / totalCount) * 1000) / 10 : 0,
          },
          roster: newRoster,
        };
      });
    };

    const handleQrRotated = (payload: any) => {
      generateQrImage(payload.token);
      setCountdown(60);
    };

    const handleSessionClosed = () => {
      fetchSession();
    };

    socket.on('roster_updated', handleRosterUpdated);
    socket.on('qr_rotated', handleQrRotated);
    socket.on('session_closed', handleSessionClosed);

    return () => {
      socket.off('roster_updated', handleRosterUpdated);
      socket.off('qr_rotated', handleQrRotated);
      socket.off('session_closed', handleSessionClosed);
    };
  }, [socket]);

  // Countdown timer for 60s rotation (BR-10)
  useEffect(() => {
    if (!data || data.session.status !== 'OPEN') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleManualRotateQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data?.session?.status]);

  const generateQrImage = async (token: string) => {
    try {
      const url = await QRCode.toDataURL(token, {
        width: 320,
        margin: 2,
        color: { dark: '#7B1113', light: '#FFFFFF' },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualRotateQr = async () => {
    if (!sessionId) return;
    try {
      const res = await apiRequest(`/faculty/sessions/${sessionId}/rotate-qr`, { method: 'POST' });
      generateQrImage(res.qrCurrentToken);
      setCountdown(60);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('End attendance session? All unverified students will be marked Absent (FR-SESS-03).')) return;
    try {
      await apiRequest(`/faculty/sessions/${sessionId}/end`, { method: 'POST' });
      fetchSession();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenManualModal = (student: any) => {
    setManualModalStudent(student);
    setManualStatus(student.status === 'PENDING_VERIFICATION' ? 'PRESENT' : student.status);
    setManualReason('');
    setManualError(null);
  };

  const handleSubmitManualMark = async () => {
    if (!manualReason || manualReason.trim().length < 3) {
      setManualError('A brief justification reason is mandatory (FR-MAN-02).');
      return;
    }
    setManualSubmitting(true);
    setManualError(null);

    try {
      await apiRequest(`/faculty/sessions/${sessionId}/manual-mark`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: manualModalStudent.studentId,
          status: manualStatus,
          reason: manualReason,
        }),
      });
      setManualModalStudent(null);
      fetchSession();
    } catch (err: any) {
      setManualError(err.message || 'Failed to update attendance');
    } finally {
      setManualSubmitting(false);
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  const session = data?.session;
  const counts = data?.counts;
  const roster = (data?.roster || []).filter((st: any) =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.rollNumber.includes(searchQuery)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Session Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                session.status === 'OPEN'
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{session.status === 'OPEN' ? 'Live Session Active' : 'Session Ended'}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-spit-maroon-100 text-spit-maroon-800 dark:bg-spit-maroon-950 dark:text-rose-300">
              {session.type} ({session.audienceRef})
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {session.subjectName} ({session.subjectCode})
          </h1>
          <p className="text-xs text-slate-500">
            Room {session.roomName} · Date: {session.date}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {session.status === 'OPEN' ? (
            <>
              <button
                onClick={() => setIsProjectorMode(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Projector Mode</span>
              </button>

              <button
                onClick={handleEndSession}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <StopCircle className="w-4 h-4" />
                <span>End Session</span>
              </button>
            </>
          ) : (
            <div className="text-xs font-bold text-slate-500">
              {data.canFacultyEdit ? 'Within 24-hr faculty correction window (BR-14)' : 'Locked: >24h elapsed (Admin override required)'}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Big Rotating QR Code (FR-QR-01, FR-QR-02, BR-10) */}
        {session.status === 'OPEN' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col items-center text-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Rotating Attendance QR
              </span>
              <button
                onClick={handleManualRotateQr}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                title="Force refresh token"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Circular Countdown Progress Ring */}
            <div className="relative">
              <div className="p-3 bg-white rounded-2xl border-4 border-spit-maroon-100 shadow-md">
                {qrDataUrl && <img src={qrDataUrl} alt="Session QR" className="w-56 h-56 object-contain" />}
              </div>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-spit-maroon-700 dark:text-rose-400">
                <Clock className="w-4 h-4" />
                <span>Refreshes in {countdown}s</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs">
              Students must scan using their browser camera. Invalidates automatically every 60s (BR-10).
            </p>
          </div>
        )}

        {/* Right Column: Live Roster with Socket Updates (UI-3, FR-QR-05) */}
        <div className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 ${session.status === 'OPEN' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-spit-maroon-700 dark:text-rose-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Live Attendance Roster (UI-3)
                </h2>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Lab roster shows exclusively <strong>Batch {session.audienceRef}</strong> students.
              </div>
            </div>

            {/* Live Counter (e.g. 3/5 present) */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <span className="text-emerald-600">{counts?.present} Present</span>
              <span>/</span>
              <span>{counts?.total} Total ({counts?.percentage}%)</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or UID..."
              className="w-full px-3 py-2 pl-9 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {/* Roster Table with Distinct Colors (UI-3) */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">UID</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Verification Details</th>
                  <th className="py-2.5 px-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {roster.map((st: any) => {
                  let badge = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                  if (st.status === 'PRESENT') badge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                  else if (st.status === 'ABSENT') badge = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                  else if (st.status === 'EXCUSED') badge = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';

                  return (
                    <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold">{st.rollNumber}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {st.name}
                      </td>
                      <td className="py-3 px-3">{st.batch}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${badge}`}>
                          {st.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {st.status === 'PRESENT' && st.method === 'QR_VERIFIED' ? (
                          <span>
                            {st.gpsDistanceM ? `${st.gpsDistanceM}m GPS` : ''} · {st.faceScore ? `${st.faceScore}% Face` : ''}
                          </span>
                        ) : st.manualReason ? (
                          <span className="italic">Manual: {st.manualReason}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {data.canFacultyEdit && (
                          <button
                            onClick={() => handleOpenManualModal(st)}
                            className="p-1 rounded-lg text-slate-500 hover:text-spit-maroon-700 hover:bg-slate-100"
                            title="Manual override"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Projector Full-Screen Mode Modal */}
      {isProjectorMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 space-y-6 text-white animate-in zoom-in-95">
          <button
            onClick={() => setIsProjectorMode(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500 text-white">
              Projector Mode · Scan Screen QR
            </span>
            <h2 className="text-3xl font-black">{session.subjectName} ({session.subjectCode})</h2>
            <p className="text-sm text-slate-400">
              Room {session.roomName} · Audience: {session.audienceRef}
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl shadow-2xl border-8 border-rose-600">
            {qrDataUrl && <img src={qrDataUrl} alt="Projector QR" className="w-80 h-80 object-contain" />}
          </div>

          <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>Rotating in {countdown} seconds</span>
          </div>

          <div className="text-base font-bold bg-white/10 px-6 py-2 rounded-2xl">
            {counts?.present} of {counts?.total} Students Marked Present ({counts?.percentage}%)
          </div>
        </div>
      )}

      {/* Manual Override Modal (FR-MAN-01..03, BR-14) */}
      {manualModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-spit-maroon-700" />
                <span>Manual Attendance Override</span>
              </h3>
              <button onClick={() => setManualModalStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs space-y-1">
              <div className="font-bold">{manualModalStudent.name}</div>
              <div className="text-slate-500">UID: {manualModalStudent.rollNumber} · Batch: {manualModalStudent.batch}</div>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {manualError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attendance Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRESENT', 'ABSENT', 'EXCUSED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setManualStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        manualStatus === st
                          ? 'bg-spit-maroon-700 text-white border-spit-maroon-700 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Override Reason (FR-MAN-02)
                </label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Verified physical presence, camera failed..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalStudent(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitManualMark}
                  disabled={manualSubmitting}
                  className="flex-1 py-2 rounded-xl bg-spit-maroon-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {manualSubmitting ? 'Saving...' : 'Apply Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
