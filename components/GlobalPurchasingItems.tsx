import React, { useMemo, useState } from 'react';
import { Project, CompletionItem, FenceMaterialItem, FenceMaterialSheet, SystemRules } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, TrashIcon, PlusIcon, ChevronRightIcon, ArrowLeftIcon, EditIcon, XIcon, CheckCircleIcon } from './Icons';

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
  
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [editingItem, setEditingItem] = useState<{
    project: Project;
    type: 'main' | 'sub';
    mainItem: CompletionItem;
    mainItemIdx: number;
    reportIdx: number;
    subItem?: FenceMaterialItem;
    itemKey?: string;
    subIdx?: number;
  } | null>(null);

  const getDaysOffset = (dateStr: string, days: number) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  const getDefaultMaterialItems = (itemName: string, quantity: string): { category: string; items: FenceMaterialItem[] } | null => {
    const baseQty = parseFloat(quantity) || 0;
    if (baseQty <= 0) return null;
    const formulaConfig = systemRules.materialFormulas.find(f => itemName.includes(f.keyword));
    if (!formulaConfig) return null;

    const generatedItems: FenceMaterialItem[] = formulaConfig.items.map(formulaItem => {
      let calcQty = 0;
      try {
        const func = new Function('baseQty', 'Math', `return ${formulaItem.formula}`);
        calcQty = func(baseQty, Math);
      } catch (e) { calcQty = baseQty; }
      return {
        id: crypto.randomUUID(),
        name: formulaItem.name,
        spec: '',
        quantity: isNaN(calcQty) ? 0 : calcQty,
        unit: formulaItem.unit
      };
    });
    return { category: formulaConfig.category, items: generatedItems };
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  // 核心彙整邏輯
  const allPurchasingItems = useMemo(() => {
    let list: { 
        project: Project; 
        type: 'main' | 'sub';
        mainItem: CompletionItem; 
        mainItemIdx: number; 
        reportIdx: number;
        subItem?: FenceMaterialItem; 
        itemKey?: string;
        subIdx?: number;
    }[] = [];
    
    projects.forEach(project => {
      if (!project.planningReports || project.planningReports.length === 0) return;
      const latestReportIdx = project.planningReports.reduce((latestIdx, curr, idx, arr) => {
        return curr.timestamp > arr[latestIdx].timestamp ? idx : latestIdx;
      }, 0);
      const report = project.planningReports[latestReportIdx];
      
      report.items.forEach((item, itemIdx) => {
        const name = item.name || '';
        const isFence = item.category === 'FENCE_MAIN';
        const isSubKeyword = systemRules.subcontractorKeywords.some(kw => name.includes(kw));
        const isProdKeyword = systemRules.productionKeywords.some(kw => name.includes(kw));
        
        if (isFence && !isSubKeyword && !isProdKeyword) {
          const itemKey = getItemKey(item);
          const savedSheet = project.fenceMaterialSheets?.[itemKey];
          const autoData = getDefaultMaterialItems(item.name, item.quantity);
          const activeSubItems = savedSheet?.items || autoData?.items || [];

          if (activeSubItems.length > 0) {
            // Case A: 有材料單 -> 導入材料單細項，不導入品名
            activeSubItems.forEach((sub, subIdx) => {
                list.push({ 
                    project, type: 'sub', subItem: sub, mainItem: item, mainItemIdx: itemIdx, reportIdx: latestReportIdx, itemKey, subIdx
                });
            });
          } else {
            // Case B: 無材料單 -> 導入品名、規格、數量、單位
            list.push({
                project, type: 'main', mainItem: item, mainItemIdx: itemIdx, reportIdx: latestReportIdx
            });
          }
        }
      });
    });
    
    if (projectFilter !== 'ALL') list = list.filter(i => i.project.id === projectFilter);

    if (sortConfig.direction) {
      list.sort((a, b) => {
        let valA = '', valB = '';
        switch (sortConfig.key) {
          case 'projectName': valA = a.project.name; valB = b.project.name; break;
          case 'date':
            valA = a.mainItem.productionDate || getDaysOffset(a.project.appointmentDate, -7) || '9999-12-31';
            valB = b.mainItem.productionDate || getDaysOffset(b.project.appointmentDate, -7) || '9999-12-31';
            break;
          case 'name':
            valA = a.type === 'sub' ? (a.subItem?.spec || '') : a.mainItem.name;
            valB = b.type === 'sub' ? (b.subItem?.spec || '') : b.mainItem.name;
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
  }, [projects, sortConfig, systemRules, projectFilter]);

  const uniqueProjectList = useMemo(() => {
    const fullMap = new Map<string, string>();
    projects.forEach(p => {
        const hasFence = p.planningReports?.some(r => r.items.some(it => it.category === 'FENCE_MAIN'));
        if (hasFence) fullMap.set(p.id, p.name);
    });
    return Array.from(fullMap.entries()).map(([id, name]) => ({ id, name }));
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

  const handleToggleProduced = (projId: string, reportIdx: number, itemIdx: number) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[reportIdx].items];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], isProduced: !updatedItems[itemIdx].isProduced };
    updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleSaveModification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { project, type, mainItemIdx, reportIdx } = editingItem;

    if (type === 'sub' && editingItem.subItem && editingItem.itemKey !== undefined && editingItem.subIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        let sheet = sheets[editingItem.itemKey];
        if (!sheet) {
            const autoData = getDefaultMaterialItems(editingItem.mainItem.name, editingItem.mainItem.quantity);
            sheet = { category: autoData?.category || '其他', items: autoData?.items || [] };
        }
        const newItems = [...sheet.items];
        newItems[editingItem.subIdx] = { ...editingItem.subItem };
        sheets[editingItem.itemKey] = { ...sheet, items: newItems };
        onUpdateProject({ ...project, fenceMaterialSheets: sheets });
    } else if (type === 'main') {
        const updatedReports = [...project.planningReports];
        const updatedItems = [...updatedReports[reportIdx].items];
        updatedItems[mainItemIdx] = { ...editingItem.mainItem };
        updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
        onUpdateProject({ ...project, planningReports: updatedReports });
    }
    setEditingItem(null);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <div className="flex flex-col opacity-20 ml-1"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
    return <div className="flex flex-col ml-1 text-indigo-600"><ChevronRightIcon className={`w-2 h-2 -rotate-90 ${sortConfig.direction === 'asc' ? '' : 'opacity-20'}`} /><ChevronRightIcon className={`w-2 h-2 rotate-90 ${sortConfig.direction === 'desc' ? '' : 'opacity-20'}`} /></div>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs cursor-pointer transition-colors w-fit" onClick={onBack}>
          <ArrowLeftIcon className="w-3 h-3" /> 返回採購
        </div>
        <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">案件過濾:</label>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                <option value="ALL">全部案件 (顯示全部項目)</option>
                {uniqueProjectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white"><ClipboardListIcon className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">採購項目總覽</h1>
            <p className="text-xs text-slate-500 font-medium">遵循材料清單導入規則，預設日期為預約日期 - 7 天</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-44">
                  <button onClick={() => handleSort('projectName')} className="flex items-center hover:text-indigo-600 transition-colors">案件名稱 {renderSortIcon('projectName')}</button>
                </th>
                <th className="px-6 py-4 w-40">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-indigo-600 transition-colors">預計採購日期 {renderSortIcon('date')}</button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('name')} className="flex items-center hover:text-indigo-600 transition-colors">品名 {renderSortIcon('name')}</button>
                </th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20 text-center">單位</th>
                <th className="px-6 py-4">注意/備註</th>
                <th className="px-6 py-4 w-16 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPurchasingItems.length > 0 ? allPurchasingItems.map((entry, idx) => {
                const { project, type, subItem, mainItem, mainItemIdx, reportIdx } = entry;
                const defaultDate = getDaysOffset(project.appointmentDate, -7);
                const displayDate = mainItem.productionDate || defaultDate;

                // 根據類型決定顯示內容
                const rowName = type === 'sub' ? (subItem?.spec || '(未填寫規格)') : mainItem.name;
                const rowSpec = type === 'sub' ? '' : (mainItem.spec || '-');
                const rowQty = type === 'sub' ? subItem?.quantity : mainItem.quantity;
                const rowUnit = type === 'sub' ? subItem?.unit : mainItem.unit;
                const rowNote = type === 'sub' ? (subItem?.name || '-') : (mainItem.itemNote || '-');

                return (
                  <tr key={`${project.id}-${idx}`} className={`hover:bg-slate-50/50 transition-colors group ${mainItem.isProduced ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={!!mainItem.isProduced} onChange={() => handleToggleProduced(project.id, reportIdx, mainItemIdx)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        <div className={`font-black text-sm truncate max-w-[140px] ${mainItem.isProduced ? 'text-slate-400 line-through' : 'text-indigo-700'}`}>{project.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="date" value={displayDate} onChange={(e) => handleUpdateItemDate(project.id, reportIdx, mainItemIdx, e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className={`font-bold text-sm ${mainItem.isProduced ? 'text-slate-400' : 'text-slate-800'}`}>{rowName}</div></td>
                    <td className="px-6 py-4"><div className="text-xs text-slate-500 whitespace-pre-wrap max-w-[180px]">{rowSpec}</div></td>
                    <td className="px-6 py-4 text-center"><span className={`font-black text-sm ${mainItem.isProduced ? 'text-slate-400' : 'text-blue-600'}`}>{rowQty}</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-xs text-slate-400 font-bold">{rowUnit}</span></td>
                    <td className="px-6 py-4"><div className="text-xs text-slate-500 font-medium truncate max-w-[150px]">{rowNote}</div></td>
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => setEditingItem({ ...entry })} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><EditIcon className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前沒有任何符合採購規則的項目</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 修改細項 Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white"><EditIcon className="w-4 h-4" /></div>
                        <h3 className="font-black text-slate-800">修改項目</h3>
                    </div>
                    <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
                </header>
                
                <form onSubmit={handleSaveModification} className="p-8 space-y-5">
                    <div className="space-y-4">
                        {editingItem.type === 'sub' && editingItem.subItem ? (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">品名 (規格填寫)</label>
                                    <input type="text" required value={editingItem.subItem.spec} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, spec: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">數量</label>
                                        <input type="number" required step="0.01" value={editingItem.subItem.quantity} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, quantity: parseFloat(e.target.value) || 0 } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 outline-none focus:bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">單位</label>
                                        <input type="text" required value={editingItem.subItem.unit} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, unit: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:bg-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">注意/備註 (材料名稱)</label>
                                    <input type="text" value={editingItem.subItem.name} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, name: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">品名</label>
                                    <input type="text" required value={editingItem.mainItem.name} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, name: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">規格</label>
                                    <textarea rows={2} value={editingItem.mainItem.spec || ''} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, spec: e.target.value } })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:bg-white transition-all shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">數量</label>
                                        <input type="text" value={editingItem.mainItem.quantity} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, quantity: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 outline-none focus:bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">單位</label>
                                        <input type="text" value={editingItem.mainItem.unit} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, unit: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:bg-white" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <footer className="pt-6 flex gap-3">
                        <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100">取消</button>
                        <button type="submit" className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"><CheckCircleIcon className="w-5 h-5" /> 儲存變更</button>
                    </footer>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default GlobalPurchasingItems;