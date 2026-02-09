
import React, { useMemo, useState, useEffect } from 'react';
import { Project, User, CompletionItem, FenceMaterialItem, FenceMaterialSheet, SystemRules } from '../types';
import { BoxIcon, TruckIcon, ClipboardListIcon, TrashIcon, UsersIcon, PlusIcon, PenToolIcon, CalendarIcon, FileTextIcon } from './Icons';

interface MaterialPreparationProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
}

// 擴展介面以包含父層資訊，方便平面化處理
interface FlatMaterialItem extends FenceMaterialItem {
    parentItem: CompletionItem;
    parentKey: string;
    parentCategory: string;
}

const MaterialPreparation: React.FC<MaterialPreparationProps> = ({ project, onUpdateProject, systemRules }) => {
  const [activeSubTab, setActiveSubTab] = useState<'fence' | 'modular'>('fence');
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // 取得所有報價單，並依時間排序（新到舊）
  const allReports = useMemo(() => {
    if (!project.planningReports || project.planningReports.length === 0) return [];
    return [...project.planningReports].sort((a, b) => b.timestamp - a.timestamp);
  }, [project.planningReports]);

  // 當報價單列表變動或初始載入時，預設選取最新的一筆
  useEffect(() => {
    if (allReports.length > 0 && !selectedReportId) {
      setSelectedReportId(allReports[0].id);
    } else if (allReports.length > 0 && !allReports.find(r => r.id === selectedReportId)) {
      setSelectedReportId(allReports[0].id);
    }
  }, [allReports, selectedReportId]);

  // 取得當前選取的報價單內容
  const currentPlanningReport = useMemo(() => {
    if (!selectedReportId) return allReports[0] || null;
    return allReports.find(r => r.id === selectedReportId) || allReports[0] || null;
  }, [allReports, selectedReportId]);

  const planningItems = currentPlanningReport?.items || [];

  const getItemKey = (item: CompletionItem) => `${item.name}_${item.category}_${item.spec || 'no-spec'}`;

  // 從卡片生成材料 (核心邏輯：只導入備料卡片)
  const getMaterialItemsFromCards = (item: CompletionItem): { category: string; items: FenceMaterialItem[] } | null => {
    if (!item.cards || item.cards.length === 0) return null;
    
    // 優先處理 material 類型的卡片
    const materialCards = item.cards.filter(c => c.type === 'material');
    if (materialCards.length === 0) return null;

    const generatedItems: FenceMaterialItem[] = [];
    
    materialCards.forEach(card => {
        if (card.materialDetails) {
            card.materialDetails.forEach(detail => {
                generatedItems.push({
                    id: crypto.randomUUID(),
                    name: detail.name,
                    spec: detail.spec,
                    quantity: parseFloat(detail.quantity) || 0,
                    unit: detail.unit,
                    notes: card.name // 使用卡片名稱 (即施工項目) 作為備註
                });
            });
        }
    });

    if (generatedItems.length === 0) return null;

    return {
        category: '卡片生成',
        items: generatedItems
    };
  };

  // 平面化材料清單：遍歷所有規劃項目，展開其材料明細
  const flatMaterialList = useMemo(() => {
      const list: FlatMaterialItem[] = [];
      
      planningItems.forEach(item => {
          const itemKey = getItemKey(item);
          const existingSheet = project.fenceMaterialSheets?.[itemKey];
          const cardData = getMaterialItemsFromCards(item);
          
          // 優先使用已存檔的材料表，若無則使用卡片生成
          const activeItems = existingSheet?.items || cardData?.items || [];
          
          activeItems.forEach(mItem => {
              list.push({
                  ...mItem,
                  parentItem: item,
                  parentKey: itemKey,
                  parentCategory: item.category,
                  // 確保備註欄位有值，若為空則預設帶入施工項目名稱
                  notes: mItem.notes || item.name
              });
          });
      });
      
      return list;
  }, [planningItems, project.fenceMaterialSheets]);

  // 根據頁籤篩選顯示內容
  const displayedMaterials = useMemo(() => {
      return flatMaterialList.filter(m => {
          const isModular = ['MODULAR_STRUCT', 'MODULAR_RENO', 'MODULAR_OTHER', 'MODULAR_DISMANTLE'].includes(m.parentCategory);
          if (activeSubTab === 'modular') return isModular;
          // Fence includes FENCE_MAIN and others not in modular
          return !isModular;
      });
  }, [flatMaterialList, activeSubTab]);

  const updateMaterialItem = (flatItem: FlatMaterialItem, field: keyof FenceMaterialItem, value: any) => {
      const { parentKey, parentItem, id } = flatItem;
      
      // 1. 取得當前該項目的完整材料列表
      let currentItems: FenceMaterialItem[] = [];
      const existingSheet = project.fenceMaterialSheets?.[parentKey];
      const cardData = getMaterialItemsFromCards(parentItem);
      
      if (existingSheet) {
          currentItems = [...existingSheet.items];
      } else if (cardData) {
          currentItems = [...cardData.items];
      } else {
          return;
      }
      
      // 2. 更新指定材料
      const targetIdx = currentItems.findIndex(i => i.id === id);
      if (targetIdx === -1) return;
      
      currentItems[targetIdx] = { ...currentItems[targetIdx], [field]: value };
      
      // 3. 回存至 Project
      const category = existingSheet?.category || cardData?.category || '其他';
      const updatedSheets = { ...(project.fenceMaterialSheets || {}), [parentKey]: { category, items: currentItems } };
      onUpdateProject({ ...project, fenceMaterialSheets: updatedSheets });
  };

  const deleteMaterialItem = (flatItem: FlatMaterialItem) => {
      if(!confirm('確定刪除此材料項目？')) return;
      
      const { parentKey, parentItem, id } = flatItem;
      
      let currentItems: FenceMaterialItem[] = [];
      const existingSheet = project.fenceMaterialSheets?.[parentKey];
      const cardData = getMaterialItemsFromCards(parentItem);
      
      if (existingSheet) {
          currentItems = [...existingSheet.items];
      } else if (cardData) {
          currentItems = [...cardData.items];
      }
      
      const newItems = currentItems.filter(i => i.id !== id);
      
      const category = existingSheet?.category || cardData?.category || '其他';
      const updatedSheets = { ...(project.fenceMaterialSheets || {}), [parentKey]: { category, items: newItems } };
      onUpdateProject({ ...project, fenceMaterialSheets: updatedSheets });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
             <TruckIcon className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-lg font-black text-slate-800">材料清單 (Material List)</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">依報價單備料卡片自動產生</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          {allReports.length > 0 ? (
            <div className="relative flex-1 md:w-56">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                <select 
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer"
                >
                  {allReports.map(r => (
                    <option key={r.id} value={r.id}>報價單日期: {r.date}</option>
                  ))}
                </select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
        <button onClick={() => setActiveSubTab('fence')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'fence' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
          <ClipboardListIcon className="w-4 h-4" /> 圍籬
        </button>
        <button onClick={() => setActiveSubTab('modular')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeSubTab === 'modular' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
          <BoxIcon className="w-4 h-4" /> 組合屋
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {allReports.length > 0 ? (
            displayedMaterials.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">#</th>
                                <th className="px-6 py-4 min-w-[150px]">材料名稱</th>
                                <th className="px-6 py-4 min-w-[120px]">規格</th>
                                <th className="px-6 py-4 w-24 text-center">數量</th>
                                <th className="px-6 py-4 w-20 text-center">單位</th>
                                <th className="px-6 py-4">備註 (施工項目)</th>
                                <th className="px-6 py-4 w-12 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedMaterials.map((item, idx) => (
                                <tr key={`${item.parentKey}_${item.id}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="text" 
                                            value={item.name} 
                                            onChange={(e) => updateMaterialItem(item, 'name', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none font-bold text-slate-700 text-sm"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="text" 
                                            value={item.spec} 
                                            placeholder="規格"
                                            onChange={(e) => updateMaterialItem(item, 'spec', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-slate-500 text-xs"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={(e) => updateMaterialItem(item, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-center font-black text-indigo-600"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input 
                                            type="text" 
                                            value={item.unit} 
                                            onChange={(e) => updateMaterialItem(item, 'unit', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-center text-slate-400 font-bold text-xs"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="text" 
                                            value={item.notes || ''} 
                                            placeholder="備註"
                                            onChange={(e) => updateMaterialItem(item, 'notes', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-slate-500 text-xs"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => deleteMaterialItem(item)}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-24 text-center text-slate-400">
                    <BoxIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">此分類下無材料清單</p>
                    <p className="text-xs mt-1 text-slate-300">請確認報價單項目已建立「備料卡片」</p>
                </div>
            )
        ) : (
            <div className="p-12 text-center">
                <FileTextIcon className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-500 font-bold">本案尚未建立任何報價單</p>
                <p className="text-xs text-slate-400 mt-1">請先至「報價單」頁面新增規劃內容後，此處將自動產生備料清單</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default MaterialPreparation;
