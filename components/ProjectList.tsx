import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectStatus, User, UserRole, ProjectType, GlobalTeamConfigs } from '../types';
import { CalendarIcon, MapPinIcon, SearchIcon, MoreVerticalIcon, EditIcon, CopyIcon, TrashIcon, LayoutGridIcon, ListIcon, PlusIcon, NavigationIcon, PlusIcon as AddIcon, CheckCircleIcon, XIcon, UsersIcon, ClipboardListIcon, PaperclipIcon } from './Icons';

interface ProjectListProps {
  title?: string;
  projects: Project[];
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onAddProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onOpenDrivingTime?: () => void;
  onAddToSchedule?: (date: string, teamId: number, taskName: string) => boolean;
  globalTeamConfigs?: GlobalTeamConfigs;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  title, projects, currentUser, onSelectProject, onAddProject, 
  onDeleteProject, onDuplicateProject, onEditProject, onOpenDrivingTime,
  onAddToSchedule, globalTeamConfigs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); 
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // 排程相關狀態
  const [schedulingProject, setSchedulingProject] = useState<Project | null>(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTeam, setScheduleTeam] = useState(1);
  const [pastedDone, setPastedDone] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED: return 'bg-green-100 text-green-800 border-green-200';
      case ProjectStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-200';
      case ProjectStatus.PLANNING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeInfo = (type: ProjectType) => {
    switch (type) {
      case ProjectType.MAINTENANCE:
        return { label: '維修', color: 'bg-orange-50 text-orange-600 border-orange-100' };
      case ProjectType.MODULAR_HOUSE:
        return { label: '組合屋', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      default:
        return { label: '圍籬', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    }
  };

  const filteredProjects = projects.filter(project => {
    if (!project) return false;
    
    const search = searchTerm.toLowerCase();
    const name = (project.name || '').toLowerCase();
    const client = (project.clientName || '').toLowerCase();
    const addr = (project.address || '').toLowerCase();
    
    const matchesSearch = 
      name.includes(search) || 
      client.includes(search) || 
      addr.includes(search);
    
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || project.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const canAddProject = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
  const canManageProject = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const handleMenuClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === projectId ? null : projectId);
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onEditProject(project);
    setActiveMenuId(null);
  };

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    onDeleteProject(projectId);
    setActiveMenuId(null);
  };

  const handleDuplicate = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onDuplicateProject(project);
    setActiveMenuId(null);
  };

  const handleOpenScheduleDialog = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setSchedulingProject(project);
    setActiveMenuId(null);
    setPastedDone(false);
  };

  const handlePasteToSchedule = () => {
    if (!schedulingProject || !onAddToSchedule) return;
    const success = onAddToSchedule(scheduleDate, scheduleTeam, schedulingProject.name);
    if (success) {
      setPastedDone(true);
      setTimeout(() => {
        setPastedDone(false);
        setSchedulingProject(null);
      }, 1500);
    } else {
      alert('該案件已在排程中');
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto pb-20 md:pb-6" onClick={() => setActiveMenuId(null)}>
      <div className="flex flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title || '案件總覽'}</h1>
        </div>
        <div className="flex gap-2">
          {onOpenDrivingTime && (
            <button
              onClick={onOpenDrivingTime}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
              title="估計行車時間"
            >
              <NavigationIcon className="w-5 h-5" />
            </button>
          )}
          {canAddProject && (
            <button
              onClick={onAddProject}
              className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
              title="新增案件"
            >
              <PlusIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 bg-white rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10 md:static">
        {/* Search and View Mode */}
        <div className="flex gap-2 p-4 pb-0">
            <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="搜尋專案..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 flex-shrink-0">
                <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <ListIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <LayoutGridIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Category Tabs (Added background colors) */}
        <div className="px-4 py-3 border-b border-slate-50">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setTypeFilter('ALL')}
                    className={`px-5 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap shadow-sm ${typeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    全部案件
                </button>
                <button 
                    onClick={() => setTypeFilter(ProjectType.CONSTRUCTION)}
                    className={`px-5 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap shadow-sm ${typeFilter === ProjectType.CONSTRUCTION ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    圍籬
                </button>
                <button 
                    onClick={() => setTypeFilter(ProjectType.MODULAR_HOUSE)}
                    className={`px-5 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap shadow-sm ${typeFilter === ProjectType.MODULAR_HOUSE ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    組合屋
                </button>
                <button 
                    onClick={() => setTypeFilter(ProjectType.MAINTENANCE)}
                    className={`px-5 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap shadow-sm ${typeFilter === ProjectType.MAINTENANCE ? 'bg-orange-600 text-white shadow-orange-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    維修
                </button>
            </div>
        </div>
            
        {/* Status Filter (Sub-navigation) */}
        <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto w-full no-scrollbar pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase py-1.5 flex items-center whitespace-nowrap">狀態篩選：</span>
                {['ALL', ProjectStatus.IN_PROGRESS, ProjectStatus.PLANNING, ProjectStatus.COMPLETED].map((status) => (
                    <button 
                        key={status}
                        onClick={() => setStatusFilter(status as any)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap ${statusFilter === status ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        {status === 'ALL' ? '全部' : status}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
          <div className="w-full py-20 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
             沒有找到符合條件的專案
          </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProjects.map((project) => {
            const typeInfo = getTypeInfo(project.type);
            const hasAttachments = project.attachments && project.attachments.length > 0;

            return (
              <div 
                key={project.id} 
                onClick={() => onSelectProject(project)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer overflow-hidden group relative flex flex-col"
              >
                <div className={`h-1.5 bg-gradient-to-r ${project.type === ProjectType.MAINTENANCE ? 'from-orange-400 to-amber-500' : 'from-blue-500 to-indigo-500'}`} />
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      {hasAttachments && (
                        <div className="flex items-center text-indigo-500" title="包含附件">
                          <PaperclipIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {canManageProject && (
                        <div className="relative">
                          <button 
                            onClick={(e) => handleMenuClick(e, project.id)}
                            className="text-slate-400 hover:text-slate-600 p-2 -mr-2 rounded-full active:bg-slate-100 transition-colors"
                          >
                            <MoreVerticalIcon className="w-5 h-5" />
                          </button>
                          
                          {activeMenuId === project.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in"
                            >
                              <button onClick={(e) => handleOpenScheduleDialog(e, project)} className="w-full text-left px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 font-bold flex items-center gap-2">
                                <PlusIcon className="w-4 h-4" /> 加入排程
                              </button>
                              <button onClick={(e) => handleEditClick(e, project)} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 border-t border-slate-50 flex items-center gap-2">
                                <EditIcon className="w-4 h-4" /> 編輯
                              </button>
                              <button onClick={(e) => handleDuplicate(e, project)} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                <CopyIcon className="w-4 h-4" /> 複製
                              </button>
                              {currentUser.role === UserRole.ADMIN && (
                                <button onClick={(e) => handleDelete(e, project.id)} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50">
                                  <TrashIcon className="w-4 h-4" /> 刪除
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">
                    {project.name}
                  </h3>
                  
                  <p className="text-slate-500 text-sm md:text-base mb-4 line-clamp-5 min-h-[5em] leading-relaxed">
                    {project.description}
                  </p>

                  <div className="space-y-1.5 text-xs md:text-sm text-slate-600 mt-auto">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{project.address}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-500 whitespace-nowrap">預約:</span>
                        <span className="text-slate-700">{formatDate(project.appointmentDate)}</span>
                      </div>
                      {project.reportDate && (
                        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                          <span className="font-medium text-slate-500 whitespace-nowrap">報修:</span>
                          <span className="text-slate-700">{formatDate(project.reportDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 w-20 whitespace-nowrap">狀態</th>
                            <th className="px-4 py-3 whitespace-nowrap">專案名稱</th>
                            <th className="px-4 py-3 whitespace-nowrap">客戶 / 地址</th>
                            <th className="px-4 py-3 whitespace-nowrap">日期資訊</th>
                            <th className="px-4 py-3 w-10 text-center">附件</th>
                            {canManageProject && <th className="px-4 py-3 w-20 text-right whitespace-nowrap">操作</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredProjects.map((project) => {
                            const typeInfo = getTypeInfo(project.type);
                            const hasAttachments = project.attachments && project.attachments.length > 0;
                            return (
                                <tr key={project.id} onClick={() => onSelectProject(project)} className="hover:bg-slate-50 transition-colors cursor-pointer group active:bg-slate-100">
                                    <td className="px-4 py-3 align-top whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getStatusColor(project.status)}`}>
                                                {project.status}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${typeInfo.color}`}>
                                                {typeInfo.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top whitespace-nowrap">
                                        <div className="font-bold text-slate-800 text-sm mb-1">{project.name}</div>
                                        <div className="text-slate-400 text-xs line-clamp-1 max-w-[200px]">{project.description}</div>
                                    </td>
                                    <td className="px-4 py-3 align-top whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-700">{project.clientName}</div>
                                        <div className="text-xs text-slate-400 truncate max-w-[120px]">{project.address}</div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-xs text-slate-500 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                          <span><span className="font-semibold">預約:</span> {formatDate(project.appointmentDate) || '-'}</span>
                                          <span><span className="font-semibold">報修:</span> {formatDate(project.reportDate) || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-center">
                                        {hasAttachments && <PaperclipIcon className="w-4 h-4 text-indigo-400 mx-auto" />}
                                    </td>
                                    {canManageProject && (
                                        <td className="px-4 py-3 align-top text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={(e) => handleOpenScheduleDialog(e, project)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full" title="加入排程">
                                                  <PlusIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => handleEditClick(e, project)} className="p-2 text-slate-400 hover:text-blue-600 rounded-full">
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* 加入排程對話框 */}
      {schedulingProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSchedulingProject(null)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
             <header className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                      <PlusIcon className="w-4 h-4" />
                   </div>
                   <h3 className="font-black text-slate-800 text-sm">加入工作排程</h3>
                </div>
                <button onClick={() => setSchedulingProject(null)} className="p-1 text-slate-400 hover:text-slate-600">
                   <XIcon className="w-5 h-5" />
                </button>
             </header>
             <div className="p-6 space-y-5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">待排專案</div>
                   <div className="text-sm font-black text-slate-800 truncate">{schedulingProject.name}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">預計施工日期</label>
                    <div className="relative">
                       <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                         type="date" 
                         value={scheduleDate}
                         onChange={e => setScheduleDate(e.target.value)}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                       />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">派遣組別</label>
                    <div className="relative">
                       <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <select 
                         value={scheduleTeam}
                         onChange={e => setScheduleTeam(parseInt(e.target.value))}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:bg-white transition-all"
                       >
                         {[1,2,3,4,5,6,7,8].map(t => (
                           <option key={t} value={t}>
                             第 {t} 組 {globalTeamConfigs && globalTeamConfigs[t]?.master ? `(${globalTeamConfigs[t].master})` : ''}
                           </option>
                         ))}
                       </select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handlePasteToSchedule}
                  disabled={pastedDone}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black transition-all shadow-lg active:scale-95 ${pastedDone ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                >
                  {pastedDone ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardListIcon className="w-5 h-5" />}
                  {pastedDone ? '已貼上排程' : '貼上排程'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;