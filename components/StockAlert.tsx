import React, { useState } from 'react';
import { StockAlertItem } from '../types';
import { AlertIcon, TrashIcon, PlusIcon, ArrowLeftIcon, XIcon, CheckCircleIcon, BoxIcon } from './Icons';

interface StockAlertProps {
  items: StockAlertItem[];
  onUpdateItems: (items: StockAlertItem[]) => void;
  onBack: () => void;
}

const StockAlert: React.FC<StockAlertProps> = ({ items, onUpdateItems, onBack }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<StockAlertItem, 'id' | 'timestamp'>>({
    name: '',
    spec: '',
    quantity: '',
    unit: '',
    note: ''
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;

    const item: StockAlertItem = {
      ...newItem,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    onUpdateItems([...items, item]);
    setNewItem({ name: '', spec: '', quantity: '', unit: '', note: '' });
    setIsAdding(false);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('確定要移除此筆爆量紀錄嗎？')) {
      onUpdateItems(items.filter(i => i.id !== id));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 hover:text-rose-600 font-bold text-xs cursor-pointer transition-colors w-fit" onClick={onBack}>
          <ArrowLeftIcon className="w-3 h-3" /> 返回採購
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-rose-100 active:scale-95 transition-all flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" /> 新增爆量項目
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-rose-600 p-3 rounded-xl text-white shadow-lg shadow-rose-100">
            <AlertIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">常備庫存爆量通知</h1>
            <p className="text-xs text-slate-500 font-medium italic">當廠內常用材料累積過剩時進行登錄，提示採購人員優先消化現存物料</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-rose-50 text-rose-800 text-[10px] uppercase font-black tracking-widest border-b border-rose-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">品名</th>
                <th className="px-6 py-4">規格</th>
                <th className="px-6 py-4 w-24 text-center">爆量數量</th>
                <th className="px-6 py-4 w-20 text-center">單位</th>
                <th className="px-6 py-4">注意/備註</th>
                <th className="px-6 py-4 w-16 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? items.sort((a, b) => b.timestamp - a.timestamp).map((item) => (
                <tr key={item.id} className="hover:bg-rose-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-slate-800">{item.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 whitespace-pre-wrap max-w-[250px]">{item.spec || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-sm text-rose-600">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs text-slate-400 font-bold">{item.unit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{item.note || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteItem(item.id)} 
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-32 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-base font-bold italic">目前庫存水位正常</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsAdding(false)}>
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-600 p-2 rounded-xl text-white">
                            <PlusIcon className="w-4 h-4" />
                        </div>
                        <h3 className="font-black text-rose-900 uppercase tracking-tighter">新增庫存爆量提示</h3>
                    </div>
                    <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                
                <form onSubmit={handleAddItem} className="p-8 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">材料名稱</label>
                            <input 
                                type="text" required
                                value={newItem.name}
                                onChange={e => setNewItem({...newItem, name: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                                placeholder="例如: 鍍鋅鋼板"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">規格 (選填)</label>
                            <textarea 
                                rows={2}
                                value={newItem.spec}
                                onChange={e => setNewItem({...newItem, spec: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all shadow-inner resize-none"
                                placeholder="詳細規格描述..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">數量</label>
                                <input 
                                    type="text" required
                                    value={newItem.quantity}
                                    onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-rose-600 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">單位</label>
                                <input 
                                    type="text" required
                                    value={newItem.unit}
                                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                                    placeholder="米、片、支"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">注意/備註</label>
                            <input 
                                type="text"
                                value={newItem.note}
                                onChange={e => setNewItem({...newItem, note: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white"
                                placeholder="放置位置或處理建議..."
                            />
                        </div>
                    </div>

                    <footer className="pt-6 flex gap-3">
                        <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100">取消</button>
                        <button type="submit" className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-95"><CheckCircleIcon className="w-5 h-5" /> 確認發布</button>
                    </footer>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default StockAlert;