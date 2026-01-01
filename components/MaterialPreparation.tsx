import React, { useState, useMemo } from 'react';
import { Project, User } from '../types';
import { BoxIcon, TruckIcon, ClipboardListIcon } from './Icons';

interface MaterialPreparationProps {
  project: Project;
  currentUser: User;
}

const MaterialPreparation: React.FC<MaterialPreparationProps> = ({ project }) => {
  const [activeSubTab, setActiveSubTab] = useState<'fence' | 'modular'>('fence');

  // 取得最新的報價單內容
  const latestPlanningReport = useMemo(() => {
    if (!project.planningReports || project.planningReports.length === 0) return null;
    return [...project.planningReports].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [project.planningReports]);

  const planningItems = latestPlanningReport?.items || [];

  // 過濾圍籬項目 (安全圍籬及休息區)
  const fenceItems = useMemo(() => {
    return planningItems.filter(item => item.category === 'FENCE_MAIN');
  }, [planningItems]);

  // 過濾組合屋項目 (組合房屋下的所有子分類)
  const modularItems = useMemo(() => {
    const modularCats = ['MODULAR_STRUCT', 'MODULAR_RENO', 'MODULAR_OTHER', 'MODULAR_DISMANTLE'];
    return planningItems.filter(item => modularCats.includes(item.category));
  }, [planningItems]);

  const renderTable = (items: any[]) => {
    if (items.length === 0) {
      return (
        <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          <BoxIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">報價單中尚無相關規劃項目</p>
          <p className="text-xs mt-1 text-slate-400">請先在「報價單」頁面新增項目</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 min-w-[200px]">品名</th>
                <th className="px-6 py-4 min-w-[150px]">規格</th>
                <th className="px-6 py-4 w-24 text-center">數量</th>
                <th className="px-6 py-4 w-20">單位</th>
                <th className="px-6 py-4">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600 text-xs whitespace-pre-wrap">{item.spec || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="font-black text-blue-600">{item.quantity}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {item.unit}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {item.itemNote || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
             <TruckIcon className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-lg font-black text-slate-800">備料/安排 (Preparation)</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">依報價單內容自動彙整</p>
           </div>
        </div>
        
        {latestPlanningReport && (
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">來源報價單日期</div>
            <div className="text-sm font-bold text-slate-700">{latestPlanningReport.date}</div>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveSubTab('fence')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'fence' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <ClipboardListIcon className="w-4 h-4" /> 圍籬
        </button>
        <button 
          onClick={() => setActiveSubTab('modular')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'modular' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <BoxIcon className="w-4 h-4" /> 組合屋
        </button>
      </div>

      <div>
        {activeSubTab === 'fence' ? renderTable(fenceItems) : renderTable(modularItems)}
      </div>

      {!latestPlanningReport && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">提示：本案尚未建立任何報價單規劃內容。</span>
        </div>
      )}
    </div>
  );
};

export default MaterialPreparation;