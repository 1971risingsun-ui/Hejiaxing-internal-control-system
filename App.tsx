import React, { useState, useEffect, useRef, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Project, ProjectStatus, User, UserRole, MaterialStatus, AuditLog, ProjectType, Attachment, WeeklySchedule as WeeklyScheduleType, DailyDispatch as DailyDispatchType, GlobalTeamConfigs, Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark, Supplier, PurchaseOrder, SitePhoto } from './types';
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
import GlobalProduction from './components/GlobalProduction';
import { HomeIcon, UserIcon, LogOutIcon, ShieldIcon, MenuIcon, XIcon, ChevronRightIcon, WrenchIcon, UploadIcon, LoaderIcon, ClipboardListIcon, LayoutGridIcon, BoxIcon, DownloadIcon, FileTextIcon, CheckCircleIcon, AlertIcon, XCircleIcon, UsersIcon, TruckIcon, BriefcaseIcon, ArrowLeftIcon, CalendarIcon, ClockIcon, NavigationIcon, SaveIcon, ExternalLinkIcon, RefreshIcon, PenToolIcon } from './components/Icons';
import { getDirectoryHandle, saveDbToLocal, loadDbFromLocal, getHandleFromIdb, clearHandleFromIdb, saveAppStateToIdb, loadAppStateFromIdb, saveHandleToIdb } from './utils/fileSystem';
import { downloadBlob } from './utils/fileHelpers';
import ExcelJS from 'exceljs';

export const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const bufferToBase64 = (buffer: ArrayBuffer, mimeType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: mimeType });
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
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

