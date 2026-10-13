import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { FileSpreadsheet, Download, Printer, Filter, Calendar, Users } from 'lucide-react';
import spitLogo from '../../assets/spit-logo.png';

export const FacultyReportsPage: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [startDate, setStartDate] = useState('2026-08-10');
  const [endDate, setEndDate] = useState('2026-10-12');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load available sections for dropdown
    apiRequest('/admin/classrooms') // general check or faculty dashboard
      .then(() => {
        return apiRequest('/faculty/dashboard');
      })
      .then((dash) => {
        const secs = dash.allAssignedSections || [];
        setSections(secs);
        if (secs.length > 0) setSelectedSectionId(secs[0].id);
      })
      .catch(() => {
        // Fallback for admin
        apiRequest('/student/timetable').then((t) => {
          setSections(t.timetable || []);
          if (t.timetable?.length > 0) setSelectedSectionId(t.timetable[0].id);
        }).catch(() => {});
      });
  }, []);

  const fetchReport = async () => {
    if (!selectedSectionId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/reports/data?courseSectionId=${selectedSectionId}&startDate=${startDate}&endDate=${endDate}`
      );
      setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSectionId) {
      fetchReport();
    }
  }, [selectedSectionId, startDate, endDate]);

  const handleDownloadCsv = () => {
    window.open(
      `/api/reports/csv?courseSectionId=${selectedSectionId}&startDate=${startDate}&endDate=${endDate}`,
      '_blank'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Printable Report Header (visible during print) */}
      <div className="hidden print:flex items-center gap-4 pb-4 border-b-2 border-spit-maroon-700 mb-6">
        <img src={spitLogo} alt="SPIT" className="w-16 h-16 object-contain" />
        <div>
          <h1 className="text-xl font-black text-slate-900">Sardar Patel Institute of Technology</h1>
          <p className="text-xs text-slate-600">Munshi Nagar, Andheri (West), Mumbai 400058 · Autonomous Institute</p>
          <p className="text-xs font-bold text-spit-maroon-700">Official Academic Attendance Record — Release 2.0</p>
        </div>
      </div>

      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
            <span>Attendance Reports & Exports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate component attendance sheets with CSV export (FR-REP-02) and printable PDF view.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={!reportData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (hidden during print) */}
      <div className="print:hidden p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-xs">
        <div className="flex-1 w-full sm:w-auto">
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Course Section / Batch
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium"
          >
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.subjectName} ({sec.type}) — {sec.audienceRef} ({sec.dayOfWeek} {sec.startTime})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      {/* Report Sheet */}
      {loading ? (
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
      ) : reportData ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <div className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                {reportData.section.subjectName} ({reportData.section.subjectCode})
              </div>
              <div className="text-slate-500">
                {reportData.section.type} · Audience: <strong>{reportData.section.audienceRef}</strong> · Faculty: {reportData.section.facultyName}
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                Total Sessions Conducted: {reportData.totalSessions}
              </div>
              <div className="text-slate-400">Date Range: {startDate} to {endDate}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3 text-center">Present</th>
                  <th className="py-2.5 px-3 text-center">Absent</th>
                  <th className="py-2.5 px-3 text-center">Excused</th>
                  <th className="py-2.5 px-3 text-center">Attendance %</th>
                  <th className="py-2.5 px-3 rounded-r-xl text-center">Eligibility (BR-1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData.students?.map((st: any) => (
                  <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold">{st.rollNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{st.name}</td>
                    <td className="py-3 px-3">{st.batch}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{st.present}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{st.absent}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-600">{st.excused}</td>
                    <td className="py-3 px-3 text-center font-black text-sm">
                      <span className={st.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'}>
                        {st.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          st.isEligible
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {st.isEligible ? 'Eligible' : 'Debarred (<75%)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature Block for Print */}
          <div className="hidden print:flex justify-between pt-16 text-xs font-bold text-slate-700">
            <div>Course Faculty Signature</div>
            <div>Head of Department (HOD)</div>
            <div>Controller of Examinations</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
