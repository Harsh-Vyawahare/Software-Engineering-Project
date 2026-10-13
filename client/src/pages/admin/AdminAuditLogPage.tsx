import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { ClipboardList, Search, ShieldCheck, Filter } from 'lucide-react';

export const AdminAuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      let url = '/admin/audit-logs?limit=150';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`;
      const res = await apiRequest(url);
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>System Audit Trail & Security Logs (SEC-05, FR-ADM-04)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable cryptographic log of authentication events, biometric updates, and administrative overrides.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Search & Filter */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by actor name, action, or details..."
              className="w-full px-3 py-2 pl-9 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium"
          >
            <option value="">All Actions</option>
            <option value="AUTH_SUCCESS_LOGIN">AUTH_SUCCESS_LOGIN</option>
            <option value="AUTH_FAILED_LOGIN">AUTH_FAILED_LOGIN</option>
            <option value="ATTENDANCE_OVERRIDE">ATTENDANCE_OVERRIDE</option>
            <option value="CLASSROOM_GPS_UPDATE">CLASSROOM_GPS_UPDATE</option>
            <option value="SETTINGS_UPDATE">SETTINGS_UPDATE</option>
            <option value="ADMIN_CREATE_STUDENT">ADMIN_CREATE_STUDENT</option>
            <option value="USER_STATUS_CHANGE">USER_STATUS_CHANGE</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-spit-maroon-700 hover:bg-spit-maroon-800 text-white font-bold text-xs"
          >
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l-xl">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action Event</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3 rounded-r-xl">Details & Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                    {log.actorName || 'System'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3">{log.targetType}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{log.ipAddress || '—'}</td>
                  <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate" title={log.details}>
                    {log.details || '—'}
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
