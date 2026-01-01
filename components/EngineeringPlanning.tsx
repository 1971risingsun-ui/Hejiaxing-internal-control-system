import React, { useState, useRef, useEffect } from 'react';
import { Project, User, CompletionReport as CompletionReportType, CompletionItem } from '../types';
import { PlusIcon, FileTextIcon, TrashIcon, PenToolIcon, XIcon, StampIcon, CheckCircleIcon, EditIcon, LoaderIcon, ClockIcon, DownloadIcon, UploadIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';
import ExcelJS from 'exceljs';

declare const html2canvas: any;
declare const jspdf: any;

interface EngineeringPlanningProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

// 根據需求更新分類：僅保留「安全圍籬」與「組合房屋」大項
const CATEGORIES = {
    FENCE: {
        id: 'FENCE',
        label: '安全圍籬及休息區',
        defaultUnit: '米',
        items: [
            "怪手整地、打洞",
            "新作防颱型甲種圍籬",
            "30cm防溢座 - 單模",
            "基地內圍牆加高圍籬",
            "新作8米施工大門",
            "新作6米施工大門",
            "警示燈",
            "告示牌",
            "安衛貼紙",
            "美化帆布",
            "隔音帆布",
            "噪音管制看板",
            "監測告示牌",
            "休息區",
            "生活垃圾雨遮",
            "電箱網狀圍籬",
            "電箱網狀小門加工",
            "大門寫字"
        ]
    },
    MODULAR: {
        id: 'MODULAR',
        label: '組合房屋',
        defaultUnit: '坪',
        items: [
            "基礎框架 + 周邊模板",
            "主結構租賃",
            "牆板噴漆",
            "屋頂鋼板",
            "特殊雙後紐門(1F)",
            "D2單開門",
            "走道",
            "樓梯",
            "客製化樓梯上蓋",
            "1F雨披",
            "W1窗",
            "天溝、落水管",
            "屋頂防颱",
            "吊裝運費",
            "天花板",
            "2F-2分夾板+PVC地磚",
            "1F地坪-底料+PVC地磚",
            "牆板隔間",
            "走道止滑毯",
            "百葉窗",
            "土尾工",
            "整體粉光",
            "組合房屋拆除"
        ]
    }
};

const EngineeringPlanning: React.FC<EngineeringPlanningProps> = ({ project, currentUser, onUpdateProject }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditing, setIsEditing] = useState(true);
  
  const [worker, setWorker] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CompletionItem[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  const [estDaysFence, setEstDaysFence] = useState('12');
  const [estDaysModular, setEstDaysModular] = useState('20');

  const [customItem, setCustomItem] = useState({ name: '', action: 'install' as 'install'|'dismantle', spec: '', quantity: '', unit: '', itemNote: '' });

  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasReport = (project.planningReports || []).some(r => r.date === reportDate);

  useEffect(() => {
    const existingReport = (project.planningReports || []).find(r => r.date === reportDate);
    
    if (existingReport) {
        setWorker(existingReport.worker);
        const noteContent = existingReport.notes || '';
        const fenceMatch = noteContent.match(/圍籬：(\d+)\s*日/);
        const modularMatch = noteContent.match(/組合屋：(\d+)\s*日/);
        if (fenceMatch) setEstDaysFence(fenceMatch[1]);
        if (modularMatch) setEstDaysModular(modularMatch[1]);
        
        setNotes(noteContent.replace(/【預估工期】.*?\n\n/s, ''));
        setItems(existingReport.items || []);
        setSignatureUrl(existingReport.signature);
        setIsEditing(false);
    } else {
        setWorker('');
        setNotes('');
        setItems([]);
        setSignatureUrl(null);
        setIsEditing(true);
    }
  }, [reportDate, project.planningReports]);

  const handleSave = () => {
      const combinedNotes = `【預估工期】圍籬：${estDaysFence} 日 / 組合屋：${estDaysModular} 日\n\n${notes}`;

      const newReport: CompletionReportType = {
          id: (project.planningReports || []).find(r => r.date === reportDate)?.id || crypto.randomUUID(),
          date: reportDate,
          worker,
          items,
          notes: combinedNotes,
          signature: signatureUrl || '',
          timestamp: Date.now()
      };

      const otherReports = (project.planningReports || []).filter(r => r.date !== reportDate);
      const updatedReports = [...otherReports, newReport];

      onUpdateProject({
          ...project,
          planningReports: updatedReports
      });
      
      setIsEditing(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('找不到工作表');

      const importedItems: CompletionItem[] = [];
      let currentCategory = 'FENCE';

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < 2) return;

        const firstCell = row.getCell(1).value?.toString().trim();
        const itemName = row.getCell(2).value?.toString().trim();
        const itemSpec = row.getCell(3).value?.toString().trim() || '';
        const itemQty = row.getCell(4).value?.toString().trim() || '';
        const itemUnit = row.getCell(5).value?.toString().trim() || '';

        // 偵測估價單中的大分類，並對應到新分類
        if (itemName?.includes('安全圍籬')) currentCategory = 'FENCE';
        else if (itemName?.includes('組合房屋') || itemName?.includes('裝修工程') || itemName?.includes('其他工程') || itemName?.includes('拆除工程')) currentCategory = 'MODULAR';

        if (itemName && !isNaN(Number(firstCell)) && firstCell !== '') {
            importedItems.push({
                name: itemName,
                action: 'install',
                spec: itemSpec,
                quantity: itemQty,
                unit: itemUnit,
                category: currentCategory,
                itemNote: ''
            });
        }
      });

      if (importedItems.length > 0) {
        setItems(prev => {
            const combined = [...prev];
            importedItems.forEach(newItem => {
                if (!combined.some(i => i.name === newItem.name && i.category === newItem.category && i.spec === newItem.spec)) {
                    combined.push(newItem);
                }
            });
            return combined;
        });
        alert(`成功匯入 ${importedItems.length} 個規劃項目`);
      } else {
        alert('未偵測到有效項目，請確認 Excel 格式是否與估價單範本相符');
      }
    } catch (err: any) {
      console.error(err);
      alert('匯入失敗: ' + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteItem = (index: number) => {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
  };

  const handleAddCategoryItem = (catId: string) => {
      const cat = CATEGORIES[catId as keyof typeof CATEGORIES];
      setItems([...items, { 
          name: cat.items[0], 
          action: 'install', 
          spec: '',
          quantity: '', 
          unit: cat.defaultUnit,
          category: catId,
          itemNote: ''
      }]);
  };

  const handleAddCustomItem = () => {
      if (!customItem.name) return;
      setItems([...items, { 
          name: customItem.name, 
          action: customItem.action, 
          spec: customItem.spec,
          quantity: customItem.quantity,
          unit: customItem.unit,
          category: 'MODULAR',
          itemNote: customItem.itemNote
      }]);
      setCustomItem({ name: '', action: 'install', spec: '', quantity: '', unit: '', itemNote: '' });
  };

  const updateItem = (index: number, field: keyof CompletionItem, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'name') {
           const currentCatId = newItems[index].category;
           const cat = CATEGORIES[currentCatId as keyof typeof CATEGORIES];
           if (cat && cat.defaultUnit) {
               newItems[index].unit = cat.defaultUnit;
           }
      }
      setItems(newItems);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      setIsDrawing(true);
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if ('touches' in e) e.preventDefault();
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
      ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx!.fillStyle = '#ffffff';
          ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }
  };
  const saveSignature = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          setSignatureUrl(canvas.toDataURL('image/jpeg', 0.8));
          setIsSigning(false);
      }
  };

  const generatePDF = async () => {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("必要元件尚未載入，請重新整理頁面");
        return;
    }
    setIsGeneratingPDF(true);
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1100px'; // 稍微加寬以容納新欄位
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    const renderCategorySection = (catKey: string) => {
        const cat = CATEGORIES[catKey as keyof typeof CATEGORIES];
        const categoryItems = items.filter(i => i.category === catKey);
        if (categoryItems.length === 0) return '';
        const rows = categoryItems.map((item, idx) => `
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 11px;">${item.action === 'install' ? '裝' : item.action === 'dismantle' ? '拆' : '-'}</td>
                <td style="border: 1px solid #000; padding: 6px; font-size: 12px; font-weight: bold;">${item.name}</td>
                <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">${item.spec || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">${item.itemNote || ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px; font-weight: bold;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${item.unit}</td>
            </tr>
        `).join('');
        return `
            <div style="margin-bottom: 25px;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; background-color: #f1f5f9; padding: 8px; border-left: 5px solid #0f172a;">${cat.label}</div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8fafc;">
                            <th style="border: 1px solid #000; padding: 8px; width: 6%;">施作</th>
                            <th style="border: 1px solid #000; padding: 8px; width: 30%;">品名</th>
                            <th style="border: 1px solid #000; padding: 8px; width: 18%;">規格</th>
                            <th style="border: 1px solid #000; padding: 8px; width: 22%;">注意</th>
                            <th style="border: 1px solid #000; padding: 8px; width: 12%;">數量</th>
                            <th style="border: 1px solid #000; padding: 8px; width: 12%;">單位</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    };

    const categoriesHtml = Object.keys(CATEGORIES).map(renderCategorySection).join('');
    
    container.innerHTML = `
        <div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; color: #000; background: white;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 28px; font-weight: bold; margin: 0;">合家興實業有限公司</h1>
                <h2 style="font-size: 22px; font-weight: normal; margin: 10px 0; text-decoration: underline; letter-spacing: 2px;">工 程 規 劃 書 (估 價 預 估)</h2>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 15px;">
                <div><span style="font-weight: bold;">規劃日期：</span> ${reportDate}</div>
                <div><span style="font-weight: bold;">案場名稱：</span> ${project.name}</div>
            </div>
            <div style="border: 2px solid #000; padding: 15px; margin-bottom: 25px; font-size: 15px; background-color: #fffbeb;">
                <span style="font-weight: bold;">工期預估：</span> 圍籬 ${estDaysFence} 日 / 組合屋 ${estDaysModular} 日 (請於施工前 7 日通知安排)
            </div>
            ${items.length > 0 ? categoriesHtml : '<div style="text-align: center; padding: 50px; border: 1px solid #ccc;">尚未加入任何規劃項目</div>'}
            <div style="border: 1px solid #000; padding: 15px; min-height: 120px; margin-bottom: 30px; margin-top: 20px;">
                <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">規劃說明與技術備註：</div>
                <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${notes || '無'}</div>
            </div>
             <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px;">
                <div style="width: 45%;">
                    <div style="font-weight: bold; margin-bottom: 8px;">規劃負責人 (Estimator)：</div>
                    <div style="border-bottom: 2px solid #000; padding: 8px; font-size: 18px; font-weight: bold;">${worker || ''}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: bold; margin-bottom: 15px;">核准簽署 (Approval)：</div>
                    ${signatureUrl ? `<img src="${signatureUrl}" style="max-height: 100px; max-width: 250px;" />` : '<div style="height: 100px; width: 250px; border-bottom: 2px solid #000;"></div>'}
                </div>
            </div>
        </div>
    `;

    await new Promise(resolve => setTimeout(resolve, 800));
    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
             position = heightLeft - imgHeight;
             pdf.addPage();
             pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
             heightLeft -= pdfHeight;
        }
        downloadBlob(pdf.output('blob'), `${project.name}_工程規劃_${reportDate}.pdf`);
    } catch (e) {
        console.error(e);
        alert("PDF 生成失敗");
    } finally {
        document.body.removeChild(container);
        setIsGeneratingPDF(false);
    }
  };

  return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[600px]">
          <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <FileTextIcon className="w-5 h-5 text-indigo-600" /> 工程規劃書 (Engineering Planning)
                  </h3>
                  <div className="flex gap-2">
                       <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleImportExcel} />
                       <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className={`p-2 rounded-full transition-colors ${isImporting ? 'text-slate-300' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title="匯入估價單 Excel"
                        >
                            {isImporting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <UploadIcon className="w-5 h-5" />}
                        </button>
                       <button 
                            onClick={generatePDF}
                            disabled={isGeneratingPDF}
                            className={`p-2 rounded-full transition-colors ${isGeneratingPDF ? 'text-slate-300' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title="匯出規劃書 PDF"
                        >
                            {isGeneratingPDF ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <DownloadIcon className="w-5 h-5" />}
                        </button>
                        {signatureUrl && <div className="text-green-600 flex items-center gap-1 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded ml-1"><StampIcon className="w-3.5 h-3.5" /><span>已核定</span></div>}
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">規劃日期</label>
                      <input 
                        type="date" 
                        value={reportDate}
                        disabled={isEditing && hasReport}
                        onChange={e => setReportDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-50"
                      />
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 shadow-sm flex flex-col justify-center">
                      <label className="block text-xs font-bold text-amber-700 mb-1 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> 圍籬預估工期</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={estDaysFence} onChange={e => setEstDaysFence(e.target.value)} disabled={!isEditing} className="w-full bg-white px-2 py-1 border border-amber-300 rounded font-bold text-sm outline-none" />
                        <span className="text-xs font-bold text-amber-700">日</span>
                      </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm flex flex-col justify-center">
                      <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> 組合屋預估工期</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={estDaysModular} onChange={e => setEstDaysModular(e.target.value)} disabled={!isEditing} className="w-full bg-white px-2 py-1 border border-blue-300 rounded font-bold text-sm outline-none" />
                        <span className="text-xs font-bold text-blue-700">日</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="p-6 space-y-6 overflow-x-auto pb-4">
              {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map(catKey => {
                  const cat = CATEGORIES[catKey];
                  const categoryItems = items
                      .map((item, index) => ({ item, index }))
                      .filter(({ item }) => item.category === catKey);
                  if (!isEditing && categoryItems.length === 0) return null;
                  return (
                    <div key={catKey} className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                        <div className="bg-slate-800 px-4 py-2 font-bold text-white text-sm border-b border-slate-200 flex justify-between items-center">
                            <span>{cat.label}</span>
                            <span className="text-[10px] opacity-70 uppercase tracking-widest">{catKey}</span>
                        </div>
                        {categoryItems.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                                        <tr>
                                            <th className="px-3 py-2 w-20 text-center">施作</th>
                                            <th className="px-3 py-2 min-w-[200px]">品名</th>
                                            <th className="px-3 py-2 min-w-[150px]">規格</th>
                                            <th className="px-3 py-2 min-w-[150px]">注意</th>
                                            <th className="px-3 py-2 w-20 text-center">數量</th>
                                            <th className="px-3 py-2 w-20">單位</th>
                                            {isEditing && <th className="px-3 py-2 w-10 text-center">刪</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {categoryItems.map(({ item, index }) => (
                                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-2 text-center">
                                                    {isEditing ? (
                                                        <select 
                                                            value={item.action} 
                                                            onChange={(e) => updateItem(index, 'action', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-xs font-bold"
                                                        >
                                                            <option value="install">裝</option>
                                                            <option value="dismantle">拆</option>
                                                            <option value="none">無</option>
                                                        </select>
                                                    ) : <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${item.action === 'install' ? 'bg-blue-50 text-blue-700 border-blue-200' : item.action === 'dismantle' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{item.action === 'install' ? '安裝' : item.action === 'dismantle' ? '拆除' : '-'}</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {isEditing ? (
                                                        <select 
                                                            value={item.name} 
                                                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 font-bold"
                                                        >
                                                            {cat.items.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            {!cat.items.includes(item.name) && <option value={item.name}>{item.name}</option>}
                                                        </select>
                                                    ) : <span className="font-bold text-slate-800">{item.name}</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text" 
                                                            value={item.spec || ''} 
                                                            onChange={(e) => updateItem(index, 'spec', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1"
                                                            placeholder="規格"
                                                        />
                                                    ) : <span className="text-slate-600">{item.spec || '-'}</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text" 
                                                            value={item.itemNote || ''} 
                                                            onChange={(e) => updateItem(index, 'itemNote', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-xs"
                                                            placeholder="注意內容"
                                                        />
                                                    ) : <span className="text-slate-500 text-xs">{item.itemNote || '-'}</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text" 
                                                            value={item.quantity} 
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-center font-black text-indigo-600"
                                                            placeholder="0"
                                                        />
                                                    ) : <span className="text-slate-900 font-black block text-center">{item.quantity}</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {isEditing ? (
                                                        <input 
                                                            type="text" 
                                                            value={item.unit} 
                                                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-xs text-slate-500"
                                                            placeholder={cat.defaultUnit || "單位"}
                                                        />
                                                    ) : <span className="text-slate-400 text-xs font-bold">{item.unit}</span>}
                                                </td>
                                                {isEditing && (
                                                    <td className="px-3 py-2 text-center">
                                                        <button onClick={() => handleDeleteItem(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <div className="p-8 text-center text-slate-300 text-xs italic">尚未加入任何規劃項目</div>}
                        {isEditing && (
                            <div className="bg-slate-50 p-2 border-t border-slate-200">
                                <button 
                                    onClick={() => handleAddCategoryItem(catKey)}
                                    className="w-full py-2 bg-white border border-dashed border-slate-300 rounded-lg text-indigo-600 hover:text-indigo-700 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all active:scale-[0.99]"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" /> 加入預估項目
                                </button>
                            </div>
                        )}
                    </div>
                  );
              })}

              {isEditing && (
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-8 shadow-lg">
                    <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">手動追加規劃</h4>
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-6 md:col-span-2">
                            <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer" value={customItem.action} onChange={e => setCustomItem({...customItem, action: e.target.value as any})}>
                                <option value="install">安裝 (裝)</option>
                                <option value="dismantle">拆除 (拆)</option>
                            </select>
                        </div>
                        <div className="col-span-6 md:col-span-2"><input type="text" placeholder="品名" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} /></div>
                        <div className="col-span-12 md:col-span-2"><input type="text" placeholder="規格" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={customItem.spec} onChange={e => setCustomItem({...customItem, spec: e.target.value})} /></div>
                        <div className="col-span-6 md:col-span-2"><input type="text" placeholder="注意內容" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={customItem.itemNote} onChange={e => setCustomItem({...customItem, itemNote: e.target.value})} /></div>
                        <div className="col-span-3 md:col-span-1"><input type="text" placeholder="數量" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none text-center" value={customItem.quantity} onChange={e => setCustomItem({...customItem, quantity: e.target.value})} /></div>
                        <div className="col-span-3 md:col-span-2"><input type="text" placeholder="單位" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none text-center" value={customItem.unit} onChange={e => setCustomItem({...customItem, unit: e.target.value})} /></div>
                        <div className="col-span-12 md:col-span-1"><button onClick={handleAddCustomItem} disabled={!customItem.name} className="w-full h-full bg-white text-slate-900 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-slate-100 transition-all active:scale-95 font-black min-h-[40px] shadow-sm"><PlusIcon className="w-5 h-5" /></button></div>
                    </div>
                </div>
              )}

              <div className="pt-8 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">規劃全域說明與備註 (General Notes)</label>
                  <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl h-32 resize-none disabled:bg-slate-50 disabled:text-slate-400 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" value={notes} onChange={e => setNotes(e.target.value)} disabled={!isEditing} placeholder="請輸入工程規劃細節、施工條件說明 or 全域物料規格備註..."></textarea>
              </div>

              <div className="flex flex-col md:flex-row gap-8 border-t border-slate-100 pt-8 mt-4 items-end">
                  <div className="flex-1 w-full">
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">規劃負責人 (Estimator)</label>
                      <input type="text" value={worker} onChange={e => setWorker(e.target.value)} disabled={!isEditing} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-50 disabled:text-slate-400 text-base font-black text-slate-800 shadow-sm" placeholder="輸入姓名" />
                  </div>
                  <div className="flex-1 w-full flex flex-col items-start gap-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">核定簽署 (Approval)</label>
                      {signatureUrl ? (
                          <div className="relative border border-slate-200 rounded-2xl p-4 bg-white w-full h-[140px] flex items-center justify-center shadow-inner group">
                              <img src={signatureUrl} alt="Signature" className="max-h-full object-contain" />
                              {isEditing && <button onClick={() => setSignatureUrl(null)} className="absolute top-2 right-2 bg-rose-100 text-rose-600 rounded-full p-1.5 hover:bg-rose-200 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>}
                          </div>
                      ) : <button onClick={() => setIsSigning(true)} disabled={!isEditing} className="w-full h-[140px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group hover:border-indigo-400"><PenToolIcon className="w-8 h-8 group-hover:scale-110 transition-transform" /><span className="font-bold">點擊進行數位簽名</span></button>}
                  </div>
              </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {isEditing ? (
                  <>
                    {hasReport && <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm font-bold transition-all active:scale-95">取消</button>}
                    <button onClick={handleSave} className="px-8 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-black flex items-center gap-2 transition-all active:scale-95"><CheckCircleIcon className="w-4 h-4" /> 提交規劃並儲存</button>
                  </>
              ) : <button onClick={() => setIsEditing(true)} className="px-8 py-2 rounded-xl bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 font-black flex items-center gap-2 transition-all active:scale-95"><EditIcon className="w-5 h-5" /> 編輯規劃內容</button>}
          </div>

          {isSigning && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-black text-lg text-slate-800">數位簽章核定</h3>
                        <button onClick={() => setIsSigning(false)} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm"><XIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="p-8 bg-slate-200 flex-1 flex items-center justify-center overflow-hidden">
                         <canvas ref={canvasRef} width={360} height={220} className="bg-white shadow-xl cursor-crosshair touch-none rounded-3xl" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                    </div>
                    <div className="p-6 border-t border-slate-100 flex justify-between items-center gap-3">
                         <button onClick={clearSignature} className="flex items-center gap-2 px-4 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /> 清除重簽</button>
                         <div className="flex gap-2">
                             <button onClick={() => setIsSigning(false)} className="px-5 py-2 text-slate-500 hover:bg-slate-50 rounded-xl font-bold">取消</button>
                             <button onClick={saveSignature} className="px-8 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-100 transition-all active:scale-95">確認並套用</button>
                         </div>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
};

export default EngineeringPlanning;