// 輔助函式：取得圖片原始尺寸
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
    { id: 'u-1', name: 'Admin User', email: 'admin@hejiaxing.ai', role: UserRole.ADMIN, avatar: '' },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleType[]>([]);
  const [dailyDispatches, setDailyDispatches] = useState<DailyDispatchType[]>([]);
  const [globalTeamConfigs, setGlobalTeamConfigs] = useState<GlobalTeamConfigs>({});
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRecord[]>([]);
  const [monthRemarks, setMonthRemarks] = useState<MonthSummaryRemark[]>([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [subcontractors, setSubcontractors] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirPermission, setDirPermission] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  
  // 新增：追蹤最後更新的案件資訊
  const [lastUpdateInfo, setLastUpdateInfo] = useState<{ name: string; time: string } | null>(null);
  
  const [isDrivingTimeModalOpen, setIsDrivingTimeModalOpen] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
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
        const cachedState = await loadAppStateFromIdb();
        if (cachedState) {
          if (Array.isArray(cachedState.projects)) setProjects(sortProjects(cachedState.projects));
          if (Array.isArray(cachedState.users)) setAllUsers(cachedState.users);
          if (Array.isArray(cachedState.auditLogs)) setAuditLogs(cachedState.auditLogs);
          if (Array.isArray(cachedState.weeklySchedules)) setWeeklySchedules(cachedState.weeklySchedules);
          if (Array.isArray(cachedState.dailyDispatches)) setDailyDispatches(cachedState.dailyDispatches);
          if (cachedState.globalTeamConfigs) setGlobalTeamConfigs(cachedState.globalTeamConfigs);
          if (cachedState.employees) setEmployees(cachedState.employees);
          if (cachedState.attendance) setAttendance(cachedState.attendance);
          if (cachedState.overtime) setOvertime(cachedState.overtime);
          if (cachedState.monthRemarks) setMonthRemarks(cachedState.monthRemarks);
          if (cachedState.suppliers) setSuppliers(cachedState.suppliers);
          if (cachedState.subcontractors) setSubcontractors(cachedState.subcontractors);
          if (cachedState.purchaseOrders) setPurchaseOrders(cachedState.purchaseOrders);
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
    if (Array.isArray(data.employees)) setEmployees(data.employees);
    if (Array.isArray(data.attendance)) setAttendance(data.attendance);
    if (Array.isArray(data.overtime)) setOvertime(data.overtime);
    if (Array.isArray(data.monthRemarks)) setMonthRemarks(data.monthRemarks);
    if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
    if (Array.isArray(data.subcontractors)) setSubcontractors(data.subcontractors);
    if (Array.isArray(data.purchaseOrders)) setPurchaseOrders(data.purchaseOrders);
    if (data.lastUpdateInfo) setLastUpdateInfo(data.lastUpdateInfo);
  };

  const handleImportDbJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.projects || !Array.isArray(json.projects)) throw new Error('備份檔格式不正確');
        if (confirm(`還原將覆寫現有資料，確定要匯入嗎？`)) {
          restoreDataToState(json);
          updateLastAction('匯入備份');
          alert('資料匯入完成');
        }
      } catch (error) { alert('匯入失敗：' + (error as Error).message); }
    };
    reader.readAsText(file);
    if (dbJsonInputRef.current) dbJsonInputRef.current.value = '';
  };

  const handleManualSaveAs = async () => {
    try {
      const appState = {
        projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, lastUpdateInfo, lastSaved: new Date().toISOString()
      };
      const jsonStr = JSON.stringify(appState, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      await downloadBlob(blob, `db_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    } catch (e) {
      alert('存檔失敗');
    }
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
      for (const row of rows) {
        const rowNumber = row.number;
        const rawName = row.getCell(headers['客戶']).value?.toString().trim() || '';
        if (!rawName) continue;
        const categoryStr = row.getCell(headers['類別']).value?.toString() || '';
        let projectType = ProjectType.CONSTRUCTION;
        if (categoryStr.includes('維修')) projectType = ProjectType.MAINTENANCE;
        else if (categoryStr.includes('組合屋')) projectType = ProjectType.MODULAR_HOUSE;
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
                url: base64
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
      setAuditLogs(prev => [{ id: generateId(), userId: currentUser?.id || 'system', userName: currentUser?.name || '系統', action: 'IMPORT_EXCEL', details: `匯入 Excel: ${file.name}, 新增 ${newCount}, 更新 ${updateCount}`, timestamp: Date.now() }, ...prev]);
    } catch (error: any) {
      alert('Excel 匯入失敗: ' + error.message);
    } finally {
      setIsWorkspaceLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('案件排程表');

      // 設定基本欄位寬度
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

      // 設定標題樣式
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      const minRowHeightPoints = 100; // 最小列高 (點)
      const photoHeightPoints = 100; // 照片固定高度 (點)
      const pointsToPixels = 1.333; // Excel 點轉像素概算

      // 輔助函式：計算文字所需的列高
      const countLines = (text: string, colWidth: number) => {
        if (!text) return 1;
        return text.split('\n').reduce((acc, line) => {
          // 概略計算：中文約占 2 單位寬度，數字英文約 1 單位
          // 針對中文與全形字進行更保守的估算 (0.55 - 0.6)
          const estimatedCharsPerLine = colWidth * 0.55; 
          return acc + Math.max(1, Math.ceil(line.length / estimatedCharsPerLine));
        }, 0);
      };

      // 使用 for...of 以便處理非同步圖片載入
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
        
        // 精確估算文字內容高度
        const descLines = countLines(p.description || '', 40);
        const remarksLines = countLines(p.remarks || '', 30);
        const nameLines = countLines(p.name || '', 25);
        const addressLines = countLines(p.address || '', 40);
        
        // 20 點約為標準單行高度，加上足夠的緩衝 (Padding)
        const estimatedTextHeight = Math.max(descLines, remarksLines, nameLines, addressLines) * 18 + 15;
        row.height = Math.max(minRowHeightPoints, estimatedTextHeight);

        // 處理圖片附件
        const imageAttachments = (p.attachments || []).filter(att => att.type.startsWith('image/'));
        
        for (const [imgIdx, att] of imageAttachments.entries()) {
          try {
            const splitData = att.url.split(',');
            if (splitData.length < 2) continue;
            
            const base64Data = splitData[1];
            const extension = att.type.split('/')[1] || 'png';
            
            // 取得圖片比例，根據固定高度計算寬度
            const dims = await getImageDimensions(att.url);
            const aspectRatio = dims.width / dims.height;
            const targetWidthPx = (photoHeightPoints * pointsToPixels) * aspectRatio;
            const targetHeightPx = photoHeightPoints * pointsToPixels;
            
            // 加入圖片到工作簿 (不壓縮)
            const imageId = workbook.addImage({
              base64: base64Data,
              extension: (extension === 'jpeg' ? 'jpg' : extension) as any,
            });

            // 計算放置欄位 (從第 10 欄開始，即 J 欄)
            const colIdx = 10 + imgIdx;
            
            // 動態調整圖片欄位寬度 (Excel 寬度單位約為 7.5 像素)
            const excelColWidth = targetWidthPx / 7.5;
            if (!worksheet.getColumn(colIdx).width || worksheet.getColumn(colIdx).width < excelColWidth) {
                worksheet.getColumn(colIdx).width = excelColWidth;
            }

            // 放置圖片：tl (top-left) 位置，ext (extent) 設為固定 100pt 比例後的尺寸
            worksheet.addImage(imageId, {
              tl: { col: colIdx - 1, row: currentRowIdx - 1 },
              ext: { width: targetWidthPx, height: targetHeightPx }
            });
            
            // 標示此儲存格為空，以便後續套用邊框樣式
            row.getCell(colIdx).value = ""; 
          } catch (e) {
            console.warn('圖片匯出失敗', e);
          }
        }
        currentRowIdx++;
      }

      // 統一設定對齊與邊框
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          if (rowNumber > 1) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await downloadBlob(blob, `合家興案件排程表_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setAuditLogs(prev => [{ 
        id: generateId(), 
        userId: currentUser?.id || 'system', 
        userName: currentUser?.name || '系統', 
        action: 'EXPORT_EXCEL', 
        details: `匯出 Excel 案件表，優化文字顯示高度，照片高度固定 100pt`, 
        timestamp: Date.now() 
      }, ...prev]);
    } catch (error: any) {
      alert('匯出 Excel 失敗: ' + error.message);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    const saveAll = async () => {
        try {
            await saveAppStateToIdb({ projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, lastUpdateInfo, lastSaved: new Date().toISOString() });
            if (dirHandle && dirPermission === 'granted') {
                syncToLocal(dirHandle, { projects, users: allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders });
            }
        } catch (e) {
            console.error('自動儲存失敗', e);
        }
    };
    const timer = setTimeout(saveAll, 500);
    return () => clearTimeout(timer);
  }, [projects, allUsers, auditLogs, weeklySchedules, dailyDispatches, globalTeamConfigs, employees, attendance, overtime, monthRemarks, suppliers, subcontractors, purchaseOrders, dirHandle, dirPermission, isInitialized, lastUpdateInfo]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [view, setView] = useState<'engineering' | 'engineering_hub' | 'driving_time' | 'weekly_schedule' | 'daily_dispatch' | 'engineering_groups' | 'construction' | 'modular_house' | 'maintenance' | 'purchasing_hub' | 'purchasing_management' | 'purchasing_materials' | 'purchasing_suppliers' | 'purchasing_subcontractors' | 'purchasing_orders' | 'production' | 'hr' | 'equipment' | 'report' | 'users'>('engineering');
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

    return (
      <>
        <div className="flex items-center justify-center w-full px-2 py-6 mb-2">
           <h1 className="text-xl font-bold text-white tracking-wider border-b-2 border-yellow-500 pb-1">
             合家興<span className="text-yellow-500 text-base ml-1">行政管理系統</span>
           </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar pb-10">
          {!isInitialized && <div className="px-4 py-2 text-xs text-yellow-500 animate-pulse flex items-center gap-2"><LoaderIcon className="w-3 h-3 animate-spin" /> 資料載入中...</div>}
          
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-4 px-4">工務工程 (Engineering)</div>
          <button onClick={() => { setSelectedProject(null); setView('engineering'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'engineering' && !selectedProject ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutGridIcon className="w-5 h-5" /> 
            <span className="font-medium">工務總覽</span>
          </button>
          <button onClick={() => { setSelectedProject(null); setView('engineering_hub'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'engineering_hub' || view === 'weekly_schedule' || view === 'daily_dispatch' || view === 'engineering_groups' || view === 'driving_time' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BriefcaseIcon className="w-5 h-5" /> 
            <span className="font-medium">工作排程</span>
          </button>

          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-6 px-4">行政管理 (Administration)</div>
          <button onClick={() => { setSelectedProject(null); setView('purchasing_hub'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view.startsWith('purchasing') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BoxIcon className="w-5 h-5" /> 
            <span className="font-medium">採購</span>
          </button>
          <button onClick={() => { setSelectedProject(null); setView('hr'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'hr' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <UsersIcon className="w-5 h-5" /> 
            <span className="font-medium">人事</span>
          </button>
          <button onClick={() => { setSelectedProject(null); setView('production'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'production' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <PenToolIcon className="w-5 h-5" /> 
            <span className="font-medium">生產／備料</span>
          </button>
          <button onClick={() => { setSelectedProject(null); setView('equipment'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'equipment' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <WrenchIcon className="w-5 h-5" /> 
            <span className="font-medium">設備／工具</span>
          </button>

          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-6 px-4">快速捷徑</div>
          <button onClick={() => { setSelectedProject(null); setView('report'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'report' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ClipboardListIcon className="w-5 h-5" /> <span className="font-medium">工作回報</span></button>
          {currentUser.role === UserRole.ADMIN && (<button onClick={() => { setView('users'); setSelectedProject(null); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${view === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ShieldIcon className="w-4 h-4" /> <span className="font-medium">系統權限</span></button>)}

          {/* 系統工具功能移動至此 */}
          <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
            <button 
              onClick={() => handleDirectoryAction(false)} 
              disabled={!isBrowserSupported}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all border ${!isBrowserSupported ? 'opacity-30 border-slate-700 bg-slate-800' : isConnected ? 'bg-green-600/10 border-green-500 text-green-400' : 'bg-red-600/10 border-red-500 text-red-400'}`}
            >
              {isWorkspaceLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : isConnected ? <CheckCircleIcon className="w-5 h-5" /> : <AlertIcon className="w-5 h-5" />}
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-bold">{!isBrowserSupported ? '不支援自動備份' : isConnected ? '電腦同步已開啟' : '未連結電腦目錄'}</span>
                <span className="text-[10px] opacity-70">
                  {isConnected && lastSyncTime ? `最後同步: ${lastSyncTime}` : 'db.json 即時同步'}
                </span>
              </div>
            </button>

            <button 
              onClick={() => window.open("http://192.168.1.2:8080/share.cgi?ssid=79f9da81f26d45bb8e896be3d7d95cbb", "_blank")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-sky-600/10 border border-sky-500/30 text-sky-400 hover:bg-sky-600 hover:text-white group"
            >
              <ExternalLinkIcon className="w-5 h-5" />
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-bold">開啟網路資料夾</span>
                <span className="text-[10px] opacity-70">連至 QNAP 共享空間</span>
              </div>
            </button>

            <div className="px-1 pt-1 border-t border-slate-800 mt-2 space-y-2">
              <input type="file" accept=".json" ref={dbJsonInputRef} className="hidden" onChange={handleImportDbJson} />
              <button onClick={() => dbJsonInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-orange-600/10 border border-orange-500/30 text-orange-400 hover:bg-orange-600 hover:text-white group">
                <UploadIcon className="w-5 h-5" />
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-bold">匯入 db.json</span>
                  <span className="text-[10px] opacity-70">還原系統備份資料</span>
                </div>
              </button>

              <button onClick={handleManualSaveAs} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white group">
                <SaveIcon className="w-5 h-5" />
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-bold">手動另存新檔</span>
                  <span className="text-[10px] opacity-70">下載 db.json 到本機</span>
                </div>
              </button>
            </div>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800 w-full mt-auto mb-safe">
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <LogOutIcon className="w-4 h-4" /> 登出
          </button>
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
      case 'purchasing_hub': return '採購入口';
      case 'purchasing_management': return '採購管理';
      case 'purchasing_materials': return '材料請購';
      case 'purchasing_suppliers': return '供應商清冊';
      case 'purchasing_subcontractors': return '協力廠商清冊';
      case 'purchasing_orders': return '採購單管理';
      case 'production': return '生產／備料總覽';
      case 'hr': return '人事管理模組';
      case 'equipment': return '設備／工具模組';
      case 'construction': return '圍籬案件';
      case 'modular_house': return '組合屋案件';
      case 'maintenance': return '維修案件';
      case 'report': return '工作回報';
      case 'users': return '權限管理';
      default: return '合家興行政管理系統';
    }
  };

  const renderEquipmentView = () => {
    return (
      <div className="p-6 max-w-5xl mx-auto h-full animate-fade-in flex flex-col items-center justify-center text-center">
        <div className="p-6 bg-slate-100 rounded-full mb-4">
          <WrenchIcon className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">設備與工具管理</h2>
        <p className="text-slate-500 max-w-md">
          此模組用於追蹤公司各式機具、車輛維護紀錄與工具借用狀態。
          功能開發中，維護計畫擬定中。
        </p>
      </div>
    );
  };

  const renderEngineeringHub = () => {
    const categories = [
      { id: 'daily_dispatch', label: '明日工作排程', icon: <ClipboardListIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600', desc: '確認明日施工地點與人員' },
      { id: 'driving_time', label: '估計行車時間', icon: <NavigationIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600', desc: '預估早上 8:00 路徑耗時' },
      { id: 'weekly_schedule', label: '週間工作排程', icon: <CalendarIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600', desc: '規劃本週各小組派工任務' },
      { id: 'engineering_groups', label: '工程小組設定', icon: <UsersIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600', desc: '管理師傅、助手與車號預設' },
    ];

    return (
      <div className="p-6 max-w-5xl mx-auto h-full animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setView(cat.id as any)}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all group flex flex-col items-center text-center gap-4"
            >
              <div className={`p-4 rounded-xl ${cat.color} group-hover:scale-110 transition-transform`}>
                {cat.icon}
              </div>
              <div className="font-bold text-slate-800 text-lg">{cat.label}</div>
              <p className="text-xs text-slate-400 font-medium">{cat.desc}</p>
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-2">Work Schedule Hub</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <datalist id="employee-nicknames-list">
        {employeeNicknames.map((name, i) => <option key={i} value={name} />)}
      </datalist>
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
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><UserIcon className="w-5 h-5 text-slate-400" /></div>
          </div>
        </header>
        <main className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] pb-safe">
          {view === 'users' ? (
            <UserManagement 
              users={allUsers} 
              onUpdateUsers={setAllUsers} 
              auditLogs={auditLogs} 
              onLogAction={(action, details) => setAuditLogs(prev => [{ id: generateId(), userId: currentUser.id, userName: currentUser.name, action, details, timestamp: Date.now() }, ...prev])} 
              projects={projects} 
              onRestoreData={restoreDataToState}
              onConnectDirectory={() => handleDirectoryAction(true)}
              dirPermission={dirPermission}
              isWorkspaceLoading={isWorkspaceLoading}
            />
          ) : 
           view === 'report' ? (<div className="flex-1 overflow-auto"><GlobalWorkReport projects={projects} currentUser={currentUser} onUpdateProject={handleUpdateProject} /></div>) : 
           view === 'engineering_hub' ? (<div className="flex-1 overflow-auto">{renderEngineeringHub()}</div>) :
           view === 'purchasing_hub' ? (<div className="flex-1 overflow-auto"><PurchasingModule onNavigate={setView} /></div>) :
           view === 'purchasing_management' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
                <div className="flex-1 overflow-auto"><PurchasingManagement projects={projects} currentUser={currentUser} onUpdateProject={handleUpdateProject} /></div>
              </div>
           ) :
           view === 'purchasing_materials' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
                <div className="flex-1 overflow-auto"><GlobalMaterials projects={projects} onSelectProject={setSelectedProject} /></div>
              </div>
           ) :
           view === 'purchasing_suppliers' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
                <div className="flex-1 overflow-hidden">
                  <SupplierList 
                    title="供應商清冊" 
                    typeLabel="供應商"
                    themeColor="emerald"
                    suppliers={suppliers} 
                    onUpdateSuppliers={setSuppliers} 
                  />
                </div>
              </div>
           ) :
           view === 'purchasing_subcontractors' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
              <div className="flex-1 overflow-hidden">
                <SupplierList 
                  title="協力廠商清冊" 
                  typeLabel="協力廠商"
                  themeColor="indigo"
                  suppliers={subcontractors} 
                  onUpdateSuppliers={setSubcontractors} 
                />
              </div>
            </div>
         ) :
           view === 'purchasing_orders' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-6 pt-4"><button onClick={() => setView('purchasing_hub')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs"><ArrowLeftIcon className="w-3 h-3" /> 返回採購</button></div>
                <div className="flex-1 overflow-hidden"><PurchaseOrders projects={projects} suppliers={[...suppliers, ...subcontractors]} purchaseOrders={purchaseOrders} onUpdatePurchaseOrders={setPurchaseOrders} onUpdateProject={handleUpdateProject} /></div>
              </div>
           ) :
           view === 'hr' ? (
             <div className="flex-1 overflow-hidden">
               <HRManagement 
                employees={employees} 
                attendance={attendance} 
                overtime={overtime} 
                monthRemarks={monthRemarks}
                dailyDispatches={dailyDispatches}
                onUpdateEmployees={setEmployees}
                onUpdateAttendance={setAttendance}
                onUpdateOvertime={setOvertime}
                onUpdateMonthRemarks={setMonthRemarks}
               />
             </div>
           ) :
           view === 'production' ? (
            <div className="flex-1 overflow-hidden">
               <GlobalProduction projects={projects} onUpdateProject={handleUpdateProject} />
            </div>
           ) :
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
           view === 'equipment' ? (<div className="flex-1 overflow-auto">{renderEquipmentView()}</div>) :
           selectedProject ? (<div className="flex-1 overflow-hidden"><ProjectDetail project={selectedProject} currentUser={currentUser} onBack={() => setSelectedProject(null)} onUpdateProject={handleUpdateProject} onEditProject={setEditingProject} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} /></div>) : 
           (<div className="flex-1 overflow-auto"><ProjectList title={getTitle()} projects={currentViewProjects} currentUser={currentUser} lastUpdateInfo={lastUpdateInfo} onSelectProject={setSelectedProject} onAddProject={() => setIsAddModalOpen(true)} onDeleteProject={handleDeleteProject} onDuplicateProject={()=>{}} onEditProject={setEditingProject} onOpenDrivingTime={() => setIsDrivingTimeModalOpen(true)} onImportExcel={() => excelInputRef.current?.click()} onExportExcel={handleExportExcel} onAddToSchedule={handleAddToSchedule} globalTeamConfigs={globalTeamConfigs} /></div>)}
        </main>
      </div>

      <input type="file" accept=".xlsx, .xls" ref={excelInputRef} className="hidden" onChange={handleImportExcel} />

      {isDrivingTimeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10 animate-fade-in">
          <div className="bg-slate-50 w-full max-w-4xl h-full max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative">
            <header className="px-8 py-4 bg-white border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <NavigationIcon className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-800">路徑規劃與估算</h3>
              </div>
              <button onClick={() => setIsDrivingTimeModalOpen(false)} className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-full transition-all">
                <XIcon className="w-6 h-6" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
              <DrivingTimeEstimator projects={projects} globalTeamConfigs={globalTeamConfigs} onAddToSchedule={handleAddToSchedule} />
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