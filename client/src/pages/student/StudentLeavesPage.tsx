import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { FileText, Calendar, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react';

export const StudentLeavesPage: React.FC = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [previewSessions, setPreviewSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchLeaves = async () => {
    try {
      const res = await apiRequest('/student/leave/history');
      setLeaves(res.leaves || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Update preview whenever dates change
  useEffect(() => {
    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        setError('End date cannot be earlier than start date (FR-LV-02).');
        setPreviewSessions([]);
        return;
      }
      setError(null);
      apiRequest(`/student/leave/preview?startDate=${startDate}&endDate=${endDate}`)
        .then((res) => setPreviewSessions(res.affected || []))
        .catch((err) => setError(err.message));
    } else {
      setPreviewSessions([]);
    }
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/student/leave/apply', {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate, reason }),
      });
      setSuccess('Leave request submitted! It has been routed to the relevant faculty members.');
      setReason('');
      setStartDate('');
      setEndDate('');
      setPreviewSessions([]);
      fetchLeaves();
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (leaveId: string) => {
    if (!window.confirm('Withdraw this pending leave request?')) return;
    try {
      await apiRequest(`/student/leave/${leaveId}`, { method: 'DELETE' });
      fetchLeaves();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>Leave Requests & Approvals</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit absence requests with multi-faculty routing. Approved sessions are auto-marked as Excused.
        </p>
      </div>

      {/* Leave Application Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Plus className="w-4 h-4 text-spit-maroon-700" />
          <span>Apply for Excused Leave</span>
        </h2>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Absence
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Medical illness, participating in National Hackathon..."
              rows={2}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          {/* Live Affected Sessions Preview (Section 3) */}
          {previewSessions.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Live Preview: Affected Timetable Slots ({previewSessions.length} sessions)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {previewSessions.map((s, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="font-bold">{s.subjectName} ({s.type})</div>
                      <div className="text-[11px] text-slate-500">{s.date} · {s.slot}</div>
                    </div>
                    <div className="text-right text-[11px] text-spit-maroon-700 dark:text-rose-400 font-semibold">
                      {s.facultyName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-spit-maroon-700 hover:bg-spit-maroon-800 text-xs shadow-md disabled:opacity-50"
          >
            {submitting ? 'Submitting request...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>

      {/* Leave Request History */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-spit-maroon-700" />
          <span>My Leave Requests History</span>
        </h2>

        {leaves.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No leave requests submitted yet.</div>
        ) : (
          <div className="space-y-4">
            {leaves.map((lr) => {
              let parentBadge = 'bg-amber-100 text-amber-800';
              if (lr.status === 'APPROVED') parentBadge = 'bg-emerald-100 text-emerald-800';
              else if (lr.status === 'REJECTED') parentBadge = 'bg-rose-100 text-rose-800';
              else if (lr.status === 'PARTIALLY_APPROVED') parentBadge = 'bg-blue-100 text-blue-800';
              else if (lr.status === 'WITHDRAWN') parentBadge = 'bg-slate-100 text-slate-600';

              return (
                <div
                  key={lr.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {lr.startDate} to {lr.endDate}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${parentBadge}`}>
                          {lr.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Reason: {lr.reason}
                      </p>
                    </div>

                    {lr.status === 'PENDING' && (
                      <button
                        onClick={() => handleWithdraw(lr.id)}
                        className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold flex items-center gap-1"
                        title="Withdraw request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Withdraw</span>
                      </button>
                    )}
                  </div>

                  {/* Multi-faculty route items */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {lr.items?.map((item: any) => {
                      let itemBadge = 'bg-amber-100 text-amber-800';
                      if (item.status === 'APPROVED') itemBadge = 'bg-emerald-100 text-emerald-800';
                      else if (item.status === 'REJECTED') itemBadge = 'bg-rose-100 text-rose-800';

                      return (
                        <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-[11px]">{item.courseSection.subject.name}</div>
                            <div className="text-[10px] text-slate-500">{item.sessionDate} · {item.faculty.user.name}</div>
                            {item.comment && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5">Remarks: {item.comment}</div>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${itemBadge}`}>
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
