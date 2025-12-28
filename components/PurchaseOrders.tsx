
import React, { useState, useMemo } from 'react';
import { Project, Supplier, PurchaseOrder, PurchaseOrderItem, MaterialStatus } from '../types';
import { PlusIcon, FileTextIcon, SearchIcon, TrashIcon, DownloadIcon, CheckCircleIcon, XIcon, BriefcaseIcon, UsersIcon, BoxIcon, ClipboardListIcon, CalendarIcon, UserIcon, MapPinIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';

declare const XLSX: any;

interface PurchaseOrdersProps {
  projects: Project[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onUpdatePurchaseOrders: (orders: PurchaseOrder[]) => void;
  onUpdateProject: (project: Project) => void;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ projects, suppliers, purchaseOrders, onUpdatePurchaseOrders, onUpdateProject }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 新增採購單表單狀態 (Header)
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [fillingDate, setFillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [requisitioner, setRequisitioner] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('現場 (Site)');
  const [receiver, setReceiver] = useState('');
  
  // 材料列表狀態 (Items)
  const [selectedMaterials, setSelectedMaterials] = useState<Record<string, { quantity: number; price: number; notes?: string }>>({});

  const filteredOrders = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return purchaseOrders.filter(o => 
      o.poNumber.toLowerCase().includes(search) ||
      o.projectName.toLowerCase().includes(search) ||
      o.supplierName.toLowerCase().includes(search)
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [purchaseOrders, searchTerm]);

  const currentProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]
  );

  // 當選擇專案時，自動填入專案預設資訊
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedMaterials({});
    const project = projects.find(p => p.id === projectId);
    if (project) {
        setFillingDate(project.materialFillingDate || new Date().toISOString().split('T')[0]);
        setRequisitioner(project.materialRequisitioner || '');
        setDeliveryDate(project.materialDeliveryDate || '');
        setDeliveryLocation(project.materialDeliveryLocation ? `${project.materialDeliveryLocation} (${project.materialDeliveryLocation === '廠內' ? 'Factory' : 'Site'})` : '現場 (Site)');
        setReceiver(project.materialReceiver || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedSupplierId || Object.keys(selectedMaterials).length === 0) {
      alert('請選取專案、供應商並至少加入一項材料');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    const poItems: PurchaseOrderItem[] = Object.entries(selectedMaterials).map(([mid, data]) => {
      const mat = currentProject?.materials.find(m => m.id === mid);
      return {
        materialId: mid,
        name: mat?.name || '',
        quantity: data.quantity,
        unit: mat?.unit || '',
        price: data.price,
        notes: mat?.notes || data.notes
      };
    });

    const totalAmount = poItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const newPO: PurchaseOrder = {
      id: crypto.randomUUID(),
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: fillingDate,
      projectId: selectedProjectId,
      projectName: currentProject?.name || '',
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || '',
      items: poItems,
      status: 'draft',
      totalAmount,
      requisitioner,
      deliveryDate,
      deliveryLocation,
      receiver
    };

    onUpdatePurchaseOrders([...purchaseOrders, newPO]);

    // 更新專案中材料的狀態
    if (currentProject) {
        const updatedMaterials = currentProject.materials.map(m => 
            selectedMaterials[m.id] ? { ...m, status: MaterialStatus.ORDERED } : m
        );
        onUpdateProject({ ...currentProject, materials: updatedMaterials });
    }

    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setSelectedSupplierId('');
    setSelectedMaterials({});
    setFillingDate(new Date().toISOString().split('T')[0]);
    setRequisitioner('');
    setDeliveryDate('');
    setDeliveryLocation('現場 (Site)');
    setReceiver('');
  };

  const handleExportPO = (po: PurchaseOrder) => {
    try {
      const data = [
        ["採購單 (Purchase Order)"],
        ["單號", po.poNumber],
        ["日期", po.date],
        ["專案名稱", po.projectName],
        ["供應商", po.supplierName],
        ["請購人", po.requisitioner || ""],
        ["需到貨日期", po.deliveryDate || ""],
        ["送貨地點", po.deliveryLocation || ""],
        ["收貨人", po.receiver || ""],
        [],
        ["項次", "品名", "數量", "單位", "單價", "備註", "小計"]
      ];

      po.items.forEach((item, idx) => {
        data.push([
          (idx + 1).toString(),
          item.name,
          item.quantity.toString(),
          item.unit,
          item.price.toString(),
          item.notes || "",
          (item.quantity * item.price).toString()
        ]);
      });

      data.push([], ["", "", "", "", "", "總計", po.totalAmount.toString()]);

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PO");
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(new Blob([wbout]), `${po.poNumber}_${po.supplierName}.xlsx`);
    } catch (e) {
      alert('匯出失敗');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden">
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <ClipboardListIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">採購單管理</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Purchase Orders</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋單號、專案或供應商..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              >
                <PlusIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6 custom-scrollbar">
        {isAdding && (
          <div className="space-y-6 animate-fade-in">
            {/* Header: 請購資訊 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="font-bold text-lg text-slate-800">請購資訊</h3>
                <button onClick={() => { setIsAdding(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">選擇專案</label>
                  <select 
                    required 
                    value={selectedProjectId} 
                    onChange={e => handleProjectChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="">請選取...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">選擇供應商</label>
                  <select 
                    required 
                    value={selectedSupplierId} 
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="">請選取...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">填表日期</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={fillingDate}
                      onChange={(e) => setFillingDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">請購人</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={requisitioner}
                      onChange={(e) => setRequisitioner(e.target.value)}
                      placeholder="請輸入姓名"
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">需到貨日期</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">送貨地點</label>
                  <div className="relative">
                    <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                    >
                      <option value="現場 (Site)">現場 (Site)</option>
                      <option value="廠內 (Factory)">廠內 (Factory)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">收貨人</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      placeholder="收貨窗口姓名"
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* List: 材料清單 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">材料清單</h3>
                  <p className="text-sm text-slate-500">管理的請購項目</p>
                </div>
              </div>

              {currentProject ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">選取</th>
                        <th className="px-4 py-3 min-w-[200px]">工程項目</th>
                        <th className="px-4 py-3 w-24 text-center">數量</th>
                        <th className="px-4 py-3 w-20 text-center">單位</th>
                        <th className="px-4 py-3 w-32 text-center">單價 (必填)</th>
                        <th className="px-4 py-3 min-w-[150px]">備註</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {currentProject.materials.map(m => {
                        const isSel = !!selectedMaterials[m.id];
                        const mData = selectedMaterials[m.id] || { quantity: m.quantity, price: 0, notes: m.notes || '' };
                        return (
                          <tr key={m.id} className={`${isSel ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                            <td className="px-4 py-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={isSel} 
                                onChange={() => {
                                  if(isSel) {
                                    const next = {...selectedMaterials}; delete next[m.id]; setSelectedMaterials(next);
                                  } else {
                                    setSelectedMaterials({...selectedMaterials, [m.id]: { quantity: m.quantity, price: 0, notes: m.notes || '' }});
                                  }
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">{m.name}</td>
                            <td className="px-4 py-3 text-center">
                              {isSel ? (
                                <input 
                                  type="number" 
                                  value={mData.quantity} 
                                  onChange={e => setSelectedMaterials({...selectedMaterials, [m.id]: { ...mData, quantity: Number(e.target.value) }})}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : m.quantity}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-center">{m.unit}</td>
                            <td className="px-4 py-3 text-center">
                              <input 
                                type="number" 
                                placeholder="0"
                                disabled={!isSel}
                                value={mData.price || ''}
                                onChange={e => setSelectedMaterials({...selectedMaterials, [m.id]: { ...mData, price: Number(e.target.value) }})}
                                className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-right font-mono outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                              />
                            </td>
                            <td className="px-4 py-3">
                               <input 
                                 type="text" 
                                 disabled={!isSel}
                                 value={mData.notes}
                                 onChange={e => setSelectedMaterials({...selectedMaterials, [m.id]: { ...mData, notes: e.target.value }})}
                                 className="w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-slate-200 outline-none text-slate-500 text-xs"
                                 placeholder="規格需求..."
                               />
                            </td>
                          </tr>
                        );
                      })}
                      {currentProject.materials.length === 0 && (
                        <tr><td colSpan={6} className="py-20 text-center text-slate-400">專案中無任何材料，請先在專案中新增材料</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center">
                    <BoxIcon className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-base font-medium">請先選取專案以顯示材料清單</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => { setIsAdding(false); resetForm(); }} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">取消</button>
              <button 
                onClick={handleSubmit}
                className="px-10 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" /> 確認建立採購單
              </button>
            </div>
          </div>
        )}

        {!isAdding && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">採購單號 / 日期</th>
                    <th className="px-6 py-4">專案名稱</th>
                    <th className="px-6 py-4">供應商</th>
                    <th className="px-6 py-4 text-right">總金額</th>
                    <th className="px-6 py-4 text-center">狀態</th>
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{po.poNumber}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{po.date}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <BriefcaseIcon className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{po.projectName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <UsersIcon className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-sm font-bold text-slate-600">{po.supplierName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-indigo-700 font-mono">${po.totalAmount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border border-slate-200">
                          {po.status === 'draft' ? '草稿' : po.status === 'sent' ? '已發送' : '已結案'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => handleExportPO(po)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="匯出 Excel"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { if(confirm('確定刪除此採購單？')) onUpdatePurchaseOrders(purchaseOrders.filter(o => o.id !== po.id)); }} 
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="刪除"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-24 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <BoxIcon className="w-16 h-16 mb-4 opacity-10" />
                          <p className="text-base font-bold">目前無採購單資料</p>
                          <p className="text-xs mt-1">點擊右上方「+」按鈕開始建立</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrders;
