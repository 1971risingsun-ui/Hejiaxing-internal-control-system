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

  // 自動換算預設材料項目
  const getDefaultMaterialItems = (itemName: string, quantity: string): { category: string; items: FenceMaterialItem[] } | null => {
    const baseQty = parseFloat(quantity) || 0;
    if (baseQty <= 0) return null;

    const formulaConfig = systemRules.materialFormulas.find(f => itemName.includes(f.keyword));
    if (!formulaConfig) return null;

    const generatedItems: FenceMaterialItem[] = formulaConfig.items.map(formulaItem => {
      let calcQty = 0;
      try {
        // eslint-disable-next-line no-new-func
        const func = new Function('baseQty', 'Math', `return ${formulaItem.formula}`);
        calcQty = func(baseQty, Math);
      } catch (e) {
        calcQty = baseQty;
      }
      return {
        id: crypto.randomUUID(),
        name: formulaItem.name,
        spec: '',
        quantity: isNaN(calcQty) ? 0 : calcQty,
        unit: formulaItem.unit
      };
    });

    return {
      category: formulaConfig.category,
      items: generatedItems
    };
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  // 彙整採購細項 (基於材料單內容)
  const purchasingItems = useMemo(() => {
    let list: { 
        project: Project; 
        subItem: FenceMaterialItem; 
        mainItem: CompletionItem; 
        mainItemIdx: number; 
        reportIdx: number 
    }[] = [];
    
    projects.forEach(project => {
      if (!project.planningReports || project.planningReports.length === 0) return;
      
      const latestReportIdx = project.planningReports.reduce((latestIdx, curr, idx, arr) => {
        return curr.timestamp > arr[latestIdx].timestamp ? idx : latestIdx;
      }, 0);
      
      const report = project.planningReports[latestReportIdx];
      
      report.items.forEach((item, itemIdx) => {
        const name = item.name || '';
        // 規則 1: 只要導入圍籬頁籤
        const isFence = item.category === 'FENCE_MAIN';
        // 規則 2: 不包含「生產/備料」和「協力廠商」
        const isSub = systemRules.subcontractorKeywords.some(kw => name.includes(kw));
        const isProd = systemRules.productionKeywords.some(kw => name.includes(kw));
        
        if (isFence && !isSub && !isProd) {
          // 規則 3: 導入材料單內容
          const itemKey = getItemKey(item);
          const savedSheet = project.fenceMaterialSheets?.[itemKey];
          const autoData = getDefaultMaterialItems(item.name, item.quantity);
          const activeSubItems = savedSheet?.items || autoData?.items || [];

          activeSubItems.forEach(sub => {
              list.push({ 
                  project, 
                  subItem: sub, 
                  mainItem: item,
                  mainItemIdx: itemIdx, 
                  reportIdx: latestReportIdx 
              });
          });
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
            valA = a.mainItem.productionDate || getDaysOffset(a.project.appointmentDate, -7) || '9999-12-31';
            valB = b.mainItem.productionDate || getDaysOffset(b.project.appointmentDate, -7) || '9999-12-31';
            break;
          case 'name':
            valA = a.subItem.spec || a.subItem.name;
            valB = b.subItem.spec || b.subItem.name;
            break;
        }

        if (sortConfig.direction === 'asc') return valA.localeCompare(valB, 'zh-Hant');
        return valB.localeCompare(valA, 'zh-Hant');
      });
    } else {
        list.sort((a, b) => {
            const dateA = a.mainItem.productionDate || getDaysOffset(a.project.appointmentDate, -7) || '9999-12-31';
            const dateB = b.mainItem.productionDate || getDaysOffset(b.project.appointmentDate, -7) || '9999-12-31';
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
            <p className="text-xs text-slate-500 font-medium">導入圍籬材料清單，主品項預設日期為預約日期前 7 天</p>
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
                <th className="px-6 py-4">規格 (歸屬)</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20">單位</th>
                <th className="px-6 py-4">注意/備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchasingItems.length > 0 ? purchasingItems.map(({ project, subItem, mainItem, mainItemIdx, reportIdx }, idx) => {
                const defaultDate = getDaysOffset(project.appointmentDate, -7);
                const displayDate = mainItem.productionDate || defaultDate;

                return (
                  <tr key={`${project.id}-${idx}`} className={`hover:bg-slate-50/50 transition-colors group ${mainItem.isProduced ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={!!mainItem.isProduced}
                          onChange={() => handleToggleProduced(project.id, reportIdx, mainItemIdx)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className={`font-black text-sm truncate max-w-[140px] ${mainItem.isProduced ? 'text-slate-400 line-through' : 'text-indigo-700'}`}>
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
                          onChange={(e) => handleUpdateItemDate(project.id, reportIdx, mainItemIdx, e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* 規則：「規格填寫」導入「品名」 */}
                      <div className={`font-bold text-sm ${mainItem.isProduced ? 'text-slate-400' : 'text-slate-800'}`}>
                        {subItem.spec || '(未填寫規格)'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate max-w-[180px]">
                        {mainItem.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/* 規則：「數量 (自動)」導入「數量」 */}
                      <span className={`font-black text-sm ${mainItem.isProduced ? 'text-slate-400' : 'text-blue-600'}`}>
                        {subItem.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {/* 規則：「單位」導入「單位」 */}
                      <span className="text-xs text-slate-400 font-bold">{subItem.unit}</span>
                    </td>
                    <td className="px-6 py-4">
                      {/* 規則：「材料名稱」導入「注意/備註」 */}
                      <div className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                        {subItem.name}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前沒有任何符合採購規則的項目</p>
                    <p className="text-xs mt-1">系統僅導入圍籬分類下，非生產且非協力廠商的材料細項</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
          <span>共計 {purchasingItems.length} 項採購細目</span>
          <span>映射規則：規格填寫 $\rightarrow$ 品名，材料名稱 $\rightarrow$ 注意</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalPurchasingItems;