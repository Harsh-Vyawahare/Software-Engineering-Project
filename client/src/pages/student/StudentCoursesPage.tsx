import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { BookOpen, ChevronRight, AlertCircle, ArrowUpRight } from 'lucide-react';

export const StudentCoursesPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/student/dashboard')
      .then((res) => setSummary(res.summary))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>My Enrolled Courses</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Detailed component-wise attendance, chronological session logs, and bunk calculators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary?.subjects?.map((sub: any) => (
          <Link
            key={sub.subjectId}
            to={`/student/courses/${sub.subjectId}`}
            className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-spit-maroon-400 dark:hover:border-rose-500/50 transition-all space-y-4 block"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                  <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-spit-maroon-700 dark:group-hover:text-rose-400 transition-colors">
                    {sub.subjectName}
                  </h2>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Code: <strong>{sub.subjectCode}</strong>
                  {sub.facultyNames.theory && <span> · Theory: {sub.facultyNames.theory}</span>}
                  {sub.facultyNames.lab && <span> · Lab: {sub.facultyNames.lab}</span>}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className={`text-2xl font-black ${sub.combined.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {sub.combined.percentage}%
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Combined</div>
              </div>
            </div>

            {/* Component breakdown */}
            <div className="space-y-2 pt-1 text-xs">
              {sub.theory && (
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Theory Sessions</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sub.theory.percentage}% ({sub.theory.attended}/{sub.theory.conducted})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, sub.theory.percentage)}%` }}
                    />
                  </div>
                </div>
              )}

              {sub.lab && (
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Lab Sessions</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sub.lab.percentage}% ({sub.lab.attended}/{sub.lab.conducted})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, sub.lab.percentage)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-spit-maroon-700 dark:text-rose-400">
              <span>View History & Bunk-o-meter</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
