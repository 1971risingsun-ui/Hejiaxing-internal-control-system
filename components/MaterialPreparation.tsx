import React, { useMemo } from 'react';
import { Project, User, CompletionItem, FenceMaterialItem, FenceMaterialSheet, SystemRules } from '../types';
import { BoxIcon, TruckIcon, ClipboardListIcon, TrashIcon, UsersIcon, PlusIcon, PenToolIcon } from './Icons';

interface MaterialPreparationProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
}

const MaterialPreparation: React.FC<MaterialPreparationProps> = ({ project, onUpdateProject, systemRules }) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'fence' | 'modular'>('fence');

  // 取得最新的報價單內容
  const latestPlanningReport = useMemo(() => {
    if (!project.planningReports || project.planningReports.length === 0) return null;
    return [...project.planningReports].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [project.planningReports]);

  const planningItems = latestPlanningReport?.items || [];

  // 過濾圍籬項目並分流 (使用動態關鍵字)
  const { fenceMainItems, fenceProductionItems, fenceSubcontractorItems } = useMemo(() => {
    const allFence = planningItems.filter(item => item.category === 'FENCE_MAIN');
    const main: CompletionItem[] = [];
    const prod: CompletionItem[] = [];
    const sub: CompletionItem[] = [];
    
    allFence.forEach(item => {
      const name = item.name || '';
      const isSub = systemRules.subcontractorKeywords.some(kw => name.includes(kw));
      const isProd = systemRules.productionKeywords.some(kw => name.includes(kw));
      
      if (isSub) sub.push(item);
      else if (isProd) prod.push(item);
      else main.push(item);
    });
    
    return { 
        fenceMainItems: main, 
        fenceProductionItems: prod, 
        fenceSubcontractorItems: sub 
    };
  }, [planningItems, systemRules]);

  // 過濾組合屋項目並按類別分組
  const { 
    modularStructItems, 
    modularRenoItems, 
    modularOtherItems, 
    modularDismantleItems 
  } = useMemo(() => {
    return {
      modularStructItems: planningItems.filter(item => item.category === 'MODULAR_STRUCT'),
      modularRenoItems: planningItems.filter(item => item.category === 'MODULAR_RENO'),
      modularOtherItems: planningItems.filter(item => item.category === 'MODULAR_OTHER'),
      modularDismantleItems: planningItems.filter(item => item.category === 'MODULAR_DISMANTLE')
    };
  }, [planningItems]);

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  // 動態換算材料項目
  const getDefaultMaterialItems = (itemName: string, quantity: string): { category: string; items: FenceMaterialItem[] } | null => {
    const baseQty = parseFloat(quantity) || 0;
    if (baseQty <= 0) return null;

    // 從系統規則中尋找匹配的關鍵字
    const formulaConfig = systemRules.materialFormulas.find(f => itemName.includes(f.keyword));
    if (!formulaConfig) return null;

    const generatedItems: FenceMaterialItem[] = formulaConfig.items.map(formulaItem => {
      let calcQty = 0;
      try {
        // 安全地評估數學公式
        // eslint-disable-next-line no-new-func
        const func = new Function('baseQty', 'Math', `return ${formulaItem.formula}`);
        calcQty = func(baseQty, Math);
      } catch (e) {
        console.error(`公式解析失敗: ${formulaItem.formula}`, e);
        calcQty = baseQty; // 失敗時回退到基本數量
      }

      return {
        id: crypto.randomUUID(),
        name: formulaItem.name,
        spec: '',
        quantity: isNaN(calcQty) ? 0 : calcQty,
        unit: formulaItem.unit
      };
    });

    return {
      category: formulaConfig.category,
      items: generatedItems
    };
  };

  const updateMaterialSheet = (itemKey: string, updatedSheet: FenceMaterialSheet) => {
    const updatedSheets = { ...(project.fenceMaterialSheets || {}) };
    updatedSheets[itemKey] = updatedSheet;
    onUpdateProject({ ...project, fenceMaterialSheets: updatedSheets });
  };

  const handleDeleteMainItem = (itemToDelete: CompletionItem) => {
    if (!latestPlanningReport || !window.confirm(`確定要從報價單移除「${itemToDelete.name}」嗎？`)) return;
    const updatedItems = latestPlanningReport.items.filter(item => 
      !(item.name === itemToDelete.name && item.category === itemToDelete.category && item.spec === itemToDelete.spec)
    );
    const updatedReports = project.planningReports.map(report => 
      report.id === latestPlanningReport.id ? { ...report, items: updatedItems, timestamp: Date.now() } : report
    );
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const renderTable = (items: CompletionItem[], title?: string, icon?: React.ReactNode, showDetails: boolean = false) => {
    if (items.length === 0 && !title) {
      return (
        <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          <BoxIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">報價單中尚無相關規劃項目</p>
        </div>
      );
    }
    if (items.length === 0 && title) return null;

    return (
      <div className="space-y-3">
        {title && (
          <div className="flex items-center gap-2 px-1">
            {icon}
            <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
          </div>
        )}
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
                  <th className="px-6 py-4 w-12 text-center text-slate-300">刪除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const itemKey = getItemKey(item);
                  const existingSheet = project.fenceMaterialSheets?.[itemKey];
                  const autoData = showDetails ? getDefaultMaterialItems(item.name, item.quantity) : null;
                  
                  const activeItems = existingSheet?.items || autoData?.items || [];
                  const activeCategory = existingSheet?.category || autoData?.category || '';

                  return (
                    <React.Fragment key={itemKey}>
                      <tr className="hover:bg-slate-50 transition-colors group bg-white">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {item.name}
                            {activeCategory && <span className="bg-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter">自動備料: {activeCategory}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs whitespace-pre-wrap">{item.spec || '-'}</td>
                        <td className="px-6 py-4 text-center font-black text-blue-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{item.unit}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{item.itemNote || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => handleDeleteMainItem(item)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4" /></button>
                        </td>
                      </tr>
                      {showDetails && activeItems.length > 0 && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="px-8 py-0">
                            <div className="border-l-4 border-indigo-200 ml-4 my-2 overflow-hidden rounded-r-lg border border-slate-100 shadow-inner">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                  <tr>
                                    <th className="px-4 py-2 w-32">材料名稱</th>
                                    <th className="px-4 py-2">規格填寫</th>
                                    <th className="px-4 py-2 w-24 text-center">數量 (自動)</th>
                                    <th className="px-4 py-2 w-16 text-center">單位</th>
                                    <th className="px-4 py-2 w-10 text-center">刪除</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                  {activeItems.map((mItem, mIdx) => (
                                    <tr key={mItem.id} className="hover:bg-indigo-50/30 transition-colors">
                                      <td className="px-4 py-2">
                                        <input 
                                          type="text" value={mItem.name} 
                                          onChange={(e) => {
                                            const newItems = [...activeItems];
                                            newItems[mIdx].name = e.target.value;
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none font-bold text-slate-700"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input 
                                          type="text" value={mItem.spec} placeholder="填寫規格..."
                                          onChange={(e) => {
                                            const newItems = [...activeItems];
                                            newItems[mIdx].spec = e.target.value;
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-slate-500 italic"
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        <input 
                                          type="number" value={mItem.quantity} 
                                          onChange={(e) => {
                                            const newItems = [...activeItems];
                                            newItems[mIdx].quantity = parseFloat(e.target.value) || 0;
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="w-16 bg-slate-100/50 border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-indigo-400 font-black text-indigo-600"
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-center font-bold text-slate-400">{mItem.unit}</td>
                                      <td className="px-4 py-2 text-center">
                                        <button 
                                          onClick={() => {
                                            const newItems = activeItems.filter((_, i) => i !== mIdx);
                                            updateMaterialSheet(itemKey, { category: activeCategory, items: newItems });
                                          }}
                                          className="text-slate-300 hover:text-red-500 transition-colors"
                                        ><TrashIcon className="w-3.5 h-3.5" /></button>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-50/30">
                                    <td colSpan={5} className="p-1">
                                      <button 
                                        onClick={() => {
                                          const m: FenceMaterialItem = { id: crypto.randomUUID(), name: '新材料', spec: '', quantity: 0, unit: '項' };
                                          updateMaterialSheet(itemKey, { category: activeCategory || '其他', items: [...activeItems, m] });
                                        }}
                                        className="w-full py-1 text-[10px] font-black text-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1"
                                      >
                                        <PlusIcon className="w-3 h-3" /> 手動追加備料
                                      </button>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
             <h2 className="text-lg font-black text-slate-800">材料清單 (Material List)</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">依品名自動導入預設材料計算公式</p>
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
        <button onClick={() => setActiveSubTab('fence')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'fence' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
          <ClipboardListIcon className="w-4 h-4" /> 圍籬
        </button>
        <button onClick={() => setActiveSubTab('modular')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'modular' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
          <BoxIcon className="w-4 h-4" /> 組合屋
        </button>
      </div>

      <div className="space-y-10 pb-10">
        {activeSubTab === 'fence' ? (
          <>
            {renderTable(fenceMainItems, undefined, undefined, true)}
            {renderTable(fenceProductionItems, "生產/備料", <PenToolIcon className="w-4 h-4 text-blue-500" />, true)}
            {renderTable(fenceSubcontractorItems, "協力廠商安排", <UsersIcon className="w-4 h-4 text-indigo-500" />)}
          </>
        ) : (
          <>
            {renderTable(modularStructItems, "主結構", <BoxIcon className="w-4 h-4 text-blue-500" />)}
            {renderTable(modularRenoItems, "裝修工程", <PlusIcon className="w-4 h-4 text-emerald-500" />)}
            {renderTable(modularOtherItems, "其他工程", <TruckIcon className="w-4 h-4 text-amber-500" />)}
            {renderTable(modularDismantleItems, "拆除工程", <TrashIcon className="w-4 h-4 text-red-500" />)}
          </>
        )}
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