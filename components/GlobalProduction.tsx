import React, { useMemo } from 'react';
import { Project, CompletionItem } from '../types';
import { PenToolIcon, BoxIcon, CalendarIcon } from './Icons';

interface GlobalProductionProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
}

const PRODUCTION_KEYWORDS = ['防溢座', '施工大門', '小門', '巨'];

const GlobalProduction: React.FC<GlobalProductionProps> = ({ projects, onUpdateProject }) => {
  // 彙整所有案件的生產備料項目
  const productionItems = useMemo(() => {
    const list: { project: Project; item: CompletionItem; itemIdx: number; reportIdx: number }[] = [];
    
    projects.forEach(project => {
      // 取得最新的報價單
      if (!project.planningReports || project.planningReports.length === 0) return;
      
      const latestReportIdx = project.planningReports.reduce((latestIdx, curr, idx, arr) => {
        return curr.timestamp > arr[latestIdx].timestamp ? idx : latestIdx;
      }, 0);
      
      const report = project.planningReports[latestReportIdx];
      
      report.items.forEach((item, itemIdx) => {
        const name = item.name || '';
        const isProd = PRODUCTION_KEYWORDS.some(kw => name.includes(kw)) && item.category === 'FENCE_MAIN';
        
        if (isProd) {
          list.push({ project, item, itemIdx, reportIdx: latestReportIdx });
        }
      });
    });
    
    return list.sort((a, b) => {
        // 優先依日期排序
        const dateA = a.item.productionDate || '9999-12-31';
        const dateB = b.item.productionDate || '9999-12-31';
        return dateA.localeCompare(dateB);
    });
  }, [projects]);

  const handleUpdateItemDate = (projId: string, reportIdx: number, itemIdx: number, newDate: string) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], productionDate: newDate };
    updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
    
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white">
            <PenToolIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">生產／備料總覽</h1>
            <p className="text-xs text-slate-500 font-medium">彙整各案場「防溢座、大門、告示牌」等需預作之項目</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">生產進度監控</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-48">案件名稱</th>
                <th className="px-6 py-4 w-40">預計生產日期</th>
                <th className="px-6 py-4">品名</th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20">單位</th>
                <th className="px-6 py-4">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productionItems.length > 0 ? productionItems.map(({ project, item, itemIdx, reportIdx }, idx) => (
                <tr key={`${project.id}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-black text-indigo-700 text-sm truncate max-w-[180px]" title={project.name}>
                      {project.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative group/date">
                      <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within/date:text-indigo-500" />
                      <input 
                        type="date" 
                        value={item.productionDate || ''}
                        onChange={(e) => handleUpdateItemDate(project.id, reportIdx, itemIdx, e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 whitespace-pre-wrap max-w-[250px] leading-relaxed">
                      {item.spec || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-blue-600 text-sm">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 font-bold">{item.unit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 italic">
                      {item.itemNote || '-'}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前沒有任何生產備料項目</p>
                    <p className="text-xs mt-1">系統會自動抓取報價單中品名包含「防溢座、大門、小門、巨」的項目</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center flex-shrink-0">
          <span>共計 {productionItems.length} 項生產清單</span>
          <span className="animate-pulse flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
            即時彙整報價單內容
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalProduction;