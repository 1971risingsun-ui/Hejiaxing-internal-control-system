import React, { useMemo, useState } from 'react';
import { Project, CompletionItem, FenceMaterialItem, SystemRules, Supplier, ProductEntry } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, ChevronRightIcon, ArrowLeftIcon, EditIcon, XIcon, CheckCircleIcon, UsersIcon, PlusIcon } from './Icons';

interface GlobalPurchasingItemsProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
  onBack: () => void;
  suppliers: Supplier[];
  onUpdateSuppliers: (list: Supplier[]) => void;
  onUpdateSubcontractors: (list: Supplier[]) => void;
}

type SortKey = 'projectName' | 'date' | 'name';
type SortDirection = 'asc' | 'desc' | null;

const GlobalPurchasingItems: React.FC<GlobalPurchasingItemsProps> = ({ 
  projects, onUpdateProject, systemRules, onBack, suppliers, onUpdateSuppliers, onUpdateSubcontractors 
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });
  
  const [projectFilter, setProjectFilter] = useState<string>('ALL');

  // 用於詢問是否加入清冊的 Modal 狀態
  const [additionPrompt, setAdditionPrompt] = useState<{
    type: 'new_supplier' | 'new_product';
    supplierName: string;
    productName: string;
    existingSupplier?: Supplier;
  } | null>(null);

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

  // 當前聚焦的行資訊，用於動態生成 Datalist 選項
  const [activeRowContext, setActiveRowContext] = useState<{
    itemName: string;
    itemNote: string;
    selectedSupplierName: string;
  } | null>(null);

  const getDaysOffset = (dateStr: string, days: number) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;
  const getUniqueRowId = (projId: string, idx: number) => `${projId}-${idx}`;

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  // 模糊比對供應商名稱的建議邏輯
  const suggestedSupplierNames = useMemo(() => {
    if (!activeRowContext) return suppliers.map(s => s.name);
    
    const { itemName, itemNote } = activeRowContext;
    const query = (itemName + itemNote).toLowerCase();

    // 模糊比對：品名/備註 包含 用途，或 用途 包含 品名/備註
    const matched = suppliers.filter(s => 
      s.productList?.some(p => 
        p.usage && (query.includes(p.usage.toLowerCase()) || p.usage.toLowerCase().includes(query))
      )
    ).map(s => s.name);

    // 如果沒結果，回傳全部
    return (matched.length > 0 ? matched : suppliers.map(s => s.name)).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [suppliers, activeRowContext]);

  // 模糊比對品名的建議邏輯
  const suggestedProductNames = useMemo(() => {
    if (!activeRowContext) return [];
    
    const { selectedSupplierName, itemName, itemNote } = activeRowContext;
    const sup = suppliers.find(s => s.name === selectedSupplierName);
    if (!sup) return [];

    const query = (itemName + itemNote).toLowerCase();
    
    // 優先過濾出用途匹配的產品名稱
    const matched = sup.productList
      ?.filter(p => p.usage && (query.includes(p.usage.toLowerCase()) || p.usage.toLowerCase().includes(query)))
      .map(p => p.name) || [];

    // 若無匹配則列出該廠商所有產品
    const allItems = (sup.productList?.map(p => p.name) || []);
    const results = matched.length > 0 ? matched : allItems;
    
    return Array.from(new Set(results)).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [suppliers, activeRowContext]);

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
          const activeSubItems = savedSheet?.items || []; // 僅顯示已生成的備料

          if (activeSubItems.length > 0) {
            activeSubItems.forEach((sub, subIdx) => {
                list.push({ 
                    project, type: 'sub', subItem: sub, mainItem: item, mainItemIdx: itemIdx, reportIdx: latestReportIdx, itemKey, subIdx
                });
            });
          } else {
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

  // 核心檢查與詢問邏輯
  const checkAndPromptAddition = (supplierInput: string, productInput: string) => {
    if (!supplierInput || !productInput) return;
    const matchedSup = suppliers.find(s => s.name === supplierInput);
    if (!matchedSup) {
      setAdditionPrompt({ type: 'new_supplier', supplierName: supplierInput, productName: productInput });
    } else {
      const productExists = matchedSup.productList?.some(p => p.name === productInput);
      if (!productExists) {
        setAdditionPrompt({ type: 'new_product', supplierName: supplierInput, productName: productInput, existingSupplier: matchedSup });
      }
    }
  };

  // 更新邏輯：取消連動更新 (不自動修改報價單內容)
  const handleUpdateItemName = (projId: string, reportIdx: number, itemIdx: number, nameInput: string, type: 'main' | 'sub', itemKey?: string, subIdx?: number) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;

    if (type === 'sub' && itemKey !== undefined && subIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        const sheet = sheets[itemKey];
        if (!sheet) return;

        const newItems = [...sheet.items];
        newItems[subIdx] = { ...newItems[subIdx], spec: nameInput };
        sheets[itemKey] = { ...sheet, items: newItems };
        onUpdateProject({ ...project, fenceMaterialSheets: sheets });
        
        const supplierVal = newItems[subIdx].supplierId;
        const supplierName = suppliers.find(s => s.id === supplierVal)?.name || supplierVal || '';
        checkAndPromptAddition(supplierName, nameInput);
    } else {
        const updatedReports = [...project.planningReports];
        const updatedItems = [...updatedReports[reportIdx].items];
        updatedItems[itemIdx] = { ...updatedItems[itemIdx], name: nameInput };
        updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
        onUpdateProject({ ...project, planningReports: updatedReports });

        const supplierVal = updatedItems[itemIdx].supplierId;
        const supplierName = suppliers.find(s => s.id === supplierVal)?.name || supplierVal || '';
        checkAndPromptAddition(supplierName, nameInput);
    }
  };

  const handleUpdateItemSupplier = (projId: string, reportIdx: number, itemIdx: number, supplierInput: string, type: 'main' | 'sub', itemKey?: string, subIdx?: number) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return;

    const matchedSup = suppliers.find(s => s.name === supplierInput);
    const finalSupplierValue = matchedSup ? matchedSup.id : supplierInput;

    if (type === 'sub' && itemKey !== undefined && subIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        const sheet = sheets[itemKey];
        if (!sheet) return;

        const newItems = [...sheet.items];
        newItems[subIdx] = { ...newItems[subIdx], supplierId: finalSupplierValue };
        sheets[itemKey] = { ...sheet, items: newItems };
        onUpdateProject({ ...project, fenceMaterialSheets: sheets });
        if (newItems[subIdx].spec) checkAndPromptAddition(supplierInput, newItems[subIdx].spec);
    } else {
        const updatedReports = [...project.planningReports];
        const updatedItems = [...updatedReports[reportIdx].items];
        updatedItems[itemIdx] = { ...updatedItems[itemIdx], supplierId: finalSupplierValue };
        updatedReports[reportIdx] = { ...updatedReports[reportIdx], items: updatedItems };
        onUpdateProject({ ...project, planningReports: updatedReports });
        if (updatedItems[itemIdx].name) checkAndPromptAddition(supplierInput, updatedItems[itemIdx].name);
    }
  };

  const executeAddition = () => {
    if (!additionPrompt) return;
    const { type, supplierName, productName, existingSupplier } = additionPrompt;
    if (type === 'new_supplier') {
        const newSup: Supplier = {
            id: crypto.randomUUID(),
            name: supplierName,
            address: '', contact: '', companyPhone: '', mobilePhone: '',
            productList: [{ name: productName, spec: '', usage: '' }]
        };
        onUpdateSuppliers([...suppliers, newSup]);
    } else if (type === 'new_product' && existingSupplier) {
        const updatedSuppliers = suppliers.map(s => {
            if (s.id === existingSupplier.id) {
                return { ...s, productList: [...(s.productList || []), { name: productName, spec: '', usage: '' }] };
            }
            return s;
        });
        onUpdateSuppliers(updatedSuppliers);
    }
    setAdditionPrompt(null);
  };

  const handleSaveModification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const { project, type, mainItemIdx, reportIdx, itemKey, subIdx } = editingItem;

    if (type === 'sub' && editingItem.subItem && itemKey !== undefined && subIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        const sheet = sheets[itemKey];
        if (!sheet) return;
        const newItems = [...sheet.items];
        newItems[subIdx] = { ...editingItem.subItem };
        sheets[itemKey] = { ...sheet, items: newItems };
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
          <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg"><ClipboardListIcon className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">採購項目總覽</h1>
            <p className="text-xs text-slate-500 font-medium">基於用途模糊匹配供應商與品名，修改內容獨立不連動</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-44">
                  <button onClick={() => handleSort('projectName')} className="flex items-center hover:text-indigo-600 transition-colors">案件名稱 {renderSortIcon('projectName')}</button>
                </th>
                <th className="px-6 py-4 w-40">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-indigo-600 transition-colors">預計採購日期 {renderSortIcon('date')}</button>
                </th>
                <th className="px-6 py-4 w-52 text-center">供應商</th>
                <th className="px-6 py-4">品名 (選填)</th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20 text-center">單位</th>
                <th className="px-6 py-4">注意/備註</th>
                <th className="px-6 py-4 w-16 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPurchasingItems.length > 0 ? allPurchasingItems.map((entry, idx) => {
                const { project, type, subItem, mainItem, mainItemIdx, reportIdx, itemKey, subIdx } = entry;
                const rowId = getUniqueRowId(project.id, idx);
                const defaultDate = getDaysOffset(project.appointmentDate, -7);
                const displayDate = mainItem.productionDate || defaultDate;

                const rowName = type === 'sub' ? (subItem?.spec || '') : mainItem.name;
                const rowSpec = type === 'sub' ? '' : (mainItem.spec || '-');
                const rowQty = type === 'sub' ? subItem?.quantity : mainItem.quantity;
                const rowUnit = type === 'sub' ? subItem?.unit : mainItem.unit;
                const rowNote = type === 'sub' ? (subItem?.name || '-') : (mainItem.itemNote || '-');
                
                const currentSupplierId = type === 'sub' ? subItem?.supplierId : mainItem.supplierId;
                const currentSupplierName = suppliers.find(s => s.id === currentSupplierId)?.name || currentSupplierId || '';

                return (
                  <tr key={rowId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-sm truncate max-w-[140px] text-indigo-700">{project.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="date" value={displayDate} onChange={(e) => handleUpdateItemDate(project.id, reportIdx, mainItemIdx, e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="relative">
                            <UsersIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                list={`suppliers-datalist-${rowId}`}
                                value={currentSupplierName} 
                                onFocus={() => setActiveRowContext({ itemName: rowName, itemNote: rowNote, selectedSupplierName: currentSupplierName })}
                                onChange={(e) => handleUpdateItemSupplier(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
                                placeholder="輸入或選取..."
                                className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            />
                            <datalist id={`suppliers-datalist-${rowId}`}>
                                <option value="手動輸入新廠商..." />
                                {suggestedSupplierNames.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="relative">
                            <input 
                              list={`products-datalist-${rowId}`}
                              value={rowName} 
                              onFocus={() => setActiveRowContext({ itemName: rowName, itemNote: rowNote, selectedSupplierName: currentSupplierName })}
                              onChange={(e) => handleUpdateItemName(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
                              placeholder="輸入或選取..."
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                            />
                            <datalist id={`products-datalist-${rowId}`}>
                                <option value="手動輸入新品項..." />
                                {suggestedProductNames.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>
                    </td>
                    <td className="px-6 py-4"><div className="text-xs text-slate-500 whitespace-pre-wrap max-w-[180px]">{rowSpec}</div></td>
                    <td className="px-6 py-4 text-center"><span className="font-black text-sm text-blue-600">{rowQty}</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-xs text-slate-400 font-bold">{rowUnit}</span></td>
                    <td className="px-6 py-4"><div className="text-xs text-slate-500 font-medium truncate max-w-[150px]">{rowNote}</div></td>
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => setEditingItem({ ...entry })} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><EditIcon className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前沒有任何符合採購規則的項目</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詢問加入清單 Modal */}
      {additionPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                  <div className="p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                        <PlusIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800">加入系統清冊？</h3>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            {additionPrompt.type === 'new_supplier' 
                                ? `偵測到新供應商「${additionPrompt.supplierName}」，是否要將其及其品項「${additionPrompt.productName}」存入清冊？`
                                : `供應商「${additionPrompt.supplierName}」清單中尚無「${additionPrompt.productName}」，是否要追加存入？`}
                        </p>
                      </div>
                  </div>
                  <div className="flex border-t border-slate-100">
                      <button onClick={() => setAdditionPrompt(null)} className="flex-1 py-4 text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors">暫不加入</button>
                      <button onClick={executeAddition} className="flex-1 py-4 text-sm font-black text-indigo-600 hover:bg-indigo-50 transition-colors border-l border-slate-100">確認加入</button>
                  </div>
              </div>
          </div>
      )}

      {/* 修改項目 Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white"><EditIcon className="w-4 h-4" /></div>
                        <h3 className="font-black text-slate-800">修改細節內容</h3>
                    </div>
                    <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
                </header>
                
                <form onSubmit={handleSaveModification} className="p-8 space-y-5">
                    <div className="space-y-4">
                        {editingItem.type === 'sub' && editingItem.subItem ? (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">品名規格 (手動填寫)</label>
                                    <input type="text" required value={editingItem.subItem.spec} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, spec: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">數量</label>
                                        <input type="number" required step="0.01" value={editingItem.subItem.quantity} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, quantity: parseFloat(e.target.value) || 0 } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 outline-none focus:bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">單位</label>
                                        <input type="text" required value={editingItem.subItem.unit} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, unit: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:bg-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">注意/備註</label>
                                    <input type="text" value={editingItem.subItem.name} onChange={e => setEditingItem({ ...editingItem, subItem: { ...editingItem.subItem!, name: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">品名</label>
                                    <input type="text" required value={editingItem.mainItem.name} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, name: e.target.value } })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">規格</label>
                                    <textarea rows={2} value={editingItem.mainItem.spec || ''} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, spec: e.target.value } })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:bg-white transition-all shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">數量</label>
                                        <input type="text" value={editingItem.mainItem.quantity} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, quantity: e.target.value } })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 outline-none focus:bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">單位</label>
                                        <input type="text" value={editingItem.mainItem.unit} onChange={e => setEditingItem({ ...editingItem, mainItem: { ...editingItem.mainItem, unit: e.target.value } })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:bg-white" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <footer className="pt-6 flex gap-3">
                        <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">取消</button>
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