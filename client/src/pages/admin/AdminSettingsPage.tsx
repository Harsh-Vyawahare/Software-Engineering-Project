import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { Settings, Save, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await apiRequest('/admin/settings');
      setSettings(res.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setMsg('System settings updated successfully (FR-ADM-03)!');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset all demo attendance data to initial seed?')) return;
    try {
      const res = await apiRequest('/admin/reset-demo-data', { method: 'POST' });
      alert(res.message);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
            <span>Institutional Settings & Safe Bounds (FR-ADM-03)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure biometric thresholds, geofence radius, and attendance rules.
          </p>
        </div>

        <button
          onClick={handleResetDemoData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold text-xs shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Verification Parameters */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-spit-maroon-700 dark:text-rose-400">
            Attendance Verification Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1">
                Minimum Attendance Eligibility Threshold (BR-1)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="95"
                  value={settings?.minAttendanceThreshold ?? 75.0}
                  onChange={(e) => setSettings({ ...settings, minAttendanceThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Default 75.0%. Below this triggers debarment warning.</p>
            </div>

            <div>
              <label className="block font-bold mb-1">
                Rotating QR Code Validity Duration (BR-10)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="300"
                  value={settings?.qrValiditySeconds ?? 60}
                  onChange={(e) => setSettings({ ...settings, qrValiditySeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                />
                <span className="font-bold text-slate-500">sec</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Default 60 seconds before cryptographic token rotates.</p>
            </div>

            <div>
              <label className="block font-bold mb-1">
                GPS Geofence Allowed Radius (BR-11)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={settings?.gpsRadiusMeters ?? 100.0}
                  onChange={(e) => setSettings({ ...settings, gpsRadiusMeters: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                />
                <span className="font-bold text-slate-500">meters</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Default 100 meters around classroom coordinates.</p>
            </div>

            <div>
              <label className="block font-bold mb-1">
                Face Verification Similarity Threshold (BR-12)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="50"
                  max="99"
                  value={settings?.faceMatchThreshold ?? 80.0}
                  onChange={(e) => setSettings({ ...settings, faceMatchThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Default 80.0% descriptor similarity required to pass.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold">Exclude Excused Leaves from Denominator</div>
              <p className="text-[11px] text-slate-500">Approved medical leaves do not penalize student percentages.</p>
            </div>
            <input
              type="checkbox"
              checked={settings?.excludeExcusedFromDenominator ?? true}
              onChange={(e) => setSettings({ ...settings, excludeExcusedFromDenominator: e.target.checked })}
              className="w-4 h-4 accent-spit-maroon-700"
            />
          </div>
        </div>

        {/* Demo Mode Configuration (Section 7) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Demo Mode Simulation Controls (Section 7)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between col-span-full pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-bold">Enable Demo / Simulation Mode</span>
                <p className="text-[11px] text-slate-500">Relaxes start window constraints for testing any timetable block.</p>
              </div>
              <input
                type="checkbox"
                checked={settings?.demoMode ?? false}
                onChange={(e) => setSettings({ ...settings, demoMode: e.target.checked })}
                className="w-4 h-4 accent-amber-600"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Simulated Date</label>
              <input
                type="date"
                value={settings?.demoSimulatedDate || '2026-10-12'}
                onChange={(e) => setSettings({ ...settings, demoSimulatedDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Simulated Time</label>
              <input
                type="time"
                value={settings?.demoSimulatedTime || '11:15'}
                onChange={(e) => setSettings({ ...settings, demoSimulatedTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-2xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Configuration (FR-ADM-03)'}</span>
        </button>
      </form>
    </div>
  );
};
