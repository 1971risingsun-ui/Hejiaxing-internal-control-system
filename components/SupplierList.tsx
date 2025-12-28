
import React, { useState, useMemo } from 'react';
import { Supplier } from '../types';
import { SearchIcon, PlusIcon, MapPinIcon, UserIcon, PhoneIcon, BoxIcon, TrashIcon, EditIcon, XIcon, CheckCircleIcon, UsersIcon } from './Icons';

interface SupplierListProps {
  suppliers: Supplier[];
  onUpdateSuppliers: (list: Supplier[]) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({ suppliers, onUpdateSuppliers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    name: '',
    address: '',
    contact: '',
    companyPhone: '',
    mobilePhone: '',
    lineId: '',
    productList: []
  });

  const [tempProduct, setTempProduct] = useState('');

  // 模糊搜尋邏輯
  const filteredSuppliers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return suppliers;
    
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(search) || 
      s.contact.toLowerCase().includes(search) ||
      s.address.toLowerCase().includes(search) ||
      s.companyPhone.includes(search) ||
      s.mobilePhone.includes(search) ||
      (s.lineId || '').toLowerCase().includes(search) ||
      s.productList.some(p => p.toLowerCase().includes(search))
    );
  }, [suppliers, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      onUpdateSuppliers(suppliers.map(s => s.id === editingId ? { ...formData, id: editingId } : s));
    } else {
      onUpdateSuppliers([...suppliers, { ...formData, id: crypto.randomUUID() }]);
    }

    setFormData({ name: '', address: '', contact: '', companyPhone: '', mobilePhone: '', lineId: '', productList: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
    setFormData({
      name: s.name,
      address: s.address,
      contact: s.contact,
      companyPhone: s.companyPhone,
      mobilePhone: s.mobilePhone,
      lineId: s.lineId || '',
      productList: Array.isArray(s.productList) ? s.productList : []
    });
    setEditingId(s.id);
    setIsAdding(true);
  };

  const addProduct = () => {
    if (!tempProduct.trim()) return;
    setFormData({
      ...formData,
      productList: [...formData.productList, tempProduct.trim()]
    });
    setTempProduct('');
  };

  const removeProduct = (index: number) => {
    const newList = [...formData.productList];
    newList.splice(index, 1);
    setFormData({ ...formData, productList: newList });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden">
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <UsersIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">供應商清冊</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Supplier Directory</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋供應商、產品或 LINE..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', address: '', contact: '', companyPhone: '', mobilePhone: '', lineId: '', productList: [] });
                setIsAdding(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-10 h-10 rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
            >
              <PlusIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 pb-6 custom-scrollbar">
        {isAdding && (
          <div className="mb-6 bg-white p-6 rounded-2xl border border-emerald-200 shadow-xl animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? '編輯供應商資訊' : '新增供應商'}</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1"><XIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">供應商名稱</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">聯絡人</label>
                  <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">公司電話</label>
                  <input type="text" value={formData.companyPhone} onChange={e => setFormData({...formData, companyPhone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">手機</label>
                  <input type="text" value={formData.mobilePhone} onChange={e => setFormData({...formData, mobilePhone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">LINE ID</label>
                  <input type="text" value={formData.lineId} onChange={e => setFormData({...formData, lineId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">地址</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">產品清單 (條列式)</label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={tempProduct}
                    onChange={(e) => setTempProduct(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProduct())}
                    placeholder="輸入產品名稱後點擊右側加入..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <button type="button" onClick={addProduct} className="bg-slate-800 text-white px-4 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95">
                    <PlusIcon className="w-4 h-4" /> 加入
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                  {formData.productList.map((p, idx) => (
                    <span key={idx} className="bg-white border border-emerald-200 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm animate-scale-in">
                      {p}
                      <button type="button" onClick={() => removeProduct(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {formData.productList.length === 0 && <span className="text-slate-400 text-sm font-medium italic">尚未加入任何產品</span>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">取消</button>
                <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" /> 確認儲存
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">供應商名稱</th>
                  <th className="px-6 py-4">LINE</th>
                  <th className="px-6 py-4">主要產品 (清單首項)</th>
                  <th className="px-6 py-4">公司電話</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map(s => (
                  <tr 
                    key={s.id} 
                    onClick={() => handleEdit(s)}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold truncate max-w-[200px] mt-0.5">{s.contact ? `聯絡人: ${s.contact}` : '無聯絡人資訊'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {s.lineId ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-black border border-emerald-100">
                          {s.lineId}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.productList && s.productList.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <BoxIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-sm font-bold text-slate-600 truncate max-w-[200px]">{s.productList[0]}</span>
                          {s.productList.length > 1 && (
                            <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-bold">
                              +{s.productList.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">無登錄產品</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">
                      {s.companyPhone || '-'}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(s)} 
                          className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="編輯"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { if(confirm('確定刪除？')) onUpdateSuppliers(suppliers.filter(i => i.id !== s.id)); }} 
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="刪除"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <UsersIcon className="w-12 h-12 mb-3 opacity-10" />
                        <p className="text-sm font-bold">沒有找到符合搜尋條件的供應商</p>
                        {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className="mt-3 text-emerald-600 text-xs font-black underline">清除搜尋</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
            <span>總計 {filteredSuppliers.length} 家供應商</span>
            {searchTerm && <span>篩選結果</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierList;
