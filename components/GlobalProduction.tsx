import React, { useMemo } from 'react';
import { Project, CompletionItem, FenceMaterialItem, FenceMaterialSheet } from '../types';
import { PenToolIcon, BoxIcon, CalendarIcon, TrashIcon, PlusIcon } from './Icons';

interface GlobalProductionProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
}

const PRODUCTION_KEYWORDS = ['防溢座', '施工大門', '小門', '巨'];

const GlobalProduction: React.FC<GlobalProductionProps> = ({ projects, onUpdateProject }) => {
  // 自動判斷分類並產生預設項目 (同步 MaterialPreparation 的邏輯)
  const getDefaultMaterialItems = (itemName: string, quantity: string): { category: string; items: FenceMaterialItem[] } | null => {
    const baseQty = parseFloat(quantity) || 0;
    if (baseQty <= 0) return null;

    if (itemName.includes('甲種圍籬')) {
      return {
        category: '圍籬',
        items: [
          { id: crypto.randomUUID(), name: '立柱', spec: '', quantity: Math.ceil(baseQty / 2.4 + 1), unit: '支' },
          { id: crypto.randomUUID(), name: '二橫', spec: '', quantity: Math.ceil((baseQty / 2.4 + 1) * 2), unit: '支' },
          { id: crypto.randomUUID(), name: '三橫', spec: '', quantity: Math.ceil((baseQty / 2.4 + 1) * 3), unit: '支' },
          { id: crypto.randomUUID(), name: '斜撐', spec: '', quantity: Math.ceil(baseQty / 2.4 + 1), unit: '支' },
          { id: crypto.randomUUID(), name: '圍籬板', spec: '', quantity: Math.ceil(baseQty / 0.75), unit: '片' },
          { id: crypto.randomUUID(), name: '2.4m圍籬板', spec: '', quantity: Math.ceil(baseQty / 0.95), unit: '片' },
        ]
      };
    } else if (itemName.includes('防溢座')) {
      return {
        category: '防溢座',
        items: [
          { id: crypto.randomUUID(), name: '單模', spec: '', quantity: Math.ceil(baseQty / 1.5), unit: '片' },
          { id: crypto.randomUUID(), name: '雙模', spec: '', quantity: Math.ceil((baseQty / 1.5) * 2), unit: '片' },
          { id: crypto.randomUUID(), name: '假模', spec: '', quantity: Math.ceil(baseQty / 2.4), unit: '片' },
        ]
      };
    } else if (itemName.includes('轉角')) {
      return {
        category: '轉角',
        items: [
          { id: crypto.randomUUID(), name: '透明板', spec: '', quantity: Math.ceil(baseQty / 0.75), unit: '片' },
        ]
      };
    } else if (itemName.includes('安全走廊')) {
      return {
        category: '安全走廊',
        items: [
          { id: crypto.randomUUID(), name: '骨料', spec: '', quantity: Math.ceil(baseQty / 2.4) + 1, unit: '組' },
          { id: crypto.randomUUID(), name: '安走板', spec: '', quantity: Math.ceil(baseQty / 0.75), unit: '片' },
        ]
      };
    }
    return null;
  };

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  // 彙整所有案件的生產備料項目
  const productionItems = useMemo(() => {
    const list: { project: Project; item: CompletionItem; itemIdx: number; reportIdx: number }[] = [];
    
    projects.forEach(project => {
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

  const updateMaterialSheet = (projId: string, itemKey: string, updatedSheet: FenceMaterialSheet) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;

    const updatedSheets = { ...(project.fenceMaterialSheets || {}) };
    updatedSheets[itemKey] = updatedSheet;
    onUpdateProject({ ...project, fenceMaterialSheets: updatedSheets });
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
            <p className="text-xs text-slate-500 font-medium">彙整各案場「防溢座、大門、告示牌」等需預作之項目與詳細材料清單</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">即時生產監控</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-44">案件名稱</th>
                <th className="px-6 py-4 w-40">預計生產日期</th>
                <th className="px-6 py-4">品名</th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20">單位</th>
                <th className="px-6 py-4">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productionItems.length > 0 ? productionItems.map(({ project, item, itemIdx, reportIdx }, idx) => {
                const itemKey = getItemKey(item);
                const existingSheet = project.fenceMaterialSheets?.[itemKey];
                const autoData = getDefaultMaterialItems(item.name, item.quantity);
                
                const activeItems = existingSheet?.items || autoData?.items || [];
                const activeCategory = existingSheet?.category || autoData?.category || '';

                return (
                  <React.Fragment key={`${project.id}-${itemKey}-${idx}`}>
                    <tr className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 align-top">
                        <div className="font-black text-indigo-700 text-sm truncate max-w-[160px]" title={project.name}>
                          {project.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
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
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-xs text-slate-500 whitespace-pre-wrap max-w-[220px] leading-relaxed">
                          {item.spec || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center align-top">
                        <span className="font-black text-blue-600 text-sm">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className="text-xs text-slate-400 font-bold">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-xs text-slate-500 italic truncate max-w-[150px]">
                          {item.itemNote || '-'}
                        </div>
                      </td>
                    </tr>
                    
                    {/* 材料單區塊 */}
                    {activeItems.length > 0 && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={7} className="px-8 py-0">
                          <div className="border-l-4 border-indigo-200 ml-6 my-2 overflow-hidden rounded-r-xl border border-slate-100 shadow-sm bg-white/50">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                <tr>
                                  <th className="px-4 py-2 text-left">材料名稱</th>
                                  <th className="px-4 py-2 text-left">規格填寫</th>
                                  <th className="px-4 py-2 w-24 text-center">數量 (自動)</th>
                                  <th className="px-4 py-2 w-16 text-center">單位</th>
                                  <th className="px-4 py-2 w-10 text-center">刪除</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {activeItems.map((mItem, mIdx) => (
                                  <tr key={mItem.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-4 py-2">
                                      <input 
                                        type="text" value={mItem.name} 
                                        onChange={(e) => {
                                          const newItems = [...activeItems];
                                          newItems[mIdx].name = e.target.value;
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
                                        }}
                                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none font-bold text-slate-700"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input 
                                        type="text" value={mItem.spec} placeholder="填寫規格..."
                                        onChange={(e) => {
                                          const newItems = [...activeItems];
                                          newItems[mIdx].spec = e.target.value;
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
                                        }}
                                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-slate-500 italic"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <input 
                                        type="number" value={mItem.quantity} 
                                        onChange={(e) => {
                                          const newItems = [...activeItems];
                                          newItems[mIdx].quantity = parseFloat(e.target.value) || 0;
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
                                        }}
                                        className="w-16 bg-slate-100/50 border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-indigo-400 font-black text-indigo-600"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-center font-bold text-slate-400">{mItem.unit}</td>
                                    <td className="px-4 py-2 text-center">
                                      <button 
                                        onClick={() => {
                                          const newItems = activeItems.filter((_, i) => i !== mIdx);
                                          updateMaterialSheet(project.id, itemKey, { category: activeCategory, items: newItems });
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                      ><TrashIcon className="w-3.5 h-3.5" /></button>
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-slate-50/50">
                                  <td colSpan={5} className="p-1">
                                    <button 
                                      onClick={() => {
                                        const m: FenceMaterialItem = { id: crypto.randomUUID(), name: '新材料', spec: '', quantity: 0, unit: '項' };
                                        updateMaterialSheet(project.id, itemKey, { category: activeCategory || '其他', items: [...activeItems, m] });
                                      }}
                                      className="w-full py-1.5 text-[9px] font-black text-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1 uppercase tracking-widest"
                                    >
                                      <PlusIcon className="w-3 h-3" /> 手動追加備料
                                    </button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前沒有任何生產備料項目</p>
                    <p className="text-xs mt-1">系統會自動從報價單中篩選防溢座與大門等預作項目</p>
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
            連動報價單與自動材料換算
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalProduction;