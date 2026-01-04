import React, { useMemo, useState } from 'react';
import { Project, CompletionItem, FenceMaterialItem, SystemRules, Supplier, PurchaseOrder, PurchaseOrderItem } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, ChevronRightIcon, ArrowLeftIcon, XIcon, CheckCircleIcon, UsersIcon, PlusIcon, FileTextIcon, MapPinIcon, UserIcon, TrashIcon, EditIcon } from './Icons';

interface GlobalPurchasingItemsProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
  onBack: () => void;
  suppliers: Supplier[];
  subcontractors: Supplier[];
  onUpdateSuppliers: (list: Supplier[]) => void;
  onUpdateSubcontractors: (list: Supplier[]) => void;
  purchaseOrders: PurchaseOrder[];
  onUpdatePurchaseOrders: (orders: PurchaseOrder[]) => void;
}

type SortKey = 'projectName' | 'date' | 'name' | 'supplier';
type SortDirection = 'asc' | 'desc' | null;

interface RowData {
  project: Project;
  type: 'main' | 'sub';
  mainItem: CompletionItem;
  mainItemIdx: number;
  reportIdx: number;
  subItem?: FenceMaterialItem;
  itemKey?: string;
  subIdx?: number;
  rowKey: string;
}

const getDaysOffset = (dateStr: string, days: number) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// 抽離列組件以解決 Hooks 巢狀使用導致的白屏問題
const PurchasingItemRow: React.FC<{
  entry: RowData;
  suppliers: Supplier[];
  allPartners: Supplier[];
  isPoCreated: boolean | undefined;
  selectedRowKeys: Set<string>;
  toggleRowSelection: (key: string) => void;
  handleUpdateItemDate: (pId: string, rIdx: number, iIdx: number, val: string) => void;
  handleUpdateItemSupplier: (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => void;
  handleUpdateItemName: (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => void;
  handleCheckAndPromptAddition: (row: RowData, sup: string, prod: string) => void;
}> = ({ 
  entry, suppliers, allPartners, isPoCreated, selectedRowKeys, toggleRowSelection, 
  handleUpdateItemDate, handleUpdateItemSupplier, handleUpdateItemName, handleCheckAndPromptAddition 
}) => {
  const { project, type, subItem, mainItem, reportIdx, mainItemIdx, itemKey, subIdx, rowKey } = entry;
  
  const displayDate = mainItem.productionDate || getDaysOffset(project.appointmentDate, -7);
  const rowName = type === 'sub' ? (subItem?.spec || '') : mainItem.name;
  const rowSpec = type === 'sub' ? '' : (mainItem.spec || '-');
  const rowQty = type === 'sub' ? subItem?.quantity : mainItem.quantity;
  const rowUnit = type === 'sub' ? subItem?.unit : mainItem.unit;
  const rowNote = type === 'sub' ? (subItem?.name || '-') : (mainItem.itemNote || '-');
  const currentSupplierId = type === 'sub' ? subItem?.supplierId : mainItem.supplierId;
  const matchedSupplier = allPartners.find(s => s.id === currentSupplierId);
  const currentSupplierName = matchedSupplier?.name || currentSupplierId || '';

  // 1. 供應商選單過濾規則
  const supplierOptions = useMemo(() => {
    const searchTargets = [rowName, rowNote].filter(Boolean).map(s => s.toLowerCase());
    let filtered = suppliers.filter(s => {
      const usages = s.productList.flatMap(p => (p.usage || '').split(',')).map(u => u.trim().toLowerCase()).filter(Boolean);
      return searchTargets.some(target => usages.some(u => target.includes(u) || u.includes(target)));
    });
    if (filtered.length === 0) filtered = suppliers;
    if (rowName) {
      const providers = suppliers.filter(s => s.productList.some(p => p.name === rowName));
      if (providers.length > 0) filtered = providers;
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  }, [suppliers, rowName, rowNote]);

  // 2. 品名選單過濾規則
  const productOptions = useMemo(() => {
    let filteredProducts: string[] = [];
    if (matchedSupplier) {
      const usages = [rowName, rowNote].filter(Boolean).map(s => s.toLowerCase());
      const matchedInSup = matchedSupplier.productList.filter(p => {
        const pUsages = (p.usage || '').split(',').map(u => u.trim().toLowerCase());
        return usages.some(target => pUsages.some(u => target.includes(u) || u.includes(target)));
      });
      filteredProducts = (matchedInSup.length > 0 ? matchedInSup : matchedSupplier.productList).map(p => p.name);
    } else {
      filteredProducts = Array.from(new Set(suppliers.flatMap(s => s.productList.map(p => p.name))));
    }
    return filteredProducts.filter(Boolean).sort();
  }, [suppliers, matchedSupplier, rowName, rowNote]);

  return (
    <tr key={rowKey} className={`hover:bg-slate-50/50 transition-colors group ${isPoCreated ? 'bg-slate-50 opacity-60' : ''}`}>
      <td className="px-4 py-4 text-center">
        {isPoCreated && <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" />}
      </td>
      <td className="px-4 py-4 text-center">
        {!isPoCreated && (
          <input 
            type="checkbox" 
            checked={selectedRowKeys.has(rowKey)}
            onChange={() => toggleRowSelection(rowKey)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
        )}
      </td>
      {/* 縮小寬度 50%：案件名稱 (w-22)、日期 (w-20)、供應商 (w-26) */}
      <td className="px-3 py-4 w-22">
        <div className={`font-black text-sm truncate max-w-[80px] text-indigo-700 ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}>{project.name}</div>
      </td>
      <td className="px-3 py-4 w-20">
        <input type="date" value={displayDate} onChange={(e) => handleUpdateItemDate(project.id, reportIdx, mainItemIdx, e.target.value)} className={`w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-xs font-bold text-slate-500 ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`} />
      </td>
      <td className="px-3 py-4 w-26">
        <div className="relative">
          <input 
            list={`supplier-datalist-${rowKey}`}
            value={currentSupplierName} 
            onChange={(e) => handleUpdateItemSupplier(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
            onBlur={(e) => handleCheckAndPromptAddition(entry, e.target.value, rowName)}
            placeholder="供應商..."
            className={`w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[11px] font-bold text-slate-700 ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}
          />
          <datalist id={`supplier-datalist-${rowKey}`}>
            {supplierOptions.map(s => <option key={s.id} value={s.name} />)}
          </datalist>
        </div>
      </td>
      {/* 放大寬度 50%：品名 (w-72)、規格 (w-60) */}
      <td className="px-6 py-4 w-72">
        <div className="relative">
          <input 
            list={`product-datalist-${rowKey}`}
            value={rowName} 
            onChange={(e) => handleUpdateItemName(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
            onBlur={(e) => handleCheckAndPromptAddition(entry, currentSupplierName, e.target.value)}
            placeholder="品名 (選填)..."
            className={`w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-sm font-bold ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}
          />
          <datalist id={`product-datalist-${rowKey}`}>
            {productOptions.map((p, pidx) => <option key={pidx} value={p} />)}
          </datalist>
        </div>
      </td>
      <td className={`px-6 py-4 w-60 text-xs text-slate-500 ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}>{rowSpec}</td>
      <td className={`px-6 py-4 w-24 text-center font-black text-blue-600 ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}>{rowQty}</td>
      <td className={`px-6 py-4 w-20 text-center text-xs text-slate-400 font-bold ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}>{rowUnit}</td>
      <td className={`px-6 py-4 text-xs text-slate-500 truncate max-w-[150px] ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}>{rowNote}</td>
      <td className="px-6 py-4 w-16 text-right">
        {/* 操作圖示改為修改 */}
        <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
          <EditIcon className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

const GlobalPurchasingItems: React.FC<GlobalPurchasingItemsProps> = ({ 
  projects, onUpdateProject, systemRules, onBack, suppliers, subcontractors, onUpdateSuppliers, onUpdateSubcontractors, purchaseOrders, onUpdatePurchaseOrders
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });
  
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [poForm, setPoForm] = useState({
    projectIds: [] as string[],
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    requisitioner: '',
    deliveryDate: '',
    deliveryLocation: '現場 (Site)',
    receiver: ''
  });

  const allPartners = useMemo(() => [...suppliers, ...subcontractors], [suppliers, subcontractors]);

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  const allPurchasingItems = useMemo(() => {
    let list: RowData[] = [];
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
          const activeSubItems = savedSheet?.items || [];
          if (activeSubItems.length > 0) {
            activeSubItems.forEach((sub, subIdx) => {
                list.push({ 
                    project, type: 'sub', subItem: sub, mainItem: item, mainItemIdx: itemIdx, reportIdx: latestReportIdx, itemKey, subIdx,
                    rowKey: `${project.id}-sub-${itemKey}-${subIdx}`
                });
            });
          } else {
            list.push({
                project, type: 'main', mainItem: item, mainItemIdx: itemIdx, reportIdx: latestReportIdx,
                rowKey: `${project.id}-main-${itemKey}`
            });
          }
        }
      });
    });
    
    // 過濾邏輯修正，確保不會導致 crash
    if (projectFilter !== 'ALL') {
      list = list.filter(i => i.project.id === projectFilter);
    }
    if (supplierFilter !== 'ALL') {
      list = list.filter(i => {
        const sId = i.type === 'sub' ? i.subItem?.supplierId : i.mainItem.supplierId;
        return sId === supplierFilter;
      });
    }

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
          case 'supplier':
            const sIdA = a.type === 'sub' ? a.subItem?.supplierId : a.mainItem.supplierId;
            const sIdB = b.type === 'sub' ? b.subItem?.supplierId : b.mainItem.supplierId;
            valA = allPartners.find(s => s.id === sIdA)?.name || sIdA || '';
            valB = allPartners.find(s => s.id === sIdB)?.name || sIdB || '';
            break;
        }
        if (sortConfig.direction === 'asc') return valA.localeCompare(valB, 'zh-Hant');
        return valB.localeCompare(valA, 'zh-Hant');
      });
    }
    return list;
  }, [projects, sortConfig, systemRules, projectFilter, supplierFilter, allPartners]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
        const direction: SortDirection = prev.key === key ? (prev.direction === 'asc' ? 'desc' : (prev.direction === 'desc' ? null : 'asc')) : 'asc';
        return { key, direction };
    });
  };

  const toggleRowSelection = (rowKey: string) => {
    const next = new Set(selectedRowKeys);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    setSelectedRowKeys(next);
  };

  const handleOpenPOModal = () => {
    if (selectedRowKeys.size === 0) {
      alert('請先勾選欲匯入的項目');
      return;
    }
    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const uniqueProjIds = Array.from(new Set(selectedItems.map(i => i.project.id)));
    const firstSupplierId = (selectedItems[0].type === 'sub' ? selectedItems[0].subItem?.supplierId : selectedItems[0].mainItem.supplierId) || '';
    setPoForm({ ...poForm, projectIds: uniqueProjIds, supplierId: firstSupplierId });
    setIsCreatingPO(true);
  };

  const confirmCreatePO = () => {
    if (poForm.projectIds.length === 0 || !poForm.supplierId) {
      alert('請填寫完整資訊');
      return;
    }
    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const targetSupplier = allPartners.find(s => s.id === poForm.supplierId);
    const poItems: PurchaseOrderItem[] = selectedItems.map(row => {
      const isSub = row.type === 'sub';
      return {
        materialId: isSub ? (row.subItem?.id || '') : `main-${row.mainItemIdx}`,
        name: isSub ? (row.subItem?.spec || '') : row.mainItem.name,
        quantity: parseFloat(isSub ? (row.subItem?.quantity.toString() || '0') : row.mainItem.quantity),
        unit: isSub ? (row.subItem?.unit || '') : row.mainItem.unit,
        price: 0,
        notes: isSub ? row.subItem?.name : row.mainItem.itemNote,
        supplierId: poForm.supplierId
      };
    });
    const newPO: PurchaseOrder = {
      id: crypto.randomUUID(),
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: poForm.date,
      projectId: poForm.projectIds[0],
      projectIds: poForm.projectIds,
      projectName: projects.find(p => p.id === poForm.projectIds[0])?.name || '',
      supplierId: poForm.supplierId,
      supplierName: targetSupplier?.name || '未知廠商',
      items: poItems,
      status: 'draft',
      totalAmount: 0,
      requisitioner: poForm.requisitioner,
      deliveryDate: poForm.deliveryDate,
      deliveryLocation: poForm.deliveryLocation,
      receiver: poForm.receiver
    };
    onUpdatePurchaseOrders([...purchaseOrders, newPO]);
    const updatedProjectsMap = new Map<string, Project>();
    selectedItems.forEach(row => {
        let p = updatedProjectsMap.get(row.project.id) || projects.find(proj => proj.id === row.project.id);
        if (!p) return;
        if (row.type === 'sub' && row.itemKey && row.subIdx !== undefined) {
          const sheets = { ...(p.fenceMaterialSheets || {}) };
          const sheet = sheets[row.itemKey];
          if (sheet) {
            const subItems = [...sheet.items];
            subItems[row.subIdx] = { ...subItems[row.subIdx], isPoCreated: true };
            sheets[row.itemKey] = { ...sheet, items: subItems };
            p = { ...p, fenceMaterialSheets: sheets };
          }
        } else {
          const reports = [...p.planningReports];
          const mainItems = [...reports[row.reportIdx].items];
          mainItems[row.mainItemIdx] = { ...mainItems[row.mainItemIdx], isPoCreated: true };
          reports[row.reportIdx] = { ...reports[row.reportIdx], items: mainItems };
          p = { ...p, planningReports: reports };
        }
        updatedProjectsMap.set(p.id, p);
    });
    updatedProjectsMap.forEach(proj => onUpdateProject(proj));
    setIsCreatingPO(false);
    setSelectedRowKeys(new Set());
    alert('採購單已建立並匯出');
  };

  const handleUpdateItemDate = (pId: string, rIdx: number, iIdx: number, val: string) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    const updatedReports = [...project.planningReports];
    const updatedItems = [...updatedReports[rIdx].items];
    updatedItems[iIdx] = { ...updatedItems[iIdx], productionDate: val };
    updatedReports[rIdx] = { ...updatedReports[rIdx], items: updatedItems };
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleUpdateItemSupplier = (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    const matchedSup = allPartners.find(s => s.name === val);
    const finalVal = matchedSup ? matchedSup.id : val;
    if (type === 'sub' && iKey !== undefined && sIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        const sheet = sheets[iKey];
        if (!sheet) return;
        const newItems = [...sheet.items];
        newItems[sIdx] = { ...newItems[sIdx], supplierId: finalVal };
        sheets[iKey] = { ...sheet, items: newItems };
        onUpdateProject({ ...project, fenceMaterialSheets: sheets });
    } else {
        const updatedReports = [...project.planningReports];
        const updatedItems = [...updatedReports[rIdx].items];
        updatedItems[iIdx] = { ...updatedItems[iIdx], supplierId: finalVal };
        updatedReports[rIdx] = { ...updatedReports[rIdx], items: updatedItems };
        onUpdateProject({ ...project, planningReports: updatedReports });
    }
  };

  const handleUpdateItemName = (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    if (type === 'sub' && iKey !== undefined && sIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        const sheet = sheets[iKey];
        if (!sheet) return;
        const newItems = [...sheet.items];
        newItems[sIdx] = { ...newItems[sIdx], spec: val };
        sheets[iKey] = { ...sheet, items: newItems };
        onUpdateProject({ ...project, fenceMaterialSheets: sheets });
    } else {
        const updatedReports = [...project.planningReports];
        const updatedItems = [...updatedReports[rIdx].items];
        updatedItems[iIdx] = { ...updatedItems[iIdx], name: val };
        updatedReports[rIdx] = { ...updatedReports[rIdx], items: updatedItems };
        onUpdateProject({ ...project, planningReports: updatedReports });
    }
  };

  const handleCheckAndPromptAddition = (row: RowData, inputSupplierName: string, inputProductName: string) => {
    const isSupplierExist = suppliers.some(s => s.name === inputSupplierName);
    const matchedSupplier = suppliers.find(s => s.name === inputSupplierName);
    if (inputSupplierName && !isSupplierExist) {
        if (window.confirm(`供應商「${inputSupplierName}」不在清冊中，是否將其連同品項「${inputProductName}」加入供應商清冊？`)) {
            const newSupplier: Supplier = {
                id: crypto.randomUUID(), name: inputSupplierName, address: '', contact: '', companyPhone: '', mobilePhone: '',
                productList: [{ name: inputProductName, spec: '', usage: '' }]
            };
            onUpdateSuppliers([...suppliers, newSupplier]);
        }
    } else if (matchedSupplier && inputProductName) {
        const isProductExist = matchedSupplier.productList.some(p => p.name === inputProductName);
        if (!isProductExist) {
            if (window.confirm(`供應商「${inputSupplierName}」的產品清單中尚無「${inputProductName}」，是否加入？`)) {
                const updatedSuppliers = suppliers.map(s => s.id === matchedSupplier.id ? {
                    ...s, productList: [...s.productList, { name: inputProductName, spec: '', usage: '' }]
                } : s);
                onUpdateSuppliers(updatedSuppliers);
            }
        }
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key || !sortConfig.direction) return <span className="opacity-20 ml-1">⇅</span>;
    return <span className="ml-1 text-indigo-500 font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const uniqueSupplierFilterList = useMemo(() => {
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  }, [suppliers]);

  const uniqueProjectList = useMemo(() => {
    const fullMap = new Map<string, string>();
    projects.forEach(p => fullMap.set(p.id, p.name));
    return Array.from(fullMap.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs cursor-pointer transition-colors w-fit" onClick={onBack}>
          <ArrowLeftIcon className="w-3 h-3" /> 返回採購
        </div>
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">案件過濾:</label>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                    <option value="ALL">全部案件</option>
                    {uniqueProjectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">供應商過濾:</label>
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                    <option value="ALL">全部供應商 (清冊)</option>
                    {uniqueSupplierFilterList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg"><ClipboardListIcon className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">採購項目總覽</h1>
            <p className="text-xs text-slate-500 font-medium">彙整規劃項目，勾選後可批次建立正式採購單</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                    <button onClick={handleOpenPOModal} className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all active:scale-90" title="將勾選項目建立採購單">
                        <FileTextIcon className="w-4 h-4" />
                    </button>
                </th>
                <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRowKeys(new Set(allPurchasingItems.filter(i => !(i.type === 'sub' ? i.subItem?.isPoCreated : i.mainItem.isPoCreated)).map(i => i.rowKey)));
                        else setSelectedRowKeys(new Set());
                      }}
                      checked={selectedRowKeys.size > 0 && selectedRowKeys.size === allPurchasingItems.filter(i => !(i.type === 'sub' ? i.subItem?.isPoCreated : i.mainItem.isPoCreated)).length}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                </th>
                {/* 寬度調整：案件縮小為 w-22, 日期 w-20, 供應商 w-26, 品名放大 w-72, 規格 w-60 */}
                <th className="px-3 py-4 w-22">
                  <button onClick={() => handleSort('projectName')} className="flex items-center hover:text-indigo-600 transition-colors uppercase tracking-widest">案件名稱 {renderSortIcon('projectName')}</button>
                </th>
                <th className="px-3 py-4 w-20">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-indigo-600 transition-colors uppercase tracking-widest text-[9px]">預計採購日期 {renderSortIcon('date')}</button>
                </th>
                <th className="px-3 py-4 w-26 text-center">
                    <button onClick={() => handleSort('supplier')} className="flex items-center justify-center hover:text-indigo-600 transition-colors uppercase tracking-widest mx-auto">供應商 {renderSortIcon('supplier')}</button>
                </th>
                <th className="px-6 py-4 w-72">
                    <button onClick={() => handleSort('name')} className="flex items-center hover:text-indigo-600 transition-colors uppercase tracking-widest">品名 (選填) {renderSortIcon('name')}</button>
                </th>
                <th className="px-6 py-4 w-60">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20 text-center">單位</th>
                <th className="px-6 py-4">注意/備註</th>
                <th className="px-6 py-4 w-16 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPurchasingItems.length > 0 ? allPurchasingItems.map((entry) => (
                <PurchasingItemRow 
                  key={entry.rowKey}
                  entry={entry}
                  suppliers={suppliers}
                  allPartners={allPartners}
                  isPoCreated={entry.type === 'sub' ? entry.subItem?.isPoCreated : entry.mainItem.isPoCreated}
                  selectedRowKeys={selectedRowKeys}
                  toggleRowSelection={toggleRowSelection}
                  handleUpdateItemDate={handleUpdateItemDate}
                  handleUpdateItemSupplier={handleUpdateItemSupplier}
                  handleUpdateItemName={handleUpdateItemName}
                  handleCheckAndPromptAddition={handleCheckAndPromptAddition}
                />
              )) : (
                <tr>
                  <td colSpan={11} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前沒有任何符合條件的項目</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreatingPO && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white"><FileTextIcon className="w-5 h-5" /></div>
                        <h3 className="font-black text-slate-800">建立正式採購單 (PO)</h3>
                    </div>
                    <button onClick={() => setIsCreatingPO(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">採購案件 (可複選)</label>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto space-y-2 shadow-inner">
                                {uniqueProjectList.map(p => (
                                    <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={poForm.projectIds.includes(p.id)}
                                            onChange={() => {
                                                const next = [...poForm.projectIds];
                                                const idx = next.indexOf(p.id);
                                                if (idx > -1) next.splice(idx, 1);
                                                else next.push(p.id);
                                                setPoForm({ ...poForm, projectIds: next });
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">主要供應商</label>
                            <div className="relative">
                                <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select 
                                    value={poForm.supplierId}
                                    onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option value="">選取廠商...</option>
                                    {allPartners.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">填表日期</label>
                            <input type="date" value={poForm.date} onChange={e => setPoForm({...poForm, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">請購人</label>
                            <input type="text" value={poForm.requisitioner} onChange={e => setPoForm({...poForm, requisitioner: e.target.value})} placeholder="姓名" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">需到貨日期</label>
                            <input type="date" value={poForm.deliveryDate} onChange={e => setPoForm({...poForm, deliveryDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">收貨人</label>
                            <input type="text" value={poForm.receiver} onChange={e => setPoForm({...poForm, receiver: e.target.value})} placeholder="姓名" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">匯入項目明細 ({selectedRowKeys.size} 項)</span>
                        </div>
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-2">專案</th>
                                    <th className="px-6 py-2">品名規格</th>
                                    <th className="px-6 py-2 text-center">數量</th>
                                    <th className="px-6 py-2">單位</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey)).map(row => (
                                    <tr key={row.rowKey} className="bg-white">
                                        <td className="px-6 py-3 font-bold text-indigo-600 truncate max-w-[150px]">{row.project.name}</td>
                                        <td className="px-6 py-3 font-black text-slate-800">{row.type === 'sub' ? row.subItem?.spec : row.mainItem.name}</td>
                                        <td className="px-6 py-3 text-center font-black text-blue-600">{row.type === 'sub' ? row.subItem?.quantity : row.mainItem.quantity}</td>
                                        <td className="px-6 py-3 text-slate-400 font-bold">{row.type === 'sub' ? row.subItem?.unit : row.mainItem.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setIsCreatingPO(false)} className="flex-1 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors">取消</button>
                    <button onClick={confirmCreatePO} className="flex-[2] py-4 rounded-2xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" /> 確定建立並匯出
                    </button>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};

export default GlobalPurchasingItems;