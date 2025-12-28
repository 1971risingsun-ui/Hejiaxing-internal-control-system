
import React from 'react';
import { BoxIcon, FileTextIcon, UsersIcon, ClipboardListIcon } from './Icons';

interface PurchasingModuleProps {
  onNavigate: (view: any) => void;
}

const PurchasingModule: React.FC<PurchasingModuleProps> = ({ onNavigate }) => {
  const categories = [
    { 
      id: 'purchasing_management', 
      label: '採購管理', 
      icon: <FileTextIcon className="w-6 h-6" />, 
      color: 'bg-blue-50 text-blue-600', 
      desc: '批量匯入 Excel 請購單並追蹤進度' 
    },
    { 
      id: 'purchasing_materials', 
      label: '材料請購', 
      icon: <BoxIcon className="w-6 h-6" />, 
      color: 'bg-orange-50 text-orange-600', 
      desc: '檢視各專案材料清單與進場狀況' 
    },
    { 
      id: 'purchasing_orders', 
      label: '採購單', 
      icon: <ClipboardListIcon className="w-6 h-6" />, 
      color: 'bg-indigo-50 text-indigo-600', 
      desc: '建立對供應商的正式採購單' 
    },
    { 
      id: 'purchasing_suppliers', 
      label: '供應商清冊', 
      icon: <UsersIcon className="w-6 h-6" />, 
      color: 'bg-emerald-50 text-emerald-600', 
      desc: '管理廠商資訊、聯絡方式與產品清單' 
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto h-full animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800">採購與供應鏈管理</h1>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Purchasing & Supply Chain</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onNavigate(cat.id)}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all group flex flex-col items-center text-center gap-4"
          >
            <div className={`p-4 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform`}>
              {cat.icon}
            </div>
            <div className="font-bold text-slate-800 text-lg">{cat.label}</div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{cat.desc}</p>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-auto pt-4">Module</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PurchasingModule;
