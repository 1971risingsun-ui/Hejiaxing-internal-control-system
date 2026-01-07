
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Project, ProjectStatus, User, UserRole, MaterialStatus, AuditLog, ProjectType, Attachment, WeeklySchedule as WeeklyScheduleType, DailyDispatch as DailyDispatchType, GlobalTeamConfigs, Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark, Supplier, PurchaseOrder, SitePhoto, SystemRules, StockAlertItem, Tool, Asset, Vehicle, ConstructionItem, DailyReport, CompletionReport } from './types';
import ProjectList from './components/ProjectList';
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
import ExcelJS from 'exceljs';
import { GoogleGenAI, Type } from "@google/genai";

export const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const DEFAULT_SYSTEM_RULES: SystemRules = {
  productionKeywords: ['防溢座', '施工大門', '小門', '巨'],
  subcontractorKeywords: ['怪手', '告示牌', '安衛貼紙', '美化帆布', '噪音管制看板', '監測告示牌', '寫字'],
  modularProductionKeywords: [],
  modularSubcontractorKeywords: [],
  rolePermissions: {
    [UserRole.ADMIN]: { 
      displayName: '管理員', 
      allowedViews: ['engineering', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'outsourcing', 'engineering_groups', 'purchasing_hub', 'purchasing_items', 'stock_alert', 'purchasing_suppliers', 'purchasing_subcontractors', 'purchasing_orders', 'purchasing_inbounds', 'hr', 'production', 'equipment', 'equipment_tools', 'equipment_assets', 'equipment_vehicles', 'report', 'users'] 
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

const bufferToBase64 = (buffer: ArrayBuffer, mimeType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: mimeType });
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const parseExcelDate = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    try {
      return val.toISOString().split('T')[0];
    } catch (e) { return ''; }
  }
  const str = String(val).trim();
  if (!str) return '';
  const dateMatch = str.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (dateMatch) {
    let [_, p1, p2, p3] = dateMatch;
    if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    if (p3.length === 4) return `${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
  }
  if (!isNaN(Number(str)) && Number(str) > 30000) {
    try {
      const date = new Date(Math.round((Number(str) - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch (e) {}
  }
  return str;
};

const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 100, height: 100 });
    img.src = url;
  });
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([
    { id: 'u-1', name: 'Admin User', email: 'admin@hejiaxing.ai', role: UserRole.ADMIN, avatar: 'logo.png' },
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
  
  const [isDrivingTimeModalOpen, setIsDrivingTimeModalOpen] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const dbJsonInputRef = useRef<HTMLInputElement>(null);
  const importConstructionRecordsRef = useRef<HTMLInputElement>(null);
  const importConstructionReportsRef = useRef<HTMLInputElement>(null);
  const importCompletionReportsRef = useRef<HTMLInputElement>(null);

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
        const cachedState = await loadAppStateFromIdb();
        if (cachedState) {
          if (Array.isArray(cachedState.projects)) setProjects(sortProjects(cachedState.projects));
          if (Array.isArray(cachedState.users)) setAllUsers(cachedState.users);
          if (Array.isArray(cachedState.auditLogs)) setAuditLogs(cachedState.auditLogs);
          if (Array.isArray(cachedState.weeklySchedules)) setWeeklySchedules(cachedState.weeklySchedules);
          if (Array.isArray(cachedState.dailyDispatches)) setDailyDispatches(cachedState.dailyDispatches);
          if (cachedState.globalTeamConfigs) setGlobalTeamConfigs(cachedState.globalTeamConfigs);
          if (cachedState.systemRules) {
              // 合併預設匯入規則，防止舊資料遺失欄位
              const mergedRules = { ...DEFAULT_SYSTEM_RULES, ...cachedState.systemRules };
              if (!mergedRules.importConfig) mergedRules.importConfig = DEFAULT_SYSTEM_RULES.importConfig;
              setSystemRules(mergedRules);
          }
          if (cachedState.employees) setEmployees(cachedState.employees);
          if (cachedState.attendance) setAttendance(cachedState.attendance);
          if (cachedState.overtime) setOvertime(cachedState.overtime);
          if (cachedState.monthRemarks) setMonthRemarks(cachedState.monthRemarks);
          if (cachedState.suppliers) setSuppliers(cachedState.suppliers);
          if (cachedState.subcontractors) setSubcontractors(cachedState.subcontractors);
          if (cachedState.purchaseOrders) setPurchaseOrders(cachedState.purchaseOrders);
          if (cachedState.stockAlertItems) setStockAlertItems(cachedState.stockAlertItems);
          if (Array.isArray(cachedState.tools)) setTools(cachedState.tools);
          if (Array.isArray(cachedState.assets)) setAssets(cachedState.assets);
          if (Array.isArray(cachedState.vehicles)) setVehicles(cachedState.vehicles);

          if (cachedState.lastSaved) {
            setLastSyncTime(new Date(cachedState.lastSaved).toLocaleTimeString('zh-TW', { hour12: false }));
          }
          if (cachedState.lastUpdateInfo) {
            setLastUpdateInfo(cachedState.lastUpdateInfo);
          }
        }
        
        const savedHandle = await getHandleFromIdb();
        if (savedHandle) {
          setDirHandle(savedHandle);
          const status = await (savedHandle as any).queryPermission({ mode: 'readwrite' });
          setDirPermission(status);
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
    if (data.systemRules) setSystemRules(data.systemRules);
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsWorkspaceLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表。');
      const currentProjects = [...projects];
      let newCount = 0;
      let updateCount = 0;
      const headers: Record<string, number> = {};
      worksheet.getRow(1).eachCell((cell: any, colNumber: number) => {
        const headerText = cell.value?.toString().trim();
        if (headerText) headers[headerText] = colNumber;
      });
      if (!headers['客戶'] || !headers['類別']) throw new Error('缺少必要欄位：「客戶」或「類別」。');
      const excelImages = worksheet.getImages();
      const imagesByRow: Record<number, any[]> = {};
      excelImages.forEach((imgMeta: any) => {
        const rowIdx = Math.floor(imgMeta.range.tl.row) + 1;
        if (!imagesByRow[rowIdx]) imagesByRow[rowIdx] = [];
        imagesByRow[rowIdx].push(imgMeta);
      });
      const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];
      
      const config = systemRules.importConfig?.projectKeywords || DEFAULT_SYSTEM_RULES.importConfig!.projectKeywords;

      for (const row of rows) {
        const rowNumber = row.number;
        const rawName = row.getCell(headers['客戶']).value?.toString().trim() || '';
        if (!rawName) continue;
        const categoryStr = row.getCell(headers['類別']).value?.toString() || '';
        let projectType = ProjectType.CONSTRUCTION;
        if (categoryStr.includes(config.maintenance)) projectType = ProjectType.MAINTENANCE;
        else if (categoryStr.includes(config.modular)) projectType = ProjectType.MODULAR_HOUSE;
        const clientName = rawName.includes('-') ? rawName.split('-')[0].trim() : rawName;
        const existingIdx = currentProjects.findIndex(p => p.name === rawName);
        const rowImages = imagesByRow[rowNumber] || [];
        const newAttachments: Attachment[] = [];
        for (const [idx, imgMeta] of rowImages.entries()) {
          try {
            const img = workbook.getImage(imgMeta.imageId);
            if (img && img.buffer && img.buffer.byteLength < 2000000) {
              const mimeType = `image/${img.extension}`;
              const base64 = await bufferToBase64(img.buffer, mimeType);
              newAttachments.push({
                id: `excel-img-${rowNumber}-${idx}-${Date.now()}`,
                name: `匯入圖片_${rowNumber}_${idx}.${img.extension}`,
                size: img.buffer.byteLength,
                type: mimeType,
                url: `data:${mimeType};base64,${base64}`
              });
            }
          } catch (e) {
            console.warn('圖片處理失敗', e);
          }
        }
        const projectUpdateData: Partial<Project> = {
          name: rawName,
          type: projectType,
          clientName: clientName,
          clientContact: row.getCell(headers['聯絡人'] || 0).value?.toString() || '',
          clientPhone: row.getCell(headers['電話'] || 0).value?.toString() || '',
          address: row.getCell(headers['地址'] || 0).value?.toString() || '',
          appointmentDate: parseExcelDate(row.getCell(headers['預約日期'] || 0).value),
          reportDate: parseExcelDate(row.getCell(headers['報修日期'] || 0).value),
          description: row.getCell(headers['工程'] || 0).value?.toString() || '',
          remarks: row.getCell(headers['備註'] || 0).value?.toString() || '',
        };
        if (existingIdx !== -1) {
          const existingProject = currentProjects[existingIdx];
          const mergedAttachments = [...(existingProject.attachments || [])];
          newAttachments.forEach(na => {
              if (!mergedAttachments.some(ma => ma.name === na.name && ma.size === na.size)) {
                  mergedAttachments.push(na);
              }
          });
          currentProjects[existingIdx] = { ...existingProject, ...projectUpdateData, attachments: mergedAttachments };
          updateCount++;
        } else {
          currentProjects.push({
            id: generateId(),
            status: ProjectStatus.PLANNING,
            progress: 0,
            milestones: [],
            photos: [],
            materials: [],
            reports: [],
            constructionItems: [],
            constructionSignatures: [],
            completionReports: [],
            attachments: newAttachments,
            ...(projectUpdateData as Project)
          });
          newCount++;
        }
        if (rowNumber % 20 === 0) await new Promise(r => setTimeout(r, 0));
      }
      setProjects(sortProjects(currentProjects));
      updateLastAction('Excel 匯入更新');
      alert(`匯入完成！\n新增：${newCount} 筆\n更新：${updateCount} 筆`);
    } catch (error: any) {
      alert('Excel 匯入失敗: ' + error.message);
    } finally {
      setIsWorkspaceLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const updateAttendanceForAssistants = (date: string, worker: string, assistantsStr: string) => {
    if (!date || !worker || !assistantsStr) return;
    
    setAttendance(prev => {
        const newAttendance = [...prev];
        const assistantList = assistantsStr.split(',').map(s => s.trim()).filter(Boolean);
        
        assistantList.forEach(aStr => {
            const isHalfDay = aStr.includes('(半天)') || aStr.includes('半天');
            const cleanAssistantName = aStr.replace('(半天)', '').replace('半天', '').trim();
            
            const emp = employees.find(e => (e.nickname || e.name) === cleanAssistantName);
            
            if (emp) {
                const status = isHalfDay ? `${worker}(半天)` : worker;
                const existingIdx = newAttendance.findIndex(rec => rec.date === date && rec.employeeId === emp.id);
                if (existingIdx !== -1) {
                    newAttendance[existingIdx] = { ...newAttendance[existingIdx], status };
                } else {
                    newAttendance.push({ date, employeeId: emp.id, status });
                }
            }
        });
        return newAttendance;
    });
  };

  const handleImportConstructionRecords = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsWorkspaceLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');

      const config = systemRules.importConfig?.recordKeywords || DEFAULT_SYSTEM_RULES.importConfig!.recordKeywords;

      const titleStr = worksheet.getRow(1).getCell(1).value?.toString() || '';
      const pName = titleStr.includes(' - ') ? titleStr.split(' - ')[1].trim() : '';
      if (!pName) throw new Error(`無法從首列辨識專案名稱（格式需為：${config.recordTitle} - 專案名稱）`);

      const date = parseExcelDate(worksheet.getRow(2).getCell(2).value);
      if (!date) throw new Error('無法辨識日期（需在第二列第二欄）');

      const personnelStr = worksheet.getRow(3).getCell(2).value?.toString() || '';
      const worker = personnelStr.match(/師傅:\s*(.*?)\s*\//)?.[1] || personnelStr.match(/師傅:\s*(.*?)$/)?.[1] || '';
      const assistant = personnelStr.match(/助手:\s*(.*)$/)?.[1] || '';

      const pIdx = projects.findIndex(p => p.name === pName);
      if (pIdx === -1) throw new Error(`系統中找不到名為「${pName}」的專案`);

      const newItems: ConstructionItem[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 6) return;
        const itemName = row.getCell(2).value?.toString() || '';
        if (!itemName) return;
        
        newItems.push({
          id: generateId(),
          name: itemName,
          quantity: row.getCell(3).value?.toString() || '',
          unit: row.getCell(4).value?.toString() || '',
          location: row.getCell(5).value?.toString() || '',
          worker: worker,
          assistant: assistant,
          date: date
        });
      });

      const updatedProjects = [...projects];
      const otherItems = (updatedProjects[pIdx].constructionItems || []).filter(item => !(item.date === date));
      updatedProjects[pIdx].constructionItems = [...otherItems, ...newItems];
      
      setProjects(updatedProjects);
      updateAttendanceForAssistants(date, worker, assistant);
      
      updateLastAction(`匯入施工紀錄: ${pName}`);
      alert(`成功匯入 ${pName} 在 ${date} 的 ${newItems.length} 筆項目`);
    } catch (err: any) {
      alert('匯入失敗: ' + err.message);
    } finally {
      setIsWorkspaceLoading(false);
      if (importConstructionRecordsRef.current) importConstructionRecordsRef.current.value = '';
    }
  };

  const handleImportConstructionReports = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsWorkspaceLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');

      const config = systemRules.importConfig?.recordKeywords || DEFAULT_SYSTEM_RULES.importConfig!.recordKeywords;

      const titleStr = worksheet.getRow(1).getCell(1).value?.toString() || '';
      const pName = titleStr.includes(' - ') ? titleStr.split(' - ')[1].trim() : '';
      if (!pName) throw new Error(`無法從首列辨識專案名稱（格式需為：${config.reportTitle} - 專案名稱）`);

      const date = parseExcelDate(worksheet.getRow(2).getCell(2).value);
      if (!date) throw new Error('無法辨識日期（需在第二列第二欄）');

      const personnelStr = worksheet.getRow(3).getCell(2).value?.toString() || '';
      const worker = personnelStr.match(/師傅:\s*(.*?)\s*\//)?.[1] || personnelStr.match(/師傅:\s*(.*?)$/)?.[1] || '';
      const assistant = personnelStr.match(/助手:\s*(.*)$/)?.[1] || '';
      
      const weatherVal = worksheet.getRow(4).getCell(2).value?.toString() || '晴天';
      const weatherMap: any = { '晴天': 'sunny', '陰天': 'cloudy', '雨天': 'rainy' };
      const weather = weatherMap[weatherVal] || 'sunny';

      const pIdx = projects.findIndex(p => p.name === pName);
      if (pIdx === -1) throw new Error(`系統中找不到名為「${pName}」的專案`);

      const newItems: ConstructionItem[] = [];
      let rNum = 7;
      while (rNum <= worksheet.rowCount) {
          const row = worksheet.getRow(rNum);
          const itemName = row.getCell(2).value?.toString()?.trim();
          if (!itemName) break;
          newItems.push({
              id: generateId(),
              name: itemName,
              quantity: row.getCell(3).value?.toString() || '',
              unit: row.getCell(4).value?.toString() || '',
              location: row.getCell(5).value?.toString() || '',
              worker: worker,
              assistant: assistant,
              date: date
          });
          rNum++;
      }

      let contentRowIdx = -1;
      worksheet.eachRow((row, rowNumber) => {
          if (row.getCell(1).value?.toString()?.trim() === '施工內容與備註') {
              contentRowIdx = rowNumber + 1;
          }
      });
      const content = contentRowIdx !== -1 ? worksheet.getRow(contentRowIdx).getCell(1).value?.toString() || '' : '';

      const newReport: DailyReport = {
        id: generateId(),
        date: date,
        weather: weather as any,
        content: content,
        reporter: currentUser?.name || '系統匯入',
        timestamp: Date.now(),
        photos: [],
        worker: worker,
        assistant: assistant
      };

      const updatedProjects = [...projects];
      updatedProjects[pIdx].reports = [...(updatedProjects[pIdx].reports || []).filter(r => r.date !== date), newReport];
      const otherItems = (updatedProjects[pIdx].constructionItems || []).filter(i => i.date !== date);
      updatedProjects[pIdx].constructionItems = [...otherItems, ...newItems];
      
      setProjects(updatedProjects);
      updateAttendanceForAssistants(date, worker, assistant);
      
      updateLastAction(`匯入施工報告: ${pName}`);
      alert(`成功匯入 ${pName} 在 ${date} 的施工報告及 ${newItems.length} 筆施工細項`);
    } catch (err: any) {
      alert('匯入失敗: ' + err.message);
    } finally {
      setIsWorkspaceLoading(false);
      if (importConstructionReportsRef.current) importConstructionReportsRef.current.value = '';
    }
  };

  const handleImportCompletionReports = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsWorkspaceLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');

      const config = systemRules.importConfig?.completionKeywords || DEFAULT_SYSTEM_RULES.importConfig!.completionKeywords;

      const headers: Record<string, number> = {};
      worksheet.getRow(1).eachCell((cell, col) => {
        const text = cell.value?.toString().trim();
        if (text) headers[text] = col;
      });
      const required = ['專案名稱', '日期', '項目', '數量'];
      required.forEach(r => { if (!headers[r]) throw new Error(`缺少必要欄位: ${r}`); });
      const newProjects = [...projects];
      let importCount = 0;
      const groupMap: Record<string, any> = {};
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const pName = row.getCell(headers['專案名稱']).value?.toString().trim();
        if (!pName) return;
        const date = parseExcelDate(row.getCell(headers['日期']).value);
        const key = `${pName}|${date}`;
        if (!groupMap[key]) groupMap[key] = { items: [], worker: row.getCell(headers['師傅'] || 0).value?.toString() || '' };
        groupMap[key].items.push({
          name: row.getCell(headers['項目']).value?.toString() || '',
          action: (row.getCell(headers['動作'] || 0).value?.toString().includes(config.dismantle) ? 'dismantle' : 'install') as any,
          quantity: row.getCell(headers['數量']).value?.toString() || '',
          unit: row.getCell(headers['單位'] || 0).value?.toString() || '',
          category: 'OTHER'
        });
        importCount++;
      });
      Object.keys(groupMap).forEach(key => {
        const [pName, date] = key.split('|');
        const pIdx = newProjects.findIndex(p => p.name === pName);
        if (pIdx === -1) return;
        const newReport: CompletionReport = {
          id: generateId(),
          date,
          worker: groupMap[key].worker,
          items: groupMap[key].items,
          notes: '',
          signature: '',
          timestamp: Date.now()
        };
        newProjects[pIdx].completionReports = [...(newProjects[pIdx].completionReports || []).filter(r => r.date !== date), newReport];
      });
      setProjects(newProjects);
      updateLastAction(`批量匯入完工報告 (${importCount} 項)`);
      alert(`匯入完工報告完成，共處理 ${Object.keys(groupMap).length} 份報告，共 ${importCount} 個品項。`);
    } catch (err: any) {
      alert('匯入失敗: ' + err.message);
    } finally {
      setIsWorkspaceLoading(false);
      if (importCompletionReportsRef.current) importCompletionReportsRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('案件排程表');
      const columns = [
        { header: '客戶', key: 'name', width: 25 },
        { header: '類別', key: 'typeLabel', width: 12 },
        { header: '聯絡人', key: 'clientContact', width: 15 },
        { header: '電話', key: 'clientPhone', width: 15 },
        { header: '地址', key: 'address', width: 40 },
        { header: '預約日期', key: 'appointmentDate', width: 15 },
        { header: '報修日期', key: 'reportDate', width: 15 },
        { header: '工程', key: 'description', width: 40 },
        { header: '備註', key: 'remarks', width: 30 },
      ];
      worksheet.columns = columns;
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      const minRowHeightPoints = 100; 
      const photoHeightPoints = 100; 
      const pointsToPixels = 1.333; 
      const countLines = (text: string, colWidth: number) => {
        if (!text) return 1;
        return text.split('\n').reduce((acc, line) => {
          const estimatedCharsPerLine = colWidth * 0.55; 
          return acc + Math.max(1, Math.ceil(line.length / estimatedCharsPerLine));
        }, 0);
      };
      let currentRowIdx = 2;
      for (const p of projects) {
        let typeLabel = '圍籬';
        if (p.type === ProjectType.MAINTENANCE) typeLabel = '維修';
        else if (p.type === ProjectType.MODULAR_HOUSE) typeLabel = '組合屋';
        const row = worksheet.addRow({
          name: p.name,
          typeLabel,
          clientContact: p.clientContact,
          clientPhone: p.clientPhone,
          address: p.address,
          appointmentDate: p.appointmentDate,
          reportDate: p.reportDate,
          description: p.description,
          remarks: p.remarks,
        });
        const descLines = countLines(p.description || '', 40);
        const remarksLines = countLines(p.remarks || '', 30);
        const nameLines = countLines(p.name || '', 25);
        const addressLines = countLines(p.address || '', 40);
        const estimatedTextHeight = Math.max(descLines, remarksLines, nameLines, addressLines) * 18 + 15;
        row.height = Math.max(minRowHeightPoints, estimatedTextHeight);
        const imageAttachments = (p.attachments || []).filter(att => att.type.startsWith('image/'));
        for (const [imgIdx, att] of imageAttachments.entries()) {
          try {
            const splitData = att.url.split(',');
            if (splitData.length < 2) continue;
            const base64Data = splitData[1];
            const extension = att.type.split('/')[1] || 'png';
            const dims = await getImageDimensions(att.url);
            const aspectRatio = dims.width / dims.height;
            const targetWidthPx = (photoHeightPoints * pointsToPixels) * aspectRatio;
            const targetHeightPx = photoHeightPoints * pointsToPixels;
            const imageId = workbook.addImage({
              base64: base64Data,
              extension: (extension === 'jpeg' ? 'jpg' : extension) as any,
            });
            const colIdx = 10 + imgIdx;
            const excelColWidth = targetWidthPx / 7.5;
            if (!worksheet.getColumn(colIdx).width || worksheet.getColumn(colIdx).width < excelColWidth) {
                worksheet.getColumn(colIdx).width = excelColWidth;
            }
            worksheet.addImage(imageId, {
              tl: { col: colIdx - 1, row: currentRowIdx - 1 },
              ext: { width: targetWidthPx, height: targetHeightPx }
            });
            row.getCell(colIdx).value = ""; 
          } catch (e) {
            console.warn('圖片匯出失敗', e);
          }
        }
        currentRowIdx++;
      }
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          if (rowNumber > 1) {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          }
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await downloadBlob(blob, `合家興案件排程表_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error: any) {
      alert('匯出 Excel 失敗: ' + error.message);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    const saveAll = async () => {
        try {
            await saveAppStateToIdb({ projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles, lastUpdateInfo, lastSaved: new Date().toISOString() });
            if (dirHandle && dirPermission === 'granted') {
                syncToLocal(dirHandle, { projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles });
            }
        } catch (e) {
            console.error('自動儲存失敗', e);
        }
    };
    const timer = setTimeout(saveAll, 500);
    return () => clearTimeout(timer);
  }, [projects, allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, systemRules, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, stockAlertItems, tools, assets, vehicles, dirHandle, dirPermission, isInitialized, lastUpdateInfo]);

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
    setProjects(prev => sortProjects(prev.map(p => p.id === updatedProject.id ? updatedProject : p)));
    if (selectedProject?.id === updatedProject.id) setSelectedProject(updatedProject);
    updateLastAction(updatedProject.name);
  };

  const handleAddToSchedule = (date: string, teamId: number, taskName: string) => {
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
  
  const currentViewProjects = projects.filter(p => {
    if (view === 'engineering') return true;
    if (view === 'construction') return p.type === ProjectType.CONSTRUCTION;
    if (view === 'modular_house') return p.type === ProjectType.MODULAR_HOUSE;
    if (view === 'maintenance') return p.type === ProjectType.MAINTENANCE;
    return false;
  });

  const renderSidebarContent = () => {
    const isConnected = dirHandle && dirPermission === 'granted';
    const isBrowserSupported = 'showDirectoryPicker' in window;
    const perms = systemRules.rolePermissions?.[currentUser.role];
    const roleName = perms?.displayName || (currentUser.role === UserRole.ADMIN ? '管理員' : currentUser.role === UserRole.MANAGER ? '專案經理' : '現場人員');

    return (
      <>
        <div className="flex flex-col items-center justify-center w-full px-2 py-8 mb-2">
           <div className="w-20 h-20 mb-4 rounded-full bg-white p-0.5 shadow-lg border border-slate-700">
              <img src="logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" />
           </div>
           <h1 className="text-base font-black text-white tracking-[0.15em] border-b-2 border-yellow-500 pb-1">
             合家興實業
           </h1>
           <div className="mt-2 text-[9px] font-black bg-blue-600 px-3 py-0.5 rounded-full text-white uppercase tracking-widest">{roleName}</div>
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
            <button onClick={() => handleDirectoryAction(false)} disabled={!isBrowserSupported} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all border ${!isBrowserSupported ? 'opacity-30 border-slate-700 bg-slate-800' : isConnected ? 'bg-green-600/10 border-green-500 text-green-400' : 'bg-red-600/10 border-red-500 text-red-400'}`}>
              {isWorkspaceLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : isConnected ? <CheckCircleIcon className="w-5 h-5" /> : <AlertIcon className="w-5 h-5" />}
              <div className="flex items-start text-left flex-col"><span className="text-sm font-bold">{!isBrowserSupported ? '不支援自動備份' : isConnected ? '電腦同步已開啟' : '未連結電腦目錄'}</span><span className="text-[10px] opacity-70">{isConnected && lastSyncTime ? `最後同步: ${lastSyncTime}` : 'db.json 即時同步'}</span></div>
            </button>
            <button onClick={() => window.open("http://192.168.1.2:8080/share.cgi?ssid=79f9da81f26d45bb8e896be3d7d95cbb", "_blank")} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-sky-600/10 border border-sky-500/30 text-sky-400 hover:bg-sky-600 hover:text-white group"><ExternalLinkIcon className="w-5 h-5" /><div className="flex items-start text-left flex-col"><span className="text-sm font-bold">開啟網路資料夾</span><span className="text-[10px] opacity-70">連至 QNAP 共享空間</span></div></button>
            <div className="px-1 pt-1 border-t border-slate-800 mt-2 space-y-2">
              <input type="file" accept=".json" ref={dbJsonInputRef} className="hidden" onChange={handleImportDbJson} />
              <button onClick={() => dbJsonInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-orange-600/10 border border-orange-500/30 text-orange-400 hover:bg-orange-600 hover:text-white group"><UploadIcon className="w-5 h-5" /><div className="flex items-start text-left flex-col"><span className="text-sm font-bold">匯入 db.json</span><span className="text-[10px] opacity-70">還原系統備份資料</span></div></button>
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
                <img src="logo.png" alt="User" className="w-full h-full object-cover" />
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
           view === 'hr' ? (<div className="flex-1 overflow-hidden"><HRManagement employees={employees} attendance={attendance} overtime={overtime} monthRemarks={monthRemarks} dailyDispatches={dailyDispatches} onUpdateEmployees={setEmployees} onUpdateAttendance={setAttendance} onUpdateOvertime={setOvertime} onUpdateMonthRemarks={setMonthRemarks} /></div>) :
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
               <div className="flex-1 overflow-hidden"><WeeklySchedule projects={projects} weeklySchedules={weeklySchedules} globalTeamConfigs={globalTeamConfigs} onUpdateWeeklySchedules={setWeeklySchedules} onOpenDrivingTime={() => setIsDrivingTimeModalOpen(true)} /></div>
             </div>
           ) :
           view === 'daily_dispatch' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4"><button onClick={() => setView('engineering_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回工作排程</button></div>
              <div className="flex-1 overflow-hidden"><DailyDispatch projects={projects} weeklySchedules={weeklySchedules} dailyDispatches={dailyDispatches} globalTeamConfigs={globalTeamConfigs} onUpdateDailyDispatches={setDailyDispatches} onOpenDrivingTime={() => setIsDrivingTimeModalOpen(true)} /></div>
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
           selectedProject ? (<div className="flex-1 overflow-hidden"><ProjectDetail project={selectedProject} currentUser={currentUser} onBack={() => setSelectedProject(null)} onUpdateProject={handleUpdateProject} onEditProject={setEditingProject} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} systemRules={systemRules} /></div>) : 
           (<div className="flex-1 overflow-auto"><ProjectList title={getTitle()} projects={currentViewProjects} currentUser={currentUser} lastUpdateInfo={lastUpdateInfo} onSelectProject={setSelectedProject} onAddProject={() => setIsAddModalOpen(true)} onDeleteProject={handleDeleteProject} onDuplicateProject={()=>{}} onEditProject={setEditingProject} onOpenDrivingTime={() => setIsDrivingTimeModalOpen(true)} onImportExcel={() => excelInputRef.current?.click()} onExportExcel={handleExportExcel} onImportConstructionRecords={() => importConstructionRecordsRef.current?.click()} onImportConstructionReports={() => importConstructionReportsRef.current?.click()} onImportCompletionReports={() => importCompletionReportsRef.current?.click()} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} /></div>)}
        </main>
      </div>

      <input type="file" accept=".xlsx, .xls" ref={excelInputRef} className="hidden" onChange={handleImportExcel} />
      <input type="file" accept=".xlsx, .xls" ref={importConstructionRecordsRef} className="hidden" onChange={handleImportConstructionRecords} />
      <input type="file" accept=".xlsx, .xls" ref={importConstructionReportsRef} className="hidden" onChange={handleImportConstructionReports} />
      <input type="file" accept=".xlsx, .xls" ref={importCompletionReportsRef} className="hidden" onChange={handleImportCompletionReports} />

      {isDrivingTimeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
            <header className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <NavigationIcon className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-800">路徑規劃與估算</h3>
              </div>
              <button onClick={() => setIsDrivingTimeModalOpen(false)} className="p-2 bg-white hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-full transition-all shadow-sm">
                <XIcon className="w-5 h-5" />
              </button>
            </header>
            <div className="p-8 flex-1 overflow-y-auto max-h-[60vh] bg-white">
              <DrivingTimeEstimator projects={projects} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} />
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && <AddProjectModal onClose={() => setIsAddModalOpen(false)} onAdd={(p) => { setProjects(sortProjects([p, ...projects])); updateLastAction(p.name); setIsAddModalOpen(false); }} defaultType={view === 'maintenance' ? ProjectType.MAINTENANCE : view === 'modular_house' ? ProjectType.MODULAR_HOUSE : ProjectType.CONSTRUCTION} />}
      {editingProject && <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onSave={handleUpdateProject} />}
    </div>
  );
};

export default App;
