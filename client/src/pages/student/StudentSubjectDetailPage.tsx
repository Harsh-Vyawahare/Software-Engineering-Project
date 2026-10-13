import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Calculator,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const StudentSubjectDetailPage: React.FC = () => {
  const { subjectId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Bunk-o-meter simulator state
  const [simMissLectures, setSimMissLectures] = useState(1);

  useEffect(() => {
    if (subjectId) {
      apiRequest(`/student/history/subject/${subjectId}`)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [subjectId]);

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  const subject = data?.subject;
  const records = data?.records || [];

  const totalConducted = records.length;
  const totalAttended = records.filter((r: any) => r.status === 'PRESENT').length;
  const totalExcused = records.filter((r: any) => r.status === 'EXCUSED').length;
  const currentPct = totalConducted - totalExcused > 0
    ? Math.round((totalAttended / (totalConducted - totalExcused)) * 1000) / 10
    : 100;

  // Simulator calculation
  const simNewConducted = totalConducted - totalExcused + simMissLectures;
  const simNewPct = simNewConducted > 0
    ? Math.round((totalAttended / simNewConducted) * 1000) / 10
    : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/student/courses"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: subject?.color }} />
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {subject?.name}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Subject Code: <strong>{subject?.code}</strong> · Total conducted sessions: {totalConducted}
          </p>
        </div>

        <div className="text-right">
          <div className={`text-3xl font-black ${currentPct < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {currentPct}%
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase">
            {totalAttended} / {totalConducted - totalExcused} Sessions
          </div>
        </div>
      </div>

      {/* Bunk-o-meter Interactive Simulator Card (Section 9.1) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/40 space-y-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
          <Calculator className="w-4 h-4" />
          <span>Interactive Bunk-o-meter & Planner</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              What if I skip the next{' '}
              <span className="font-extrabold text-amber-700 dark:text-amber-400 text-sm">
                {simMissLectures}
              </span>{' '}
              lecture(s)?
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={simMissLectures}
              onChange={(e) => setSimMissLectures(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 session</span>
              <span>5 sessions</span>
              <span>10 sessions</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shrink-0 min-w-[160px]">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Projected %</div>
            <div className={`text-2xl font-black ${simNewPct < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {simNewPct}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {simNewPct >= 75 ? '✅ Still above 75%' : '⚠️ Drops below 75%!'}
            </div>
          </div>
        </div>
      </div>

      {/* Chronological History Table (FR-PCT-04) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-spit-maroon-700 dark:text-rose-400" />
            <span>Chronological Attendance History (FR-PCT-04)</span>
          </h2>
          <span className="text-xs text-slate-500">{records.length} records logged</span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No attendance records found yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Faculty / Room</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 rounded-r-xl">Verification Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((rec: any) => {
                  let badge = 'bg-slate-100 text-slate-700';
                  if (rec.status === 'PRESENT') badge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                  else if (rec.status === 'ABSENT') badge = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                  else if (rec.status === 'EXCUSED') badge = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold">{rec.date}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                          {rec.type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div>{rec.facultyName}</div>
                        <div className="text-[10px] text-slate-400">Room {rec.roomName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${badge}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {rec.method === 'QR_VERIFIED' ? 'QR + GPS + Face' : 'Manual Faculty'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {rec.method === 'QR_VERIFIED' ? (
                          <span>
                            {rec.gpsDistanceM ? `${rec.gpsDistanceM}m GPS` : ''}
                            {rec.faceScore ? ` · ${rec.faceScore}% Face` : ''}
                          </span>
                        ) : (
                          <span className="italic">{rec.manualReason || 'Marked by faculty'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
