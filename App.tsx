import React, { useState, useEffect, useRef, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Project, ProjectStatus, User, UserRole, MaterialStatus, AuditLog, ProjectType, Attachment, WeeklySchedule as WeeklyScheduleType, DailyDispatch as DailyDispatchType, GlobalTeamConfigs, Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark, Supplier, PurchaseOrder, SitePhoto, SystemRules, StockAlertItem, Tool, Asset, Vehicle, ConstructionItem, DailyReport, CompletionReport } from './types';
import EngineeringView from './components/EngineeringView';
import ProjectDetail from './components/ProjectDetail';
import UserManagement from './components/UserManagement';
import AddProjectModal from './components/AddProjectModal';
import EditProjectModal from './components/EditProjectModal';
import LoginScreen from './components/LoginScreen';
import GlobalWorkReport from './components/GlobalWorkReport';
import GlobalMaterials from './components/GlobalMaterials';
import WeeklySchedule from './components/WeeklySchedule';
import DailyDispatch from './components/DailyDispatch';
import EngineeringGroups from './components/EngineeringGroups';
import PurchasingManagement from './components/PurchasingManagement';
import DrivingTimeEstimator from './components/DrivingTimeEstimator';
import HRManagement from './components/HRManagement';
import PurchasingModule from './components/PurchasingModule';
import SupplierList from './components/SupplierList';
import PurchaseOrders from './components/PurchaseOrders';
import InboundDetails from './components/InboundDetails';
import GlobalProduction from './components/GlobalProduction';
import GlobalOutsourcing from './components/GlobalOutsourcing';
import GlobalPurchasingItems from './components/GlobalPurchasingItems';
import StockAlert from './components/StockAlert';
import EquipmentModule from './components/EquipmentModule';
import ToolManagement from './components/ToolManagement';
import AssetManagement from './components/AssetManagement';
import VehicleManagement from './components/VehicleManagement';
import { HomeIcon, UserIcon, LogOutIcon, ShieldIcon, MenuIcon, XIcon, ChevronRightIcon, WrenchIcon, UploadIcon, LoaderIcon, ClipboardListIcon, LayoutGridIcon, BoxIcon, DownloadIcon, FileTextIcon, CheckCircleIcon, AlertIcon, XCircleIcon, UsersIcon, TruckIcon, BriefcaseIcon, ArrowLeftIcon, CalendarIcon, ClockIcon, NavigationIcon, SaveIcon, ExternalLinkIcon, RefreshIcon, PenToolIcon, StampIcon } from './components/Icons';
import { getDirectoryHandle, saveDbToLocal, loadDbFromLocal, getHandleFromIdb, clearHandleFromIdb, saveAppStateToIdb, loadAppStateFromIdb, saveHandleToIdb } from './utils/fileSystem';
import { downloadBlob } from './utils/fileHelpers';
import { GoogleGenAI } from "@google/genai";

// 宣告 pdfjs 庫與工作執行緒路徑
declare const pdfjsLib: any;
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const LOGO_URL = './logo.png';

const DEFAULT_SYSTEM_RULES: SystemRules = {
  productionKeywords: ['防溢座', '施工大門', '小門', '巨'],
  subcontractorKeywords: ['怪手', '告示牌', '安衛貼紙', '美化帆布', '噪音管制看板', '監測告示牌', '寫字'],
  modularProductionKeywords: [],
  modularSubcontractorKeywords: [],
  rolePermissions: {
    [UserRole.ADMIN]: { 
      displayName: '管理員', 
      allowedViews: ['engineering', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'outsourcing', 'engineering_groups', 'purchasing_hub', 'purchasing_items', 'stock_alert', 'purchasing_suppliers', 'purchasing_subcontractors', 'purchasing_orders', 'purchasing_inbounds', 'hr', 'production', 'equipment', 'report', 'users'] 
    },
    [UserRole.MANAGER]: { 
      displayName: '專案經理', 
      allowedViews: ['engineering', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'outsourcing', 'purchasing_hub', 'purchasing_items', 'stock_alert', 'purchasing_suppliers', 'purchasing_subcontractors', 'purchasing_orders', 'purchasing_inbounds', 'hr', 'production', 'equipment', 'report'] 
    },
    [UserRole.ENGINEERING]: { 
      displayName: '工務人員', 
      allowedViews: ['engineering', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'report'] 
    },
    [UserRole.FACTORY]: { 
      displayName: '廠務人員', 
      allowedViews: ['engineering', 'production', 'equipment', 'equipment_tools', 'report'] 
    },
    [UserRole.WORKER]: { 
      displayName: '現場人員', 
      allowedViews: ['engineering', 'engineering_hub', 'daily_dispatch', 'report'] 
    },
    [UserRole.VIEWER]: { 
      displayName: '唯讀觀察員', 
      allowedViews: ['engineering', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'outsourcing', 'purchasing_hub', 'purchasing_items', 'stock_alert', 'purchasing_suppliers', 'purchasing_subcontractors', 'purchasing_orders', 'purchasing_inbounds', 'hr', 'production', 'equipment', 'report'] 
    }
  },
  materialFormulas: [
    {
      id: 'f-1',
      keyword: '甲種圍籬',
      category: '圍籬',
      items: [
        { id: 'fi-1', name: '立柱', formula: 'Math.ceil(baseQty / 2.4 + 1)', unit: '支' },
        { id: 'fi-2', name: '二橫', formula: 'Math.ceil((baseQty / 2.4 + 1) * 2)', unit: '支' },
        { id: 'fi-3', name: '三橫', formula: 'Math.ceil((baseQty / 2.4 + 1) * 3)', unit: '支' },
        { id: 'fi-4', name: '斜撐', formula: 'Math.ceil(baseQty / 2.4 + 1)', unit: '支' },
        { id: 'fi-5', name: '圍籬板', formula: 'Math.ceil(baseQty / 0.75)', unit: '片' },
        { id: 'fi-6', name: '2.4m圍籬板', formula: 'Math.ceil(baseQty / 0.95)', unit: '片' },
      ]
    },
    {
      id: 'f-2',
      keyword: '防溢座',
      category: '防溢座',
      items: [
        { id: 'fi-7', name: '單模', formula: 'Math.ceil(baseQty / 1.5)', unit: '片' },
        { id: 'fi-8', name: '雙模', formula: 'Math.ceil((baseQty / 1.5) * 2)', unit: '片' },
        { id: 'fi-9', name: '假模', formula: 'Math.ceil(baseQty / 2.4)', unit: '片' },
      ]
    },
    {
      id: 'f-3',
      keyword: '轉角',
      category: '轉角',
      items: [
        { id: 'fi-10', name: '透明板', formula: 'Math.ceil(baseQty / 0.75)', unit: '片' },
      ]
    },
    {
      id: 'f-4',
      keyword: '安全走廊',
      category: '安全走廊',
      items: [
        { id: 'fi-11', name: '骨料', formula: 'Math.ceil(baseQty / 2.4 + 1)', unit: '組' },
        { id: 'fi-12', name: '安走板', formula: 'Math.ceil(baseQty / 0.75)', unit: '片' },
      ]
    }
  ],
  importConfig: {
    projectKeywords: { maintenance: '維修', modular: '組合屋' },
    recordKeywords: { recordTitle: '施工紀錄', reportTitle: '施工報告' },
    completionKeywords: { dismantle: '拆' },
    planningKeywords: {
      headerRow: 8,
      subCatFence: '安全圍籬及休息區',
      subCatModularStruct: '主結構租賃',
      subCatModularReno: '裝修工程',
      subCatModularOther: '其他工程',
      subCatModularDismantle: '拆除工程'
    }
  }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([
    { id: 'u-1', name: 'Admin User', email: 'admin@hejiaxing.ai', role: UserRole.ADMIN, avatar: LOGO_URL },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleType[]>([]);
  const [dailyDispatches, setDailyDispatches] = useState<DailyDispatchType[]>([]);
  const [globalTeamConfigs, setGlobalTeamConfigs] = useState<GlobalTeamConfigs>({});
  const [systemRules, setSystemRules] = useState<SystemRules>(DEFAULT_SYSTEM_RULES);
  const [stockAlertItems, setStockAlertItems] = useState<StockAlertItem[]>([]);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRecord[]>([]);
  const [monthRemarks, setMonthRemarks] = useState<MonthSummaryRemark[]>([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [subcontractors, setSubcontractors] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [tools, setTools] = useState<Tool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirPermission, setDirPermission] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [lastUpdateInfo, setLastUpdateInfo] = useState<{ name: string; time: string } | null>(null);
  
  const dbJsonInputRef = useRef<HTMLInputElement>(null);

  const sortProjects = (list: Project[]) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const dateA = a.appointmentDate || a.reportDate || '9999-12-31';
      const dateB = b.appointmentDate || b.reportDate || '9999-12-31';
      return String(dateA).localeCompare(String(dateB));
    });
  };

  useEffect(() => {
    const restoreAndLoad = async () => {
      try {
        // 1. 優先獲取 IndexedDB 快取狀態
        const cachedState = await loadAppStateFromIdb();
        
        // 2. 獲取實體資料夾 Handle
        const savedHandle = await getHandleFromIdb();
        let fileState = null;

        if (savedHandle) {
          setDirHandle(savedHandle);
          const status = await (savedHandle as any).queryPermission({ mode: 'readwrite' });
          setDirPermission(status);
          if (status === 'granted') {
            // 讀取實體檔案內容
            fileState = await loadDbFromLocal(savedHandle);
          }
        }

        // 3. 差異比較邏輯
        let finalDataToRestore = cachedState;

        if (fileState && cachedState) {
          const fileTime = new Date(fileState.lastSaved || 0).getTime();
          const cacheTime = new Date(cachedState.lastSaved || 0).getTime();
          
          // 如果時間不一致，進行詢問
          if (fileTime !== cacheTime) {
            const newer = fileTime > cacheTime ? '實體資料夾' : '瀏覽器快取';
            const older = fileTime > cacheTime ? '瀏覽器快取' : '實體資料夾';
            
            const fileInfo = fileState.lastUpdateInfo ? `${fileState.lastUpdateInfo.name} (${fileState.lastUpdateInfo.time})` : '未知項目';
            const cacheInfo = cachedState.lastUpdateInfo ? `${cachedState.lastUpdateInfo.name} (${cachedState.lastUpdateInfo.time})` : '未知項目';
            
            const msg = `偵測到資料版本差異：\n\n` +
                        `📂 實體資料夾：${new Date(fileTime).toLocaleString()} [${fileInfo}]\n` +
                        `🌐 瀏覽器快取：${new Date(cacheTime).toLocaleString()} [${cacheInfo}]\n\n` +
                        `最新版本在：${newer}。\n` +
                        `是否從實體資料夾同步資料？ (點擊「取消」將保留目前的瀏覽器快取)`;

            if (window.confirm(msg)) {
              finalDataToRestore = fileState;
            }
          }
        } else if (fileState && !cachedState) {
          // 僅有實體檔案
          finalDataToRestore = fileState;
        }

        // 4. 套用資料
        if (finalDataToRestore) {
          restoreDataToState(finalDataToRestore);
          if (finalDataToRestore.lastSaved) {
            setLastSyncTime(new Date(finalDataToRestore.lastSaved).toLocaleTimeString('zh-TW', { hour12: false }));
          }
          if (finalDataToRestore.lastUpdateInfo) {
            setLastUpdateInfo(finalDataToRestore.lastUpdateInfo);
          }
        }
      } catch (e) {
        console.error('資料恢復過程失敗', e);
      } finally {
        setIsInitialized(true);
      }
    };
    restoreAndLoad();
  }, []);

  const updateLastAction = (name: string) => {
    setLastUpdateInfo({
      name,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    });
  };

  const syncToLocal = async (handle: FileSystemDirectoryHandle, data: any) => {
    try {
      const now = new Date();
      const payload = { ...data, lastSaved: now.toISOString(), lastUpdateInfo };
      await saveDbToLocal(handle, payload);
      setLastSyncTime(now.toLocaleTimeString('zh-TW', { hour12: false }));
    } catch (e) {
      console.error('同步至電腦資料夾失敗', e);
    }
  };

  const handleDirectoryAction = async (force: boolean = false) => {
    setIsWorkspaceLoading(true);
    try {
      let handle = dirHandle;
      if (force || !handle) {
        handle = await getDirectoryHandle();
        setDirHandle(handle);
        await saveHandleToIdb(handle);
      }
      const status = await (handle as any).requestPermission({ mode: 'readwrite' });
      setDirPermission(status);
      if (status === 'granted') {
        const savedData = await loadDbFromLocal(handle);
        if (savedData) {
          restoreDataToState(savedData);
          if (savedData.lastSaved) {
            setLastSyncTime(new Date(savedData.lastSaved).toLocaleTimeString('zh-TW', { hour12: false }));
          }
          if (savedData.lastUpdateInfo) {
            setLastUpdateInfo(savedData.lastUpdateInfo);
          }
        }
      }
    } catch (e: any) {
      if (e.message !== '已取消選擇') alert(e.message);
    } finally {
      setIsWorkspaceLoading(false);
    }
  };

  const restoreDataToState = (data: any) => {
    if (Array.isArray(data.projects)) setProjects(sortProjects(data.projects));
    if (Array.isArray(data.users)) setAllUsers(data.users);
    if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
    if (Array.isArray(data.weeklySchedules)) setWeeklySchedules(data.weeklySchedules);
    if (Array.isArray(data.dailyDispatches)) setDailyDispatches(data.dailyDispatches);
    if (data.globalTeamConfigs) setGlobalTeamConfigs(data.globalTeamConfigs);
    if (data.systemRules) {
        const mergedRules = { ...DEFAULT_SYSTEM_RULES, ...data.systemRules };
        if (!mergedRules.importConfig) mergedRules.importConfig = DEFAULT_SYSTEM_RULES.importConfig;
        setSystemRules(mergedRules);
    }
    if (Array.isArray(data.employees)) setEmployees(data.employees);
    if (Array.isArray(data.attendance)) setAttendance(data.attendance);
    if (Array.isArray(data.overtime)) setOvertime(data.overtime);
    if (Array.isArray(data.monthRemarks)) setMonthRemarks(data.monthRemarks);
    if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
    if (Array.isArray(data.subcontractors)) setSubcontractors(data.subcontractors);
    if (Array.isArray(data.purchaseOrders)) setPurchaseOrders(data.purchaseOrders);
    if (Array.isArray(data.stockAlertItems)) setStockAlertItems(data.stockAlertItems);
    if (Array.isArray(data.tools)) setTools(data.tools);
    if (Array.isArray(data.assets)) setAssets(data.assets);
    if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
    if (data.lastUpdateInfo) setLastUpdateInfo(data.lastUpdateInfo);
  };

  const handleManualSaveAs = async () => {
    try {
      const appState = {
        projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles, lastUpdateInfo, lastSaved: new Date().toISOString()
      };
      const jsonStr = JSON.stringify(appState, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      await downloadBlob(blob, `db_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    } catch (e) {
      alert('存檔失敗');
    }
  };

  const handleImportDbJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.projects || !Array.isArray(json.projects)) throw new Error('不正確的備份檔案格式');
        if (window.confirm(`匯入將會完全覆蓋目前的系統資料，確定要繼續嗎？`)) {
          restoreDataToState(json);
          updateLastAction('匯入系統資料');
          alert('資料已成功還原');
        }
      } catch (error: any) {
        alert('解析備份檔案失敗: ' + (error.message || '未知錯誤'));
      }
    };
    reader.readAsText(file);
    if (dbJsonInputRef.current) dbJsonInputRef.current.value = '';
  };

  useEffect(() => {
    if (!isInitialized) return;
    const saveAll = async () => {
        try {
            // 唯讀用戶不觸發自動儲存至實體檔案
            if (currentUser?.role === UserRole.VIEWER) return;

            const now = new Date().toISOString();
            const stateToSave = { 
              projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, 
              globalTeamConfigs, systemRules, employees, attendance, overtime, 
              monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, 
              tools, assets, vehicles, lastUpdateInfo, lastSaved: now 
            };

            // 同步至 IndexedDB
            await saveAppStateToIdb(stateToSave);

            // 同步至實體檔案 (如果權限允許)
            if (dirHandle && dirPermission === 'granted') {
                await syncToLocal(dirHandle, { 
                  projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, 
                  globalTeamConfigs, systemRules, employees, attendance, overtime, 
                  monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, 
                  tools, assets, vehicles 
                });
            }
        } catch (e) {
            console.error('自動儲存失敗', e);
        }
    };
    const timer = setTimeout(saveAll, 500);
    return () => clearTimeout(timer);
  }, [projects, allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles, dirHandle, dirPermission, isInitialized, lastUpdateInfo, currentUser]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [view, setView] = useState<'engineering' | 'engineering_hub' | 'driving_time' | 'weekly_schedule' | 'daily_dispatch' | 'engineering_groups' | 'outsourcing' | 'construction' | 'modular_house' | 'maintenance' | 'purchasing_hub' | 'purchasing_items' | 'stock_alert' | 'purchasing_suppliers' | 'purchasing_subcontractors' | 'purchasing_orders' | 'purchasing_inbounds' | 'production' | 'hr' | 'equipment' | 'equipment_tools' | 'equipment_assets' | 'equipment_vehicles' | 'report' | 'users'>('engineering');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogin = (user: User) => { setCurrentUser(user); setView('engineering'); };
  const handleLogout = () => { setCurrentUser(null); setIsSidebarOpen(false); };
  const handleDeleteProject = (id: string) => {
    if (window.confirm('確定要刪除此案件嗎？')) {
        setProjects(sortProjects(projects.filter(p => p.id !== id)));
        updateLastAction('刪除案件');
    }
  };
  const handleUpdateProject = (updatedProject: Project) => {
    if (currentUser?.role === UserRole.VIEWER) return;
    setProjects(prev => sortProjects(prev.map(p => p.id === updatedProject.id ? updatedProject : p)));
    if (selectedProject?.id === updatedProject.id) setSelectedProject(updatedProject);
    updateLastAction(updatedProject.name);
  };

  const handleAddToSchedule = (date: string, teamId: number, taskName: string) => {
    if (currentUser?.role === UserRole.VIEWER) return false;
    let wasAdded = false;
    setWeeklySchedules(prevSchedules => {
      const newWeeklySchedules = [...prevSchedules];
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff)).toISOString().split('T')[0];
      let weekIdx = newWeeklySchedules.findIndex(s => s.weekStartDate === weekStart);
      if (weekIdx === -1) {
        newWeeklySchedules.push({ weekStartDate: weekStart, teamConfigs: {}, days: {} });
        weekIdx = newWeeklySchedules.length - 1;
      }
      const week = { ...newWeeklySchedules[weekIdx] };
      const days = { ...week.days };
      if (!days[date]) days[date] = { date, teams: {} };
      const dayData = { ...days[date] };
      const teams = { ...dayData.teams };
      if (!teams[teamId]) teams[teamId] = { tasks: [] };
      const teamTasks = [...teams[teamId].tasks];
      if (!teamTasks.includes(taskName)) {
        teamTasks.push(taskName);
        wasAdded = true;
      }
      teams[teamId] = { tasks: teamTasks };
      dayData.teams = teams;
      days[date] = dayData;
      week.days = days;
      newWeeklySchedules[weekIdx] = week;
      return newWeeklySchedules;
    });
    if (wasAdded) updateLastAction(`排程: ${taskName}`);
    return wasAdded;
  };

  const employeeNicknames = useMemo(() => {
    return employees.map(e => e.nickname || e.name).filter(Boolean);
  }, [employees]);

  const isViewAllowed = (viewId: string) => {
    if (!currentUser) return false;
    const perms = systemRules.rolePermissions?.[currentUser.role];
    if (!perms) return currentUser.role === UserRole.ADMIN;
    return perms.allowedViews.includes(viewId);
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;
  
  const renderSidebarContent = () => {
    const isConnected = dirHandle && dirPermission === 'granted';
    const isBrowserSupported = 'showDirectoryPicker' in window;
    const perms = systemRules.rolePermissions?.[currentUser.role];
    const roleName = perms?.displayName || (currentUser.role === UserRole.ADMIN ? '管理員' : currentUser.role === UserRole.MANAGER ? '專案經理' : '現場人員');
    const isReadOnly = currentUser.role === UserRole.VIEWER;

    return (
      <>
        <div className="flex flex-col items-center justify-center w-full px-2 py-8 mb-2">
           <div className="w-20 h-20 mb-4 rounded-full bg-white p-0.5 shadow-lg border border-slate-700">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain rounded-full" />
           </div>
           <h1 className="text-base font-black text-white tracking-[0.15em] border-b-2 border-yellow-500 pb-1">
             合家興實業
           </h1>
           <div className={`mt-2 text-[9px] font-black ${isReadOnly ? 'bg-slate-500' : 'bg-blue-600'} px-3 py-0.5 rounded-full text-white uppercase tracking-widest`}>{roleName}</div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar pb-10">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-4 px-4">工務工程 (Engineering)</div>
          {isViewAllowed('engineering') && (
            <button onClick={() => { setSelectedProject(null); setView('engineering'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'engineering' && !selectedProject ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
              <LayoutGridIcon className="w-5 h-5" /> <span className="font-medium">工務總覽</span>
            </button>
          )}
          {isViewAllowed('engineering_hub') && (
            <button onClick={() => { setSelectedProject(null); setView('engineering_hub'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'engineering_hub' || view === 'weekly_schedule' || view === 'daily_dispatch' || view === 'engineering_groups' || view === 'driving_time' || view === 'outsourcing' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
              <BriefcaseIcon className="w-5 h-5" /> <span className="font-medium">工作排程</span>
            </button>
          )}
          
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-6 px-4">行政管理 (Administration)</div>
          {isViewAllowed('purchasing_hub') && (
            <button onClick={() => { setSelectedProject(null); setView('purchasing_hub'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view.startsWith('purchasing') || view === 'stock_alert' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <BoxIcon className="w-5 h-5" /> <span className="font-medium">採購</span>
            </button>
          )}
          {isViewAllowed('hr') && (
            <button onClick={() => { setSelectedProject(null); setView('hr'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'hr' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
              <UsersIcon className="w-5 h-5" /> <span className="font-medium">人事</span>
            </button>
          )}
          {isViewAllowed('production') && (
            <button onClick={() => { setSelectedProject(null); setView('production'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'production' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
              <PenToolIcon className="w-5 h-5" /> <span className="font-medium">生產／備料</span>
            </button>
          )}
          {isViewAllowed('equipment') && (
            <button onClick={() => { setSelectedProject(null); setView('equipment'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view.startsWith('equipment') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
              <WrenchIcon className="w-5 h-5" /> <span className="font-medium">設備／工具</span>
            </button>
          )}
          
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-6 px-4">快速捷徑</div>
          {isViewAllowed('report') && (
            <button onClick={() => { setSelectedProject(null); setView('report'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'report' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ClipboardListIcon className="w-5 h-5" /> <span className="font-medium">工作回報</span></button>
          )}
          {isViewAllowed('users') && (<button onClick={() => { setView('users'); setSelectedProject(null); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ShieldIcon className="w-4 h-4" /> <span className="font-medium">系統權限</span></button>)}
          <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
            <button 
              onClick={() => isReadOnly ? alert('唯讀帳號無法修改同步設定') : handleDirectoryAction(false)} 
              disabled={!isBrowserSupported} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all border ${!isBrowserSupported ? 'opacity-30 border-slate-700 bg-slate-800' : isConnected ? 'bg-green-600/10 border-green-500 text-green-400' : 'bg-red-600/10 border-red-500 text-red-400'} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isWorkspaceLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : isConnected ? <CheckCircleIcon className="w-5 h-5" /> : <AlertIcon className="w-5 h-5" />}
              <div className="flex items-start text-left flex-col"><span className="text-sm font-bold">{!isBrowserSupported ? '不支援自動備份' : isConnected ? '電腦同步已開啟' : '未連結電腦目錄'}</span><span className="text-[10px] opacity-70">{isConnected && lastSyncTime ? `最後同步: ${lastSyncTime}` : 'db.json 即時同步'}</span></div>
            </button>
            <button onClick={() => window.open("https://www.myqnapcloud.com/smartshare/718f171i34qr44su2301w465_01ee54950081233tq6u01ww8c822fgj0", "_blank")} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-sky-600/10 border border-sky-500/30 text-sky-400 hover:bg-sky-600 hover:text-white group"><ExternalLinkIcon className="w-5 h-5" /><div className="flex items-start text-left flex-col"><span className="text-sm font-bold">開啟網路資料夾</span><span className="text-[10px] opacity-70">連至 QNAP 共享空間</span></div></button>
            <div className="px-1 pt-1 border-t border-slate-800 mt-2 space-y-2">
              <input type="file" accept=".json" ref={dbJsonInputRef} className="hidden" onChange={handleImportDbJson} />
              <button 
                onClick={() => isReadOnly ? alert('唯讀帳號無法匯入資料') : dbJsonInputRef.current?.click()} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-orange-600/10 border border-orange-500/30 text-orange-400 hover:bg-orange-600 hover:text-white group ${isReadOnly ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
              >
                <UploadIcon className="w-5 h-5" /><div className="flex items-start text-left flex-col"><span className="text-sm font-bold">匯入 db.json</span><span className="text-[10px] opacity-70">還原系統備份資料</span></div>
              </button>
              <button onClick={handleManualSaveAs} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white group"><SaveIcon className="w-5 h-5" /><div className="flex items-start text-left flex-col"><span className="text-sm font-bold">手動另存新檔</span><span className="text-[10px] opacity-70">下載 db.json 到本機</span></div></button>
            </div>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800 w-full mt-auto mb-safe">
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"><LogOutIcon className="w-4 h-4" /> 登出</button>
        </div>
      </>
    );
  };

  const getTitle = () => {
    switch(view) {
      case 'engineering': return '工務總覽';
      case 'engineering_hub': return '工作排程入口';
      case 'driving_time': return '估計行車時間';
      case 'weekly_schedule': return '週間工作排程';
      case 'daily_dispatch': return '明日工作排程';
      case 'engineering_groups': return '工程小組管理';
      case 'outsourcing': return '外包管理';
      case 'purchasing_hub': return '採購入口';
      case 'purchasing_items': return '採購項目總覽';
      case 'stock_alert': return '常備庫存爆量通知';
      case 'purchasing_suppliers': return '供應商清冊';
      case 'purchasing_subcontractors': return '外包廠商';
      case 'purchasing_orders': return '採購單管理';
      case 'purchasing_inbounds': return '進料明細';
      case 'production': return '生產／備料總覽';
      case 'hr': return '人事管理模組';
      case 'equipment': return '設備與工具模組';
      case 'equipment_tools': return '工具管理';
      case 'equipment_assets': return '大型設備管理';
      case 'equipment_vehicles': return '車輛管理';
      case 'report': return '工作回報';
      case 'users': return '權限管理';
      default: return '合家興行政管理系統';
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <datalist id="employee-nicknames-list">{employeeNicknames.map((name, i) => <option key={i} value={name} />)}</datalist>
      <div className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        <aside className={`absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>{renderSidebarContent()}</aside>
      </div>
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white flex-shrink-0">{renderSidebarContent()}</aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-500 p-2"><MenuIcon className="w-6 h-6" /></button>
          <div className="text-sm font-bold text-slate-700">{selectedProject ? selectedProject.name : getTitle()}</div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-slate-700 hidden sm:block">{currentUser.name}</div>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                <img src={LOGO_URL} alt="User" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] pb-safe">
          {view === 'users' ? (<UserManagement users={allUsers} onUpdateUsers={setAllUsers} auditLogs={auditLogs} onLogAction={(action, details) => setAuditLogs(prev => [{ id: generateId(), userId: currentUser.id, userName: currentUser.name, action, details, timestamp: Date.now() }, ...prev])} projects={projects} onRestoreData={restoreDataToState} onConnectDirectory={() => handleDirectoryAction(true)} dirPermission={dirPermission} isWorkspaceLoading={isWorkspaceLoading} systemRules={systemRules} onUpdateSystemRules={setSystemRules} />) : 
           view === 'report' ? (<div className="flex-1 overflow-auto"><GlobalWorkReport projects={projects} currentUser={currentUser} onUpdateProject={handleUpdateProject} /></div>) : 
           view === 'engineering_hub' ? (<div className="flex-1 overflow-auto"><div className="p-6 max-w-5xl mx-auto h-full animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">{[
             { id: 'daily_dispatch', label: '明日工作排程', icon: <ClipboardListIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600', desc: '確認明日施工地點與人員' },
             { id: 'driving_time', label: '估計行車時間', icon: <NavigationIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600', desc: '預估早上 8:00 路徑耗時' },
             { id: 'weekly_schedule', label: '週間工作排程', icon: <CalendarIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600', desc: '規劃本週各小組派工任務' },
             { id: 'outsourcing', label: '外包廠商管理', icon: <BriefcaseIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600', desc: '外包廠商調度與進度控管' },
             { id: 'engineering_groups', label: '工程小組設定', icon: <UsersIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600', desc: '管理師傅、助手與車號預設' },
           ].filter(cat => isViewAllowed(cat.id)).map(cat => (
            <button key={cat.id} onClick={() => setView(cat.id as any)} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all group flex flex-col items-center text-center gap-4"><div className={`p-4 rounded-xl ${cat.color} group-hover:scale-110 transition-transform`}>{cat.icon}</div><div className="font-bold text-slate-800 text-lg">{cat.label}</div><p className="text-xs text-slate-400 font-medium">{cat.desc}</p><p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-2">Work Schedule Hub</p></button>
          ))}</div></div></div>) :
           view === 'purchasing_hub' ? (<div className="flex-1 overflow-auto"><PurchasingModule onNavigate={setView} allowedViews={systemRules.rolePermissions?.[currentUser.role]?.allowedViews || []} /></div>) :
           view === 'purchasing_items' ? (<div className="flex-1 overflow-hidden"><GlobalPurchasingItems projects={projects} onUpdateProject={handleUpdateProject} systemRules={systemRules} onBack={() => setView('purchasing_hub')} suppliers={suppliers} subcontractors={subcontractors} onUpdateSuppliers={setSuppliers} onUpdateSubcontractors={setSubcontractors} purchaseOrders={purchaseOrders} onUpdatePurchaseOrders={setPurchaseOrders} /></div>) :
           view === 'stock_alert' ? (<div className="flex-1 overflow-hidden"><StockAlert items={stockAlertItems} onUpdateItems={setStockAlertItems} onBack={() => setView('purchasing_hub')} /></div>) :
           view === 'purchasing_suppliers' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
                <div className="flex-1 overflow-hidden"><SupplierList title="供應商清冊" typeLabel="供應商" themeColor="emerald" suppliers={suppliers} onUpdateSuppliers={setSuppliers} /></div>
              </div>
           ) :
           view === 'purchasing_subcontractors' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
              <div className="flex-1 overflow-hidden"><SupplierList title="外包廠商清冊" typeLabel="外包廠商" themeColor="indigo" suppliers={subcontractors} onUpdateSuppliers={setSuppliers} /></div>
            </div>
         ) :
           view === 'purchasing_orders' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
                <div className="flex-1 overflow-hidden"><PurchaseOrders projects={projects} suppliers={[...suppliers, ...subcontractors]} purchaseOrders={purchaseOrders} onUpdatePurchaseOrders={setPurchaseOrders} onUpdateProject={handleUpdateProject} /></div>
              </div>
           ) :
           view === 'purchasing_inbounds' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
                <div className="flex-1 overflow-hidden"><InboundDetails projects={projects} suppliers={[...suppliers, ...subcontractors]} purchaseOrders={purchaseOrders} onUpdatePurchaseOrders={setPurchaseOrders} /></div>
              </div>
           ) :
           view === 'hr' ? (<div className="flex-1 overflow-hidden"><HRManagement employees={employees} attendance={attendance} overtime={overtime} monthRemarks={monthRemarks} dailyDispatches={dailyDispatches} onUpdateEmployees={setEmployees} onUpdateAttendance={setAttendance} onUpdateOvertime={setOvertime} onUpdateMonthRemarks={setMonthRemarks} currentUserRole={currentUser.role} /></div>) :
           view === 'production' ? (<div className="flex-1 overflow-hidden"><GlobalProduction projects={projects} onUpdateProject={handleUpdateProject} systemRules={systemRules} /></div>) :
           view === 'outsourcing' ? (<div className="flex-1 overflow-hidden"><GlobalOutsourcing projects={projects} onUpdateProject={handleUpdateProject} systemRules={systemRules} subcontractors={subcontractors} /></div>) :
           view === 'driving_time' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回工作排程</button></div>
              <div className="flex-1 overflow-auto"><DrivingTimeEstimator projects={projects} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} /></div>
            </div>
           ) :
           view === 'weekly_schedule' ? (
             <div className="flex flex-col flex-1 min-h-0">
               <div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回工作排程</button></div>
               <div className="flex-1 overflow-hidden"><WeeklySchedule projects={projects} weeklySchedules={weeklySchedules} globalTeamConfigs={globalTeamConfigs} onUpdateWeeklySchedules={setWeeklySchedules} onOpenDrivingTime={() => setView('driving_time')} /></div>
             </div>
           ) :
           view === 'daily_dispatch' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回工作排程</button></div>
              <div className="flex-1 overflow-hidden"><DailyDispatch projects={projects} weeklySchedules={weeklySchedules} dailyDispatches={dailyDispatches} globalTeamConfigs={globalTeamConfigs} onUpdateDailyDispatches={setDailyDispatches} onOpenDrivingTime={() => setView('driving_time')} /></div>
            </div>
           ) :
           view === 'engineering_groups' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回工作排程</button></div>
              <div className="flex-1 overflow-auto"><EngineeringGroups globalTeamConfigs={globalTeamConfigs} onUpdateGlobalTeamConfigs={setGlobalTeamConfigs} /></div>
            </div>
           ) :
           view === 'equipment' ? (<div className="flex-1 overflow-auto"><EquipmentModule onNavigate={setView} allowedViews={systemRules.rolePermissions?.[currentUser.role]?.allowedViews || []} /></div>) :
           view === 'equipment_tools' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('equipment')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回設備選單</button></div>
                <div className="flex-1 overflow-hidden"><ToolManagement tools={tools} onUpdateTools={setTools} employees={employees} /></div>
              </div>
           ) :
           view === 'equipment_assets' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('equipment')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回設備選單</button></div>
                <div className="flex-1 overflow-hidden"><AssetManagement assets={assets} onUpdateAssets={setAssets} /></div>
              </div>
           ) :
           view === 'equipment_vehicles' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('equipment')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回設備選單</button></div>
                <div className="flex-1 overflow-hidden"><VehicleManagement vehicles={vehicles} onUpdateVehicles={setVehicles} employees={employees} /></div>
              </div>
           ) :
           selectedProject ? (
             <div className="flex-1 overflow-hidden">
               <ProjectDetail 
                 project={selectedProject} currentUser={currentUser} onBack={() => setSelectedProject(null)} 
                 onUpdateProject={handleUpdateProject} onEditProject={setEditingProject} 
                 onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} systemRules={systemRules} 
               />
             </div>
           ) : view === 'engineering' ? (
             <div className="flex-1 overflow-auto">
               <EngineeringView 
                 projects={projects} setProjects={setProjects} currentUser={currentUser} 
                 lastUpdateInfo={lastUpdateInfo} updateLastAction={updateLastAction} 
                 systemRules={systemRules} employees={employees} setAttendance={setAttendance} 
                 onSelectProject={setSelectedProject} onAddProject={() => setIsAddModalOpen(true)} 
                 onEditProject={setEditingProject} handleDeleteProject={handleDeleteProject} 
                 onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} 
               />
             </div>
           ) : null}
        </main>
      </div>

      {isAddModalOpen && <AddProjectModal onClose={() => setIsAddModalOpen(false)} onAdd={(p) => { setProjects(sortProjects([p, ...projects])); updateLastAction(p.name); setIsAddModalOpen(false); }} defaultType={view === 'maintenance' ? ProjectType.MAINTENANCE : view === 'modular_house' ? ProjectType.MODULAR_HOUSE : ProjectType.CONSTRUCTION} />}
      {editingProject && <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onSave={handleUpdateProject} />}
    </div>
  );
};

export default App;