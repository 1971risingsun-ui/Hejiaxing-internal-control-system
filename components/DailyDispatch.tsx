
import React, { useState, useMemo } from 'react';
import { Project, WeeklySchedule, DailyDispatch as DailyDispatchType, GlobalTeamConfigs } from '../types';
import { CalendarIcon, UserIcon, PlusIcon, XIcon, BriefcaseIcon, FileTextIcon, HomeIcon, LayoutGridIcon, TruckIcon, HistoryIcon, CheckCircleIcon, TrashIcon, NavigationIcon, ClipboardListIcon, SparklesIcon, LoaderIcon, XCircleIcon } from './Icons';
import { GoogleGenAI } from "@google/genai";

interface DailyDispatchProps {
  projects: Project[];
  weeklySchedules: WeeklySchedule[];
  dailyDispatches: DailyDispatchType[];
  globalTeamConfigs: GlobalTeamConfigs;
  onUpdateDailyDispatches: (dispatches: DailyDispatchType[]) => void;
  onOpenDrivingTime: () => void;
}

const DailyDispatch: React.FC<DailyDispatchProps> = ({ projects, weeklySchedules, dailyDispatches, globalTeamConfigs, onUpdateDailyDispatches, onOpenDrivingTime }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [filterTeam, setFilterTeam] = useState<number | null>(null);
  const [newAssistantNames, setNewAssistantNames] = useState<Record<number, string>>({});
  const [newTaskNames, setNewTaskNames] = useState<Record<number, string>>({});
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // AI 相關狀態
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResultModalOpen, setAiResultModalOpen] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');

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

  const generatedText = useMemo(() => {
    let text = `📅 ${selectedDate} 工作排程彙整\n`;
    text += `========================\n\n`;
    
    let hasContent = false;
    teams.forEach(t => {
      const team = dispatchRecord.teams[t];
      if (team && (team.master || team.tasks.length > 0 || team.assistants.length > 0)) {
        hasContent = true;
        text += `【第 ${t} 組】\n`;
        text += `👤 師傅：${team.master || '未指定'}\n`;
        if (team.assistants.length > 0) {
            text += `👥 助手：${team.assistants.join(', ')}\n`;
        }
        
        if (team.tasks.length > 0) {
            text += `📝 排程：\n`;
            team.tasks.forEach((task, idx) => {
                text += `   ${idx + 1}. ${task.name}\n`;
                if (task.description) {
                    const indentedDesc = task.description
                        .split('\n')
                        .map(line => `      ${line}`)
                        .join('\n');
                    text += `${indentedDesc}\n`;
                }
                if (idx < team.tasks.length - 1) {
                    text += `\n`;
                }
            });
        }
        text += `\n`;
      }
    });

    if (!hasContent) return `${selectedDate} 尚未安排任何派工項目。`;
    return text.trim();
  }, [dispatchRecord, selectedDate, teams]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedText).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const handleAskAI = async () => {
    if (projects.length === 0) return alert('目前沒有案件資料供 AI 分析');
    
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // 自動匯出有名稱且有地址的案件
      const projectData = projects
        .filter(p => p.name && p.address)
        .map(p => ({ 名稱: p.name, 地址: p.address }));
      
      if (projectData.length === 0) return alert('目前案件資料皆缺少地址資訊，無法進行分析');

      const prompt = `你是一位專業的工務調度專家。
我將提供一份建築案件清單（含名稱與地址）。
請根據地理位置進行分類，將「距離估計在大約 5 公里內」的客戶歸類在同一個群組中。

案件清單（JSON格式）：
${JSON.stringify(projectData, null, 2)}

請遵守以下規則：
1. 以清晰的繁體中文條列式回報結果。
2. 每個群組請給予一個概括的地區名稱作為標題（例如：【板橋/土城區】）。
3. 每個項目格式為：- [案件名稱] (完整地址)。
4. 若案件較分散，請盡量找出鄰近的組合。
5. 回覆請簡潔有力，不需要額外的開場白或結語。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      // Guideline: Access the .text property directly (do not call as a function).
      setAiResponseText(response.text || 'AI 無法產生分類結果。');
      setAiResultModalOpen(true);
    } catch (error) {
      console.error('AI 分類失敗', error);
      alert('AI 分析發生錯誤，請檢查網路連線或 API 金鑰配置。');
    } finally {
      setIsAiLoading(false);
    }
  };

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

  // Fix: Added missing UI rendering return logic
  return (
    <div className="p-4 md:p-6 max-w-full overflow-hidden animate-fade-in flex flex-col h-full bg-slate-50">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><ClipboardListIcon className="w-5 h-5" /></div>
          <div>
            <h2 className="text-lg font-black text-slate-800">明日工作排程</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Daily Dispatch Planning</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-700 outline-none" />
          </div>
          <button onClick={handleSyncFromWeek} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors">
            <HistoryIcon className="w-4 h-4" /> 同步週排程
          </button>
          <button onClick={handleAskAI} disabled={isAiLoading} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50">
            {isAiLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
            AI 地理分類
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {teams.map(t => {
            const team = dispatchRecord.teams[t] || { master: '', assistants: [], carNumber: '', tasks: [] };
            return (
              <div key={t} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-400 transition-all group">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center group-hover:bg-blue-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">第 {t} 組</span>
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                      <TruckIcon className="w-3 h-3 text-slate-400" />
                      <input 
                        type="text" 
                        value={team.carNumber || ''} 
                        onChange={e => updateTeamField(t, 'carNumber', e.target.value)} 
                        placeholder="車號" 
                        className="bg-transparent outline-none text-[10px] font-bold text-slate-600 w-12" 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5 flex-1">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">師傅 (Thợ chính)</label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <UserIcon className="w-4 h-4 text-blue-500" />
                        <input 
                          type="text" 
                          list="employee-nicknames-list"
                          value={team.master} 
                          onChange={e => updateTeamField(t, 'master', e.target.value)} 
                          placeholder="輸入姓名" 
                          className="w-full bg-transparent outline-none text-sm font-bold text-slate-700" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">助手清單 (Phụ việc)</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {team.assistants.map((a, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-blue-100">
                            {a}
                            <button onClick={() => removeAssistant(t, idx)} className="text-blue-300 hover:text-red-500"><XCircleIcon className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          list="employee-nicknames-list"
                          value={newAssistantNames[t] || ''} 
                          onChange={e => setNewAssistantNames({...newAssistantNames, [t]: e.target.value})} 
                          onKeyDown={e => e.key === 'Enter' && addAssistant(t)}
                          placeholder="新增助手..." 
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                        />
                        <button onClick={() => addAssistant(t)} className="w-9 h-9 bg-slate-800 text-white rounded-xl flex items-center justify-center"><PlusIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">派工項目 (Công việc)</label>
                    <div className="space-y-2 mb-3">
                      {team.tasks.map((task, idx) => (
                        <div key={idx} className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 relative group/task">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-indigo-900 text-xs truncate max-w-[150px]">{task.name}</span>
                            <button onClick={() => removeTask(t, idx)} className="text-indigo-300 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity"><TrashIcon className="w-3.5 h-3.5" /></button>
                          </div>
                          <textarea 
                            value={task.description} 
                            onChange={e => updateTaskDescription(t, idx, e.target.value)}
                            className="w-full bg-transparent text-[10px] text-slate-500 leading-relaxed outline-none resize-none h-12"
                            placeholder="輸入工作細節描述..."
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        list="projects-datalist"
                        value={newTaskNames[t] || ''} 
                        onChange={e => setNewTaskNames({...newTaskNames, [t]: e.target.value})} 
                        onKeyDown={e => e.key === 'Enter' && handleAddTask(t)}
                        placeholder="選取案件加入..." 
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500" 
                      />
                      <button onClick={() => handleAddTask(t)} className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100"><PlusIcon className="w-4 h-4" /></button>
                      <datalist id="projects-datalist">{projects.map(p => <option key={p.id} value={p.name} />)}</datalist>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
         <button 
           onClick={() => setIsTextModalOpen(true)}
           className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-sm shadow-2xl flex items-center gap-3 active:scale-95 transition-all hover:bg-black"
         >
           <FileTextIcon className="w-5 h-5 text-yellow-500" /> 產生排程文字
         </button>
      </div>

      {isTextModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
              <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-black text-slate-800">排程文字彙整</h3>
                 <button onClick={() => setIsTextModalOpen(false)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
              </header>
              <div className="p-8">
                 <textarea 
                   readOnly 
                   className="w-full h-80 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs font-mono leading-relaxed outline-none focus:bg-white transition-all shadow-inner"
                   value={generatedText}
                 />
                 <button 
                   onClick={handleCopyText}
                   className={`w-full mt-6 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${copyFeedback ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                 >
                   {copyFeedback ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardListIcon className="w-5 h-5" />}
                   {copyFeedback ? '已複製到剪貼簿' : '複製排程文字 (Line 用)'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {aiResultModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
              <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                 <div className="flex items-center gap-3">
                    <SparklesIcon className="w-5 h-5" />
                    <h3 className="font-black">AI 地理鄰近度分析</h3>
                 </div>
                 <button onClick={() => setAiResultModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon className="w-5 h-5" /></button>
              </header>
              <div className="p-8 bg-white flex-1 overflow-y-auto">
                 <div className="prose prose-slate max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-blue-50/50 p-6 rounded-2xl border border-blue-100 leading-relaxed shadow-inner">
                      {aiResponseText}
                    </pre>
                 </div>
                 <div className="mt-6 flex gap-3">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aiResponseText);
                        alert('已複製分析結果');
                      }}
                      className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <ClipboardListIcon className="w-4 h-4" /> 複製分析結果
                    </button>
                    <button 
                      onClick={() => setAiResultModalOpen(false)}
                      className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      關閉分析
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Fix: Added missing default export
export default DailyDispatch;
