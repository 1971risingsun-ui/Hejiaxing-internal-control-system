import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, User, ProjectType, DailyReport, SitePhoto, ConstructionItem, CompletionReport } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, XIcon, ChevronRightIcon, PlusIcon, TrashIcon, CheckCircleIcon, SunIcon, CloudIcon, RainIcon, CameraIcon, LoaderIcon, XCircleIcon, FileTextIcon, DownloadIcon } from './Icons';
import { processFile, downloadBlob } from '../utils/fileHelpers';

declare const html2canvas: any;
declare const jspdf: any;

interface GlobalWorkReportProps {
  projects: Project[];
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

const GlobalWorkReport: React.FC<GlobalWorkReportProps> = ({ projects, currentUser, onUpdateProject }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'));

  const [manuallyAddedIds] = useState<Record<string, string[]>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [formBuffer, setFormBuffer] = useState<{
    worker: string;
    assistant: string;
    weather: 'sunny' | 'cloudy' | 'rainy';
    content: string;
    photos: SitePhoto[];
  }>({
    worker: '',
    assistant: '',
    weather: 'sunny',
    content: '',
    photos: []
  });

  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  const activeProjects = useMemo(() => {
    const todayAdded = manuallyAddedIds[selectedDate] || [];
    return projects.filter(p => {
        const hasReport = (p.reports || []).some(r => r.date === selectedDate);
        const hasItems = (p.constructionItems || []).some(i => i.date === selectedDate);
        const hasCompletion = (p.completionReports || []).some(r => r.date === selectedDate);
        return hasReport || hasItems || hasCompletion || todayAdded.includes(p.id);
    });
  }, [projects, selectedDate, manuallyAddedIds]);

  const mainActiveProject = useMemo(() => {
      const constProjects = activeProjects.filter(p => p.type === ProjectType.CONSTRUCTION);
      if (constProjects.length > 0) return constProjects[0];
      const modularProjects = activeProjects.filter(p => p.type === ProjectType.MODULAR_HOUSE);
      return modularProjects.length > 0 ? modularProjects[0] : null;
  }, [activeProjects]);

  useEffect(() => {
    if (mainActiveProject) {
        const report = (mainActiveProject.reports || []).find(r => r.date === selectedDate);
        const item = (mainActiveProject.constructionItems || []).find(i => i.date === selectedDate);
        
        setFormBuffer({
            worker: report?.worker !== undefined ? report.worker : (item?.worker || ''),
            assistant: report?.assistant !== undefined ? report.assistant : (item?.assistant || ''),
            weather: report?.weather || 'sunny',
            content: (report?.content || '').replace(/^\[已完成\]\s*/, '').replace(/^\[未完成\]\s*/, ''),
            photos: (report?.photos || []).map(id => mainActiveProject.photos.find(p => p.id === id)).filter((p): p is SitePhoto => !!p)
        });
    } else {
        setFormBuffer({ worker: '', assistant: '', weather: 'sunny', content: '', photos: [] });
    }
  }, [selectedDate, mainActiveProject?.id]);

  const handleExportGlobalPDF = async () => {
    if (activeProjects.length === 0) return alert("當日無活躍案件可供匯出");
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') return alert("必要元件尚未載入");
    
    setIsGeneratingPDF(true);

    const exportData: any = {
        date: selectedDate,
        exportedAt: new Date().toISOString(),
        projects: activeProjects.map(p => ({
            id: p.id,
            name: p.name,
            dailyReport: (p.reports || []).find(r => r.date === selectedDate),
            constructionItems: (p.constructionItems || []).filter(i => i.date === selectedDate),
            completionReport: (p.completionReports || []).find(r => r.date === selectedDate)
        }))
    };

    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();

    pdf.setProperties({
        title: `合家興工作彙整_${selectedDate}`,
        subject: JSON.stringify(exportData)
    });

    for (let i = 0; i < activeProjects.length; i++) {
        const p = activeProjects[i];
        if (i > 0) pdf.addPage();

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.width = '850px';
        container.style.backgroundColor = '#ffffff';
        document.body.appendChild(container);

        const report = (p.reports || []).find(r => r.date === selectedDate);
        const items = (p.constructionItems || []).filter(i => i.date === selectedDate);

        let html = `<div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; color: #333; background: white;">`;
        if (i === 0) {
            html += `<h1 style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; font-size: 26px; font-weight: bold;">合家興實業 - 工作彙整</h1>`;
        }
        html += `<h2>${p.name}</h2><p>日期: ${selectedDate}</p><p>人員: ${report?.worker || items[0]?.worker || ''}</p></div>`;

        container.innerHTML = html;
        await new Promise(resolve => setTimeout(resolve, 300));
        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        document.body.removeChild(container);
    }

    setIsGeneratingPDF(false);
    downloadBlob(pdf.output('blob'), `合家興工作回報彙整_${selectedDate}.pdf`);
  };

  return (
    <div className="p-4 md:p-6 flex flex-col h-full bg-slate-50 min-h-0 overflow-hidden animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex-shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600">
                    <ClipboardListIcon className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">工作回報彙整</h1>
                    <p className="text-xs text-slate-500 font-medium">檢視並匯出特定日期的全案場進度</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <button onClick={() => setShowCalendar(!showCalendar)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                        <CalendarIcon className="w-4 h-4 text-rose-500" />
                        {selectedDate}
                    </button>
                    {showCalendar && (
                        <div className="absolute top-full mt-2 right-0 bg-white border rounded-2xl shadow-2xl p-4 z-[100]">
                            <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setShowCalendar(false); }} className="p-2 border rounded" />
                        </div>
                    )}
                </div>
                <button 
                    onClick={handleExportGlobalPDF} 
                    disabled={isGeneratingPDF}
                    className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                >
                    {isGeneratingPDF ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                    匯出日報 PDF
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            {activeProjects.map(p => (
                <div key={p.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase tracking-widest">{p.type}</span>
                            <h3 className="font-black text-slate-800">{p.name}</h3>
                        </div>
                    </div>
                </div>
            ))}
            {activeProjects.length === 0 && (
                <div className="py-32 text-center text-slate-400 italic">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    該日期目前無活躍案件或回報紀錄
                </div>
            )}
        </div>
    </div>
  );
};

export default GlobalWorkReport;