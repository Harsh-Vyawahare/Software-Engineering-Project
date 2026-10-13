import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { Users, Mail, BookOpen } from 'lucide-react';

export const AdminFacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/admin/faculty')
      .then((res) => setFaculty(res.faculty || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>Faculty Directory & Teaching Allocations</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Sardar Patel Institute of Technology · Department of Computer Engineering
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {faculty.map((f) => (
          <div
            key={f.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {f.employeeId}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {f.courseSections?.length || 0} Sections
              </span>
            </div>

            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{f.user.name}</h2>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" />
                <span>{f.user.email}</span>
              </div>
            </div>

            {/* Courses taught */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Sections:</div>
              <div className="flex flex-wrap gap-1">
                {f.courseSections?.map((sec: any) => (
                  <span
                    key={sec.id}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {sec.subject.code} ({sec.type})
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
