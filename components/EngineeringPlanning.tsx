
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
}

const CardManagementModal: React.FC<CardManagementModalProps> = ({ item, onSave, onClose }) => {
  const [cards, setCards] = useState<PlanningCard[]>(() => {
      return (item.cards || []).map(c => {
          if (c.type === 'material' && (!c.materialDetails || c.materialDetails.length === 0)) {
              if (c.materialName || c.spec) {
                  return {
                      ...c,
                      materialDetails: [{
                          id: crypto.randomUUID(),
                          name: c.materialName || '',
                          spec: c.spec || '',
                          quantity: c.quantity || '',
                          unit: c.unit || ''
                      }]
                  };
              }
              return { ...c, materialDetails: [] };
          }
          return c;
      });
  });
  
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
    if (type === 'material') {
        newCard.name = item.name;
        newCard.quantity = item.quantity;
        newCard.unit = item.unit;
        newCard.materialDetails = [{
            id: crypto.randomUUID(),
            name: '',
            spec: '',
            quantity: item.quantity,
            unit: item.unit
        }];
    }
    setCards([...cards, newCard]);
  };

  const handleUpdateCard = (id: string, field: keyof PlanningCard, value: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleDeleteCard = (id: string) => {
    if(confirm('確定刪除此卡片?')) {
        setCards(cards.filter(c => c.id !== id));
    }
  };

  const handleConfirm = () => {
    onSave({ ...item, cards });
    onClose();
  };

  const handleAddMaterialDetail = (cardId: string) => {
    setCards(cards.map(c => {
        if (c.id === cardId) {
            const newDetail: PlanningMaterialDetail = { 
                id: crypto.randomUUID(), 
                name: '', 
                spec: '', 
                quantity: '', 
                unit: '' 
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
                    {cards.map((card) => {
                        const style = getCardStyle(card.type);
                        const label = getCardLabel(card.type);
                        return (
                            <div key={card.id} className={`p-4 rounded-2xl border-2 ${style} relative group shadow-sm hover:shadow-md transition-all`}>
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-black/5">
                                    <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${label.color}`}>
                                        {label.icon} {label.text}
                                    </div>
                                    <button onClick={() => handleDeleteCard(card.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                                
                                <div className="space-y-3">
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
                                                    {(card.materialDetails || []).map((detail) => (
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

const EngineeringPlanning: React.FC<EngineeringPlanningProps> = ({ project, currentUser, onUpdateProject, systemRules, onUpdateSystemRules }) => {
  const [activeReportId, setActiveReportId] = useState<string>('');
  const [editingItem, setEditingItem] = useState<{ reportId: string, itemIdx: number } | null>(null);
  
  const reports = useMemo(() => {
    return [...(project.planningReports || [])].sort((a, b) => b.timestamp - a.timestamp);
  }, [project.planningReports]);

  useEffect(() => {
    if (reports.length > 0 && !activeReportId) {
        setActiveReportId(reports[0].id);
    }
  }, [reports, activeReportId]);

  const activeReport = reports.find(r => r.id === activeReportId);

  const handleAddReport = () => {
    const newReport: CompletionReportType = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        worker: currentUser.name,
        items: [],
        notes: '',
        signature: '',
        timestamp: Date.now()
    };
    onUpdateProject({ ...project, planningReports: [newReport, ...reports] });
    setActiveReportId(newReport.id);
  };

  const handleDeleteReport = (id: string) => {
    if (!confirm('確定刪除此報價單？')) return;
    const updated = reports.filter(r => r.id !== id);
    onUpdateProject({ ...project, planningReports: updated });
    if (activeReportId === id && updated.length > 0) setActiveReportId(updated[0].id);
    else if (updated.length === 0) setActiveReportId('');
  };

  const handleAddItem = (category: string, itemName: string, defaultUnit: string) => {
    if (!activeReport) return;
    const newItem: CompletionItem = {
        name: itemName,
        action: 'install',
        quantity: '',
        unit: defaultUnit,
        category: category,
        spec: '',
        itemNote: '',
        cards: []
    };
    const updatedReport = { ...activeReport, items: [...activeReport.items, newItem] };
    const updatedReports = reports.map(r => r.id === activeReport.id ? updatedReport : r);
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleDeleteItem = (index: number) => {
    if (!activeReport) return;
    const newItems = [...activeReport.items];
    newItems.splice(index, 1);
    const updatedReport = { ...activeReport, items: newItems };
    const updatedReports = reports.map(r => r.id === activeReport.id ? updatedReport : r);
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleUpdateItem = (index: number, field: keyof CompletionItem, value: any) => {
    if (!activeReport) return;
    const newItems = [...activeReport.items];
    newItems[index] = { ...newItems[index], [field]: value };
    const updatedReport = { ...activeReport, items: newItems };
    const updatedReports = reports.map(r => r.id === activeReport.id ? updatedReport : r);
    onUpdateProject({ ...project, planningReports: updatedReports });
  };

  const handleCardManagementSave = (updatedItem: CompletionItem) => {
    if (!editingItem || !activeReport) return;
    const newItems = [...activeReport.items];
    newItems[editingItem.itemIdx] = updatedItem;
    const updatedReport = { ...activeReport, items: newItems };
    const updatedReports = reports.map(r => r.id === activeReport.id ? updatedReport : r);
    onUpdateProject({ ...project, planningReports: updatedReports });
    setEditingItem(null);
  };

  const renderCategorySection = (groupKey: string, groupData: any) => {
    return (
        <div key={groupKey} className="mb-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                    <BoxIcon className="w-4 h-4 text-blue-500" /> {groupData.label}
                </h3>
            </div>
            
            {Object.entries(groupData.subCategories).map(([subKey, subData]: [string, any]) => {
                const subItems = activeReport?.items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === subKey) || [];
                
                return (
                    <div key={subKey} className="p-4 border-b border-slate-100 last:border-0">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{subData.label}</h4>
                            <div className="flex gap-2">
                                {subData.items.map((opt: string) => (
                                    <button 
                                        key={opt}
                                        onClick={() => handleAddItem(subKey, opt, subData.defaultUnit)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-[10px] transition-colors border border-slate-200"
                                    >
                                        + {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {subItems.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-400 font-bold">
                                    <tr>
                                        <th className="px-3 py-2 w-10">#</th>
                                        <th className="px-3 py-2 w-1/4">項目</th>
                                        <th className="px-3 py-2 w-1/4">規格</th>
                                        <th className="px-3 py-2 w-16 text-center">數量</th>
                                        <th className="px-3 py-2 w-16 text-center">單位</th>
                                        <th className="px-3 py-2">備註</th>
                                        <th className="px-3 py-2 w-24 text-center">卡片/操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subItems.map(({ item, idx }) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-3 py-2 text-center text-slate-300">{idx + 1}</td>
                                            <td className="px-3 py-2 font-bold text-slate-700">{item.name}</td>
                                            <td className="px-3 py-2">
                                                <input 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none" 
                                                    value={item.spec || ''} 
                                                    onChange={e => handleUpdateItem(idx, 'spec', e.target.value)} 
                                                    placeholder="規格..."
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-center font-black text-blue-600" 
                                                    value={item.quantity} 
                                                    onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)} 
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-center" 
                                                    value={item.unit} 
                                                    onChange={e => handleUpdateItem(idx, 'unit', e.target.value)} 
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none" 
                                                    value={item.itemNote || ''} 
                                                    onChange={e => handleUpdateItem(idx, 'itemNote', e.target.value)} 
                                                    placeholder="備註..."
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => setEditingItem({ reportId: activeReport!.id, itemIdx: idx })}
                                                        className={`p-1.5 rounded-lg transition-all ${item.cards && item.cards.length > 0 ? 'bg-indigo-100 text-indigo-600 shadow-sm' : 'text-slate-300 hover:text-indigo-500'}`}
                                                        title="卡片管理"
                                                    >
                                                        <SettingsIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteItem(idx)} className="text-slate-300 hover:text-red-500 p-1.5">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-4 text-slate-300 text-xs italic bg-slate-50/30 rounded border border-dashed border-slate-200">
                                尚未新增項目
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-100">
                <FileTextIcon className="w-5 h-5" />
            </div>
            <div>
                <h1 className="text-lg font-black text-slate-800">報價單規劃 (Quotation & Planning)</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">依據報價單建立工程需求與細節卡片</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
                <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                    value={activeReportId} 
                    onChange={e => setActiveReportId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                    {reports.map((r, i) => (
                        <option key={r.id} value={r.id}>{r.date} (版本 {reports.length - i})</option>
                    ))}
                    {reports.length === 0 && <option value="">無報價單</option>}
                </select>
            </div>
            
            <button onClick={handleAddReport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95">
                <PlusIcon className="w-4 h-4" /> 新增報價單
            </button>
            
            {activeReportId && (
                <button onClick={() => handleDeleteReport(activeReportId)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>

      {activeReport ? (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <label className="text-xs font-bold text-slate-500 whitespace-nowrap">報價單日期:</label>
                <input 
                    type="date" 
                    value={activeReport.date} 
                    onChange={(e) => {
                        const updated = { ...activeReport, date: e.target.value };
                        onUpdateProject({ ...project, planningReports: reports.map(r => r.id === activeReport.id ? updated : r) });
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {Object.entries(CATEGORY_GROUPS).map(([key, data]) => renderCategorySection(key, data))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <FileTextIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-sm">目前無報價單</p>
            <p className="text-xs mt-1">請點擊上方按鈕新增</p>
        </div>
      )}

      {editingItem && activeReport && (
        <CardManagementModal 
            item={activeReport.items[editingItem.itemIdx]}
            onSave={handleCardManagementSave}
            onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};

export default EngineeringPlanning;
