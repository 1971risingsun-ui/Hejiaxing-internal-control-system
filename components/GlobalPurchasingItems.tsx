import React, { useMemo, useState, useRef } from 'react';
import { Project, CompletionItem, FenceMaterialItem, SystemRules, Supplier, PurchaseOrder, PurchaseOrderItem } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, ArrowLeftIcon, XIcon, CheckCircleIcon, UsersIcon, FileTextIcon, EditIcon, SaveIcon } from './Icons';

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
  onUpdateSuppliers: (list: Supplier[]) => void;
}> = ({ 
  entry, suppliers, allPartners, isPoCreated, selectedRowKeys, toggleRowSelection, 
  handleUpdateItemDate, handleUpdateItemSupplier, handleUpdateItemName, onUpdateSuppliers
}) => {
  const { project, type, subItem, mainItem, reportIdx, mainItemIdx, itemKey, subIdx, rowKey } = entry;
  
  const displayDate = mainItem.productionDate || getDaysOffset(project.appointmentDate, -7);
  
  const rowName = type === 'sub' ? (subItem?.spec || '') : mainItem.name;
  const rowNote = type === 'sub' ? (subItem?.name || '-') : (mainItem.itemNote || '-');
  
  const currentSupplierId = type === 'sub' ? subItem?.supplierId : mainItem.supplierId;
  const matchedSupplier = allPartners.find(s => s.id === currentSupplierId);
  const currentSupplierName = matchedSupplier?.name || currentSupplierId || '';

  // 供應商選項過濾邏輯 (模糊比對用途)
  const filteredSupplierOptions = useMemo(() => {
    if (rowName) {
      const providers = suppliers.filter(s => s.productList.some(p => p.name === rowName));
      if (providers.length > 0) return providers;
    }

    const targets = [rowName, rowNote].filter(Boolean).map(t => t.toLowerCase());
    let matches = suppliers.filter(s => {
      const usages = s.productList.flatMap(p => (p.usage || '').split(',')).map(u => u.trim().toLowerCase()).filter(Boolean);
      return targets.some(t => usages.some(u => t.includes(u) || u.includes(t)));
    });

    if (matches.length === 0) return suppliers;
    return matches.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  }, [suppliers, rowName, rowNote]);

  // 品名下拉選單過濾 (連動供應商)
  const filteredProductOptions = useMemo(() => {
    const selectedS = suppliers.find(s => s.name === currentSupplierName);
    if (selectedS) return selectedS.productList;

    const uniqueProds = new Map<string, string>();
    suppliers.forEach(s => s.productList.forEach(p => uniqueProds.set(p.name, p.usage)));
    return Array.from(uniqueProds.entries()).map(([name, usage]) => ({ name, spec: '', usage }));
  }, [suppliers, currentSupplierName]);

  // 處理「確認新增至清冊」邏輯
  const handleCommitToSuppliers = () => {
    if (!currentSupplierName) return;

    const targetSupplier = suppliers.find(s => s.name === currentSupplierName);

    if (!targetSupplier) {
      if (window.confirm(`供應商「${currentSupplierName}」未在清冊中，是否將其與品項「${rowName}」一併加入供應商清冊？`)) {
        const newSupplier: Supplier = {
          id: crypto.randomUUID(),
          name: currentSupplierName,
          address: '', contact: '', companyPhone: '', mobilePhone: '',
          productList: [{ name: rowName, spec: '', usage: '' }]
        };
        onUpdateSuppliers([...suppliers, newSupplier]);
      }
    } else if (rowName) {
      const isProductExist = targetSupplier.productList.some(p => p.name === rowName);
      if (!isProductExist) {
        if (window.confirm(`供應商「${currentSupplierName}」的產品清單中尚無「${rowName}」，是否加入？`)) {
          const updatedSuppliers = suppliers.map(s => s.id === targetSupplier.id ? {
            ...s,
            productList: [...s.productList, { name: rowName, spec: '', usage: '' }]
          } : s);
          onUpdateSuppliers(updatedSuppliers);
        }
      } else {
        alert('已對齊供應商清冊項目');
      }
    }
  };

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
      <td className="px-3 py-4 w-22">
        <div className={`font-black text-xs truncate max-w-[80px] text-indigo-700 ${isPoCreated ? 'line-through text-slate-400 opacity-60' : ''}`}>{project.name}</div>
      </td>
      <td className="px-3 py-4 w-20">
        <input 
          type="date" 
          value={displayDate}
          onChange={(e) => handleUpdateItemDate(project.id, reportIdx, mainItemIdx, e.target.value)}
          className="w-full px-1 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[10px] font-bold text-slate-500" 
        />
      </td>
      <td className="px-3 py-4 w-40">
        <div className="flex items-center gap-1">
          <input 
            list={`supplier-dl-${rowKey}`}
            value={currentSupplierName} 
            onChange={(e) => handleUpdateItemSupplier(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
            placeholder="供應商..."
            className="flex-1 px-1 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[11px] font-bold text-slate-700"
          />
          <datalist id={`supplier-dl-${rowKey}`}>
            {filteredSupplierOptions.map(s => <option key={s.id} value={s.name} />)}
          </datalist>
        </div>
      </td>
      <td className="px-6 py-4 w-60">
        <div className="flex items-center gap-1">
            <input 
                list={`product-dl-${rowKey}`}
                value={rowName}
                onChange={(e) => handleUpdateItemName(project.id, reportIdx, mainItemIdx, e.target.value, type, itemKey, subIdx)}
                placeholder="品名..."
                className="flex-1 px-1 py-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-[11px] font-bold text-slate-800"
            />
            <datalist id={`product-dl-${rowKey}`}>
                {filteredProductOptions.map((p, i) => <option key={i} value={p.name}>{p.usage}</option>)}
            </datalist>
            <button onClick={handleCommitToSuppliers} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors" title="確認輸入並檢查清冊">
              <CheckCircleIcon className="w-3.5 h-3.5" />
            </button>
        </div>
      </td>
      <td className="px-6 py-4 w-40 text-xs text-slate-500 truncate">{type === 'sub' ? '(細項項目)' : (mainItem.spec || '-')}</td>
      <td className="px-6 py-4 w-20 text-center font-black text-blue-600 text-xs">{type === 'sub' ? subItem?.quantity : mainItem.quantity}</td>
      <td className="px-6 py-4 w-16 text-center text-[10px] text-slate-400 font-bold uppercase">{type === 'sub' ? subItem?.unit : mainItem.unit}</td>
      <td className="px-6 py-4 text-[10px] text-slate-500 truncate max-w-[120px]">{rowNote}</td>
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
    projectIds: [] as string[], supplierId: '', date: new Date().toISOString().split('T')[0],
    requisitioner: '', deliveryDate: '', deliveryLocation: '現場 (Site)', receiver: ''
  });

  const [poItemsDraft, setPoItemsDraft] = useState<Record<string, { quantity: string; name: string; unit: string; notes: string; project: string }>>({});

  const allPartners = useMemo(() => [...suppliers, ...subcontractors], [suppliers, subcontractors]);

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  const getAutoFormulaItems = (itemName: string, quantity: string): FenceMaterialItem[] => {
    const baseQty = parseFloat(quantity) || 0;
    if (baseQty <= 0) return [];
    const config = systemRules.materialFormulas.find(f => itemName.includes(f.keyword));
    if (!config) return [];
    return config.items.map(fi => {
      let calcQty = 0;
      try {
        const func = new Function('baseQty', 'Math', `return ${fi.formula}`);
        calcQty = func(baseQty, Math);
      } catch (e) { calcQty = baseQty; }
      return { id: crypto.randomUUID(), name: fi.name, spec: '', quantity: isNaN(calcQty) ? 0 : calcQty, unit: fi.unit };
    });
  };

  const allPurchasingItems = useMemo(() => {
    let list: RowData[] = [];
    projects.forEach(project => {
      if (!project.planningReports || project.planningReports.length === 0) return;
      const latestReportIdx = project.planningReports.reduce((latestIdx, curr, idx, arr) => {
        return curr.timestamp > arr[latestIdx].timestamp ? idx : latestIdx;
      }, 0);
      const report = project.planningReports[latestReportIdx];
      
      report.items.forEach((item, itemIdx) => {
        const isFence = item.category === 'FENCE_MAIN';
        const isSubKeyword = systemRules.subcontractorKeywords.some(kw => (item.name || '').includes(kw));
        const isProdKeyword = systemRules.productionKeywords.some(kw => (item.name || '').includes(kw));
        
        if (isFence && !isSubKeyword && !isProdKeyword) {
          const itemKey = getItemKey(item);
          const savedSheet = project.fenceMaterialSheets?.[itemKey];
          let activeSubItems = savedSheet?.items || getAutoFormulaItems(item.name, item.quantity);

          if (activeSubItems.length > 0) {
            activeSubItems.forEach((sub, subIdx) => {
                list.push({ 
                    project, type: 'sub', subItem: sub, mainItem: item, mainItemIdx: itemIdx, reportIdx: latestReportIdx, itemKey, subIdx,
                    rowKey: `${project.id}-sub-${itemKey}-${subIdx}`
                });
            });
          } else {
            list.push({ project, type: 'main', mainItem: item, mainItemIdx: itemIdx, reportIdx: latestReportIdx, rowKey: `${project.id}-main-${itemKey}` });
          }
        }
      });
    });
    
    if (projectFilter !== 'ALL') list = list.filter(i => i.project.id === projectFilter);
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
    setSortConfig(prev => ({ key, direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : (prev.direction === 'desc' ? null : 'asc')) : 'asc' }));
  };

  const toggleRowSelection = (rowKey: string) => {
    const next = new Set(selectedRowKeys);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    setSelectedRowKeys(next);
  };

  const handleUpdateItemDate = (pId: string, rIdx: number, iIdx: number, val: string) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    const updatedReports = [...project.planningReports];
    updatedReports[rIdx].items[iIdx] = { ...updatedReports[rIdx].items[iIdx], productionDate: val };
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleUpdateItemSupplier = (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    const matchedSup = allPartners.find(s => s.name === val);
    const finalVal = matchedSup ? matchedSup.id : val;
    if (type === 'sub' && iKey && sIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        if (sheets[iKey]) {
            sheets[iKey].items[sIdx].supplierId = finalVal;
            onUpdateProject({ ...project, fenceMaterialSheets: sheets });
        }
    } else {
        const updatedReports = [...project.planningReports];
        updatedReports[rIdx].items[iIdx].supplierId = finalVal;
        onUpdateProject({ ...project, planningReports: updatedReports });
    }
  };

  const handleUpdateItemName = (pId: string, rIdx: number, iIdx: number, val: string, type: 'main' | 'sub', iKey?: string, sIdx?: number) => {
    const project = projects.find(p => p.id === pId);
    if (!project) return;
    if (type === 'sub' && iKey && sIdx !== undefined) {
        const sheets = { ...(project.fenceMaterialSheets || {}) };
        if (sheets[iKey]) {
            sheets[iKey].items[sIdx].spec = val;
            onUpdateProject({ ...project, fenceMaterialSheets: sheets });
        }
    } else {
        const updatedReports = [...project.planningReports];
        updatedReports[rIdx].items[iIdx].name = val;
        onUpdateProject({ ...project, planningReports: updatedReports });
    }
  };

  const handleOpenPOModal = () => {
    if (selectedRowKeys.size === 0) return alert('請先勾選項目');
    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const draft: Record<string, any> = {};
    selectedItems.forEach(row => {
        const isSub = row.type === 'sub';
        draft[row.rowKey] = {
            quantity: String(isSub ? (row.subItem?.quantity || '0') : row.mainItem.quantity),
            name: isSub ? (row.subItem?.spec || '') : row.mainItem.name,
            unit: isSub ? (row.subItem?.unit || '') : row.mainItem.unit,
            notes: isSub ? (row.subItem?.name || '') : (row.mainItem.itemNote || ''),
            project: row.project.name
        };
    });
    setPoItemsDraft(draft);
    setPoForm({ ...poForm, projectIds: Array.from(new Set(selectedItems.map(i => i.project.id))), supplierId: (selectedItems[0].type === 'sub' ? selectedItems[0].subItem?.supplierId : selectedItems[0].mainItem.supplierId) || '' });
    setIsCreatingPO(true);
  };

  const confirmCreatePO = () => {
    if (!poForm.supplierId) return alert('請選取主要供應商');
    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const targetSupplier = allPartners.find(s => s.id === poForm.supplierId);
    
    const newPO: PurchaseOrder = {
      id: crypto.randomUUID(),
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: poForm.date, projectIds: poForm.projectIds, projectId: poForm.projectIds[0],
      projectName: Array.from(new Set(selectedItems.map(row => row.project.name))).join(', '), 
      supplierId: poForm.supplierId, supplierName: targetSupplier?.name || '未知廠商',
      items: selectedItems.map(row => ({
        materialId: row.type === 'sub' ? (row.subItem?.id || '') : `main-${row.mainItemIdx}`,
        name: poItemsDraft[row.rowKey].name, quantity: parseFloat(poItemsDraft[row.rowKey].quantity) || 0,
        unit: poItemsDraft[row.rowKey].unit, price: 0, notes: poItemsDraft[row.rowKey].notes,
        supplierId: poForm.supplierId, projectName: row.project.name 
      })),
      status: 'draft', totalAmount: 0, requisitioner: poForm.requisitioner, deliveryDate: poForm.deliveryDate,
      deliveryLocation: poForm.deliveryLocation, receiver: poForm.receiver
    };
    onUpdatePurchaseOrders([...purchaseOrders, newPO]);
    
    selectedItems.forEach(row => {
        const p = projects.find(proj => proj.id === row.project.id);
        if (!p) return;
        if (row.type === 'sub' && row.itemKey && row.subIdx !== undefined) {
          const sheets = { ...(p.fenceMaterialSheets || {}) };
          if (sheets[row.itemKey]) {
            sheets[row.itemKey].items[row.subIdx].isPoCreated = true;
            onUpdateProject({ ...p, fenceMaterialSheets: sheets });
          }
        } else {
          const reports = [...p.planningReports];
          reports[row.reportIdx].items[row.mainItemIdx].isPoCreated = true;
          onUpdateProject({ ...p, planningReports: reports });
        }
    });
    setIsCreatingPO(false);
    setSelectedRowKeys(new Set());
    alert('採購單已建立');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 animate-fade-in h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs cursor-pointer transition-colors" onClick={onBack}>
          <ArrowLeftIcon className="w-3 h-3" /> 返回
        </div>
        <div className="flex gap-4">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                <option value="ALL">全部案件</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                <option value="ALL">全部供應商</option>
                {suppliers.sort((a,b)=>a.name.localeCompare(b.name,'zh')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><ClipboardListIcon className="w-5 h-5" /></div>
          <div><h1 className="text-lg font-bold text-slate-800">採購項目總覽</h1><p className="text-[10px] text-slate-500 font-medium">彙整各案規劃與備料細項，追蹤採購狀態</p></div>
        </div>
        <button onClick={handleOpenPOModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2 active:scale-95">
            <FileTextIcon className="w-4 h-4" /> 建立採購單
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-10 text-center">狀態</th>
                <th className="px-4 py-4 w-10 text-center">
                    <input type="checkbox" onChange={(e) => setSelectedRowKeys(e.target.checked ? new Set(allPurchasingItems.filter(i => !(i.type === 'sub' ? i.subItem?.isPoCreated : i.mainItem.isPoCreated)).map(i => i.rowKey)) : new Set())} checked={selectedRowKeys.size > 0 && selectedRowKeys.size === allPurchasingItems.filter(i => !(i.type === 'sub' ? i.subItem?.isPoCreated : i.mainItem.isPoCreated)).length} className="w-4 h-4 rounded text-indigo-600" />
                </th>
                <th className="px-3 py-4 w-22 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('projectName')}>案件 {sortConfig.key === 'projectName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-3 py-4 w-20 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('date')}>預計日期 {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-3 py-4 w-40 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('supplier')}>供應商 {sortConfig.key === 'supplier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-6 py-4 w-60 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('name')}>品名 {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-6 py-4 w-40">規格</th>
                <th className="px-6 py-4 w-20 text-center">數量</th>
                <th className="px-6 py-4 w-16 text-center">單位</th>
                <th className="px-6 py-4">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPurchasingItems.map((entry) => (
                <PurchasingItemRow 
                  key={entry.rowKey} entry={entry} suppliers={suppliers} allPartners={allPartners}
                  isPoCreated={entry.type === 'sub' ? entry.subItem?.isPoCreated : entry.mainItem.isPoCreated}
                  selectedRowKeys={selectedRowKeys} toggleRowSelection={toggleRowSelection}
                  handleUpdateItemDate={handleUpdateItemDate} handleUpdateItemSupplier={handleUpdateItemSupplier}
                  handleUpdateItemName={handleUpdateItemName} onUpdateSuppliers={onUpdateSuppliers}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreatingPO && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                    <div className="flex items-center gap-3"><div className="bg-indigo-600 p-2 rounded-xl text-white"><FileTextIcon className="w-5 h-5" /></div><h3 className="font-black text-slate-800">建立正式採購單 (PO)</h3></div>
                    <button onClick={() => setIsCreatingPO(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">主要供應商</label>
                            <select value={poForm.supplierId} onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">選取廠商...</option>
                                {allPartners.sort((a,b)=>a.name.localeCompare(b.name,'zh')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div><label className="text-[10px] uppercase font-black text-slate-400 block mb-1">日期</label><input type="date" value={poForm.date} onChange={e => setPoForm({...poForm, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                        <div><label className="text-[10px] uppercase font-black text-slate-400 block mb-1">請購人</label><input type="text" value={poForm.requisitioner} onChange={e => setPoForm({...poForm, requisitioner: e.target.value})} placeholder="姓名" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                        <div><label className="text-[10px] uppercase font-black text-slate-400 block mb-1">到貨日</label><input type="date" value={poForm.deliveryDate} onChange={e => setPoForm({...poForm, deliveryDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                        <div><label className="text-[10px] uppercase font-black text-slate-400 block mb-1">收貨人</label><input type="text" value={poForm.receiver} onChange={e => setPoForm({...poForm, receiver: e.target.value})} placeholder="姓名" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100 text-slate-400 font-bold border-b border-slate-200">
                                <tr><th className="px-6 py-2">專案</th><th className="px-6 py-2">品名規格</th><th className="px-6 py-2 text-center">數量</th><th className="px-6 py-2">單位</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey)).map(row => (
                                    <tr key={row.rowKey} className="bg-white">
                                        <td className="px-6 py-3 font-bold text-indigo-600 truncate max-w-[150px]">{row.project.name}</td>
                                        <td className="px-6 py-3 font-black text-slate-800">{poItemsDraft[row.rowKey]?.name || ''}</td>
                                        <td className="px-6 py-3 text-center">
                                            <input type="number" step="any" value={poItemsDraft[row.rowKey]?.quantity || '0'} onChange={(e) => setPoItemsDraft(prev => ({ ...prev, [row.rowKey]: { ...prev[row.rowKey], quantity: e.target.value } }))} className="w-20 px-2 py-1 border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-indigo-500 font-black text-blue-600" />
                                        </td>
                                        <td className="px-6 py-3 text-slate-400 font-bold">{poItemsDraft[row.rowKey]?.unit || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <footer className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setIsCreatingPO(false)} className="flex-1 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors">取消</button>
                    <button onClick={confirmCreatePO} className="flex-[2] py-4 rounded-2xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"><CheckCircleIcon className="w-5 h-5" /> 確定建立</button>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};

export default GlobalPurchasingItems;