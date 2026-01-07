
import React, { useState, useEffect, useRef, useMemo } from 'react';
// Added UserRole and other missing type imports to satisfy component scope
import { User, UserRole, SystemRules, Project, AuditLog, Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark, DailyDispatch, WeeklySchedule, GlobalTeamConfigs } from './types';
import { HomeIcon, UserIcon, LogOutIcon, ShieldIcon, MenuIcon, XIcon, ChevronRightIcon, WrenchIcon, UploadIcon, LoaderIcon, ClipboardListIcon, LayoutGridIcon, BoxIcon, DownloadIcon, FileTextIcon, CheckCircleIcon, AlertIcon, XCircleIcon, UsersIcon, TruckIcon, BriefcaseIcon, ArrowLeftIcon, CalendarIcon, ClockIcon, NavigationIcon, SaveIcon, ExternalLinkIcon, RefreshIcon, PenToolIcon, StampIcon } from './components/Icons';
import LoginScreen from './components/LoginScreen';

// Fix: Export generateId to resolve "no exported member" errors in LoginScreen.tsx, ProjectMaterials.tsx, PurchasingManagement.tsx, and PurchaseOrders.tsx
export const generateId = () => crypto.randomUUID();

const LOGO_URL = 'https://1971risingsun-ui.github.io/Hejiaxing-internal-control-system/logo.png';

const App: React.FC = () => {
  // Fix: Define missing state variables used in renderSidebarContent and throughout the app
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirPermission, setDirPermission] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  const [systemRules, setSystemRules] = useState<SystemRules>({
    productionKeywords: [],
    subcontractorKeywords: [],
    modularProductionKeywords: [],
    modularSubcontractorKeywords: [],
    materialFormulas: [],
    rolePermissions: {
      [UserRole.ADMIN]: { displayName: '管理員', allowedViews: ['engineering', 'engineering_hub', 'purchasing_hub', 'hr', 'production', 'equipment', 'report', 'users'] },
      [UserRole.MANAGER]: { displayName: '專案經理', allowedViews: ['engineering', 'engineering_hub', 'purchasing_hub', 'production', 'equipment', 'report'] },
      [UserRole.ENGINEERING]: { displayName: '工務人員', allowedViews: ['engineering', 'report'] },
      [UserRole.FACTORY]: { displayName: '廠務人員', allowedViews: ['production', 'equipment'] },
      [UserRole.WORKER]: { displayName: '現場人員', allowedViews: ['report'] }
    }
  });

  const renderSidebarContent = () => {
    // Fix: Added safety check for currentUser
    if (!currentUser) return null;

    // Fix: Variables like dirHandle and dirPermission are now accessed from component scope
    const isConnected = dirHandle && dirPermission === 'granted';
    const isBrowserSupported = 'showDirectoryPicker' in window;
    const perms = systemRules.rolePermissions?.[currentUser.role];
    const roleName = perms?.displayName || (currentUser.role === UserRole.ADMIN ? '管理員' : currentUser.role === UserRole.MANAGER ? '專案經理' : '現場人員');

    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="flex flex-col items-center justify-center w-full px-2 py-8 mb-2">
           <div className="w-20 h-20 mb-4 rounded-full bg-white p-0.5 shadow-lg border border-slate-700">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain rounded-full" />
           </div>
           <h1 className="text-base font-black text-white tracking-[0.15em] border-b-2 border-yellow-500 pb-1">
             合家興實業
           </h1>
           <div className="mt-2 text-[9px] font-black bg-blue-600 px-3 py-0.5 rounded-full text-white uppercase tracking-widest">{roleName}</div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
           {/* Sidebar navigation links would be mapped here */}
        </nav>
      </div>
    );
  };

  // Fix: Show login screen if no user is authenticated
  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className="w-64 bg-slate-900 flex-shrink-0 hidden md:block">
        {renderSidebarContent()}
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="md:hidden">
            <MenuIcon className="w-6 h-6 text-slate-600" />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {/* Fix: Access currentUser.name from state */}
            <div className="text-sm font-bold text-slate-700 hidden sm:block">{currentUser.name}</div>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                <img src={currentUser.avatar || LOGO_URL} alt="User" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-2xl font-bold text-slate-800">歡迎進入系統</h2>
          <p className="text-slate-500 mt-2">請點選左側選單以開始作業，目前的權限為：{currentUser.role}</p>
        </div>
      </main>
    </div>
  );
};

// Fix: Added default export to resolve error in index.tsx
export default App;
