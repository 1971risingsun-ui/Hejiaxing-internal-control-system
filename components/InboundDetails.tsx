import React, { useState, useMemo } from 'react';
import { Project, Supplier, PurchaseOrder, PurchaseOrderItem, MaterialStatus, Material } from '../types';
import { FileTextIcon, SearchIcon, TrashIcon, DownloadIcon, XIcon, UsersIcon, BoxIcon, TruckIcon, CalendarIcon, EditIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';

declare const XLSX: any;

interface InboundDetailsProps {
  projects: Project[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onUpdatePurchaseOrders: (orders: PurchaseOrder[]) => void;
}

const InboundDetails: React.FC<InboundDetailsProps> = ({ projects, suppliers, purchaseOrders, onUpdatePurchaseOrders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPOId, setEditingPOId] = useState<string | null>(null);

  const filteredInbounds = useMemo(() => {
    const search = searchTerm.toLowerCase();
    // 僅顯示已下單的項目
    return purchaseOrders.filter(o => 
      o.isOrdered &&
      (o.poNumber.toLowerCase().includes(search) ||
      o.projectName.toLowerCase().includes(search) ||
      o.supplierName.toLowerCase().includes(search))
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [purchaseOrders, searchTerm]);

  const handleToggleOrdered = (e: React.MouseEvent, poId: string) => {
    e.stopPropagation();
    if (confirm('確定要將此項目移回採購單列表嗎？')) {
        const updated = purchaseOrders.map(o => o.id === poId ? { ...o, isOrdered: false } : o);
        onUpdatePurchaseOrders(updated);
    }
  };

  const handleExportPO = (po: PurchaseOrder) => {
    try {
      const data = [
        ["進料明細 (Inbound Details)"],
        ["採購單號", po.poNumber],
        ["下單日期", po.date],
        ["供應商", po.supplierName],
        ["請購人", po.requisitioner || ""],
        ["預計到貨日期", po.deliveryDate || ""],
        ["送貨地點", po.deliveryLocation || ""],
        ["收貨人", po.receiver || ""],
        [],
        ["項次", "品名", "案件名稱", "數量", "單位", "備註"]
      ];

      po.items.forEach((item, idx) => {
        data.push([
          (idx + 1).toString(),
          item.name,
          item.projectName || "",
          item.quantity.toString(),
          item.unit,
          item.notes || ""
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inbound");
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      downloadBlob(blob, `進料_${po.poNumber}_${po.supplierName}.xlsx`);
    } catch (e) {
      alert('匯出失敗');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden">
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-amber-100 p-2 rounded-xl">
              <TruckIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">進料明細管理</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Inbound Tracking</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋單號、案件或廠商..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6 custom-scrollbar">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-20 text-center">已下單</th>
                  <th className="px-6 py-4">採購單號 / 下單日期</th>
                  <th className="px-6 py-4">案件名稱</th>
                  <th className="px-6 py-4">供應商</th>
                  <th className="px-6 py-4 text-center">項目數量</th>
                  <th className="px-6 py-4 text-center">狀態</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInbounds.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={true}
                        onChange={(e) => handleToggleOrdered(e as any, po.id)}
                        className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 transition-all cursor-pointer"
                        title="移回採購單列表"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800 text-sm group-hover:text-amber-600 transition-colors">{po.poNumber}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">{po.date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{po.projectName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-sm font-bold text-slate-600">{po.supplierName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-amber-700 font-mono">{po.items.length} 項</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border border-amber-200">
                        進料中
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleExportPO(po)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="匯出進料表"
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { if(confirm('確定刪除？')) onUpdatePurchaseOrders(purchaseOrders.filter(o => o.id !== po.id)); }} 
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="刪除"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredInbounds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <TruckIcon className="w-16 h-16 mb-4 opacity-10" />
                        <p className="text-base font-bold">目前無進料中項目</p>
                        <p className="text-xs mt-1">請在「採購單管理」勾選「已下單」來追蹤進度</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboundDetails;