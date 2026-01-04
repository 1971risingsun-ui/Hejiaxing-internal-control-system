import React, { useMemo, useState } from 'react';
import { Project, CompletionItem, FenceMaterialItem, SystemRules, Supplier, PurchaseOrder, PurchaseOrderItem, MaterialStatus } from '../types';
import { ClipboardListIcon, BoxIcon, CalendarIcon, ChevronRightIcon, ArrowLeftIcon, EditIcon, XIcon, CheckCircleIcon, UsersIcon, PlusIcon, FileTextIcon, MapPinIcon, UserIcon, TrashIcon } from './Icons';

interface GlobalPurchasingItemsProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
  onBack: () => void;
  suppliers: Supplier[];
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

const GlobalPurchasingItems: React.FC<GlobalPurchasingItemsProps> = ({ 
  projects, onUpdateProject, systemRules, onBack, suppliers, onUpdateSuppliers, onUpdateSubcontractors, purchaseOrders, onUpdatePurchaseOrders
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });
  
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [poFormData, setPoFormData] = useState({
    selectedProjectIds: [] as string[],
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    requisitioner: '',
    deliveryDate: '',
    deliveryLocation: '現場 (Site)',
    receiver: ''
  });

  const getDaysOffset = (dateStr: string, days: number) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

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
            valA = suppliers.find(s => s.id === sIdA)?.name || '';
            valB = suppliers.find(s => s.id === sIdB)?.name || '';
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
  }, [projects, sortConfig, systemRules, projectFilter, supplierFilter, suppliers]);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <div className="flex flex-col opacity-20 ml-1"><ChevronRightIcon className="w-2 h-2 -rotate-90" /><ChevronRightIcon className="w-2 h-2 rotate-90" /></div>;
    return <div className="flex flex-col ml-1 text-indigo-600"><ChevronRightIcon className={`w-2 h-2 -rotate-90 ${sortConfig.direction === 'asc' ? '' : 'opacity-20'}`} /><ChevronRightIcon className={`w-2 h-2 rotate-90 ${sortConfig.direction === 'desc' ? '' : 'opacity-20'}`} /></div>;
  };

  const toggleRowSelection = (rowKey: string) => {
    const next = new Set(selectedRowKeys);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    setSelectedRowKeys(next);
  };

  const handleCreatePOFromSelected = () => {
    if (selectedRowKeys.size === 0) {
      alert('請先勾選欲建立採購單的項目');
      return;
    }
    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const uniqueProjIds = Array.from(new Set(selectedItems.map(i => i.project.id)));
    const firstSupplierId = (selectedItems[0].type === 'sub' ? selectedItems[0].subItem?.supplierId : selectedItems[0].mainItem.supplierId) || '';

    setPoFormData({
      ...poFormData,
      selectedProjectIds: uniqueProjIds,
      supplierId: firstSupplierId
    });
    setIsCreatingPO(true);
  };

  const confirmCreatePO = () => {
    if (poFormData.selectedProjectIds.length === 0 || !poFormData.supplierId) {
      alert('請選擇專案與供應商');
      return;
    }

    const selectedItems = allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey));
    const targetSupplier = suppliers.find(s => s.id === poFormData.supplierId);
    
    const poItems: PurchaseOrderItem[] = selectedItems.map(row => {
      const isSub = row.type === 'sub';
      return {
        materialId: isSub ? (row.subItem?.id || '') : `main-${row.mainItemIdx}`,
        name: isSub ? (row.subItem?.spec || '') : row.mainItem.name,
        quantity: parseFloat(isSub ? (row.subItem?.quantity.toString() || '0') : row.mainItem.quantity),
        unit: isSub ? (row.subItem?.unit || '') : row.mainItem.unit,
        price: 0,
        notes: isSub ? row.subItem?.name : row.mainItem.itemNote,
        supplierId: poFormData.supplierId,
        projectId: row.project.id,
        projectName: row.project.name
      };
    });

    const newPO: PurchaseOrder = {
      id: crypto.randomUUID(),
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: poFormData.date,
      projectId: poFormData.selectedProjectIds[0],
      projectIds: poFormData.selectedProjectIds,
      projectName: projects.find(p => p.id === poFormData.selectedProjectIds[0])?.name || '',
      supplierId: poFormData.supplierId,
      supplierName: targetSupplier?.name || '未知供應商',
      items: poItems,
      status: 'draft',
      totalAmount: 0,
      requisitioner: poFormData.requisitioner,
      deliveryDate: poFormData.deliveryDate,
      deliveryLocation: poFormData.deliveryLocation,
      receiver: poFormData.receiver
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
          const items = [...sheet.items];
          items[row.subIdx] = { ...items[row.subIdx], isPoCreated: true };
          sheets[row.itemKey] = { ...sheet, items };
          p = { ...p, fenceMaterialSheets: sheets };
        }
      } else {
        const reports = [...p.planningReports];
        const items = [...reports[row.reportIdx].items];
        items[row.mainItemIdx] = { ...items[row.mainItemIdx], isPoCreated: true };
        reports[row.reportIdx] = { ...reports[row.reportIdx], items };
        p = { ...p, planningReports: reports };
      }
      updatedProjectsMap.set(p.id, p);
    });

    updatedProjectsMap.forEach(proj => onUpdateProject(proj));

    setIsCreatingPO(false);
    setSelectedRowKeys(new Set());
    alert('採購單已建立成功');
  };

  const handleDeleteItem = (row: RowData) => {
    if (!window.confirm('確定要刪除此採購規劃項目嗎？這將從專案報價單中移除。')) return;
    const { project, type, mainItemIdx, reportIdx, itemKey, subIdx } = row;
    
    if (type === 'sub' && itemKey && subIdx !== undefined) {
      const sheets = { ...(project.fenceMaterialSheets || {}) };
      const sheet = sheets[itemKey];
      if (sheet) {
        const items = sheet.items.filter((_, i) => i !== subIdx);
        sheets[itemKey] = { ...sheet, items };
        onUpdateProject({ ...project, fenceMaterialSheets: sheets });
      }
    } else {
      const reports = [...project.planningReports];
      const items = reports[reportIdx].items.filter((_, i) => i !== mainItemIdx);
      reports[reportIdx] = { ...reports[reportIdx], items };
      onUpdateProject({ ...project, planningReports: reports });
    }
  };

  const uniqueProjectList = useMemo(() => {
    const fullMap = new Map<string, string>();
    projects.forEach(p => {
        const hasFence = p.planningReports?.some(r => r.items.some(it => it.category === 'FENCE_MAIN'));
        if (hasFence) fullMap.set(p.id, p.name);
    });
    return Array.from(fullMap.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  const uniqueSupplierList = useMemo(() => {
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  }, [suppliers]);

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
                    <option value="ALL">全部供應商</option>
                    {uniqueSupplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg"><ClipboardListIcon className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">採購項目總覽</h1>
            <p className="text-xs text-slate-500 font-medium">勾選項目可批次建立採購單，連動報價單與供應商清冊</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRowKeys(new Set(allPurchasingItems.map(i => i.rowKey)));
                        else setSelectedRowKeys(new Set());
                      }}
                      checked={selectedRowKeys.size > 0 && selectedRowKeys.size === allPurchasingItems.length}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                </th>
                <th className="px-6 py-4 w-44">
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleSort('projectName')} className="flex items-center hover:text-indigo-600 transition-colors">案件名稱 {renderSortIcon('projectName')}</button>
                    <button 
                        onClick={handleCreatePOFromSelected}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all active:scale-90" 
                        title="將勾選項目建立採購單"
                    >
                        <FileTextIcon className="w-4 h-4" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-4 w-40">
                  <button onClick={() => handleSort('date')} className="flex items-center hover:text-indigo-600 transition-colors">預計採購日期 {renderSortIcon('date')}</button>
                </th>
                <th className="px-6 py-4 w-52 text-center">
                    <button onClick={() => handleSort('supplier')} className="flex items-center justify-center hover:text-indigo-600 transition-colors mx-auto">供應商 {renderSortIcon('supplier')}</button>
                </th>
                <th className="px-6 py-4">
                    <button onClick={() => handleSort('name')} className="flex items-center hover:text-indigo-600 transition-colors">品名 (選填) {renderSortIcon('name')}</button>
                </th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20 text-center">單位</th>
                <th className="px-6 py-4">注意/備註</th>
                <th className="px-6 py-4 w-16 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPurchasingItems.length > 0 ? allPurchasingItems.map((entry) => {
                const { project, type, subItem, mainItem, rowKey } = entry;
                const defaultDate = getDaysOffset(project.appointmentDate, -7);
                const displayDate = mainItem.productionDate || defaultDate;
                const rowName = type === 'sub' ? (subItem?.spec || '') : mainItem.name;
                const rowSpec = type === 'sub' ? '' : (mainItem.spec || '-');
                const rowQty = type === 'sub' ? subItem?.quantity : mainItem.quantity;
                const rowUnit = type === 'sub' ? subItem?.unit : mainItem.unit;
                const rowNote = type === 'sub' ? (subItem?.name || '-') : (mainItem.itemNote || '-');
                const currentSupplierId = type === 'sub' ? subItem?.supplierId : mainItem.supplierId;
                const currentSupplierName = suppliers.find(s => s.id === currentSupplierId)?.name || currentSupplierId || '-';
                const isPoCreated = type === 'sub' ? subItem?.isPoCreated : mainItem.isPoCreated;

                return (
                  <tr key={rowKey} className={`hover:bg-slate-50/50 transition-colors group ${isPoCreated ? 'bg-green-50/20' : ''}`}>
                    <td className="px-4 py-4 text-center">
                        {!isPoCreated && (
                            <input 
                              type="checkbox" 
                              checked={selectedRowKeys.has(rowKey)}
                              onChange={() => toggleRowSelection(rowKey)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                        )}
                        {isPoCreated && (
                          <span title="已建立採購單" className="flex items-center justify-center">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" />
                          </span>
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <div className={`font-black text-sm truncate max-w-[140px] ${isPoCreated ? 'text-slate-400' : 'text-indigo-700'}`}>{project.name}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{displayDate}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${currentSupplierId ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'text-slate-300'}`}>
                            {currentSupplierName}
                        </span>
                    </td>
                    <td className="px-6 py-4"><div className={`text-sm font-bold ${isPoCreated ? 'text-slate-400' : 'text-slate-800'}`}>{rowName}</div></td>
                    <td className="px-6 py-4 text-xs text-slate-500">{rowSpec}</td>
                    <td className="px-6 py-4 text-center font-black text-blue-600">{rowQty}</td>
                    <td className="px-6 py-4 text-center text-xs text-slate-400">{rowUnit}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[150px]">{rowNote}</td>
                    <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteItem(entry)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold">目前無符合條件的採購項目</p>
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
                    <button onClick={() => setIsCreatingPO(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">採購專案 (可複選)</label>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto space-y-2">
                                {uniqueProjectList.map(p => (
                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={poFormData.selectedProjectIds.includes(p.id)}
                                            onChange={() => {
                                                const next = [...poFormData.selectedProjectIds];
                                                const idx = next.indexOf(p.id);
                                                if (idx > -1) next.splice(idx, 1);
                                                else next.push(p.id);
                                                setPoFormData({ ...poFormData, selectedProjectIds: next });
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">供應商</label>
                            <div className="relative">
                                <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select 
                                    value={poFormData.supplierId}
                                    onChange={e => setPoFormData({ ...poFormData, supplierId: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option value="">選取供應商...</option>
                                    {uniqueSupplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">填表日期</label>
                            <input type="date" value={poFormData.date} onChange={e => setPoFormData({...poFormData, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">請購人</label>
                            <input type="text" value={poFormData.requisitioner} onChange={e => setPoFormData({...poFormData, requisitioner: e.target.value})} placeholder="姓名" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">需到貨日期</label>
                            <input type="date" value={poFormData.deliveryDate} onChange={e => setPoFormData({...poFormData, deliveryDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-widest">收貨人</label>
                            <input type="text" value={poFormData.receiver} onChange={e => setPoFormData({...poFormData, receiver: e.target.value})} placeholder="姓名" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">匯入之採購項目 ({selectedRowKeys.size})</span>
                        </div>
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2">所屬專案</th>
                                    <th className="px-4 py-2">品名</th>
                                    <th className="px-4 py-2 text-center">數量</th>
                                    <th className="px-4 py-2">單位</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allPurchasingItems.filter(i => selectedRowKeys.has(i.rowKey)).map(row => (
                                    <tr key={row.rowKey}>
                                        <td className="px-4 py-2 font-bold text-indigo-600">{row.project.name}</td>
                                        <td className="px-4 py-2 font-bold">{row.type === 'sub' ? row.subItem?.spec : row.mainItem.name}</td>
                                        <td className="px-4 py-2 text-center font-black text-blue-600">{row.type === 'sub' ? row.subItem?.quantity : row.mainItem.quantity}</td>
                                        <td className="px-4 py-2 text-slate-400">{row.type === 'sub' ? row.subItem?.unit : row.mainItem.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 flex-shrink-0">
                    <button type="button" onClick={() => setIsCreatingPO(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors">取消</button>
                    <button 
                        onClick={confirmCreatePO} 
                        className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                    >
                        <CheckCircleIcon className="w-5 h-5" /> 確定建立正式採購單
                    </button>
                </footer>
            </div>
        </div>
      )}
    </div>
  );
};

export default GlobalPurchasingItems;