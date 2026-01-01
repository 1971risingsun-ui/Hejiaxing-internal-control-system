import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, CompletionItem, FenceMaterialItem, FenceMaterialSheet } from '../types';
import { BoxIcon, TruckIcon, ClipboardListIcon, TrashIcon, UsersIcon, XIcon, PlusIcon, CheckCircleIcon } from './Icons';

interface MaterialPreparationProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
}

const SUBCONTRACTOR_KEYWORDS = ['怪手', '告示牌', '安衛貼紙', '美化帆布', '噪音管制看板', '監測告示牌', '寫字'];

// 刪除「圍籬板」選項
const SHEET_CATEGORIES = ['圍籬', '防溢座', '轉角', '安全走廊', '其他'];

const MaterialPreparation: React.FC<MaterialPreparationProps> = ({ project, onUpdateProject }) => {
  const [activeSubTab, setActiveSubTab] = useState<'fence' | 'modular'>('fence');
  const [selectedItemForSheet, setSelectedItemForSheet] = useState<{ item: CompletionItem; key: string } | null>(null);
  const [editingSheet, setEditingSheet] = useState<FenceMaterialSheet | null>(null);

  // 取得最新的報價單內容
  const latestPlanningReport = useMemo(() => {
    if (!project.planningReports || project.planningReports.length === 0) return null;
    return [...project.planningReports].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [project.planningReports]);

  const planningItems = latestPlanningReport?.items || [];

  // 過濾圍籬項目並分流
  const { fenceMainItems, fenceSubcontractorItems } = useMemo(() => {
    const allFence = planningItems.filter(item => item.category === 'FENCE_MAIN');
    const main: CompletionItem[] = [];
    const sub: CompletionItem[] = [];
    
    allFence.forEach(item => {
      const isSub = SUBCONTRACTOR_KEYWORDS.some(kw => (item.name || '').includes(kw));
      if (isSub) sub.push(item);
      else main.push(item);
    });
    
    return { fenceMainItems: main, fenceSubcontractorItems: sub };
  }, [planningItems]);

  // 過濾組合屋項目
  const modularItems = useMemo(() => {
    const modularCats = ['MODULAR_STRUCT', 'MODULAR_RENO', 'MODULAR_OTHER', 'MODULAR_DISMANTLE'];
    return planningItems.filter(item => modularCats.includes(item.category));
  }, [planningItems]);

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  const openMaterialSheet = (item: CompletionItem) => {
    const key = getItemKey(item);
    setSelectedItemForSheet({ item, key });
    
    const existing = project.fenceMaterialSheets?.[key];
    if (existing) {
        setEditingSheet(JSON.parse(JSON.stringify(existing)));
    } else {
        // 初始化新材料單，預設為「圍籬」分類
        setEditingSheet({
            category: '圍籬',
            items: []
        });
    }
  };

  // 當分類切換且項目為空時，根據公式自動載入預設項目
  useEffect(() => {
    if (editingSheet && editingSheet.items.length === 0 && selectedItemForSheet) {
        const baseQty = parseFloat(selectedItemForSheet.item.quantity) || 0;
        if (baseQty <= 0) return;

        let defaultItems: FenceMaterialItem[] = [];

        switch (editingSheet.category) {
            case '圍籬':
                defaultItems = [
                    { id: crypto.randomUUID(), name: '立柱', spec: '', quantity: Math.ceil(baseQty / 2.4 + 1), unit: '支' },
                    { id: crypto.randomUUID(), name: '二橫', spec: '', quantity: Math.ceil((baseQty / 2.4 + 1) * 2), unit: '支' },
                    { id: crypto.randomUUID(), name: '三橫', spec: '', quantity: Math.ceil((baseQty / 2.4 + 1) * 3), unit: '支' },
                    { id: crypto.randomUUID(), name: '斜撐', spec: '', quantity: Math.ceil(baseQty / 2.4 + 1), unit: '支' },
                    { id: crypto.randomUUID(), name: '圍籬板', spec: '', quantity: Math.ceil(baseQty / 0.75), unit: '片' },
                    { id: crypto.randomUUID(), name: '2.4m圍籬板', spec: '', quantity: Math.ceil(baseQty / 0.95), unit: '片' },
                ];
                break;
            case '防溢座':
                defaultItems = [
                    { id: crypto.randomUUID(), name: '單模', spec: '', quantity: Math.ceil(baseQty / 1.5), unit: '片' },
                    { id: crypto.randomUUID(), name: '雙模', spec: '', quantity: Math.ceil((baseQty / 1.5) * 2), unit: '片' },
                    { id: crypto.randomUUID(), name: '假模', spec: '', quantity: Math.ceil(baseQty / 2.4), unit: '片' },
                ];
                break;
            case '轉角':
                defaultItems = [
                    { id: crypto.randomUUID(), name: '透明板', spec: '', quantity: Math.ceil(baseQty / 0.75), unit: '片' },
                ];
                break;
            case '安全走廊':
                defaultItems = [
                    { id: crypto.randomUUID(), name: '骨料', spec: '', quantity: Math.ceil(baseQty / 2.4) + 1, unit: '組' },
                    { id: crypto.randomUUID(), name: '安走板', spec: '', quantity: Math.ceil(baseQty / 0.75), unit: '片' },
                ];
                break;
            default:
                break;
        }

        if (defaultItems.length > 0) {
            setEditingSheet({ ...editingSheet, items: defaultItems });
        }
    }
  }, [editingSheet?.category, selectedItemForSheet]);

  const handleSaveSheet = () => {
    if (!selectedItemForSheet || !editingSheet) return;
    
    const updatedSheets = { ...(project.fenceMaterialSheets || {}) };
    updatedSheets[selectedItemForSheet.key] = editingSheet;

    onUpdateProject({
        ...project,
        fenceMaterialSheets: updatedSheets
    });
    setSelectedItemForSheet(null);
    setEditingSheet(null);
  };

  const handleDeleteItem = (itemToDelete: CompletionItem) => {
    if (!latestPlanningReport || !window.confirm(`確定要移除「${itemToDelete.name}」嗎？`)) return;

    const updatedItems = latestPlanningReport.items.filter(item => 
      !(item.name === itemToDelete.name && item.category === itemToDelete.category && item.spec === itemToDelete.spec)
    );

    const updatedReports = project.planningReports.map(report => 
      report.id === latestPlanningReport.id ? { ...report, items: updatedItems, timestamp: Date.now() } : report
    );

    onUpdateProject({
      ...project,
      planningReports: updatedReports
    });
  };

  const renderTable = (items: CompletionItem[], title?: string, icon?: React.ReactNode, clickable: boolean = false) => {
    if (items.length === 0 && !title) {
      return (
        <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          <BoxIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">報價單中尚無相關規劃項目</p>
          <p className="text-xs mt-1 text-slate-400">請先在「報價單」頁面新增項目</p>
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
                  const hasSheet = !!project.fenceMaterialSheets?.[getItemKey(item)];
                  return (
                    <tr 
                      key={idx} 
                      onClick={() => clickable && openMaterialSheet(item)}
                      className={`hover:bg-slate-50 transition-colors group ${clickable ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-800">{item.name}</div>
                            {hasSheet && <span className="bg-blue-100 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">已填材料單</span>}
                        </div>
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
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <button 
                              onClick={() => handleDeleteItem(item)}
                              className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="從報價單移除此項"
                          >
                              <TrashIcon className="w-4 h-4" />
                          </button>
                      </td>
                    </tr>
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

      <div className="space-y-10">
        {activeSubTab === 'fence' ? (
            <>
              {renderTable(fenceMainItems, undefined, undefined, true)}
              {renderTable(fenceSubcontractorItems, "協力廠商安排", <UsersIcon className="w-4 h-4 text-indigo-500" />)}
            </>
        ) : renderTable(modularItems)}
      </div>

      {!latestPlanningReport && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">提示：本案尚未建立任何報價單規劃內容。</span>
        </div>
      )}

      {/* 材料單彈窗 */}
      {selectedItemForSheet && editingSheet && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedItemForSheet(null)}>
              <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <header className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                              <BoxIcon className="w-4 h-4" />
                          </div>
                          <div>
                              <h3 className="font-black text-slate-800 text-sm">材料單 (Material Sheet)</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">依項目基準數量自動換算</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedItemForSheet(null)} className="p-1 text-slate-400 hover:text-slate-600">
                          <XIcon className="w-5 h-5" />
                      </button>
                  </header>

                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center">
                          <div>
                              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">對應項目</div>
                              <div className="text-sm font-black text-blue-900">{selectedItemForSheet.item.name}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">基準數量</div>
                              <div className="text-sm font-black text-blue-600">{selectedItemForSheet.item.quantity} {selectedItemForSheet.item.unit}</div>
                          </div>
                      </div>

                      <div className="flex gap-4 items-center">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">材料項目選單</label>
                          <select 
                            value={editingSheet.category}
                            onChange={(e) => setEditingSheet({ ...editingSheet, category: e.target.value, items: [] })}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {SHEET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-sm">
                              <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                  <tr>
                                      <th className="px-4 py-3">項目名稱</th>
                                      <th className="px-4 py-3">規格</th>
                                      <th className="px-4 py-3 w-20 text-center">數量</th>
                                      <th className="px-4 py-3 w-16 text-center">單位</th>
                                      <th className="px-4 py-3 w-10 text-center">刪</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {editingSheet.items.map((mItem, idx) => (
                                      <tr key={mItem.id} className="hover:bg-slate-50/50">
                                          <td className="px-4 py-3">
                                              <input 
                                                type="text" 
                                                value={mItem.name} 
                                                onChange={(e) => {
                                                    const newItems = [...editingSheet.items];
                                                    newItems[idx].name = e.target.value;
                                                    setEditingSheet({ ...editingSheet, items: newItems });
                                                }}
                                                className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-0.5 font-bold"
                                              />
                                          </td>
                                          <td className="px-4 py-3">
                                              <input 
                                                type="text" 
                                                value={mItem.spec} 
                                                onChange={(e) => {
                                                    const newItems = [...editingSheet.items];
                                                    newItems[idx].spec = e.target.value;
                                                    setEditingSheet({ ...editingSheet, items: newItems });
                                                }}
                                                placeholder="填寫規格..."
                                                className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-0.5 text-xs text-slate-500"
                                              />
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                              <input 
                                                type="number" 
                                                value={mItem.quantity} 
                                                onChange={(e) => {
                                                    const newItems = [...editingSheet.items];
                                                    newItems[idx].quantity = parseFloat(e.target.value) || 0;
                                                    setEditingSheet({ ...editingSheet, items: newItems });
                                                }}
                                                className="w-16 bg-slate-50 border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold text-blue-600"
                                              />
                                          </td>
                                          <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-400">
                                              {mItem.unit}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                              <button 
                                                onClick={() => {
                                                    const newItems = editingSheet.items.filter((_, i) => i !== idx);
                                                    setEditingSheet({ ...editingSheet, items: newItems });
                                                }}
                                                className="text-slate-300 hover:text-red-500"
                                              >
                                                  <TrashIcon className="w-4 h-4" />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                                  {editingSheet.items.length === 0 && (
                                      <tr>
                                          <td colSpan={5} className="py-10 text-center text-slate-300 italic text-xs">
                                              尚無項目，切換分類或手動新增
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                          <div className="bg-slate-50 p-2 border-t border-slate-100">
                              <button 
                                onClick={() => {
                                    const m: FenceMaterialItem = { id: crypto.randomUUID(), name: '新材料', spec: '', quantity: 0, unit: '項' };
                                    setEditingSheet({ ...editingSheet, items: [...editingSheet.items, m] });
                                }}
                                className="w-full py-2 bg-white border border-dashed border-slate-300 rounded-xl text-blue-600 text-xs font-black flex items-center justify-center gap-1 hover:bg-white/80 transition-all"
                              >
                                  <PlusIcon className="w-3 h-3" /> 手動追加材料
                              </button>
                          </div>
                      </div>
                  </div>

                  <footer className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button 
                        onClick={() => setSelectedItemForSheet(null)}
                        className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
                      >
                          取消
                      </button>
                      <button 
                        onClick={handleSaveSheet}
                        className="px-8 py-2 rounded-xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                          <CheckCircleIcon className="w-4 h-4" /> 儲存材料單
                      </button>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};

export default MaterialPreparation;