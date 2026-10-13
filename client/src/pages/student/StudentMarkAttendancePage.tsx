import React from 'react';
import { AttendanceStepper } from '../../components/attendance/AttendanceStepper.js';
import { QrCode } from 'lucide-react';

export const StudentMarkAttendancePage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
          <QrCode className="w-6 h-6 text-spit-maroon-700 dark:text-rose-400" />
          <span>Mark Classroom Attendance</span>
        </h1>
        <p className="text-xs text-slate-500">
          Complete the 3-step sequenced verification: Rotating QR → Campus GPS → Live Face Match
        </p>
      </div>

      <AttendanceStepper />
    </div>
  );
};
