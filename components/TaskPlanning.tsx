
import React, { useState, useMemo } from 'react';
import { Project, User, PlanningCard, TaskSchedule, Employee, CardType } from '../types';
import { CalendarIcon, UserIcon, LayoutGridIcon, BoxIcon, BriefcaseIcon, UsersIcon, PenToolIcon, XIcon, PlusIcon, SearchIcon, TrashIcon, ChevronRightIcon } from './Icons';

interface TaskPlanningProps {
  projects: Project[];
  taskSchedules: Record<string, TaskSchedule>;
  onUpdateTaskSchedules: (schedules: Record<string, TaskSchedule>) => void;
  employees: Employee[];
  currentUser: User;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

interface DraggedCardState {
  card: PlanningCard;
  source: 'import' | 'calendar';
  originalDate?: string;
  originalZone?: 'master' | 'collab';
  originalMaster?: string; // For master zone
}

const TaskPlanning: React.FC<TaskPlanningProps> = ({ projects, taskSchedules, onUpdateTaskSchedules, employees, currentUser }) => {
  // Determine start date (Monday of current week)
  const startDate = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }, []);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [draggedCard, setDraggedCard] = useState<DraggedCardState | null>(null);
  
  // Dynamic Master Columns State - Initialize with at least one column
  const [masterColumns, setMasterColumns] = useState<string[]>(['col-1']);
  const [selectedMasters, setSelectedMasters] = useState<Record<string, string>>({});
  
  // Column Collapse State
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Generate 60 days from start date
  const displayDates = useMemo(() => {
    const days = [];
    const start = new Date(startDate);
    for (let i = 0; i < 60; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [startDate]);

  const getScheduleForDate = (date: string): TaskSchedule => {
    const schedule = taskSchedules[date] || { date, collabCards: [], masterAssignments: {} };
    // Backward Compatibility Logic
    const assignments = schedule.masterAssignments || {};
    // If legacy master data exists and is not yet in assignments, add it
    if (schedule.master && schedule.masterCards && schedule.masterCards.length > 0) {
        if (!assignments[schedule.master]) {
            assignments[schedule.master] = schedule.masterCards;
        }
    }
    // Also check generic 'cards' field
    if (schedule.cards && schedule.cards.length > 0) {
       // If we have legacy cards but no master, maybe assign to "Unassigned"? 
       // Or just ignore. Let's assign to legacy master if exists, otherwise they are hidden or need manual migration.
       if (schedule.master && !assignments[schedule.master]) {
           assignments[schedule.master] = schedule.cards;
       }
    }

    return { 
        ...schedule, 
        masterAssignments: assignments,
        collabCards: schedule.collabCards || [] 
    };
  };

  // Import Logic
  const importableCards = useMemo(() => {
    if (!selectedProjectId) return [];
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project || !project.planningReports) return [];
    
    const cards: PlanningCard[] = [];
    project.durationEstimationReports?.forEach(report => {
        report.items.forEach(item => {
            if (item.cards) {
                // Inject project Name
                const cardsWithProject = item.cards.map(c => ({
                    ...c,
                    projectName: project.name
                }));
                cards.push(...cardsWithProject);
            }
        });
    });
    return cards;
  }, [selectedProjectId, projects]);

  const groupedImportCards = useMemo(() => {
      const groups: Record<string, PlanningCard[]> = {};
      importableCards.forEach(card => {
          const key = card.name || '未命名項目';
          if(!groups[key]) groups[key] = [];
          groups[key].push(card);
      });
      return groups;
  }, [importableCards]);

  // Handlers
  const handleAddMasterColumn = () => {
      const newId = `col-${Date.now()}`;
      setMasterColumns([...masterColumns, newId]);
  };

  const handleRemoveMasterColumn = (colId: string) => {
      if (masterColumns.length <= 1) return; // Keep at least one
      setMasterColumns(masterColumns.filter(id => id !== colId));
      const newSelected = { ...selectedMasters };
      delete newSelected[colId];
      setSelectedMasters(newSelected);
      
      // Cleanup collapsed state
      if(collapsedColumns.has(colId)) {
          const newCollapsed = new Set(collapsedColumns);
          newCollapsed.delete(colId);
          setCollapsedColumns(newCollapsed);
      }
  };

  const handleMasterSelect = (colId: string, masterName: string) => {
      setSelectedMasters(prev => ({ ...prev, [colId]: masterName }));
  };

  const toggleColumnCollapse = (colId: string) => {
      const newSet = new Set(collapsedColumns);
      if (newSet.has(colId)) {
          newSet.delete(colId);
      } else {
          newSet.add(colId);
      }
      setCollapsedColumns(newSet);
  };

  const handleDrop = (e: React.DragEvent, targetDate: string, targetZone: 'master' | 'collab', targetMaster?: string) => {
    e.preventDefault();
    if (!draggedCard) return;
    
    // Safety check: if dropping to master zone, need a master selected
    if (targetZone === 'master' && !targetMaster) {
        alert("請先在欄位抬頭選擇師傅");
        return;
    }

    const schedule = getScheduleForDate(targetDate);
    const newAssignments = { ...schedule.masterAssignments };
    let newCollabCards = [...schedule.collabCards];

    // Remove from source if it was on calendar
    if (draggedCard.source === 'calendar' && draggedCard.originalDate) {
        const originalSchedule = getScheduleForDate(draggedCard.originalDate);
        const origAssignments = { ...originalSchedule.masterAssignments };
        let origCollabCards = [...originalSchedule.collabCards];

        if (draggedCard.originalZone === 'master' && draggedCard.originalMaster) {
            const masterList = origAssignments[draggedCard.originalMaster] || [];
            origAssignments[draggedCard.originalMaster] = masterList.filter(c => c.id !== draggedCard.card.id);
        } else if (draggedCard.originalZone === 'collab') {
            origCollabCards = origCollabCards.filter(c => c.id !== draggedCard.card.id);
        }

        // Save original date changes first (if diff date) or update local vars (if same date)
        if (draggedCard.originalDate !== targetDate) {
             const updatedOriginal = { 
                 ...originalSchedule, 
                 masterAssignments: origAssignments, 
                 collabCards: origCollabCards,
                 lastModifiedBy: currentUser.name,
                 lastModifiedAt: Date.now()
             };
             taskSchedules[draggedCard.originalDate] = updatedOriginal;
        } else {
            // Same date, sync local variables
            if (draggedCard.originalZone === 'master' && draggedCard.originalMaster) {
               newAssignments[draggedCard.originalMaster] = origAssignments[draggedCard.originalMaster];
            } else {
               newCollabCards = origCollabCards;
            }
        }
    }

    // Add to target
    const cardToAdd = draggedCard.source === 'import' ? { ...draggedCard.card, id: crypto.randomUUID() } : draggedCard.card;

    if (targetZone === 'master' && targetMaster) {
        const list = newAssignments[targetMaster] || [];
        newAssignments[targetMaster] = [...list, cardToAdd];
    } else {
        newCollabCards.push(cardToAdd);
    }

    const updatedTargetSchedule = {
        ...schedule,
        masterAssignments: newAssignments,
        collabCards: newCollabCards,
        lastModifiedBy: currentUser.name,
        lastModifiedAt: Date.now()
    };

    onUpdateTaskSchedules({ ...taskSchedules, [targetDate]: updatedTargetSchedule });
    setDraggedCard(null);
  };

  const handleRemoveCard = (date: string, cardId: string, zone: 'master' | 'collab', masterName?: string) => {
      const schedule = getScheduleForDate(date);
      const newAssignments = { ...schedule.masterAssignments };
      let newCollabCards = [...schedule.collabCards];

      if (zone === 'master' && masterName) {
          const list = newAssignments[masterName] || [];
          newAssignments[masterName] = list.filter(c => c.id !== cardId);
      } else {
          newCollabCards = newCollabCards.filter(c => c.id !== cardId);
      }

      onUpdateTaskSchedules({ 
          ...taskSchedules, 
          [date]: { ...schedule, masterAssignments: newAssignments, collabCards: newCollabCards } 
      });
  };

  const getCardColor = (type: CardType) => {
    switch(type) {
        case 'material': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'outsourcing': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'subcontractor': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'production': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getCardIcon = (type: CardType) => {
      switch(type) {
          case 'material': return <BoxIcon className="w-3 h-3" />;
          case 'outsourcing': return <BriefcaseIcon className="w-3 h-3" />;
          case 'subcontractor': return <UsersIcon className="w-3 h-3" />;
          case 'production': return <PenToolIcon className="w-3 h-3" />;
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><LayoutGridIcon className="w-6 h-6" /></div>
            <div>
                <h1 className="text-xl font-black text-slate-800">任務規劃</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Task Planning & Calendar</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
            >
                <PlusIcon className="w-4 h-4" /> 導入案件卡片
            </button>
        </div>
      </div>

      {/* Vertical Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-white relative">
        <table className="w-full border-collapse min-w-[1000px] table-fixed">
            <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="bg-slate-50 border-b border-slate-200 h-14">
                    <th className="w-28 p-2 border-r border-slate-200 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest sticky left-0 z-30">
                        日期 (Date)
                    </th>
                    {masterColumns.map((colId, index) => {
                        const isCollapsed = collapsedColumns.has(colId);
                        return (
                            <th key={colId} className={`p-2 border-r border-slate-200 bg-white transition-all duration-300 ${isCollapsed ? 'w-10 min-w-[40px]' : 'min-w-[200px]'}`}>
                                {isCollapsed ? (
                                    <div className="flex flex-col items-center gap-2 h-full">
                                        <button onClick={() => toggleColumnCollapse(colId)} className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-slate-100 rounded">
                                            <ChevronRightIcon className="w-4 h-4" />
                                        </button>
                                        <div className="py-2" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '2px' }}>
                                            <span className="text-xs font-black text-slate-700 whitespace-nowrap">
                                                {selectedMasters[colId] ? (selectedMasters[colId].length > 3 ? selectedMasters[colId].substring(0,3)+'..' : selectedMasters[colId]) : '未選'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleColumnCollapse(colId)} className="text-slate-300 hover:text-indigo-600 p-1 hover:bg-slate-50 rounded flex-shrink-0" title="收起欄位">
                                            <ChevronRightIcon className="w-4 h-4 rotate-180" />
                                        </button>
                                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 flex-shrink-0"><UserIcon className="w-4 h-4" /></div>
                                        <select 
                                            value={selectedMasters[colId] || ''}
                                            onChange={(e) => handleMasterSelect(colId, e.target.value)}
                                            className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer border-b border-transparent focus:border-indigo-500 truncate"
                                        >
                                            <option value="">選擇師傅...</option>
                                            {employees.filter(e => e.category === '現場' || e.category === '做件').map(e => (
                                                <option key={e.id} value={e.nickname || e.name}>{e.nickname || e.name}</option>
                                            ))}
                                        </select>
                                        {masterColumns.length > 1 && (
                                            <button onClick={() => handleRemoveMasterColumn(colId)} className="text-slate-300 hover:text-red-500 p-1 flex-shrink-0">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </th>
                        );
                    })}
                    <th className="w-10 p-0 border-r border-slate-200 bg-slate-50 text-center align-middle">
                        <button onClick={handleAddMasterColumn} className="w-full h-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="新增師傅欄位">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </th>
                    <th className="p-2 bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest min-w-[200px]">
                        協同作業 (Collaboration)
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {displayDates.map(dateStr => {
                    const schedule = getScheduleForDate(dateStr);
                    const dateObj = new Date(dateStr);
                    const dayNum = dateObj.getDate();
                    const dayIdx = dateObj.getDay(); // 0 = Sunday
                    // Adjust day index for array lookup: 0(Sun)->6, 1(Mon)->0...
                    const adjustedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
                    const weekDayName = WEEKDAYS[adjustedIdx];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const isSunday = dayIdx === 0;

                    return (
                        <tr key={dateStr} className={`hover:bg-slate-50/30 ${isSunday ? 'bg-red-50/10' : ''}`}>
                            {/* Date Column */}
                            <td className={`p-3 border-r border-slate-200 sticky left-0 z-10 text-center align-top ${isToday ? 'bg-indigo-50' : 'bg-white'}`}>
                                <div className={`text-lg font-black ${isToday ? 'text-indigo-600' : (isSunday ? 'text-red-500' : 'text-slate-700')}`}>
                                    {dayNum}
                                </div>
                                <div className={`text-[10px] font-bold uppercase ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>
                                    {dateObj.getMonth() + 1}月 / {weekDayName}
                                </div>
                                {isToday && <span className="inline-block mt-1 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">TODAY</span>}
                            </td>

                            {/* Master Columns */}
                            {masterColumns.map(colId => {
                                const masterName = selectedMasters[colId];
                                const cards = masterName ? (schedule.masterAssignments?.[masterName] || []) : [];
                                const isCollapsed = collapsedColumns.has(colId);
                                
                                return (
                                    <td 
                                        key={colId} 
                                        className={`border-r border-slate-200 align-top transition-all duration-300 ${!masterName ? 'bg-slate-50/50' : 'bg-white'} ${isCollapsed ? 'p-0 w-10 min-w-[40px]' : 'p-2 min-w-[200px]'}`}
                                        onDragOver={(e) => !isCollapsed && e.preventDefault()}
                                        onDrop={(e) => !isCollapsed && handleDrop(e, dateStr, 'master', masterName)}
                                    >
                                        {isCollapsed ? (
                                            <div className="h-full w-full flex flex-col items-center pt-4 gap-2 bg-slate-50/30">
                                                {cards.length > 0 && (
                                                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm" title={`${cards.length} 張卡片`}>
                                                        {cards.length}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            !masterName ? (
                                                <div className="h-20 flex items-center justify-center text-slate-300 text-xs font-bold italic pointer-events-none">
                                                    請先選取師傅
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1.5 min-h-[80px]">
                                                    {cards.map(card => (
                                                        <div 
                                                            key={card.id}
                                                            draggable
                                                            onDragStart={() => setDraggedCard({ card, source: 'calendar', originalDate: dateStr, originalZone: 'master', originalMaster: masterName })}
                                                            className={`p-2 rounded-lg border shadow-sm cursor-move text-xs flex flex-col gap-0.5 relative group ${getCardColor(card.type)}`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-1 font-black opacity-70 uppercase text-[9px]">
                                                                    {getCardIcon(card.type)} {card.type === 'material' ? '工' : card.type === 'outsourcing' ? '外' : card.type === 'subcontractor' ? '協' : '廠'}
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleRemoveCard(dateStr, card.id, 'master', masterName)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/50 rounded"
                                                                >
                                                                    <XIcon className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            {card.projectName && <div className="text-[9px] text-indigo-600 font-black truncate">{card.projectName}</div>}
                                                            <div className="font-bold leading-tight line-clamp-2">{card.name}</div>
                                                            <div className="text-[9px] opacity-80">{card.spec || card.vendor || '-'}</div>
                                                            <div className="text-[9px] font-mono opacity-90 mt-0.5">Qty: {card.quantity}{card.unit}</div>
                                                            {card.materialDetails && card.materialDetails.length > 0 && (
                                                                <div className="mt-1 pt-1 border-t border-black/5 space-y-0.5">
                                                                    {card.materialDetails.map(d => (
                                                                        <div key={d.id} className="flex justify-between text-[8px] leading-tight opacity-70">
                                                                            <span className="truncate pr-1">{d.name}</span>
                                                                            <span className="font-mono whitespace-nowrap flex-shrink-0">{d.quantity}{d.unit}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {cards.length === 0 && (
                                                        <div className="h-full flex items-center justify-center opacity-10 text-[10px] font-bold pointer-events-none p-4">
                                                            拖曳卡片
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </td>
                                );
                            })}
                            
                            {/* Empty spacer column for add button alignment */}
                            <td className="border-r border-slate-200 bg-slate-50/20"></td>

                            {/* Collaboration Column */}
                            <td 
                                className="p-2 align-top bg-white"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, dateStr, 'collab')}
                            >
                                <div className="flex flex-col gap-1.5 min-h-[80px]">
                                    {schedule.collabCards.map(card => (
                                        <div 
                                            key={card.id}
                                            draggable
                                            onDragStart={() => setDraggedCard({ card, source: 'calendar', originalDate: dateStr, originalZone: 'collab' })}
                                            className={`p-2 rounded-lg border shadow-sm cursor-move text-xs flex flex-col gap-0.5 relative group ${getCardColor(card.type)}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-1 font-black opacity-70 uppercase text-[9px]">
                                                    {getCardIcon(card.type)} {card.type === 'material' ? '工' : card.type === 'outsourcing' ? '外' : card.type === 'subcontractor' ? '協' : '廠'}
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveCard(dateStr, card.id, 'collab')}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/50 rounded"
                                                >
                                                    <XIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                            {card.projectName && <div className="text-[9px] text-indigo-600 font-black truncate">{card.projectName}</div>}
                                            <div className="font-bold leading-tight line-clamp-2">{card.name}</div>
                                            <div className="text-[9px] opacity-80">{card.spec || card.vendor || '-'}</div>
                                            <div className="text-[9px] font-mono opacity-90 mt-0.5">Qty: {card.quantity}{card.unit}</div>
                                            {card.materialDetails && card.materialDetails.length > 0 && (
                                                <div className="mt-1 pt-1 border-t border-black/5 space-y-0.5">
                                                    {card.materialDetails.map(d => (
                                                        <div key={d.id} className="flex justify-between text-[8px] leading-tight opacity-70">
                                                            <span className="truncate pr-1">{d.name}</span>
                                                            <span className="font-mono whitespace-nowrap flex-shrink-0">{d.quantity}{d.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {schedule.collabCards.length === 0 && (
                                        <div className="h-full flex items-center justify-center opacity-10 text-[10px] font-bold pointer-events-none p-4">
                                            拖曳卡片
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>

      {/* Import Modal (Floating Window) */}
      {isImportModalOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col animate-slide-in-right">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <BriefcaseIcon className="w-4 h-4 text-indigo-600" /> 卡片來源
                  </h3>
                  <button onClick={() => setIsImportModalOpen(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors">
                      <XIcon className="w-5 h-5" />
                  </button>
              </div>
              
              <div className="p-4 border-b border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">選擇來源案件</label>
                  <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                      >
                          <option value="">請選擇案件...</option>
                          {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                      </select>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 space-y-6">
                  {!selectedProjectId && (
                      <div className="text-center py-10 text-slate-400">
                          <LayoutGridIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-bold">請先選擇案件以載入卡片</p>
                      </div>
                  )}
                  
                  {Object.entries(groupedImportCards).map(([itemName, cards]) => (
                      <div key={itemName} className="space-y-2">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">{itemName}</div>
                          {(cards as PlanningCard[]).map(card => (
                              <div 
                                  key={card.id}
                                  draggable
                                  onDragStart={() => setDraggedCard({ card, source: 'import' })}
                                  className={`p-3 rounded-xl border cursor-move transition-all active:scale-95 hover:shadow-md ${getCardColor(card.type)} bg-white`}
                              >
                                  <div className="flex items-center gap-1.5 font-black uppercase text-[9px] mb-1 opacity-70">
                                      {getCardIcon(card.type)} {card.type === 'material' ? '工項卡' : card.type === 'outsourcing' ? '外包卡' : card.type === 'subcontractor' ? '協力卡' : '廠內準備卡'}
                                  </div>
                                  {card.projectName && <div className="text-[9px] text-indigo-600 font-black truncate mb-0.5">{card.projectName}</div>}
                                  <div className="font-bold text-sm mb-1">{card.name}</div>
                                  {(card.spec || card.vendor) && <div className="text-[10px] opacity-80 bg-white/50 px-1.5 py-0.5 rounded w-fit">{card.spec || card.vendor}</div>}
                                  <div className="mt-2 flex justify-between items-center text-[10px] opacity-60 font-mono">
                                      <span>Qty: {card.quantity || '-'} {card.unit}</span>
                                  </div>
                                  {card.materialDetails && card.materialDetails.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                          {card.materialDetails.map(d => (
                                              <div key={d.id} className="flex justify-between text-[10px] text-slate-500">
                                                  <span className="truncate pr-2">{d.name}</span>
                                                  <span className="font-mono whitespace-nowrap flex-shrink-0 bg-slate-50 px-1 rounded">{d.quantity}{d.unit}</span>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  ))}
                  
                  {selectedProjectId && importableCards.length === 0 && (
                      <div className="text-center py-10 text-slate-400">
                          <p className="text-xs font-bold">此案件尚無規劃卡片</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default TaskPlanning;
