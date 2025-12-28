
import React, { useState, useMemo } from 'react';
import { Project, WeeklySchedule, DailyDispatch as DailyDispatchType, GlobalTeamConfigs } from '../types';
import { CalendarIcon, UserIcon, PlusIcon, XIcon, BriefcaseIcon, FileTextIcon, HomeIcon, LayoutGridIcon, TruckIcon, HistoryIcon, CheckCircleIcon, TrashIcon } from './Icons';

interface DailyDispatchProps {
  projects: Project[];
  weeklySchedules: WeeklySchedule[];
  dailyDispatches: DailyDispatchType[];
  globalTeamConfigs: GlobalTeamConfigs;
  onUpdateDailyDispatches: (dispatches: DailyDispatchType[]) => void;
}

const DailyDispatch: React.FC<DailyDispatchProps> = ({ projects, weeklySchedules, dailyDispatches, globalTeamConfigs, onUpdateDailyDispatches }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [filterTeam, setFilterTeam] = useState<number | null>(null);
  const [newAssistantNames, setNewAssistantNames] = useState<Record<number, string>>({});
  const [newTaskNames, setNewTaskNames] = useState<Record<number, string>>({});
  const teams = [1, 2, 3, 4, 5, 6, 7, 8];

  const weekSchedule = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff)).toISOString().split('T')[0];
    return weeklySchedules.find(s => s.weekStartDate === weekStart);
  }, [selectedDate, weeklySchedules]);

  const dispatchRecord = useMemo(() => {
    return dailyDispatches.find(d => d.date === selectedDate) || { date: selectedDate, teams: {} };
  }, [dailyDispatches, selectedDate]);

  const handleUpdateDispatch = (newDispatch: DailyDispatchType) => {
    onUpdateDailyDispatches([...dailyDispatches.filter(d => d.date !== selectedDate), newDispatch]);
  };

  const updateTeamField = (teamId: number, field: string, value: any) => {
    const newDispatch = JSON.parse(JSON.stringify(dispatchRecord));
    if (!newDispatch.teams[teamId]) {
      newDispatch.teams[teamId] = { master: '', assistants: [], carNumber: '', tasks: [] };
    }
    
    if (field === 'tasks') {
        newDispatch.teams[teamId].tasks = value;
    } else if (field === 'assistants') {
        newDispatch.teams[teamId].assistants = value;
    } else {
        newDispatch.teams[teamId][field] = value;
    }
    
    handleUpdateDispatch(newDispatch);
  };

  const addAssistant = (teamId: number) => {
    const name = newAssistantNames[teamId]?.trim();
    if (!name) return;

    const teamData = dispatchRecord.teams[teamId];
    const currentAssistants = [...(teamData?.assistants || [])];
    
    if (!currentAssistants.includes(name)) {
        updateTeamField(teamId, 'assistants', [...currentAssistants, name]);
    }
    
    setNewAssistantNames(prev => ({ ...prev, [teamId]: '' }));
  };

  const removeAssistant = (teamId: number, index: number) => {
    const teamData = dispatchRecord.teams[teamId];
    const currentAssistants = [...(teamData?.assistants || [])];
    currentAssistants.splice(index, 1);
    updateTeamField(teamId, 'assistants', currentAssistants);
  };

  const handleAddTask = (teamId: number) => {
    const taskName = newTaskNames[teamId]?.trim();
    if (!taskName) return;

    const teamData = dispatchRecord.teams[teamId];
    const currentTasks = [...(teamData?.tasks || [])];
    
    const project = projects.find(p => p.name === taskName);
    const description = project?.description || '';

    updateTeamField(teamId, 'tasks', [...currentTasks, { name: taskName, description }]);
    setNewTaskNames(prev => ({ ...prev, [teamId]: '' }));
  };

  const removeTask = (teamId: number, index: number) => {
    const teamData = dispatchRecord.teams[teamId];
    const currentTasks = [...(teamData?.tasks || [])];
    currentTasks.splice(index, 1);
    updateTeamField(teamId, 'tasks', currentTasks);
  };

  const updateTaskDescription = (teamId: number, taskIndex: number, newDesc: string) => {
    const teamData = dispatchRecord.teams[teamId];
    const tasks = teamData?.tasks || [];
    if (tasks.length === 0) return;
    
    const newTasks = [...tasks];
    newTasks[taskIndex].description = newDesc;
    updateTeamField(teamId, 'tasks', newTasks);
  };

  const handleSyncFromWeek = () => {
    if (confirm('確定要從週排程同步資料嗎？這將會覆蓋掉您目前對此日期的手動修改。')) {
        const newDispatch: DailyDispatchType = { date: selectedDate, teams: {} };
        teams.forEach(t => {
            const weekCfg = weekSchedule?.teamConfigs?.[t] || globalTeamConfigs[t] || { master: '', assistant: '', carNumber: '' };
            const weekTasks = weekSchedule?.days[selectedDate]?.teams[t]?.tasks || [];
            newDispatch.teams[t] = {
                master: weekCfg.master,
                assistants: weekCfg.assistant ? [weekCfg.assistant] : [],
                carNumber: weekCfg.carNumber,
                tasks: weekTasks.map(name => ({ name, description: projects.find(p => p.name === name)?.description || '' }))
            };
        });
        handleUpdateDispatch(newDispatch);
    }
  };

  const visibleTeams = filterTeam === null ? teams : [filterTeam];

  return (
    <div className="p-4 md:p-6 flex flex-col h-full bg-slate-50 min-h-0 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white"><BriefcaseIcon className="w-5 h-5" /></div>
          <div><h1 className="text-lg font-bold text-slate-800">明日工作排程</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Daily Dispatch</p></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSyncFromWeek} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm"><HistoryIcon className="w-4 h-4" /> 同步週排程</button>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-700 outline-none" />
          </div>
          <button onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setSelectedDate(tomorrow.toISOString().split('T')[0]);
            }} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">明天</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1 flex-shrink-0">
        <button onClick={() => setFilterTeam(null)} className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 whitespace-nowrap ${filterTeam === null ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}><LayoutGridIcon className="w-3.5 h-3.5" />全部顯示</button>
        <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />
        {teams.map(t => <button key={t} onClick={() => setFilterTeam(t)} className={`w-10 h-10 rounded-xl text-xs font-bold border transition-all flex-shrink-0 ${filterTeam === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-110' : 'bg-white border-slate-200 text-slate-500'}`}>{t}</button>)}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 min-h-0 h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {visibleTeams.map(t => {
            const teamRecord = dispatchRecord.teams[t];
            const weekCfg = weekSchedule?.teamConfigs?.[t] || globalTeamConfigs[t] || { master: '', assistant: '', carNumber: '' };
            
            const displayMaster = teamRecord?.master || '';
            const displayCar = teamRecord?.carNumber || '';
            const displayAssistants = teamRecord?.assistants || [];
            const displayTasks = teamRecord?.tasks || [];

            return (
              <div key={t} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-indigo-300 transition-all min-h-[300px]">
                <div className={`px-4 py-3 border-b flex justify-between items-center transition-colors ${teamRecord ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${teamRecord ? 'text-amber-600' : 'text-slate-400'}`}>第 {t} 組</span>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 bg-white border rounded-lg shadow-sm transition-all ${displayCar ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
                     <TruckIcon className={`w-3.5 h-3.5 ${displayCar ? 'text-amber-500' : 'text-indigo-400'}`} />
                     <input 
                        type="text" 
                        placeholder={weekCfg.carNumber || "車號"} 
                        value={displayCar} 
                        onChange={(e) => updateTeamField(t, 'carNumber', e.target.value)} 
                        className={`bg-transparent outline-none text-[10px] font-bold w-12 ${displayCar ? 'text-amber-700' : 'text-slate-400 font-medium'}`} 
                     />
                  </div>
                </div>
                <div className="p-4 space-y-4 flex-1 overflow-auto">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">師傅</label>
                      <div className={`flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border transition-all ${displayMaster ? 'border-amber-400 bg-white ring-2 ring-amber-50' : 'border-slate-100'}`}>
                        <UserIcon className={`w-4 h-4 ${displayMaster ? 'text-amber-500' : 'text-indigo-400'}`} />
                        <input 
                            type="text" 
                            list="employee-nicknames-list"
                            placeholder={weekCfg.master || "未指定"} 
                            value={displayMaster} 
                            onChange={(e) => updateTeamField(t, 'master', e.target.value)} 
                            className={`bg-transparent outline-none text-sm font-bold w-full ${displayMaster ? 'text-slate-800' : 'text-slate-400 font-medium'}`} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">助手人員</label>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                        {displayAssistants.map((name, idx) => (
                            <span key={`${name}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium transition-all shadow-sm">
                                {name}
                                <button onClick={() => removeAssistant(t, idx)} className="text-slate-300 hover:text-red-500 transition-colors"><XIcon className="w-3 h-3" /></button>
                            </span>
                        ))}
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          list="employee-nicknames-list"
                          placeholder="追加助手..." 
                          value={newAssistantNames[t] || ''}
                          onChange={(e) => setNewAssistantNames(prev => ({ ...prev, [t]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAssistant(t); } }}
                          className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:bg-white focus:border-indigo-300 transition-all" 
                        />
                        <button 
                          type="button"
                          onClick={() => addAssistant(t)} 
                          className="absolute right-2 top-1.5 text-slate-300 hover:text-indigo-500 transition-colors cursor-pointer"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">派工項目</label>
                    <div className="space-y-3">
                      {displayTasks.map((task, idx) => (
                        <div key={idx} className="bg-indigo-50/30 rounded-xl p-3 border border-indigo-100/50 hover:border-indigo-200 transition-all group/task">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <HomeIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                <span className="text-xs font-black text-indigo-800 truncate">{task.name}</span>
                            </div>
                            <button onClick={() => removeTask(t, idx)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="relative">
                            <FileTextIcon className="absolute left-2 top-2 w-3 h-3 text-slate-300" />
                            <textarea 
                                value={task.description} 
                                onChange={(e) => updateTaskDescription(t, idx, e.target.value)} 
                                className="w-full text-[11px] bg-white/60 border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 min-h-[60px] outline-none focus:bg-white resize-none text-slate-600 leading-relaxed shadow-sm transition-all" 
                                placeholder="施工說明..." 
                            />
                          </div>
                        </div>
                      ))}
                      
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 mt-4">
                        <div className="flex items-center gap-2">
                           <div className="relative flex-1">
                               <input 
                                 type="text" 
                                 list="projects-datalist"
                                 placeholder="選取或輸入案件..."
                                 value={newTaskNames[t] || ''}
                                 onChange={(e) => {
                                     const val = e.target.value;
                                     setNewTaskNames(prev => ({ ...prev, [t]: val }));
                                     if (projects.some(p => p.name === val)) {
                                         setTimeout(() => handleAddTask(t), 0);
                                     }
                                 }}
                                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(t); } }}
                                 className="w-full pl-3 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400 transition-all font-bold"
                               />
                               <datalist id="projects-datalist">
                                 {projects.map(p => <option key={p.id} value={p.name} />)}
                               </datalist>
                           </div>
                           <button 
                             onClick={() => handleAddTask(t)}
                             className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm"
                           >
                             <PlusIcon className="w-4 h-4" />
                           </button>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">+ 派工項目 (選取後代入工程概要)</p>
                      </div>

                      {displayTasks.length === 0 && (
                        <div className="text-center py-4 text-slate-300 italic text-[10px]">尚未安排派工項目</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyDispatch;
