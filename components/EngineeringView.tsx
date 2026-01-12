import React, { useRef, useState } from 'react';
import { Project, User, ProjectStatus, ProjectType, GlobalTeamConfigs, SystemRules, Employee, AttendanceRecord, ConstructionItem, DailyReport, CompletionReport, Attachment, SitePhoto } from '../types';
import ProjectList from './ProjectList';
import ExcelJS from 'exceljs';
import { downloadBlob } from '../utils/fileHelpers';
import { generateId } from '../App';

// 宣告 pdfjs 庫
declare const pdfjsLib: any;

interface EngineeringViewProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentUser: User;
  lastUpdateInfo: { name: string; time: string } | null;
  updateLastAction: (name: string) => void;
  systemRules: SystemRules;
  employees: Employee[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  onSelectProject: (project: Project) => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  handleDeleteProject: (id: string) => void;
  onAddToSchedule: (date: string, teamId: number, taskName: string) => boolean;
  globalTeamConfigs: GlobalTeamConfigs;
}

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

const EngineeringView: React.FC<EngineeringViewProps> = ({
  projects, setProjects, currentUser, lastUpdateInfo, updateLastAction, systemRules,
  employees, setAttendance, onSelectProject, onAddProject, onEditProject,
  handleDeleteProject, onAddToSchedule, globalTeamConfigs
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
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
      const config = systemRules.importConfig?.projectKeywords || { maintenance: '維修', modular: '組合屋' };

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
      setIsProcessing(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
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

      const addProjectsToSheet = async (sheetName: string, projectList: Project[]) => {
        if (projectList.length === 0) return;
        const worksheet = workbook.addWorksheet(sheetName);
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
        for (const p of projectList) {
          let typeLabel = '圍籬';
          if (p.type === ProjectType.MAINTENANCE) typeLabel = '維修';
          else if (p.type === ProjectType.MODULAR_HOUSE) typeLabel = '組合屋';
          const row = worksheet.addRow({
            name: p.name, typeLabel, clientContact: p.clientContact, clientPhone: p.clientPhone, address: p.address,
            appointmentDate: p.appointmentDate, reportDate: p.reportDate, description: p.description, remarks: p.remarks,
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
              const imageId = workbook.addImage({ base64: base64Data, extension: (extension === 'jpeg' ? 'jpg' : extension) as any });
              const colIdx = 10 + imgIdx;
              const excelColWidth = targetWidthPx / 7.5;
              if (!worksheet.getColumn(colIdx).width || worksheet.getColumn(colIdx).width < excelColWidth) {
                worksheet.getColumn(colIdx).width = excelColWidth;
              }
              worksheet.addImage(imageId, { tl: { col: colIdx - 1, row: currentRowIdx - 1 }, ext: { width: targetWidthPx, height: targetHeightPx } });
              row.getCell(colIdx).value = "";
            } catch (e) { console.warn('圖片匯出失敗', e); }
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
      };

      const ongoing = projects.filter(p => p.status !== ProjectStatus.COMPLETED);
      const completed = projects.filter(p => p.status === ProjectStatus.COMPLETED);
      await addProjectsToSheet('案件排程表', ongoing);
      await addProjectsToSheet('已完工案件', completed);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await downloadBlob(blob, `合家興案件排程表_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error: any) { alert('匯出 Excel 失敗: ' + error.message); }
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

  const handleImportConstructionPDF = async (files: File[], mode: 'record' | 'report') => {
    if (typeof pdfjsLib === 'undefined') { alert('PDF 解析函式庫尚未載入。'); return; }
    setIsProcessing(true);
    let successCount = 0, failCount = 0;
    const updatedProjects = [...projects];
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const metadata = await pdf.getMetadata();
        const jsonStr = metadata.info?.Subject || metadata.info?.subject;
        if (!jsonStr) throw new Error('找不到內嵌數據');
        const data = JSON.parse(jsonStr);
        if (!data.project || !data.record) throw new Error('數據格式不正確');
        const { id: projId, name: projName } = data.project;
        const { date, worker, assistant, weather, content, items } = data.record;
        const pIdx = updatedProjects.findIndex(p => p.id === projId || p.name === projName);
        if (pIdx === -1) throw new Error(`找不到專案：${projName}`);
        if (mode === 'record') {
          const otherItems = (updatedProjects[pIdx].constructionItems || []).filter(i => i.date !== date);
          const newItems: ConstructionItem[] = items.map((i: any) => ({
            id: generateId(), name: i.name, quantity: i.quantity, unit: i.unit,
            location: i.location, worker: worker, assistant: assistant, date: date
          }));
          updatedProjects[pIdx].constructionItems = [...otherItems, ...newItems];
        } else {
          const weatherMap: any = { 'sunny': 'sunny', 'cloudy': 'cloudy', 'rainy': 'rainy' };
          const newReport: DailyReport = {
            id: generateId(), date: date, weather: (weatherMap[weather] || 'sunny') as any, content: content,
            reporter: currentUser?.name || '系統匯入', timestamp: Date.now(), photos: [], worker: worker, assistant: assistant
          };
          updatedProjects[pIdx].reports = [...(updatedProjects[pIdx].reports || []).filter(r => r.date !== date), newReport];
          if (items && Array.isArray(items)) {
            const otherItems = (updatedProjects[pIdx].constructionItems || []).filter(i => i.date !== date);
            const newItems: ConstructionItem[] = items.map((i: any) => ({
              id: generateId(), name: i.name, quantity: i.quantity, unit: i.unit,
              location: i.location, worker: worker, assistant: assistant, date: date
            }));
            updatedProjects[pIdx].constructionItems = [...otherItems, ...newItems];
          }
        }
        updateAttendanceForAssistants(date, worker, assistant);
        successCount++;
      } catch (err: any) { console.warn(`檔案 ${file.name} 匯入失敗:`, err.message); failCount++; }
    }
    setProjects(updatedProjects);
    updateLastAction(`批量 PDF 匯入: ${mode === 'record' ? '施工紀錄' : '施工報告'}`);
    setIsProcessing(false);
    alert(`匯入完成！\n成功：${successCount} 份\n失敗：${failCount} 份`);
  };

  const handleImportCompletionReports = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');
      const config = systemRules.importConfig?.completionKeywords || { dismantle: '拆' };
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
          id: generateId(), date, worker: groupMap[key].worker, items: groupMap[key].items, notes: '', signature: '', timestamp: Date.now()
        };
        newProjects[pIdx].completionReports = [...(newProjects[pIdx].completionReports || []).filter(r => r.date !== date), newReport];
      });
      setProjects(newProjects);
      updateLastAction(`批量匯入完工報告 (${importCount} 項)`);
      alert(`匯入完工報告完成，共處理 ${Object.keys(groupMap).length} 份報告，共 ${importCount} 個品項。`);
    } catch (err: any) { alert('匯入失敗: ' + err.message); } finally {
      setIsProcessing(false);
      if (importCompletionReportsRef.current) importCompletionReportsRef.current.value = '';
    }
  };

  return (
    <>
      <ProjectList 
        title="工務總覽" 
        projects={projects} 
        currentUser={currentUser} 
        lastUpdateInfo={lastUpdateInfo} 
        onSelectProject={onSelectProject} 
        onAddProject={onAddProject} 
        onDeleteProject={handleDeleteProject} 
        onDuplicateProject={()=>{}} 
        onEditProject={onEditProject} 
        onImportExcel={() => excelInputRef.current?.click()} 
        onExportExcel={handleExportExcel} 
        onImportConstructionRecords={() => importConstructionRecordsRef.current?.click()} 
        onImportConstructionReports={() => importConstructionReportsRef.current?.click()} 
        onImportCompletionReports={() => importCompletionReportsRef.current?.click()} 
        onAddToSchedule={onAddToSchedule} 
        globalTeamConfigs={globalTeamConfigs} 
      />
      <input type="file" accept=".xlsx, .xls" ref={excelInputRef} className="hidden" onChange={handleImportExcel} />
      <input type="file" multiple accept=".pdf" ref={importConstructionRecordsRef} className="hidden" onChange={(e) => e.target.files && handleImportConstructionPDF(Array.from(e.target.files), 'record')} />
      <input type="file" multiple accept=".pdf" ref={importConstructionReportsRef} className="hidden" onChange={(e) => e.target.files && handleImportConstructionPDF(Array.from(e.target.files), 'report')} />
      <input type="file" accept=".xlsx, .xls" ref={importCompletionReportsRef} className="hidden" onChange={handleImportCompletionReports} />
    </>
  );
};

export default EngineeringView;