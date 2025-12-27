
import React, { useState, useMemo } from 'react';
import { Project, WeeklySchedule, DailyDispatch as DailyDispatchType, GlobalTeamConfigs } from '../types';
import { CalendarIcon, UserIcon, PlusIcon, XIcon, BriefcaseIcon, FileTextIcon, HomeIcon, LayoutGridIcon, TruckIcon, HistoryIcon, CheckCircleIcon } from './Icons';

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

  const addAssistant = (teamId: number, name: string) => {
    if (!name.trim()) return;
    const teamData = dispatchRecord.teams[teamId];
    const weekCfg = weekSchedule?.teamConfigs?.[teamId] || globalTeamConfigs[teamId];
    const currentAssistants = teamData?.assistants || (weekCfg?.assistant ? [weekCfg.assistant] : []);
    
    if (!currentAssistants.includes(name)) {
        updateTeamField(teamId, 'assistants', [...currentAssistants, name]);
    }
  };

  const removeAssistant = (teamId: number, index: number) => {
    const teamData = dispatchRecord.teams[teamId];
    const weekCfg = weekSchedule?.teamConfigs?.[teamId] || globalTeamConfigs[teamId];
    const currentAssistants = [...(teamData?.assistants || (weekCfg?.assistant ? [weekCfg.assistant] : []))];
    currentAssistants.splice(index, 1);
    updateTeamField(teamId, 'assistants', currentAssistants);
  };

  const updateTaskDescription = (teamId: number, taskIndex: number, newDesc: string) => {
    const teamData = dispatchRecord.teams[teamId];
    let tasks = teamData?.tasks;
    if (!tasks || tasks.length === 0) {
        const weekTasks = weekSchedule?.days[selectedDate]?.teams[teamId]?.tasks || [];
        tasks = weekTasks.map(t => ({ name: t, description: projects.find(p => p.name === t)?.description || '' }));
    }
    const newTasks = [...tasks];
    newTasks[taskIndex].description = newDesc;
    updateTeamField(teamId, 'tasks', newTasks);
  };

  const handleSyncFromWeek = () => {
    if (confirm('確定要重新從週排程同步資料嗎？這將會覆蓋掉您目前對此日期的手動修改。')) {
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

      {/* 修正：移除 no-scrollbar 類別以恢復卷軸正常顯示，並確保內容區域能夠滾動 */}
      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {visibleTeams.map(t => {
            const teamRecord = dispatchRecord.teams[t];
            const weekCfg = weekSchedule?.teamConfigs?.[t] || globalTeamConfigs[t] || { master: '', assistant: '', carNumber: '' };
            const weekTasks = weekSchedule?.days[selectedDate]?.teams[t]?.tasks || [];

            const displayAssistants = (teamRecord?.assistants && teamRecord.assistants.length > 0) ? teamRecord.assistants : (weekCfg.assistant ? [weekCfg.assistant] : []);
            const displayTasks = (teamRecord?.tasks && teamRecord.tasks.length > 0) 
                ? teamRecord.tasks 
                : weekTasks.map(name => ({ name, description: projects.find(p => p.name === name)?.description || '' }));

            const isMasterOverridden = !!teamRecord?.master;
            const isCarOverridden = !!teamRecord?.carNumber;
            const isAssistantsOverridden = !!teamRecord?.assistants;

            return (
              <div key={t} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-indigo-300 transition-all min-h-[300px]">
                <div className={`px-4 py-3 border-b flex justify-between items-center transition-colors ${isCarOverridden || isMasterOverridden || isAssistantsOverridden ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50 border-slate-100 group-hover:bg-indigo-50'}`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${isCarOverridden || isMasterOverridden || isAssistantsOverridden ? 'text-amber-600' : 'text-slate-400 group-hover:text-indigo-600'}`}>第 {t} 組</span>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 bg-white border rounded-lg shadow-sm transition-all ${isCarOverridden ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
                     <TruckIcon className={`w-3.5 h-3.5 ${isCarOverridden ? 'text-amber-500' : 'text-indigo-400'}`} />
                     <input 
                        type="text" 
                        placeholder={weekCfg.carNumber || "車號"} 
                        value={teamRecord?.carNumber || ''} 
                        onChange={(e) => updateTeamField(t, 'carNumber', e.target.value)} 
                        className={`bg-transparent outline-none text-[10px] font-bold w-12 ${isCarOverridden ? 'text-amber-700' : 'text-slate-400 font-medium'}`} 
                     />
                  </div>
                </div>
                <div className="p-4 space-y-4 flex-1 overflow-auto">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">師傅</label>
                      <div className={`flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border transition-all ${isMasterOverridden ? 'border-amber-400 bg-white ring-2 ring-amber-50' : 'border-slate-100'}`}>
                        <UserIcon className={`w-4 h-4 ${isMasterOverridden ? 'text-amber-500' : 'text-indigo-400'}`} />
                        <input 
                            type="text" 
                            placeholder={weekCfg.master || "未指定"} 
                            value={teamRecord?.master || ''} 
                            onChange={(e) => updateTeamField(t, 'master', e.target.value)} 
                            className={`bg-transparent outline-none text-sm font-bold w-full ${isMasterOverridden ? 'text-slate-800' : 'text-slate-400 font-medium'}`} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">助手人員</label>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                        {displayAssistants.map((name, idx) => (
                            <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-lg text-xs font-medium transition-all ${isAssistantsOverridden ? 'text-amber-700 border-amber-300 shadow-sm' : 'text-slate-500 border-slate-100'}`}>
                                {name}
                                <button onClick={() => removeAssistant(t, idx)} className="text-slate-300 hover:text-red-500 transition-colors"><XIcon className="w-3 h-3" /></button>
                            </span>
                        ))}
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="追加助手..." className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:bg-white focus:border-indigo-300 transition-all" onKeyPress={(e) => { if (e.key === 'Enter') { addAssistant(t, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
                        <button className="absolute right-2 top-1.5 text-slate-300 hover:text-indigo-500 transition-colors"><PlusIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">派工項目</label>
                    <div className="space-y-3">
                      {displayTasks.length > 0 ? displayTasks.map((task, idx) => (
                        <div key={idx} className="bg-indigo-50/30 rounded-xl p-3 border border-indigo-100/50 hover:border-indigo-200 transition-all">
                          <div className="flex items-center gap-2 mb-2"><HomeIcon className="w-3.5 h-3.5 text-indigo-500" /><span className="text-xs font-black text-indigo-800">{task.name}</span></div>
                          <div className="relative"><FileTextIcon className="absolute left-2 top-2 w-3 h-3 text-slate-300" /><textarea value={task.description} onChange={(e) => updateTaskDescription(t, idx, e.target.value)} className="w-full text-[11px] bg-white/60 border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 min-h-[60px] outline-none focus:bg-white resize-none text-slate-600 leading-relaxed shadow-sm transition-all" placeholder="施工說明..." /></div>
                        </div>
                      )) : <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400 italic">本日無派工項目</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-4 px-4 py-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm flex-shrink-0">
         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            💡 系統狀態：<span className="text-slate-500">灰色背景來自全域/週間設定</span> | <span className="text-amber-600">米黃色背景表示已手動覆寫</span>
         </p>
      </div>
    </div>
  );
};

export default DailyDispatch;
