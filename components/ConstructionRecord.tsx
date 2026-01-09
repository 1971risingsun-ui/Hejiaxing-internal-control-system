
import React, { useState, useEffect, useRef } from 'react';
import { Project, ConstructionItem, User, UserRole, ConstructionSignature, DailyReport, SitePhoto, ProjectType } from '../types';
import { DownloadIcon, PlusIcon, ClipboardListIcon, ArrowLeftIcon, ChevronRightIcon, TrashIcon, CheckCircleIcon as SubmitIcon, PenToolIcon, XIcon, StampIcon, XCircleIcon, SunIcon, CloudIcon, RainIcon, CameraIcon, LoaderIcon, FileTextIcon, BoxIcon, ImageIcon, EditIcon } from './Icons';
import { downloadBlob, processFile } from '../utils/fileHelpers';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';

declare const XLSX: any;
declare const html2canvas: any;
declare const jspdf: any;

interface ConstructionRecordProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  forceEntryMode?: boolean; 
  initialDate?: string; 
}

const STANDARD_CONSTRUCTION_ITEMS = [
  { name: '立柱', unit: '支' },
  { name: '澆置', unit: '洞' },
  { name: '(雙模)前模', unit: '米' },
  { name: '(雙模)後模', unit: '米' },
  { name: '(雙模)螺桿', unit: '米' },
  { name: '(雙模)澆置', unit: '米' },
  { name: '(雙模)拆模', unit: '米' },
  { name: '(雙模)清潔', unit: '' },
  { name: '(雙模)收模', unit: '米' },
  { name: '三橫骨架', unit: '米' },
  { name: '封板', unit: '米' },
  { name: '(單模)組模', unit: '米' },
  { name: '(單模)澆置', unit: '米' },
  { name: '(單模)拆模', unit: '米' },
  { name: '(單模)清潔', unit: '' },
  { name: '(單模)收模', unit: '米' },
  { name: '安走骨架', unit: '米' },
  { name: '安走三橫', unit: '米' },
  { name: '安走封板', unit: '米' },
  { name: '隔音帆布骨架', unit: '米' },
  { name: '隔音帆布', unit: '米' },
  { name: '大門門片安裝', unit: '樘' },
];

const MAINTENANCE_CONSTRUCTION_ITEMS = [
  { name: '一般大門 (Cổng thông thường)', unit: '組/bộ' },
  { name: '日式拉門 (Cửa kéo kiểu Nhật)', unit: '組/bộ' },
  { name: '摺疊門 (Cửa xếp)', unit: '組/bộ' },
  { name: '(4", 5") 門柱 (Trụ cổng)', unit: '支/cây' },
  { name: '大門斜撐 (Thanh chống chéo cổng)', unit: '支/cây' },
  { name: '上拉桿 (Thanh kéo lên)', unit: '組/bộ' },
  { name: '後紐 (Nút sau)', unit: '片/tấm' },
  { name: '門栓、地栓 (Chốt cửa/Chốt sàn)', unit: '支/cây' },
  { name: '門片 (Cánh cửa)', unit: '片/tấm' },
  { name: '上軌道整修 (Sửa chữa ray trên)', unit: '支/thanh' },
  { name: '門片整修 (Sửa chữa cánh cửa)', unit: '組/bộ' },
  { name: '基礎座 (Chân đế)', unit: '個/cái' },
  { name: '下軌道 (Ray dưới)', unit: '米/mét' },
  { name: 'H型鋼立柱 (Cột thép hình H)', unit: '支/cây' },
  { name: '橫衍 (Thanh ngang)', unit: '米/mét' },
  { name: '簡易小門加工 (Gia công cửa nhỏ đơn)', unit: '樘/cửa' },
  { name: '簡易小門維修 (Sửa cửa nhỏ đơn giản)', unit: '式/kiểu' },
  { name: '小門後紐 (Nút sau cửa nhỏ)', unit: '個/cái' },
  { name: '甲種圍籬 (Hàng rào loại A)', unit: '米/mét' },
  { name: '乙種圍籬 (Hàng rào loại B)', unit: '米/mét' },
  { name: '防颱型圍籬 (Hàng rào công trình chống bão)', unit: '米/mét' },
  { name: '一般圍籬立柱 (Trụ hàng rào)', unit: '支/cây' },
  { name: '斜撐 (Chống chéo)', unit: '支/cây' },
  { name: '防颱型立柱 (Cột chống bão)', unit: '支/cây' },
  { name: '6米角鋼 (Thép角)', unit: '支/cây' },
  { name: '長斜撐 (Dầm chéo dài)', unit: '支/cây' },
  { name: '一般鋼板 (Tấm thép thường)', unit: '片/tấm' },
  { name: '烤漆鋼板 (Thép tấm sơn tĩnh điện)', unit: '片/tấm' },
  { name: '鍍鋅鋼板 (Thép mạ kẽm)', unit: '片/tấm' },
  { name: '懸吊式骨架 (Khung treo)', unit: '支/cây' },
  { name: '懸吊式懸臂/短臂 (Cần treo kiểu treo)', unit: '支/cây' },
  { name: 'L收邊板 (Tấm vi園 chữ L)', unit: '片/tấm' },
  { name: '懸吊式安走鋼板 (Tấm thép lối đi an全)', unit: '片/tấm' },
];

