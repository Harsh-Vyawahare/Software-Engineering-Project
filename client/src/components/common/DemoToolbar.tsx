import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { Play, RotateCcw, Mail, MapPin, Calendar, Clock, Sparkles, X, CheckCircle, AlertTriangle } from 'lucide-react';

export const DemoToolbar: React.FC = () => {
  return null;
};

const _unusedDemoToolbar: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await apiRequest('/admin/settings');
      setSettings(res.settings);
    } catch {
      // not admin or error
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, val: any) => {
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: val }),
      });
      fetchSettings();
      setMsg(`Updated ${key}`);
      setTimeout(() => setMsg(null), 2500);
    } catch (err: any) {
      setMsg(err.message);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleSimulateCheckin = async () => {
    try {
      // Find active open session
      const dash = await apiRequest('/admin/dashboard');
      const liveSessions = dash.liveSessions;
      if (!liveSessions || liveSessions.length === 0) {
        setMsg('No live session currently open! Start an attendance session first.');
        setTimeout(() => setMsg(null), 3000);
        return;
      }
      const sessionId = liveSessions[0].id;
      const res = await apiRequest('/dev/simulate-checkin', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      setMsg(res.message);
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(err.message);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all demo attendance data to initial seed?')) return;
    try {
      const res = await apiRequest('/admin/reset-demo-data', { method: 'POST' });
      alert(res.message);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openMailbox = async () => {
    try {
      const res = await apiRequest('/dev/emails');
      setEmails(res.emails || []);
      setIsMailboxOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      {/* Floating Demo Trigger Pill */}
      <div className="fixed top-2 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-spit-gold-600 to-amber-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Demo Controls</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
        </button>

        <button
          onClick={openMailbox}
          title="View Dev Outgoing Emails"
          className="p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow hover:bg-slate-100 transition-all"
        >
          <Mail className="w-4 h-4 text-spit-maroon-700 dark:text-amber-400" />
        </button>
      </div>

      {/* Expanded Demo Controls Drawer */}
      {isOpen && (
        <div className="fixed top-12 right-4 z-50 w-80 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/40 text-xs text-slate-800 dark:text-slate-200 space-y-3 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>SPIT Attend Demo Console</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {msg && (
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px]">
              {msg}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-spit-maroon-600" />
                Mock GPS Inside Campus
              </span>
              <input
                type="checkbox"
                checked={settings?.demoMockGps ?? false}
                onChange={(e) => updateSetting('demoMockGps', e.target.checked)}
                className="w-4 h-4 accent-spit-maroon-700 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-500">Bypasses GPS geofence checks for off-campus testing.</p>

            <div className="flex items-center justify-between pt-1">
              <span className="font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Simulated Date
              </span>
              <input
                type="date"
                value={settings?.demoSimulatedDate || '2026-10-12'}
                onChange={(e) => updateSetting('demoSimulatedDate', e.target.value)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Simulated Time
              </span>
              <input
                type="time"
                value={settings?.demoSimulatedTime || '11:15'}
                onChange={(e) => updateSetting('demoSimulatedTime', e.target.value)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={handleSimulateCheckin}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Simulate Student Check-in
            </button>
            <p className="text-[10px] text-slate-500 text-center">Pushes real-time websocket check-in to open session</p>

            <button
              onClick={handleResetData}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Data to Seed
            </button>
          </div>
        </div>
      )}

      {/* Dev Mailbox Modal */}
      {isMailboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-spit-maroon-700" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">In-App Dev Mailbox (CI-2 / TBD-04)</h3>
              </div>
              <button onClick={() => setIsMailboxOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {emails.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Mail className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p>No emails dispatched yet.</p>
                  <p className="text-xs text-slate-500">Submit a leave request or password reset to see emails here.</p>
                </div>
              ) : (
                emails.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{m.subject}</span>
                        <div className="text-[11px] text-slate-500">To: {m.to}</div>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(m.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <div
                      className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      dangerouslySetInnerHTML={{ __html: m.html }}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsMailboxOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-spit-maroon-700 text-white text-xs font-semibold hover:bg-spit-maroon-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
