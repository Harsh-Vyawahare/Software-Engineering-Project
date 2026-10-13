import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader.js';
import { Sidebar } from './Sidebar.js';
import { MobileNavbar } from './MobileNavbar.js';
export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <AppHeader />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <MobileNavbar />
    </div>
  );
};
