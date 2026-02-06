
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, User, CompletionReport as CompletionReportType, CompletionItem, PlanningCard, CardType, PlanningMaterialDetail, SystemRules, CardGenerationRule, PlanningMaterialDetailTemplate } from '../types';
import { PlusIcon, FileTextIcon, TrashIcon, XIcon, CheckCircleIcon, EditIcon, LoaderIcon, ClockIcon, DownloadIcon, UploadIcon, CopyIcon, LayoutGridIcon, BoxIcon, UsersIcon, PenToolIcon, BriefcaseIcon, SettingsIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';
import ExcelJS from 'exceljs';

declare const html2canvas: any;
declare const jspdf: any;

interface EngineeringPlanningProps {
  project: Project;
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  systemRules: SystemRules;
  onUpdateSystemRules: (rules: SystemRules) => void;
}

// 定義大分類及其下的子分類
const CATEGORY_GROUPS = {
    FENCE: {
        label: '安全圍籬及休息區',
        subCategories: {
            FENCE_MAIN: {
                label: '安全圍籬',
                defaultUnit: '米',
                items: [
                    "怪手整地、打洞", "新作防颱型甲種圍籬", "30cm防溢座 - 單模", "基地內圍牆加高圍籬",
                    "新作8米施工大門", "新作6米施工大門", "警示燈", "告示牌", "安衛貼紙", "美化帆布",
                    "隔音帆布", "噪音管制看板", "監測告示牌", "休息區", "生活垃圾雨遮", "電箱網狀圍籬",
                    "電箱網狀小門加工", "大門寫字"
                ]
            }
        }
    },
    MODULAR_HOUSE: {
        label: '組合房屋',
        subCategories: {
            MODULAR_STRUCT: {
                label: '主結構',
                defaultUnit: '坪',
                items: [
                    "基礎框架 + 周邊模板", "主結構租賃", "牆板噴漆", "屋頂鋼板", "特殊雙後紐門(1F)",
                    "D2單開門", "走道", "樓梯", "客製化樓梯上蓋", "1F雨披", "W1窗", "天溝、落水管",
                    "屋頂防颱", "吊裝運費"
                ]
            },
            MODULAR_RENO: {
                label: '裝修工程',
                defaultUnit: '坪',
                items: [
                    "天花板", "2F-2分夾板+PVC地磚", "1F地坪-底料+PVC地磚", "牆板隔間", "走道止滑毯", "百葉窗"
                ]
            },
            MODULAR_OTHER: {
                label: '其他工程',
                defaultUnit: '式',
                items: [
                    "土尾工", "整體粉光"
                ]
            },
            MODULAR_DISMANTLE: {
                label: '拆除工程',
                defaultUnit: '坪',
                items: [
                    "組合房屋拆除", "吊裝運費"
                ]
            }
        }
    }
};

interface CardManagementModalProps {
  item: CompletionItem;
  onSave: (updatedItem: CompletionItem) => void;
  onClose: () => void;
  systemRules: SystemRules;
}

const CardManagementModal: React.FC<CardManagementModalProps> = ({ item, onSave, onClose, systemRules }) => {
  // 初始化時檢查是否有舊資料需要遷移到 materialDetails
  const [cards, setCards] = useState<PlanningCard[]>(() => {
      return (item.cards || []).map(c => {
          if (c.type === 'material' && (!c.materialDetails || c.materialDetails.length === 0)) {
              // 兼容舊資料：若無 details 但有 top-level fields，則建立一筆 detail
              if (c.materialName || c.spec) {
                  return {
                      ...c,
                      materialDetails: [{
                          id: crypto.randomUUID(),
                          name: c.materialName || '',
                          spec: c.spec || '',
                          quantity: c.quantity || '',
                          unit: c.unit || '',
                          formula: 'baseQty' // Assuming 1:1 if migrating old data
                      }]
                  };
              }
              // 若完全無資料，初始化一個空陣列或預設一筆空資料
              return { ...c, materialDetails: [] };
          }
          return c;
      });
  });

  const calculateQty = (formula: string, baseQty: number) => {
    try {
        const func = new Function('baseQty', 'Math', `return ${formula}`);
        const result = func(baseQty, Math);
        return isNaN(result) ? 0 : Number(result.toFixed(2));
    } catch (e) {
        return 0;
    }
  };
  
  const handleAddCard = (type: CardType) => {
    const newCard: PlanningCard = {
      id: crypto.randomUUID(),
      type,
      name: '',
      quantity: '',
      unit: '',
      spec: '',
      vendor: '',
      materialName: '',
      note: '',
      materialDetails: []
    };
    // 預設值填充
    if (type === 'material') {
        newCard.name = item.name; // 預設帶入施工項目名稱
        newCard.quantity = item.quantity; // 預設帶入數量
        newCard.unit = item.unit; // 預設帶入單位
        
        // 查找匹配的自動生成規則
        const rule = (systemRules.cardGenerationRules || []).find(r => r.targetType === 'material' && item.name.includes(r.keyword));
        const baseQty = parseFloat(item.quantity) || 0;

        if (rule && rule.materialTemplates && rule.materialTemplates.length > 0) {
            newCard.materialDetails = rule.materialTemplates.map(tpl => ({
                id: crypto.randomUUID(),
                name: tpl.name,
                spec: tpl.spec,
                quantity: String(calculateQty(tpl.quantityFormula || 'baseQty', baseQty)),
                unit: tpl.unit,
                formula: tpl.quantityFormula || 'baseQty'
            }));
        } else {
            // 備料卡片預設新增一筆明細，並代入施工項目數量和單位
            newCard.materialDetails = [{
                id: crypto.randomUUID(),
                name: '',
                spec: '',
                quantity: item.quantity,
                unit: item.unit,
                formula: 'baseQty'
            }];
        }
    }
    setCards([...cards, newCard]);
  };

  const handleUpdateCard = (id: string, field: keyof PlanningCard, value: string) => {
    setCards(cards.map(c => {
        if (c.id === id) {
            const updatedCard = { ...c, [field]: value };
            
            // 如果修改的是數量，且卡片有詳細資料，嘗試重新計算
            if (field === 'quantity' && c.type === 'material' && c.materialDetails) {
                const baseQty = parseFloat(value) || 0;
                updatedCard.materialDetails = c.materialDetails.map(d => {
                    if (d.formula) {
                        return { ...d, quantity: String(calculateQty(d.formula, baseQty)) };
                    }
                    return d;
                });
            }
            return updatedCard;
        }
        return c;
    }));
  };

  const handleDeleteCard = (id: string) => {
    if(confirm('確定刪除此卡片?')) {
        setCards(cards.filter(c => c.id !== id));
    }
  };

  const handleDuplicateCard = (id: string) => {
    const cardIndex = cards.findIndex(c => c.id === id);
    if (cardIndex === -1) return;
    
    const cardToCopy = cards[cardIndex];
    const newCard: PlanningCard = {
        ...cardToCopy,
        id: crypto.randomUUID(),
        // Deep copy material details if they exist
        materialDetails: cardToCopy.materialDetails?.map(d => ({
            ...d,
            id: crypto.randomUUID()
        }))
    };
    
    const newCards = [...cards];
    newCards.splice(cardIndex + 1, 0, newCard);
    setCards(newCards);
  };

  const handleConfirm = () => {
    onSave({ ...item, cards });
    onClose();
  };

  // --- Material Details Handlers ---
  const handleAddMaterialDetail = (cardId: string) => {
    setCards(cards.map(c => {
        if (c.id === cardId) {
            const newDetail: PlanningMaterialDetail = { 
                id: crypto.randomUUID(), 
                name: '', 
                spec: '', 
                quantity: '', 
                unit: '',
                formula: 'baseQty' 
            };
            return { ...c, materialDetails: [...(c.materialDetails || []), newDetail] };
        }
        return c;
    }));
  };

  const handleUpdateMaterialDetail = (cardId: string, detailId: string, field: keyof PlanningMaterialDetail, value: string) => {
    setCards(cards.map(c => {
        if (c.id === cardId) {
            const newDetails = (c.materialDetails || []).map(d => d.id === detailId ? { ...d, [field]: value } : d);
            return { ...c, materialDetails: newDetails };
        }
        return c;
    }));
  };

  const handleDeleteMaterialDetail = (cardId: string, detailId: string) => {
    setCards(cards.map(c => {
        if (c.id === cardId) {
            return { ...c, materialDetails: (c.materialDetails || []).filter(d => d.id !== detailId) };
        }
        return c;
    }));
  };

  const getCardStyle = (type: CardType) => {
    switch(type) {
        case 'material': return 'bg-blue-50 border-blue-200';
        case 'outsourcing': return 'bg-orange-50 border-orange-200';
        case 'subcontractor': return 'bg-purple-50 border-purple-200';
        case 'production': return 'bg-emerald-50 border-emerald-200';
        default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getCardLabel = (type: CardType) => {
    switch(type) {
        case 'material': return { text: '備料卡片', icon: <BoxIcon className="w-4 h-4 text-blue-600" />, color: 'text-blue-700' };
        case 'outsourcing': return { text: '外包卡片', icon: <BriefcaseIcon className="w-4 h-4 text-orange-600" />, color: 'text-orange-700' };
        case 'subcontractor': return { text: '協力卡片', icon: <UsersIcon className="w-4 h-4 text-purple-600" />, color: 'text-purple-700' };
        case 'production': return { text: '生產卡片', icon: <PenToolIcon className="w-4 h-4 text-emerald-600" />, color: 'text-emerald-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
        <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="font-black text-slate-800 text-lg">項目細節卡片管理</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{item.name} {item.spec ? `(${item.spec})` : ''}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-6 h-6" /></button>
        </header>
        
        <div className="p-6 bg-white border-b border-slate-100 flex gap-3 overflow-x-auto no-scrollbar">
            <button onClick={() => handleAddCard('material')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs hover:bg-blue-200 transition-all shadow-sm active:scale-95 whitespace-nowrap"><BoxIcon className="w-4 h-4" /> + 新增備料卡片</button>
            <button onClick={() => handleAddCard('outsourcing')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs hover:bg-orange-200 transition-all shadow-sm active:scale-95 whitespace-nowrap"><BriefcaseIcon className="w-4 h-4" /> + 新增外包卡片</button>
            <button onClick={() => handleAddCard('subcontractor')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-100 text-purple-700 font-bold text-xs hover:bg-purple-200 transition-all shadow-sm active:scale-95 whitespace-nowrap"><UsersIcon className="w-4 h-4" /> + 新增協力卡片</button>
            <button onClick={() => handleAddCard('production')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-200 transition-all shadow-sm active:scale-95 whitespace-nowrap"><PenToolIcon className="w-4 h-4" /> + 新增生產卡片</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
            {cards.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                    <LayoutGridIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-sm">尚未建立任何卡片</p>
                    <p className="text-xs mt-1">請點擊上方按鈕依需求新增</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cards.map((card, idx) => {
                        const style = getCardStyle(card.type);
                        const label = getCardLabel(card.type);
                        return (
                            <div key={card.id} className={`p-4 rounded-2xl border-2 ${style} relative group shadow-sm hover:shadow-md transition-all`}>
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-black/5">
                                    <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${label.color}`}>
                                        {label.icon} {label.text}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleDuplicateCard(card.id)} className="text-slate-400 hover:text-indigo-500 p-1 rounded transition-colors" title="複製此卡片"><CopyIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteCard(card.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors" title="刪除此卡片"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    {/* 備料卡片 (Material) - 支援多筆明細 */}
                                    {card.type === 'material' && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">施工項目</label>
                                                <input type="text" value={card.name} onChange={e => handleUpdateCard(card.id, 'name', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3 mt-1">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">數量</label>
                                                    <input type="text" value={card.quantity || ''} onChange={e => handleUpdateCard(card.id, 'quantity', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">單位</label>
                                                    <input type="text" value={card.unit || ''} onChange={e => handleUpdateCard(card.id, 'unit', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400" />
                                                </div>
                                            </div>

                                            <div className="mt-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-[10px] font-bold text-slate-500 block">材料明細</label>
                                                    <button onClick={() => handleAddMaterialDetail(card.id)} className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold hover:bg-blue-200 transition-colors flex items-center gap-1">
                                                        <PlusIcon className="w-3 h-3" /> 新增規格
                                                    </button>
                                                </div>
                                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                                    {(card.materialDetails || []).map((detail, dIdx) => (
                                                        <div key={detail.id} className="bg-white/60 p-2 rounded-lg border border-slate-200 shadow-sm relative group/detail">
                                                            <div className="grid grid-cols-12 gap-2 mb-1">
                                                                <div className="col-span-12">
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="材料名稱" 
                                                                        value={detail.name} 
                                                                        onChange={e => handleUpdateMaterialDetail(card.id, detail.id, 'name', e.target.value)} 
                                                                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 placeholder:text-slate-300" 
                                                                    />
                                                                </div>
                                                                <div className="col-span-12">
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="規格" 
                                                                        value={detail.spec} 
                                                                        onChange={e => handleUpdateMaterialDetail(card.id, detail.id, 'spec', e.target.value)} 
                                                                        className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 placeholder:text-slate-300" 
                                                                    />
                                                                </div>
                                                                <div className="col-span-6">
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="數量" 
                                                                        value={detail.quantity} 
                                                                        onChange={e => handleUpdateMaterialDetail(card.id, detail.id, 'quantity', e.target.value)} 
                                                                        className="w-full text-xs font-black text-blue-600 bg-white border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center placeholder:text-slate-300" 
                                                                    />
                                                                </div>
                                                                <div className="col-span-6">
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="單位" 
                                                                        value={detail.unit} 
                                                                        onChange={e => handleUpdateMaterialDetail(card.id, detail.id, 'unit', e.target.value)} 
                                                                        className="w-full text-xs text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center placeholder:text-slate-300" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDeleteMaterialDetail(card.id, detail.id)} 
                                                                className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover/detail:opacity-100 transition-opacity hover:bg-red-200"
                                                            >
                                                                <XIcon className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(card.materialDetails || []).length === 0 && (
                                                        <div className="text-center py-2 text-[10px] text-slate-400 italic">尚無明細</div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {(card.type === 'outsourcing' || card.type === 'subcontractor') && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">{card.type === 'outsourcing' ? '外包項目' : '協力項目'}</label>
                                                <input type="text" value={card.name} onChange={e => handleUpdateCard(card.id, 'name', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-orange-400" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">{card.type === 'outsourcing' ? '外包廠商' : '協力廠商'}</label>
                                                <input type="text" value={card.vendor || ''} onChange={e => handleUpdateCard(card.id, 'vendor', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-orange-400" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">規格</label>
                                                <textarea rows={2} value={card.spec || ''} onChange={e => handleUpdateCard(card.id, 'spec', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-orange-400 resize-none" />
                                            </div>
                                        </>
                                    )}

                                    {card.type === 'production' && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">品名</label>
                                                <input type="text" value={card.name} onChange={e => handleUpdateCard(card.id, 'name', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">規格</label>
                                                <textarea rows={2} value={card.spec || ''} onChange={e => handleUpdateCard(card.id, 'spec', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400 resize-none" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">數量</label>
                                                    <input type="text" value={card.quantity || ''} onChange={e => handleUpdateCard(card.id, 'quantity', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">單位</label>
                                                    <input type="text" value={card.unit || ''} onChange={e => handleUpdateCard(card.id, 'unit', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1">備註</label>
                                                <input type="text" value={card.note || ''} onChange={e => handleUpdateCard(card.id, 'note', e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-2xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 shadow-sm font-bold transition-all active:scale-95">取消</button>
            <button onClick={handleConfirm} className="px-8 py-3 rounded-2xl bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-300 font-black flex items-center gap-2 transition-all active:scale-95"><CheckCircleIcon className="w-5 h-5" /> 儲存卡片變更</button>
        </footer>
      </div>
    </div>
  );
};

const EngineeringPlanning: React.FC<EngineeringPlanningProps> = ({ 
  project, currentUser, onUpdateProject, systemRules, onUpdateSystemRules 
}) => {
  const [activeReportId, setActiveReportId] = useState<string>('');
  const [editingItem, setEditingItem] = useState<CompletionItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (project.planningReports && project.planningReports.length > 0) {
      if (!activeReportId || !project.planningReports.find(r => r.id === activeReportId)) {
        setActiveReportId(project.planningReports[0].id);
      }
    } else {
        setActiveReportId('');
    }
  }, [project.planningReports, activeReportId]);

  const activeReport = useMemo(() => {
      return project.planningReports?.find(r => r.id === activeReportId) || null;
  }, [project.planningReports, activeReportId]);

  const handleCreateReport = () => {
      const newReport: CompletionReportType = {
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          worker: currentUser.name,
          items: [],
          notes: '',
          signature: '',
          timestamp: Date.now()
      };
      onUpdateProject({
          ...project,
          planningReports: [newReport, ...(project.planningReports || [])]
      });
      setActiveReportId(newReport.id);
  };

  const handleDeleteReport = () => {
      if (!activeReport) return;
      if (confirm('確定刪除此報價單/規劃書？')) {
          const newReports = project.planningReports.filter(r => r.id !== activeReportId);
          onUpdateProject({ ...project, planningReports: newReports });
          setActiveReportId(newReports.length > 0 ? newReports[0].id : '');
      }
  };

  const handleUpdateReportDate = (date: string) => {
      if (!activeReport) return;
      const updatedReports = project.planningReports.map(r => 
          r.id === activeReportId ? { ...r, date, timestamp: Date.now() } : r
      );
      onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleAddItem = (category: string, defaultName: string, defaultUnit: string) => {
      if (!activeReport) return;
      const newItem: CompletionItem = {
          name: defaultName,
          action: 'install',
          quantity: '',
          unit: defaultUnit,
          category,
          spec: '',
          cards: []
      };
      const updatedReport = {
          ...activeReport,
          items: [...activeReport.items, newItem],
          timestamp: Date.now()
      };
      const updatedReports = project.planningReports.map(r => 
          r.id === activeReportId ? updatedReport : r
      );
      onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleUpdateItem = (index: number, field: keyof CompletionItem, value: any) => {
      if (!activeReport) return;
      const newItems = [...activeReport.items];
      newItems[index] = { ...newItems[index], [field]: value };
      const updatedReport = { ...activeReport, items: newItems, timestamp: Date.now() };
      const updatedReports = project.planningReports.map(r => 
          r.id === activeReportId ? updatedReport : r
      );
      onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleDeleteItem = (index: number) => {
      if (!activeReport || !confirm('確定刪除此項目？')) return;
      const newItems = activeReport.items.filter((_, i) => i !== index);
      const updatedReport = { ...activeReport, items: newItems, timestamp: Date.now() };
      const updatedReports = project.planningReports.map(r => 
          r.id === activeReportId ? updatedReport : r
      );
      onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleOpenCardModal = (item: CompletionItem, index: number) => {
      setEditingItem(item);
      setEditingItemIndex(index);
  };

  const handleSaveCardModal = (updatedItem: CompletionItem) => {
      if (!activeReport || editingItemIndex === null) return;
      const newItems = [...activeReport.items];
      newItems[editingItemIndex] = updatedItem;
      const updatedReport = { ...activeReport, items: newItems, timestamp: Date.now() };
      const updatedReports = project.planningReports.map(r => 
          r.id === activeReportId ? updatedReport : r
      );
      onUpdateProject({ ...project, planningReports: updatedReports });
      setEditingItem(null);
      setEditingItemIndex(null);
  };

  // Helper to render category sections
  const renderCategorySection = (groupKey: string, groupLabel: string, subCats: any) => {
      return (
          <div key={groupKey} className="mb-8">
              <h3 className="text-sm font-black text-slate-700 mb-3 bg-slate-100 p-2 rounded-lg">{groupLabel}</h3>
              {Object.entries(subCats).map(([subKey, subData]: [string, any]) => {
                  const itemsInCat = activeReport?.items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === subKey) || [];
                  
                  return (
                      <div key={subKey} className="mb-6 pl-2 border-l-2 border-slate-200">
                          <div className="flex justify-between items-center mb-2 pr-2">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{subData.label}</h4>
                              <div className="flex gap-1">
                                  {subData.items.map((itemName: string) => (
                                      <button 
                                          key={itemName}
                                          onClick={() => handleAddItem(subKey, itemName, subData.defaultUnit)}
                                          className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                      >
                                          + {itemName}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          {itemsInCat.length > 0 ? (
                              <div className="space-y-2">
                                  {itemsInCat.map(({ item, idx }) => (
                                      <div key={idx} className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm items-start md:items-center">
                                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 flex-shrink-0">
                                              {idx + 1}
                                          </div>
                                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 w-full">
                                              <input 
                                                  type="text" 
                                                  value={item.name} 
                                                  onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                                                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-400"
                                                  placeholder="項目名稱"
                                              />
                                              <input 
                                                  type="text" 
                                                  value={item.spec || ''} 
                                                  onChange={(e) => handleUpdateItem(idx, 'spec', e.target.value)}
                                                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-blue-400"
                                                  placeholder="規格說明"
                                              />
                                              <div className="flex gap-2">
                                                  <input 
                                                      type="text" 
                                                      value={item.quantity} 
                                                      onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                                                      className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-black text-blue-600 text-center outline-none focus:border-blue-400"
                                                      placeholder="數量"
                                                  />
                                                  <input 
                                                      type="text" 
                                                      value={item.unit} 
                                                      onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                                                      className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-500 text-center outline-none focus:border-blue-400"
                                                      placeholder="單位"
                                                  />
                                              </div>
                                              <div className="flex justify-between items-center gap-2">
                                                  <button 
                                                      onClick={() => handleOpenCardModal(item, idx)}
                                                      className={`flex-1 py-1.5 rounded border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${item.cards && item.cards.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
                                                  >
                                                      <LayoutGridIcon className="w-3 h-3" />
                                                      {item.cards && item.cards.length > 0 ? `${item.cards.length} 張卡片` : '詳細卡片'}
                                                  </button>
                                                  <button onClick={() => handleDeleteItem(idx)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                                      <TrashIcon className="w-4 h-4" />
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="p-4 border-2 border-dashed border-slate-100 rounded-lg text-center text-xs text-slate-300">
                                  無項目 (點擊上方按鈕新增)
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex-shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><FileTextIcon className="w-5 h-5" /></div>
                <div>
                    <h2 className="text-lg font-black text-slate-800">工程規劃與報價</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Planning & Quotation</p>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <select 
                    value={activeReportId} 
                    onChange={(e) => setActiveReportId(e.target.value)}
                    className="flex-1 md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                    {project.planningReports?.map(r => (
                        <option key={r.id} value={r.id}>{r.date} 規劃單 ({r.items?.length || 0} 項)</option>
                    ))}
                    {(!project.planningReports || project.planningReports.length === 0) && <option value="">無規劃單</option>}
                </select>
                <button onClick={handleCreateReport} className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95" title="新增規劃單">
                    <PlusIcon className="w-6 h-6" />
                </button>
                {activeReportId && (
                    <button onClick={handleDeleteReport} className="bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 w-10 h-10 rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-95" title="刪除此單">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
            {activeReport ? (
                <div className="space-y-6 max-w-5xl mx-auto pb-20">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">規劃日期</label>
                                <div className="relative">
                                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="date" 
                                        value={activeReport.date} 
                                        onChange={(e) => handleUpdateReportDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">規劃人員</label>
                                <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">
                                    {activeReport.worker}
                                </div>
                            </div>
                        </div>

                        {renderCategorySection('FENCE', CATEGORY_GROUPS.FENCE.label, CATEGORY_GROUPS.FENCE.subCategories)}
                        {renderCategorySection('MODULAR_HOUSE', CATEGORY_GROUPS.MODULAR_HOUSE.label, CATEGORY_GROUPS.MODULAR_HOUSE.subCategories)}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FileTextIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold">請選擇或建立一份規劃單</p>
                </div>
            )}
        </div>

        {editingItem && editingItemIndex !== null && (
            <CardManagementModal 
                item={editingItem}
                onSave={handleSaveCardModal}
                onClose={() => { setEditingItem(null); setEditingItemIndex(null); }}
                systemRules={systemRules}
            />
        )}
    </div>
  );
};

export default EngineeringPlanning;
