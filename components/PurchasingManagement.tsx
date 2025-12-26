
import React, { useState, useRef } from 'react';
import { Project, Material, MaterialStatus, User } from '../types';
import { BoxIcon, UploadIcon, FileTextIcon, CheckCircleIcon, AlertIcon, LoaderIcon, SearchIcon } from './Icons';
import ExcelJS from 'exceljs';
import { generateId } from '../App';

interface PurchasingManagementProps {
  projects: Project[];
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

interface ImportResult {
  fileName: string;
  projectName: string;
  status: 'success' | 'error';
  message: string;
}

const PurchasingManagement: React.FC<PurchasingManagementProps> = ({ projects, currentUser, onUpdateProject }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return String(val).trim();
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    const results: ImportResult[] = [];
    
    // Fix: Explicitly cast Array.from(files) to File[] to avoid 'unknown' type errors during iteration
    const fileArray = Array.from(files) as File[];
    
    for (const file of fileArray) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) throw new Error('找不到工作表');

        // 依照 PDF 格式讀取表頭 (假設 專案名稱 在 B2, 填表日期 在 B3...)
        // 如果是標籤與數值在同一格，需要更精細的字串處理
        const getValue = (row: number, col: number) => {
            const cell = worksheet.getRow(row).getCell(col);
            const val = cell.value?.toString() || '';
            // 處理「專案名稱 崇偉-民權西路」這種格式
            if (val.includes(' ')) return val.split(/\s+/).slice(1).join(' ');
            return val;
        };

        const projectName = getValue(2, 1); // A2: 專案名稱 XXX
        const fillingDate = parseExcelDate(worksheet.getRow(3).getCell(1).value?.toString().split(/\s+/)[1]);
        const requisitioner = worksheet.getRow(4).getCell(1).value?.toString().split(/\s+/)[1] || '';
        const deliveryDate = parseExcelDate(worksheet.getRow(5).getCell(1).value?.toString().split(/\s+/)[1]);
        const location = worksheet.getRow(6).getCell(1).value?.toString().split(/\s+/)[1] || '';
        const receiver = worksheet.getRow(7).getCell(1).value?.toString().split(/\s+/)[1] || '';

        // 尋找專案
        const targetProject = projects.find(p => p.name === projectName || projectName.includes(p.name));
        
        if (!targetProject) {
          results.push({ fileName: file.name, projectName, status: 'error', message: '系統中找不到對應專案' });
          continue;
        }

        // 解析材料清單 (從第 10 行開始)
        const newMaterials: Material[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber >= 10) {
            const name = row.getCell(2).value?.toString();
            if (name) {
              newMaterials.push({
                id: generateId(),
                name,
                quantity: Number(row.getCell(3).value) || 0,
                unit: row.getCell(4).value?.toString() || '',
                status: MaterialStatus.PENDING,
                notes: row.getCell(5).value?.toString() || ''
              });
            }
          }
        });

        // 更新專案
        onUpdateProject({
          ...targetProject,
          materialFillingDate: fillingDate,
          materialRequisitioner: requisitioner,
          materialDeliveryDate: deliveryDate,
          materialDeliveryLocation: location as any,
          materialReceiver: receiver,
          materials: [...(targetProject.materials || []), ...newMaterials]
        });

        results.push({ fileName: file.name, projectName, status: 'success', message: `成功匯入 ${newMaterials.length} 項材料` });
      } catch (err: any) {
        results.push({ fileName: file.name, projectName: '未知', status: 'error', message: err.message });
      }
    }

    setImportResults(results);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in flex flex-col gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white">
            <BoxIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">採購管理 (Purchasing)</h1>
            <p className="text-xs text-slate-500">批量處理 Excel 請購單並自動同步至專案</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 匯入卡片 */}
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-4 hover:border-blue-500 transition-all group">
          <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
            <UploadIcon className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">批量匯入 Excel 請購單</h3>
            <p className="text-sm text-slate-500 mt-1">支援多選檔案，自動讀取附件格式內容</p>
          </div>
          <input 
            type="file" 
            multiple 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleBulkImport} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="mt-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isImporting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <FileTextIcon className="w-5 h-5" />}
            {isImporting ? '處理中...' : '選擇檔案並匯入'}
          </button>
        </div>

        {/* 匯入結果預覽 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">本次匯入狀態</h3>
            <button onClick={() => setImportResults([])} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">清除紀錄</button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-2">
            {importResults.length > 0 ? importResults.map((res, i) => (
              <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${res.status === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                {res.status === 'success' ? <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" /> : <AlertIcon className="w-5 h-5 text-red-500 mt-0.5" />}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{res.fileName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    專案: <span className="font-bold">{res.projectName}</span> • {res.message}
                  </div>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                <FileTextIcon className="w-12 h-12 opacity-20 mb-2" />
                <p className="text-xs">等待匯入資料</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 待辦採購統計 */}
      <div className="bg-slate-900 p-6 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <BoxIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">全系統待採購項</div>
            <div className="text-3xl font-black">{projects.reduce((acc, p) => acc + (p.materials?.filter(m => m.status === MaterialStatus.PENDING).length || 0), 0)} 項</div>
          </div>
        </div>
        <div className="h-10 w-px bg-white/10 hidden md:block" />
        <div className="flex-1 w-full max-w-xs relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="快速搜尋請購項目..." className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:bg-white/10 outline-none transition-all" />
        </div>
      </div>
    </div>
  );
};

export default PurchasingManagement;
