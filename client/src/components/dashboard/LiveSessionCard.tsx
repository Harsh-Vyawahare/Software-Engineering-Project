import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, CheckCircle, Clock, MapPin, User, ArrowRight, Sparkles } from 'lucide-react';

interface LiveSessionCardProps {
  liveSession: any;
  nextScheduled: any;
}

export const LiveSessionCard: React.FC<LiveSessionCardProps> = ({
  liveSession,
  nextScheduled,
}) => {
  if (liveSession) {
    const isMarked = liveSession.status === 'PRESENT' || liveSession.isMarked;

    return (
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-spit-maroon-700 via-rose-800 to-spit-maroon-900 text-white shadow-xl">
        {/* Background glow ornament */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/80 text-white uppercase tracking-wider backdrop-blur-md animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                Live Attendance Active
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                {liveSession.type === 'LAB' ? `Lab (${liveSession.audienceRef})` : 'Lecture (Division D)'}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight">{liveSession.subjectName}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-rose-100/90 mt-1.5">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {liveSession.facultyName}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Room {liveSession.classroomName || liveSession.roomName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {liveSession.startTime} - {liveSession.endTime}
                </span>
              </div>
            </div>
          </div>

          <div>
            {isMarked ? (
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/90 text-white font-bold text-sm shadow-md backdrop-blur-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Marked Present</span>
              </div>
            ) : (
              <Link
                to="/student/mark"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <span>Mark Attendance</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If nothing is currently live -> show next scheduled session
  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Next Scheduled Session</span>
        </div>
        {nextScheduled ? (
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {nextScheduled.subjectName}{' '}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {nextScheduled.type}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {nextScheduled.facultyName} · Room {nextScheduled.classroomName} · {nextScheduled.startTime}
            </p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No further sessions scheduled for today. Enjoy your day!
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/student/timetable"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
        >
          View Full Week Timetable
        </Link>
      </div>
    </div>
  );
};
