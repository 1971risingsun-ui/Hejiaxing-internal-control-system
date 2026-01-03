import React, { useMemo, useState } from 'react';
import { Project, CompletionItem, FenceMaterialItem, FenceMaterialSheet, SystemRules } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, TrashIcon, PlusIcon, ChevronRightIcon, ArrowLeftIcon } from './Icons';

interface GlobalPurchasingItemsProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
  onBack: () => void;
}

type SortKey = 'projectName' | 'date' | 'name';
type SortDirection = 'asc' | 'desc' | null;

const GlobalPurchasingItems: React.FC<GlobalPurchasingItemsProps> = ({ projects, onUpdateProject, systemRules, onBack }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });

  const getDaysOffset = (dateStr: string, days: number) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  // 彙整採購項目 (非生產、非協力的規劃項目)
  const purchasingItems = useMemo(() => {
    let list: { project: Project; item: CompletionItem; itemIdx: number; reportIdx: number }[] = [];
    
    projects.forEach(project => {
      if (!project.planningReports || project.planningReports.length === 0) return;
      
      const latestReportIdx = project.planningReports.reduce((latestIdx, curr, idx, arr) => {
        return curr.timestamp > arr[latestIdx].timestamp ? idx : latestIdx;
      }, 0);
      
      const report = project.planningReports[latestReportIdx];
      
      report.items.forEach((item, itemIdx) => {
        const name = item.name || '';
        const isSub = systemRules.subcontractorKeywords.some(kw => name.includes(kw));
        const isProd = systemRules.productionKeywords.some(kw => name.includes(kw));
        
        // 只顯示非生產且非協力的項目 (圍籬主項、組合屋主項)
        if (!isSub && !isProd) {
          list.push({ project, item, itemIdx, reportIdx: latestReportIdx });
        }
      });
    });
    
    if (sortConfig.direction) {
      list.sort((a, b) => {
        let valA = '';
        let valB = '';

        switch (sortConfig.key) {
          case 'projectName':
            valA = a.project.name;
            valB = b.project.name;
            break;
          case 'date':
            valA = a.item.productionDate || getDaysOffset(a.project.appointmentDate, -7) || '9999-12-31';
            valB = b.item.productionDate || getDaysOffset(b.project.appointmentDate, -7) || '9999-12-31';
            break;
          case 'name':
            valA = a.item.name;
            valB = b.item.name;
            break;
        }

        if (sortConfig.direction === 'asc') return valA.localeCompare(valB, 'zh-Hant');
        return valB.localeCompare(valA, 'zh-Hant');
      });
    } else {
        list.sort((a, b) => {
            const dateA = a.item.productionDate || getDaysOffset(a.project.appointmentDate, -7) || '9999-12-31';
            const dateB = b.item.productionDate || getDaysOffset(b.project.appointmentDate, -7) || '9999-12-31';
            return dateA.localeCompare(dateB);
        });
    }
    
    return list;
  }, [projects, sortConfig, systemRules]);

  const handleUpdateItemDate = (projId: string, reportIdx: number, itemIdx: number, newDate: string) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], productionDate: newDate };
    updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
    
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleToggleProduced = (projId: string, reportIdx: number, itemIdx: number) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], isProduced: !updatedItems[itemIdx].isProduced };
    updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
    
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <div className="flex flex-col opacity-20 ml-1"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
    return <div className="flex flex-col ml-1 text-indigo-600"><ChevronRightIcon className={`w-2 h-2 -rotate-90 ${sortConfig.direction === 'asc' ? '' : 'opacity-20'}`} /><ChevronRightIcon className={`w-2 h-2 rotate-90 ${sortConfig.direction === 'desc' ? '' : 'opacity-20'}`} /></div>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs cursor-pointer transition-colors w-fit" onClick={onBack}>
        <ArrowLeftIcon className="w-3 h-3" /> 返回採購
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white">
            <ClipboardListIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">採購項目總覽</h1>
            <p className="text-xs text-slate-500 font-medium">彙整報價單內容，預設「預定生產日期」為預約日期前 7 天</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-44">
                  <button onClick={() => handleSort('projectName')} className="flex items-center hover:text-indigo-600 transition-colors">
                    案件名稱 {renderSortIcon('projectName')}
                  </button>
                </th>
                <th className="px-6 py-4 w-40">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-indigo-600 transition-colors">
                    預計生產日期 {renderSortIcon('date')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('name')} className="flex items-center hover:text-indigo-600 transition-colors">
                    品名 {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20">單位</th>
                <th className="px-6 py-4">注意/備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchasingItems.length > 0 ? purchasingItems.map(({ project, item, itemIdx, reportIdx }, idx) => {
                const defaultDate = getDaysOffset(project.appointmentDate, -7);
                const displayDate = item.productionDate || defaultDate;

                return (
                  <tr key={`${project.id}-${idx}`} className={`hover:bg-slate-50/50 transition-colors group ${item.isProduced ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={!!item.isProduced}
                          onChange={() => handleToggleProduced(project.id, reportIdx, itemIdx)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className={`font-black text-sm truncate max-w-[140px] ${item.isProduced ? 'text-slate-400 line-through' : 'text-indigo-700'}`}>
                          {project.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="date" 
                          value={displayDate}
                          onChange={(e) => handleUpdateItemDate(project.id, reportIdx, itemIdx, e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-bold text-sm ${item.isProduced ? 'text-slate-400' : 'text-slate-800'}`}>{item.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 whitespace-pre-wrap max-w-[200px] leading-relaxed">
                        {item.spec || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-black text-sm ${item.isProduced ? 'text-slate-400' : 'text-blue-600'}`}>{item.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400 font-bold">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 italic truncate max-w-[150px]">
                        {item.itemNote || '-'}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前沒有任何待採購的規劃項目</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
          <span>共計 {purchasingItems.length} 項採購規劃</span>
          <span>日期自動連動案件預約時間</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalPurchasingItems;