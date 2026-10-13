import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { FileText, CheckCircle2, XCircle, Clock, AlertCircle, X } from 'lucide-react';

export const FacultyLeaveInboxPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalItem, setReviewModalItem] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const res = await apiRequest('/faculty/leave-inbox');
      setItems(res.leaveItems || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenReview = (item: any, action: 'APPROVED' | 'REJECTED') => {
    setReviewModalItem(item);
    setReviewAction(action);
    setReviewComment('');
    setErrorMsg(null);
  };

  const handleSubmitReview = async () => {
    if (reviewAction === 'REJECTED' && (!reviewComment || reviewComment.trim().length === 0)) {
      setErrorMsg('A comment explaining the rejection is mandatory (FR-LV-03).');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await apiRequest(`/faculty/leave-inbox/${reviewModalItem.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: reviewAction,
          comment: reviewComment,
        }),
      });
      setReviewModalItem(null);
      fetchItems();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  const pendingItems = items.filter((i) => i.status === 'PENDING');
  const reviewedItems = items.filter((i) => i.status !== 'PENDING');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>Faculty Leave Request Inbox</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review absence requests for sessions you teach. Approving auto-marks sessions as Excused and dispatches email within 60s (CI-2).
        </p>
      </div>

      {/* Pending Items */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Pending Student Requests ({pendingItems.length})</span>
        </h2>

        {pendingItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No pending leave requests requiring your review.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => {
              const req = item.leaveRequest;
              const student = req.student;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {student.user.name} ({student.rollNumber}) · Batch {student.batch.name}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Requested for: <strong>{item.courseSection.subject.name} ({item.courseSection.type})</strong> on <strong>{item.sessionDate}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReview(item, 'APPROVED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleOpenReview(item, 'REJECTED')}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    "{req.reason}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviewed Items History */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Reviewed Requests History ({reviewedItems.length})
        </h2>

        {reviewedItems.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No reviewed requests yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reviewedItems.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold">
                    {item.leaveRequest.student.user.name} ({item.leaveRequest.student.rollNumber})
                  </div>
                  <div className="text-slate-500">
                    {item.courseSection.subject.name} · {item.sessionDate}
                    {item.comment && <span> · Remarks: {item.comment}</span>}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {reviewAction === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button onClick={() => setReviewModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs space-y-1">
              <div className="font-bold">{reviewModalItem.leaveRequest.student.user.name}</div>
              <div className="text-slate-500">
                {reviewModalItem.courseSection.subject.name} on {reviewModalItem.sessionDate}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Faculty Remarks {reviewAction === 'REJECTED' ? '(Mandatory FR-LV-03)' : '(Optional)'}
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={reviewAction === 'REJECTED' ? 'Please state reason for rejection...' : 'Optional approval remarks...'}
                rows={3}
                required={reviewAction === 'REJECTED'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submitting}
                className={`flex-1 py-2 rounded-xl text-white text-xs font-bold shadow-md disabled:opacity-50 ${
                  reviewAction === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Submitting...' : `Confirm ${reviewAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
