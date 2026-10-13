import React, { useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { ShieldAlert, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminOverridesPage: React.FC = () => {
  const [recordId, setRecordId] = useState('');
  const [newStatus, setNewStatus] = useState<'PRESENT' | 'ABSENT' | 'EXCUSED'>('PRESENT');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordId || !justification) return;
    setLoading(true);
    setMsg(null);

    try {
      const res = await apiRequest('/admin/override-attendance', {
        method: 'POST',
        body: JSON.stringify({
          recordId: recordId.trim(),
          newStatus,
          justification: justification.trim(),
        }),
      });
      setMsg({ type: 'success', text: res.message });
      setRecordId('');
      setJustification('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Override failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>Administrative Attendance Override (FR-ADM-02)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Override locked records past the 24-hour faculty window (BR-14). Every action is permanently recorded in the audit log (FR-ADM-04).
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {msg && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleOverride} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Attendance Record ID
            </label>
            <input
              type="text"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              placeholder="e.g. paste Record UUID"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              New Override Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['PRESENT', 'ABSENT', 'EXCUSED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setNewStatus(st)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    newStatus === st
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
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mandatory Justification / Committee Resolution (FR-ADM-02)
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="State the committee or HOD approval reason for this override..."
              rows={3}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white font-bold text-xs shadow-md disabled:opacity-50"
          >
            {loading ? 'Submitting Override...' : 'Commit Administrative Override'}
          </button>
        </form>
      </div>
    </div>
  );
};
