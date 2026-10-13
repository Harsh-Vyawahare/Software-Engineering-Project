import React from 'react';

interface AttendanceRingProps {
  percentage: number;
  attended: number;
  conducted: number;
  excused?: number;
  bunkOMeter?: {
    canBunk: number;
    neededToTarget: number;
  };
}

export const AttendanceRing: React.FC<AttendanceRingProps> = ({
  percentage,
  attended,
  conducted,
  excused = 0,
  bunkOMeter,
}) => {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  let colorClass = 'text-emerald-500 stroke-emerald-500';
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
  let statusText = 'Eligible for End-Sem Exam (≥75%)';

  if (percentage < 70) {
    colorClass = 'text-rose-500 stroke-rose-500';
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
    statusText = 'Critical: Below 70% (At Risk of Debarment)';
  } else if (percentage < 75) {
    colorClass = 'text-amber-500 stroke-amber-500';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    statusText = 'Warning: Borderline Attendance (<75%)';
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* SVG Circular Gauge */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          {/* Background Track */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            className="text-slate-100 dark:text-slate-800"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress Ring */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
            strokeLinecap="round"
            className={colorClass}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {percentage}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Overall
          </span>
        </div>
      </div>

      {/* Details & Insight */}
      <div className="flex-1 space-y-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
            Overall Semester Attendance
          </span>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>
            {statusText}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Attended <strong>{attended}</strong> out of <strong>{conducted}</strong> conducted sessions
          {excused > 0 && <span> ({excused} approved excused sessions excluded)</span>}.
        </p>

        {/* Smart Bunk-o-meter Insight Line */}
        {bunkOMeter && (
          <div className="pt-2">
            {percentage >= 75 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <span>🎯 Bunk-o-meter:</span>
                <span>
                  You can safely miss <strong>{bunkOMeter.canBunk}</strong> more lecture{bunkOMeter.canBunk === 1 ? '' : 's'} while staying above 75%.
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-800 dark:text-rose-300">
                <span>⚠️ Bunk-o-meter:</span>
                <span>
                  You must attend the next <strong>{bunkOMeter.neededToTarget}</strong> consecutive lectures to recover to 75%.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
