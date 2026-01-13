import React, { useRef, useState } from 'react';
import { Project, User, ProjectStatus, ProjectType, GlobalTeamConfigs, SystemRules, Employee, AttendanceRecord, ConstructionItem, DailyReport, CompletionReport, Attachment, SitePhoto } from '../types';
import ProjectList from './ProjectList';
import ExcelJS from 'exceljs';
import { downloadBlob } from '../utils/fileHelpers';
import { generateId } from '../utils/dataLogic';

declare const pdfjsLib: any;

interface EngineeringViewProps {
  projects: Project[]; setProjects: React.Dispatch<React.SetStateAction<Project[]>>; currentUser: User; lastUpdateInfo: { name: string; time: string } | null; updateLastAction: (name: string) => void; systemRules: SystemRules; employees: Employee[]; setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>; onSelectProject: (project: Project) => void; onAddProject: () => void; onEditProject: (project: Project) => void; handleDeleteProject: (id: string) => void; onAddToSchedule: (date: string, teamId: number, taskName: string) => boolean; globalTeamConfigs: GlobalTeamConfigs;
}

const EngineeringView: React.FC<EngineeringViewProps> = ({ projects, setProjects, currentUser, lastUpdateInfo, updateLastAction, systemRules, employees, setAttendance, onSelectProject, onAddProject, onEditProject, handleDeleteProject, onAddToSchedule, globalTeamConfigs }) => {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsProcessing(true);
    try {
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1); if (!worksheet) throw new Error('找不到工作表');
      const currentProjects = [...projects]; let newCount = 0; const headers: Record<string, number> = {};
      worksheet.getRow(1).eachCell((cell: any, col: number) => { const text = cell.value?.toString().trim(); if (text) headers[text] = col; });
      if (!headers['客戶'] || !headers['類別']) throw new Error('缺少必要欄位');
      const config = systemRules.importConfig?.projectKeywords || { maintenance: '維修', modular: '組合屋' };

      for (const row of worksheet.getRows(2, worksheet.rowCount - 1) || []) {
        const rawName = row.getCell(headers['客戶']).value?.toString().trim() || ''; if (!rawName) continue;
        const categoryStr = row.getCell(headers['類別']).value?.toString() || '';
        let type = ProjectType.CONSTRUCTION;
        if (categoryStr.includes(config.maintenance)) type = ProjectType.MAINTENANCE;
        else if (categoryStr.includes(config.modular)) type = ProjectType.MODULAR_HOUSE;
        if (!currentProjects.some(p => p.name === rawName)) {
          currentProjects.push({ id: generateId(), name: rawName, type, clientName: rawName.split('-')[0], clientContact: '', clientPhone: '', address: row.getCell(headers['地址'] || 0).value?.toString() || '', status: ProjectStatus.PLANNING, progress: 0, appointmentDate: '', reportDate: '', description: '', remarks: '', milestones: [], photos: [], materials: [], reports: [], attachments: [], constructionItems: [], constructionSignatures: [], completionReports: [], planningReports: [] });
          newCount++;
        }
      }
      setProjects(currentProjects); updateLastAction('Excel 匯入更新'); alert(`匯入完成！新增：${newCount} 筆`);
    } catch (error: any) { alert('匯入失敗: ' + error.message); } finally { setIsProcessing(false); if (excelInputRef.current) excelInputRef.current.value = ''; }
  };

  return (
    <>
      <ProjectList title="工務總覽" projects={projects} currentUser={currentUser} lastUpdateInfo={lastUpdateInfo} onSelectProject={onSelectProject} onAddProject={onAddProject} onDeleteProject={handleDeleteProject} onDuplicateProject={()=>{}} onEditProject={onEditProject} onImportExcel={() => excelInputRef.current?.click()} onAddToSchedule={onAddToSchedule} globalTeamConfigs={globalTeamConfigs} />
      <input type="file" accept=".xlsx, .xls" ref={excelInputRef} className="hidden" onChange={handleImportExcel} />
    </>
  );
};

export default EngineeringView;