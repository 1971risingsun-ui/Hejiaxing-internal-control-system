
import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus } from '../types';
import { SearchIcon, XIcon, CheckCircleIcon, FileTextIcon, BoxIcon } from './Icons';

interface ExportProjectModalProps {
  projects: Project[];
  onClose: () => void;
  onExport: (selectedProjects: Project[]) => void;
}

const ExportProjectModal: React.FC<ExportProjectModalProps> = ({ projects, onClose, onExport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    const newSet = new Set(selectedIds);
    filteredProjects.forEach(p => newSet.add(p.id));
    setSelectedIds(newSet);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selected = projects.filter(p => selectedIds.has(p.id));
    onExport(selected);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
             <div className="bg-slate-800 p-2 rounded-xl text-white"><FileTextIcon className="w-5 h-5" /></div>
             <div>
               <h3 className="font-black text-slate-800 text-lg">匯出案件資料 (JSON)</h3>
               <p className="text-xs font-bold text-slate-400">Select Projects to Export</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><XIcon className="w-6 h-6" /></button>
        </header>

        <div className="p-6 space-y-4 border-b border-slate-100">
           <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="搜尋案件..." 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">全部狀態</option>
                <option value="規劃中">規劃中</option>
                <option value="進行中">進行中</option>
                <option value="已完工">已完工</option>
                <option value="暫停">暫停</option>
              </select>
           </div>
           <div className="flex justify-between items-center">
              <div className="text-xs font-bold text-slate-500">
                 顯示 {filteredProjects.length} 筆 / 已選 {selectedIds.size} 筆
              </div>
              <div className="flex gap-2">
                 <button onClick={handleSelectAll} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">全選顯示項目</button>
                 <button onClick={handleDeselectAll} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">取消全選</button>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-slate-50/50">
           {filteredProjects.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
               {filteredProjects.map(p => (
                 <div 
                   key={p.id} 
                   onClick={() => handleToggleSelect(p.id)}
                   className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${selectedIds.has(p.id) ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                 >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${selectedIds.has(p.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                       {selectedIds.has(p.id) && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="min-w-0">
                       <div className={`font-black text-sm truncate ${selectedIds.has(p.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</div>
                       <div className="text-xs text-slate-500 font-bold mt-0.5">{p.status} <span className="text-slate-300 mx-1">|</span> {p.clientName}</div>
                    </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                <BoxIcon className="w-12 h-12 opacity-20 mb-2" />
                <p className="text-sm font-bold">沒有符合的案件</p>
             </div>
           )}
        </div>

        <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">取消</button>
           <button 
             onClick={handleConfirm}
             disabled={selectedIds.size === 0}
             className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-black shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
           >
             <FileTextIcon className="w-4 h-4" /> 匯出 {selectedIds.size} 筆案件
           </button>
        </footer>
      </div>
    </div>
  );
};

export default ExportProjectModal;
