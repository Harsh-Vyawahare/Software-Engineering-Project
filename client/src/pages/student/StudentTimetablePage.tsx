import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { Calendar, Clock, MapPin, User } from 'lucide-react';

export const StudentTimetablePage: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/student/timetable')
      .then((res) => setSections(res.timetable || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>Personalized Weekly Timetable</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Academic Year 2026-27 ODD Semester · Showing your enrolled division lectures and batch labs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {days.map((day) => {
          const daySections = sections
            .filter((s) => s.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div
              key={day}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800 font-extrabold text-xs text-spit-maroon-700 dark:text-rose-400 uppercase tracking-wider text-center">
                {day}
              </div>

              {daySections.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-slate-400">No sessions scheduled</div>
              ) : (
                <div className="space-y-2.5">
                  {daySections.map((sec) => (
                    <div
                      key={sec.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold">{sec.startTime} - {sec.endTime}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-extrabold text-white"
                          style={{ backgroundColor: sec.subject.color }}
                        >
                          {sec.type}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {sec.subject.name}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Room {sec.classroom.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{sec.faculty.user.name.split(' ').pop()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Non-attendance slots footnote (Section 4.7) */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/40 text-slate-500 text-xs space-y-1">
        <div className="font-bold text-slate-700 dark:text-slate-300">Non-Attendance Institutional Slots:</div>
        <div>
          • Short Break (11:00–11:15 AM) · Long Break (12:15–1:15 PM) · Thursday Student Activity Slot (5:15–6:15 PM) · Friday Faculty Quality Circle Slot (3:15–5:15 PM) are non-attendance and excluded from statistics.
        </div>
      </div>
    </div>
  );
};