const RESOURCE_ITEMS = [
    { name: '點工 (Công nhân theo ngày)', unit: '工/công' },
    { name: '吊卡 (Xe cẩu tự行)', unit: '式/chuyến' },
    { name: '怪手 (Máy đào)', unit: '式/chuyến' }
];

const ConstructionRecord: React.FC<ConstructionRecordProps> = ({ project, currentUser, onUpdateProject, forceEntryMode = false, initialDate }) => {
  const isMaintenance = project.type === ProjectType.MAINTENANCE;
  const mainTitle = isMaintenance ? '施工報告' : '施工紀錄';

  const [constructionMode, setConstructionMode] = useState<'overview' | 'entry'>(
    forceEntryMode ? 'entry' : (isMaintenance ? 'entry' : 'overview')
  );
  
  const [constructionDate, setConstructionDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [dailyWorker, setDailyWorker] = useState('');
  const [dailyAssistant, setDailyAssistant] = useState(''); 
  const [pendingAssistant, setPendingAssistant] = useState(''); 
  const [isHalfDay, setIsHalfDay] = useState(false); 
  const [customItem, setCustomItem] = useState({ name: '', quantity: '', unit: '', location: '' });
  
  const [isEditing, setIsEditing] = useState(true);
  const [resourceInputs, setResourceInputs] = useState<Record<string, string>>({});

  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<ConstructionSignature | null>(null);

  const [reportWeather, setReportWeather] = useState<'sunny' | 'cloudy' | 'rainy'>('sunny');
  const [reportContent, setReportContent] = useState('');
  const [reportPhotos, setReportPhotos] = useState<SitePhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
  const currentStandardItems = isMaintenance ? MAINTENANCE_CONSTRUCTION_ITEMS : STANDARD_CONSTRUCTION_ITEMS;

  useEffect(() => {
    const items = (project.constructionItems || []).filter(i => i.date === constructionDate);
    if (items.length > 0) {
      setDailyWorker(items[0].worker || '');
      setDailyAssistant(items[0].assistant || '');
      
      const currentResources: Record<string, string> = {};
      RESOURCE_ITEMS.forEach(res => {
          const found = items.find(i => i.name === res.name);
          if (found) currentResources[res.name] = found.quantity;
      });
      setResourceInputs(currentResources);
    } else {
      setDailyWorker('');
      setDailyAssistant('');
      setResourceInputs({});
    }

    const existingSig = (project.constructionSignatures || []).find(s => s.date === constructionDate);
    setSignatureData(existingSig || null);

    const existingReport = (project.reports || []).find(r => r.date === constructionDate);
    if (existingReport) {
        setReportWeather(existingReport.weather);
        setReportContent(existingReport.content);
        const photos = (existingReport.photos || []).map(id => project.photos.find(p => p.id === id)).filter((p): p is SitePhoto => !!p);
        setReportPhotos(photos);
    } else {
        setReportWeather('sunny');
        setReportContent('');
        setReportPhotos([]);
    }
  }, [constructionDate, project.constructionItems, project.constructionSignatures, project.reports, project.photos]);

  const updateReportData = (updates: Partial<{ weather: 'sunny' | 'cloudy' | 'rainy', content: string, photos: SitePhoto[] }>) => {
      const newWeather = updates.weather || reportWeather;
      const newContent = updates.content !== undefined ? updates.content : reportContent;
      const newPhotos = updates.photos || reportPhotos;
      
      if (updates.weather) setReportWeather(updates.weather);
      if (updates.content !== undefined) setReportContent(updates.content);
      if (updates.photos) setReportPhotos(updates.photos);

      const otherReports = (project.reports || []).filter(r => r.date !== constructionDate);
      const existingPhotoIds = new Set(project.photos.map(p => p.id));
      const photosToAdd = newPhotos.filter(p => !existingPhotoIds.has(p.id));
      const updatedGlobalPhotos = [...project.photos, ...photosToAdd];

      const reportPayload: DailyReport = {
          id: (project.reports || []).find(r => r.date === constructionDate)?.id || crypto.randomUUID(),
          date: constructionDate,
          weather: newWeather,
          content: newContent,
          reporter: currentUser.name,
          timestamp: Date.now(),
          photos: newPhotos.map(p => p.id),
          worker: dailyWorker,
          assistant: dailyAssistant
      };

      const shouldSave = newContent || newPhotos.length > 0 || (project.reports || []).some(r => r.date === constructionDate);
      if (shouldSave) {
          onUpdateProject({ ...project, reports: [...otherReports, reportPayload], photos: updatedGlobalPhotos });
      }
  };

  const handleReportPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingPhotos(true);
      const files = Array.from(e.target.files) as File[];
      const newPhotos: SitePhoto[] = [];
      for (const file of files) {
          try {
              const dataUrl = await processFile(file);
              newPhotos.push({ id: crypto.randomUUID(), url: dataUrl, timestamp: Date.now(), description: `${mainTitle}附件 - ${constructionDate}` });
          } catch (error) {
              alert("照片處理失敗");
          }
      }
      updateReportData({ photos: [...reportPhotos, ...newPhotos] });
      setIsProcessingPhotos(false);
      e.target.value = '';
    }
  };

  const removeReportPhoto = (id: string) => {
    updateReportData({ photos: reportPhotos.filter(p => p.id !== id) });
  };

  const handleAddItem = () => {
    const newItem: ConstructionItem = {
      id: crypto.randomUUID(),
      name: currentStandardItems[0].name,
      unit: currentStandardItems[0].unit,
      quantity: '',
      location: isMaintenance ? '裝/Lắp đặt' : '',
      worker: dailyWorker,
      assistant: dailyAssistant,
      date: constructionDate
    };
    onUpdateProject({ ...project, constructionItems: [...(project.constructionItems || []), newItem] });
  };

  const handleAddCustomItem = () => {
    if (!customItem.name) return;
    const newItem: ConstructionItem = {
      id: crypto.randomUUID(),
      name: customItem.name,
      quantity: customItem.quantity,
      unit: customItem.unit,
      location: customItem.location,
      worker: dailyWorker,
      assistant: dailyAssistant,
      date: constructionDate
    };
    onUpdateProject({ ...project, constructionItems: [...(project.constructionItems || []), newItem] });
    setCustomItem({ name: '', quantity: '', unit: '', location: '' });
  };

  const deleteConstructionItem = (id: string) => {
    onUpdateProject({ ...project, constructionItems: (project.constructionItems || []).filter(item => item.id !== id) });
  };

  const updateConstructionItem = (id: string, field: keyof ConstructionItem, value: any) => {
    const updatedItems = (project.constructionItems || []).map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'name') {
           const std = currentStandardItems.find(s => s.name === value);
           if (std) updatedItem.unit = std.unit;
        }
        return updatedItem;
      }
      return item;
    });
    onUpdateProject({ ...project, constructionItems: updatedItems });
  };

  const handleHeaderWorkerChange = (val: string) => {
    setDailyWorker(val);
    const updatedItems = (project.constructionItems || []).map(item => item.date === constructionDate ? { ...item, worker: val } : item);
    onUpdateProject({ ...project, constructionItems: updatedItems });
  };

  const getAssistantList = () => {
    return dailyAssistant ? dailyAssistant.split(',').map(s => s.trim()).filter(s => s !== '') : [];
  };

  const handleAddAssistant = () => {
    if (!pendingAssistant.trim()) return;
    const currentList = getAssistantList();
    const finalName = isHalfDay ? `${pendingAssistant.trim()} (半天)` : pendingAssistant.trim();
    
    if (currentList.includes(finalName)) {
        setPendingAssistant('');
        setIsHalfDay(false);
        return;
    }
    
    const newList = [...currentList, finalName];
    const joined = newList.join(', ');
    updateAssistantInItems(joined);
    
    setPendingAssistant('');
    setIsHalfDay(false);
  };

  const removeAssistant = (name: string) => {
    const newList = getAssistantList().filter(a => a !== name);
    const joined = newList.join(', ');
    updateAssistantInItems(joined);
  };

  const updateAssistantInItems = (joinedValue: string) => {
    setDailyAssistant(joinedValue);
    const updatedItems = (project.constructionItems || []).map(item => 
      item.date === constructionDate ? { ...item, assistant: joinedValue } : item
    );
    onUpdateProject({ ...project, constructionItems: updatedItems });
  };

  const handleAssistantInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddAssistant();
    }
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    setIsDrawing(true);
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    if ('touches' in e) e.preventDefault();
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = '#ffffff'; ctx!.fillRect(0, 0, canvas.width, canvas.height);
    }
  };
  const saveSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const newSig: ConstructionSignature = { id: crypto.randomUUID(), date: constructionDate, url: canvas.toDataURL('image/jpeg', 0.8), timestamp: Date.now() };
    const otherSignatures = (project.constructionSignatures || []).filter(s => s.date !== constructionDate);
    onUpdateProject({ ...project, constructionSignatures: [...otherSignatures, newSig] });
    setSignatureData(newSig); setIsSigning(false);
  };

  useEffect(() => {
    if (isSigning && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000000'; }
    }
  }, [isSigning]);

  const handleSubmitLog = () => setIsEditing(false);

  const generateReportPDF = async (date: string) => {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("必要元件尚未載入"); return;
    }
    setIsGeneratingPDF(true);
    const items = (project.constructionItems || []).filter(i => i.date === date);
    const report = (project.reports || []).find(r => r.date === date);
    const signature = (project.constructionSignatures || []).find(s => s.date === date);
    const container = document.createElement('div');
    container.style.position = 'fixed'; container.style.top = '-9999px'; container.style.left = '-9999px'; container.style.width = '800px'; container.style.backgroundColor = '#ffffff'; document.body.appendChild(container);
    const weatherText = report ? (report.weather === 'sunny' ? '晴天' : report.weather === 'cloudy' ? '陰天' : report.weather === 'rainy' ? '雨天' : '未紀錄') : '未紀錄';
    container.innerHTML = `<div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; color: #333; background: white;"><h1 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; font-size: 28px; font-weight: bold; margin-bottom: 25px;">${mainTitle}</h1><div style="display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 16px;"><div><span style="font-weight: bold;">專案：</span>${project.name}</div><div><span style="font-weight: bold;">日期：</span>${date}</div></div><div style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 30px; background-color: #f8f9fa;"><div style="margin-bottom: 8px;"><strong style="color: #4b5563;">人員：</strong> 師傅: ${items[0]?.worker || '無'} / 助手: ${items[0]?.assistant || '無'}</div><div><strong style="color: #4b5563;">天氣：</strong> ${weatherText}</div></div><div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #3b82f6; padding-left: 12px; color: #1f2937;">施工項目</div><table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 15px;"><thead><tr style="background-color: #f3f4f6;"><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">#</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left;">項目</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">數量</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">單位</th><th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left;">${isMaintenance ? '作業' : '位置'}</th></tr></thead><tbody>${items.length > 0 ? items.map((item, idx) => `<tr><td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${idx + 1}</td><td style="border: 1px solid #e5e7eb; padding: 10px;">${item.name}</td><td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.quantity}</td><td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${item.unit}</td><td style="border: 1px solid #e5e7eb; padding: 10px;">${item.location || ''}</td></tr>`).join('') : '<tr><td colspan="5" style="border: 1px solid #e5e7eb; padding: 20px; text-align: center;">無施工項目</td></tr>'}</tbody></table><div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #3b82f6; padding-left: 12px; color: #1f2937;">施工內容與備註</div><div style="white-space: pre-wrap; margin-bottom: 30px; border: 1px solid #e5e7eb; padding: 15px; min-height: 100px; border-radius: 4px;">${report ? report.content : '無內容'}</div><div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #3b82f6; padding-left: 12px; color: #1f2937;">現場照片</div><div style="grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; display: grid;">${report?.photos?.length ? report.photos.map(pid => { const photo = project.photos.find(p => p.id === pid); return photo ? `<div style="border: 1px solid #e5e7eb; padding: 8px; background: #fff;"><img src="${photo.url}" style="width: 100%; height: auto; display: block;" /></div>` : ''; }).join('') : '<div style="grid-column: span 2; padding: 20px; text-align: center;">無照片</div>'}</div>${signature ? `<div style="margin-top: 50px; display: flex; flex-direction: column; align-items: flex-end;"><div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">現場人員簽名：</div><div style="border-bottom: 2px solid #333;"><img src="${signature.url}" style="width: 350px; height: auto;" /></div></div>` : ''}</div>`;
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // 準備內嵌數據 JSON
        const embeddedData = {
          date: date,
          projectName: project.name,
          worker: items[0]?.worker || '',
          assistant: items[0]?.assistant || '',
          items: items.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, location: i.location })),
          report: report ? { weather: report.weather, content: report.content } : null
        };
        
        // 將 JSON 嵌入 PDF Keywords
        pdf.setProperties({
            keywords: JSON.stringify(embeddedData)
        });

        const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData); const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight; let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight); heightLeft -= pdfHeight;
        while (heightLeft > 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight); heightLeft -= pdfHeight; }
        downloadBlob(pdf.output('blob'), `${project.name}_${mainTitle}_${date}.pdf`);
    } catch (error) { alert("PDF 生成失敗"); } finally { document.body.removeChild(container); setIsGeneratingPDF(false); }
  };

  const generateReportExcel = async (date: string) => {
    setIsGeneratingExcel(true);
    try {
        const items = (project.constructionItems || []).filter(i => i.date === date);
        const report = (project.reports || []).find(r => r.date === date);
        const signature = (project.constructionSignatures || []).find(s => s.date === date);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(date);

        // --- 常用樣式定義 ---
        const centerStyle: any = { vertical: 'middle', horizontal: 'center' };
        const leftStyle: any = { vertical: 'middle', horizontal: 'left', wrapText: true };
        const borderThin: any = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        const titleFont: any = { name: 'Microsoft JhengHei', size: 20, bold: true, underline: true };
        const headerFont: any = { name: 'Microsoft JhengHei', size: 11, bold: true };
        const contentFont: any = { name: 'Microsoft JhengHei', size: 10 };
        const blueAccentColor = 'FF1E40AF'; // 深藍色

        // 1. A1: 主標題 (置中底線大字，符合匯入規則需包含「施工報告 - 專案名稱」)
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `${mainTitle} - ${project.name}`;
        titleCell.font = titleFont;
        titleCell.alignment = centerStyle;
        worksheet.getRow(1).height = 45;

        // 2. 日期、人員、天氣資訊 (灰色盒狀區域 A2:E4)
        const infoFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        
        // Row 2: 日期 (精準對應匯入規則 B2)
        worksheet.getCell('A2').value = '日期';
        worksheet.getCell('A2').font = headerFont;
        worksheet.getCell('B2').value = date;
        worksheet.getCell('B2').font = contentFont;
        worksheet.mergeCells('B2:E2');
        
        // Row 3: 人員 (精準對應匯入規則 B3)
        worksheet.getCell('A3').value = '人員';
        worksheet.getCell('A3').font = headerFont;
        worksheet.getCell('B3').value = `師傅: ${items[0]?.worker || '無'} / 助手: ${items[0]?.assistant || '無'}`;
        worksheet.getCell('B3').font = contentFont;
        worksheet.mergeCells('B3:E3');

        // Row 4: 天氣 (精準對應匯入規則 B4)
        const weatherText = report ? (report.weather === 'sunny' ? '晴天' : report.weather === 'cloudy' ? '陰天' : report.weather === 'rainy' ? '雨天' : '未紀錄') : '未紀錄';
        worksheet.getCell('A4').value = '天氣';
        worksheet.getCell('A4').font = headerFont;
        worksheet.getCell('B4').value = weatherText;
        worksheet.getCell('B4').font = contentFont;
        worksheet.mergeCells('B4:E4');

        // 套用資訊盒區域樣式
        for(let r=2; r<=4; r++) {
            for(let c=1; c<=5; c++) {
                const cell = worksheet.getRow(r).getCell(c);
                cell.fill = infoFill;
                cell.alignment = leftStyle;
                cell.border = borderThin;
            }
            worksheet.getRow(r).height = 25;
        }

        // 3. 施工項目 章節標頭 (Row 5)
        worksheet.getRow(5).height = 30;
        const section1Cell = worksheet.getCell('B5');
        section1Cell.value = '施工項目';
        section1Cell.font = { ...headerFont, size: 14, color: { argb: 'FF1E293B' } };
        section1Cell.alignment = leftStyle;
        // 左側藍色側條
        const accent1 = worksheet.getCell('A5');
        accent1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueAccentColor } };
        
        // 4. 表格表頭 (Row 6)
        const tableHeaderRow = worksheet.getRow(6);
        tableHeaderRow.height = 25;
        const headers = ['#', '項目', '數量', '單位', isMaintenance ? '作業' : '位置'];
        headers.forEach((h, i) => {
            const cell = tableHeaderRow.getCell(i + 1);
            cell.value = h;
            cell.font = { ...headerFont, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; // 深灰色
            cell.alignment = centerStyle;
            cell.border = borderThin;
        });

        // 5. 填寫項目數據 (從 Row 7 開始，精準對應匯入規則)
        let currentRow = 7;
        items.forEach((item, idx) => {
            const row = worksheet.getRow(currentRow);
            row.height = 22;
            row.getCell(1).value = idx + 1;
            row.getCell(2).value = item.name;
            row.getCell(3).value = item.quantity;
            row.getCell(4).value = item.unit;
            row.getCell(5).value = item.location || '';
            
            for(let i=1; i<=5; i++) {
                const cell = row.getCell(i);
                cell.font = contentFont;
                cell.alignment = i === 1 || i === 3 || i === 4 ? centerStyle : leftStyle;
                cell.border = borderThin;
            }
            currentRow++;
        });

        // 6. 施工內容與備註 章節標頭
        currentRow += 1;
        worksheet.getRow(currentRow).height = 30;
        const section2Cell = worksheet.getCell(`B${currentRow}`);
        section2Cell.value = '施工內容與備註';
        section2Cell.font = { ...headerFont, size: 14, color: { argb: 'FF1E293B' } };
        section2Cell.alignment = leftStyle;
        const accent2 = worksheet.getCell(`A${currentRow}`);
        accent2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueAccentColor } };

        // 7. 備註內容區塊
        currentRow += 1;
        const noteStartRow = currentRow;
        const noteCell = worksheet.getCell(`A${currentRow}`);
        noteCell.value = report ? report.content : '無內容';
        noteCell.font = contentFont;
        noteCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        worksheet.mergeCells(`A${currentRow}:E${currentRow + 4}`);
        // 畫框
        for(let r=currentRow; r<=currentRow+4; r++) {
            worksheet.getRow(r).height = 20;
            for(let c=1; c<=5; c++) {
                worksheet.getRow(r).getCell(c).border = borderThin;
            }
        }
        currentRow += 5;

        // 8. 現場照片 章節標頭
        currentRow += 1;
        worksheet.getRow(currentRow).height = 30;
        const section3Cell = worksheet.getCell(`B${currentRow}`);
        section3Cell.value = '現場照片';
        section3Cell.font = { ...headerFont, size: 14, color: { argb: 'FF1E293B' } };
        section3Cell.alignment = leftStyle;
        const accent3 = worksheet.getCell(`A${currentRow}`);
        accent3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blueAccentColor } };
        currentRow += 1;

        // 9. 插入簽名圖片
        if (signature) {
            const splitData = signature.url.split(',');
            if (splitData.length > 1) {
                const imageId = workbook.addImage({
                    base64: splitData[1],
                    extension: 'jpeg',
                });
                
                const sigLabelRow = currentRow + 2;
                const sigLabelCell = worksheet.getCell(`D${sigLabelRow}`);
                sigLabelCell.value = '現場人員簽名：';
                sigLabelCell.font = headerFont;
                sigLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
                
                worksheet.addImage(imageId, {
                    tl: { col: 3.8, row: sigLabelRow + 0.2 },
                    ext: { width: 140, height: 60 }
                });
                currentRow += 6;
            }
        } else {
            // 無照片提示
            const noPhotoCell = worksheet.getCell(`A${currentRow}`);
            noPhotoCell.value = '無照片';
            noPhotoCell.font = { ...contentFont, italic: true, color: { argb: 'FF94A3B8' } };
            noPhotoCell.alignment = centerStyle;
            worksheet.mergeCells(`A${currentRow}:E${currentRow + 2}`);
            currentRow += 3;
        }

        // 設定欄寬
        worksheet.getColumn(1).width = 7;
        worksheet.getColumn(2).width = 35;
        worksheet.getColumn(3).width = 12;
        worksheet.getColumn(4).width = 10;
        worksheet.getColumn(5).width = 30;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadBlob(blob, `${project.name}_${mainTitle}_${date}.xlsx`);
    } catch (error) {
        console.error("Excel 匯出錯誤:", error);
        alert("Excel 匯出失敗");
    } finally {
        setIsGeneratingExcel(false);
    }
  };

  // Placeholder return to satisfy React component structure if snippet was incomplete
  return null;
};

// Fix: Add default export to resolve import error in ProjectDetail.tsx
export default ConstructionRecord;
