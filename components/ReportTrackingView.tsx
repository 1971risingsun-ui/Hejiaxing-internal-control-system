import React, { useMemo, useState } from 'react';
import { Project, ProjectStatus, ProjectType, DailyDispatch } from '../types';
import { FileTextIcon, SearchIcon, ArrowLeftIcon, CheckCircleIcon, XCircleIcon, UserIcon, CalendarIcon, ChevronRightIcon, BoxIcon } from './Icons';

interface ReportTrackingViewProps {
  projects: Project[];
  dailyDispatches: DailyDispatch[];
  onBack: () => void;
  onSelectProject: (project: Project) => void;
}

const ReportTrackingView: React.FC<ReportTrackingViewProps> = ({ projects, dailyDispatches, onBack, onSelectProject }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. 篩選狀態為「進行中」和「已完工」案件
  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      (p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.COMPLETED) &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
        // 先按狀態排序（進行中在前），再按最新修改時間
        if (a.status !== b.status) return a.status === ProjectStatus.IN_PROGRESS ? -1 : 1;
        return (b.lastModifiedAt || 0) - (a.lastModifiedAt || 0);
    });
  }, [projects, searchTerm]);

  // 2. 預處理派工紀錄，以便快速查詢最新日期與師傅
  const dispatchLookup = useMemo(() => {
    const map: Record<string, { date: string; masters: string[] }> = {};
    
    // 遍歷所有派工單
    dailyDispatches.forEach(disp => {
        const date = disp.date;
        Object.values(disp.teams).forEach(team => {
            team.tasks.forEach(task => {
                const projectName = task.name;
                const master = team.master;
                
                if (!map[projectName] || date > map[projectName].date) {
                    // 如果這筆日期比較新，直接替換
                    map[projectName] = { date, masters: [master] };
                } else if (date === map[projectName].date) {
                    // 如果日期相同，且師傅還沒被加入，則追加
                    if (master && !map[projectName].masters.includes(master)) {
                        map[projectName].masters.push(master);
                    }
                }
            });
        });
    });
    return map;
  }, [dailyDispatches]);

  const getTypeText = (type: ProjectType) => {
    switch (type) {
      case ProjectType.MAINTENANCE: return '維修';
      case ProjectType.MODULAR_HOUSE: return '組合屋';
      default: return '圍籬';
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    return status === ProjectStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="bg-rose-100 p-2 rounded-xl">
            <FileTextIcon className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">回報追蹤表</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Report Tracking & Dispatch Analysis</p>
          </div>
        </div>
        <div className="relative w-full md:w-64">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜尋案件名稱..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">案件資訊 (狀態/類型)</th>
                <th className="px-6 py-4 text-center">施工報告</th>
                <th className="px-6 py-4 text-center">完工報告</th>
                <th className="px-6 py-4 bg-rose-50/30">最新派工日期</th>
                <th className="px-6 py-4 bg-rose-50/30">負責師傅</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map(p => {
                const hasConstruction = (p.reports?.length > 0) || (p.constructionItems?.length > 0);
                const hasCompletion = (p.completionReports?.length > 0);
                const dispatchInfo = dispatchLookup[p.name];

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="font-black text-slate-800 text-sm">{p.name}</div>
                        <div className="flex gap-2">
                           <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(p.status)}`}>
                             {p.status}
                           </span>
                           <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black border border-slate-200 uppercase">
                             {getTypeText(p.type)}
                           </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {hasConstruction ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-slate-200 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {hasCompletion ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-slate-200 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 bg-rose-50/10">
                      {dispatchInfo ? (
                        <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                          <CalendarIcon className="w-3.5 h-3.5 text-rose-300" />
                          {dispatchInfo.date}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">- 未見排程 -</span>
                      )}
                    </td>
                    <td className="px-6 py-4 bg-rose-50/10">
                      {dispatchInfo ? (
                        <div className="flex flex-wrap gap-1.5">
                          {dispatchInfo.masters.filter(Boolean).map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-white border border-rose-200 text-rose-600 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm">
                              <UserIcon className="w-3 h-3 text-rose-300" />
                              {m}
                            </span>
                          ))}
                          {dispatchInfo.masters.length === 0 && <span className="text-slate-400 text-xs">未指定</span>}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onSelectProject(p)}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="開啟案件詳情"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <BoxIcon className="w-16 h-16 mb-4 opacity-10" />
                      <p className="text-base font-bold">目前無符合條件的追蹤項目</p>
                      <p className="text-xs mt-1">案件狀態需為「進行中」或「已完工」</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 shadow-sm">
         <div className="bg-amber-500 text-white p-1 rounded-lg flex-shrink-0 mt-0.5">
            <CheckCircleIcon className="w-3 h-3" />
         </div>
         <div className="text-[10px] text-amber-800 leading-relaxed font-bold">
            <p className="uppercase tracking-widest opacity-60 mb-0.5">Tracking Intelligence</p>
            本表自動同步所有「進行中」與「已完工」案件。最新派工比對是基於「明日工作排程」模組中的歷史與未來紀錄。若報告狀態顯示未勾選，請至案件詳情補齊施工或完工資訊。
         </div>
      </div>
    </div>
  );
};

export default ReportTrackingView;