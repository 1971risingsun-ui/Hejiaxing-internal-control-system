import React, { useState } from 'react';
import { Project, User, ProjectStatus, SystemRules, ProjectType } from '../types';
import ProjectOverview from './ProjectOverview';
import ConstructionRecord from './ConstructionRecord';
import CompletionReport from './CompletionReport';
import ProjectMaterials from './ProjectMaterials';
import MaterialPreparation from './MaterialPreparation';
import EngineeringPlanning from './EngineeringPlanning';
import { ArrowLeftIcon, LayoutGridIcon, ClipboardListIcon, StampIcon, BoxIcon, TruckIcon, FileTextIcon, EditIcon } from './Icons';

interface ProjectDetailProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onEditProject: (project: Project) => void;
  onAddToSchedule: (date: string, teamId: number, taskName: string) => boolean;
  globalTeamConfigs: any;
  systemRules: SystemRules;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project, currentUser, onBack, onUpdateProject, onEditProject, onAddToSchedule, globalTeamConfigs, systemRules
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'construction' | 'completion' | 'materials' | 'preparation' | 'planning'>('overview');

  const supportsCompletionReport = project.type !== ProjectType.MAINTENANCE;

  const tabs = [
    { id: 'overview', label: '專案概覽', icon: <LayoutGridIcon className="w-4 h-4" /> },
    { id: 'planning', label: '報價規劃', icon: <FileTextIcon className="w-4 h-4" /> },
    { id: 'preparation', label: '備料清單', icon: <TruckIcon className="w-4 h-4" /> },
    { id: 'construction', label: '施工紀錄', icon: <ClipboardListIcon className="w-4 h-4" /> },
    ...(supportsCompletionReport ? [{ id: 'completion', label: '完工報告', icon: <StampIcon className="w-4 h-4" /> }] : []),
    { id: 'materials', label: '材料請購', icon: <BoxIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in overflow-hidden">
      <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800">{project.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                project.status === ProjectStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                project.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {project.status}
              </span>
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Project ID: {project.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <button onClick={() => onEditProject(project)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all active:scale-95">
          <EditIcon className="w-5 h-5" />
        </button>
      </header>

      <nav className="px-6 border-b border-slate-100 bg-white flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-4 text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-6 flex-1 overflow-auto bg-slate-50">
        {activeTab === 'overview' && <ProjectOverview project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} />}
        {activeTab === 'construction' && <ConstructionRecord project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} systemRules={systemRules} />}
        {activeTab === 'completion' && supportsCompletionReport && <CompletionReport project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} systemRules={systemRules} />}
        {activeTab === 'materials' && <ProjectMaterials project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} />}
        {activeTab === 'preparation' && <MaterialPreparation project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} systemRules={systemRules} />}
        {activeTab === 'planning' && <EngineeringPlanning project={project} currentUser={currentUser} onUpdateProject={onUpdateProject} />}
      </div>
    </div>
  );
};

export default ProjectDetail;