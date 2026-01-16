import React, { useState, useRef, useMemo } from 'react';
import { User, UserRole, AuditLog, Project, SystemRules, MaterialFormulaConfig, MaterialFormulaItem, RolePermission, ConstructionItemOption, CompletionCategoryOption } from '../types';
import { PlusIcon, TrashIcon, ShieldIcon, UserIcon, HistoryIcon, DownloadIcon, UploadIcon, BoxIcon, SettingsIcon, CheckCircleIcon, LoaderIcon, AlertIcon, PenToolIcon, ChevronRightIcon, WrenchIcon, EditIcon, XIcon, LayoutGridIcon, BriefcaseIcon, UsersIcon, FileTextIcon, TruckIcon, ClipboardListIcon, StampIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';

interface UserManagementProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  auditLogs: AuditLog[];
  onLogAction: (action: string, details: string) => void;
  projects?: Project[];
  onRestoreData?: (data: { projects: Project[], users: User[], auditLogs: AuditLog[] }) => void;
  onConnectDirectory?: () => Promise<void>;
  dirPermission?: 'granted' | 'prompt' | 'denied';
  isWorkspaceLoading?: boolean;
  systemRules: SystemRules;
  onUpdateSystemRules: (rules: SystemRules) => void;
}

const PERMISSION_STRUCTURE = [
  { id: 'engineering', label: '工務總覽', type: 'main' },
  { id: 'engineering_hub', label: '工作排程', type: 'main', children: [
    { id: 'daily_dispatch', label: '明日工作排程' },
    { id: 'driving_time', label: '估計行車時間' },
    { id: 'weekly_schedule', label: '週間工作排程' },
    { id: 'report_tracking', label: '回報追蹤表' },
    { id: 'outsourcing', label: '外包廠商管理' },
    { id: 'engineering_groups', label: '工程小組設定' },
  ]},
  { id: 'purchasing_hub', label: '採購管理', type: 'main', children: [
    { id: 'purchasing_items', label: '採購項目' },
    { id: 'stock_alert', label: '常備庫存爆量通知' },
    { id: 'purchasing_suppliers', label: '供應商清冊' },
    { id: 'purchasing_subcontractors', label: '外包廠商' },
    { id: 'purchasing_orders', label: '採購單管理' },
    { id: 'purchasing_inbounds', label: '進料明細' },
  ]},
  { id: 'hr', label: '人事管理', type: 'main' },
  { id: 'production', label: '生產／備料', type: 'main' },
  { id: 'equipment', label: '設備與工具', type: 'main', children: [
    { id: 'equipment_tools', label: '工具管理' },
    { id: 'equipment_assets', label: '大型設備管理' },
    { id: 'equipment_vehicles', label: '車輛管理' },
  ]},
  { id: 'report', label: '工作回報', type: 'main' },
  { id: 'users', label: '系統權限設定', type: 'main' },
];

const UserManagement: React.FC<UserManagementProps> = ({ 
  users, onUpdateUsers, auditLogs, onLogAction, projects = [], onRestoreData,
  onConnectDirectory, dirPermission, isWorkspaceLoading,
  systemRules, onUpdateSystemRules
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'rules' | 'logs' | 'data' | 'settings'>('users');
  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>(UserRole.ADMIN);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.WORKER });
  const importFileRef = useRef<HTMLInputElement>(null);

  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);

  const isBrowserSupported = 'showDirectoryPicker' in window;

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;

    const user: User = {
      id: crypto.randomUUID(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
    };

    onUpdateUsers([...users, user]);
    onLogAction('ADD_USER', `Added user: ${newUser.name} (${newUser.role})`);
    
    setNewUser({ name: '', email: '', role: UserRole.WORKER });
    setIsAdding(false);
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm('確定要刪除此使用者嗎？')) {
      onUpdateUsers(users.filter(u => u.id !== id));
      onLogAction('DELETE_USER', `Deleted user: ${name}`);
    }
  };

  const handleRoleChange = (id: string, name: string, newRole: UserRole) => {
    onUpdateUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    onLogAction('UPDATE_ROLE', `Changed role for ${name} to ${newRole}`);
  };

  const handleUpdateRolePermission = (role: UserRole, updates: Partial<RolePermission>) => {
    const currentPermissions = systemRules.rolePermissions || {
      [UserRole.ADMIN]: { displayName: '管理員', allowedViews: [] },
      [UserRole.MANAGER]: { displayName: '專案經理', allowedViews: [] },
      [UserRole.ENGINEERING]: { displayName: '工務人員', allowedViews: [] },
      [UserRole.FACTORY]: { displayName: '廠務人員', allowedViews: [] },
      [UserRole.WORKER]: { displayName: '現場人員', allowedViews: [] }
    };

    const newPermissions = {
      ...currentPermissions,
      [role]: { ...currentPermissions[role], ...updates }
    };

    onUpdateSystemRules({ ...systemRules, rolePermissions: newPermissions });
    onLogAction('UPDATE_ROLE_PERM', `Updated permissions for role: ${role}`);
  };

  const togglePermission = (role: UserRole, viewId: string) => {
    const current = systemRules.rolePermissions?.[role]?.allowedViews || [];
    let next;
    if (current.includes(viewId)) {
      next = current.filter(id => id !== viewId);
      const item = PERMISSION_STRUCTURE.find(p => p.id === viewId);
      if (item?.children) {
        const childIds = item.children.map(c => c.id);
        next = next.filter(id => !childIds.includes(id));
      }
    } else {
      next = [...current, viewId];
      PERMISSION_STRUCTURE.forEach(p => {
        if (p.children?.some(c => c.id === viewId) && !next.includes(p.id)) {
          next.push(p.id);
        }
      });
    }
    handleUpdateRolePermission(role, { allowedViews: next });
  };

  const handleExportData = () => {
    const backupData = {
      projects,
      users,
      auditLogs,
      systemRules,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadBlob(blob, `hejiaxing_backup_${new Date().toISOString().split('T')[0]}.json`);
    
    onLogAction('DATA_EXPORT', 'Exported system backup');
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.projects || !Array.isArray(json.projects)) {
          throw new Error('Invalid backup file');
        }

        if (confirm(`還原將覆寫現有資料，確定嗎？`)) {
          if (onRestoreData) {
            onRestoreData({
              projects: json.projects,
              users: json.users || users,
              auditLogs: json.auditLogs || auditLogs
            });
          }
        }
      } catch (error) {
        alert('備份檔案無效');
      }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  const handleUpdateKeywords = (type: 'production' | 'subcontractor' | 'modular-production' | 'modular-subcontractor', value: string) => {
    const keywords = value.split(',').map(s => s.trim()).filter(s => !!s);
    if (type === 'production') {
      onUpdateSystemRules({ ...systemRules, productionKeywords: keywords });
    } else if (type === 'subcontractor') {
      onUpdateSystemRules({ ...systemRules, subcontractorKeywords: keywords });
    } else if (type === 'modular-production') {
      onUpdateSystemRules({ ...systemRules, modularProductionKeywords: keywords });
    } else if (type === 'modular-subcontractor') {
      onUpdateSystemRules({ ...systemRules, modularSubcontractorKeywords: keywords });
    }
  };

  const handleAddFormula = () => {
    const newFormula: MaterialFormulaConfig = {
      id: crypto.randomUUID(),
      keyword: '新關鍵字',
      category: '其他',
      items: []
    };
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: [...systemRules.materialFormulas, newFormula]
    });
    setEditingFormulaId(newFormula.id);
  };

  const handleDeleteFormula = (id: string) => {
    if (!confirm('確定刪除此換算規則嗎？')) return;
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.filter(f => f.id !== id)
    });
  };

  const handleUpdateFormulaConfig = (id: string, field: keyof MaterialFormulaConfig, value: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => f.id === id ? { ...f, [field]: value } : f)
    });
  };

  const handleAddFormulaItem = (formulaId: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => {
        if (f.id === formulaId) {
          return {
            ...f,
            items: [...f.items, { id: crypto.randomUUID(), name: '新材料', formula: 'baseQty', unit: '項' }]
          };
        }
        return f;
      })
    });
  };

  const handleUpdateFormulaItem = (formulaId: string, itemId: string, field: keyof MaterialFormulaItem, value: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => {
        if (f.id === formulaId) {
          return {
            ...f,
            items: f.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
          };
        }
        return f;
      })
    });
  };

  const handleRemoveFormulaItem = (formulaId: string, itemId: string) => {
    onUpdateSystemRules({
      ...systemRules,
      materialFormulas: systemRules.materialFormulas.map(f => {
        if (f.id === formulaId) {
          return {
            ...f,
            items: f.items.filter(i => i.id !== itemId)
          };
        }
        return f;
      })
    });
  };

  const handleAddConstructionItem = (type: 'standard' | 'maintenance') => {
    const list = type === 'standard' ? [...systemRules.standardConstructionItems] : [...systemRules.maintenanceConstructionItems];
    list.push({ name: '新項目', unit: '項' });
    if (type === 'standard') onUpdateSystemRules({ ...systemRules, standardConstructionItems: list });
    else onUpdateSystemRules({ ...systemRules, maintenanceConstructionItems: list });
  };

  const handleUpdateConstructionItem = (type: 'standard' | 'maintenance', idx: number, field: keyof ConstructionItemOption, val: string) => {
    const list = type === 'standard' ? [...systemRules.standardConstructionItems] : [...systemRules.maintenanceConstructionItems];
    list[idx] = { ...list[idx], [field]: val };
    if (type === 'standard') onUpdateSystemRules({ ...systemRules, standardConstructionItems: list });
    else onUpdateSystemRules({ ...systemRules, maintenanceConstructionItems: list });
  };

  const handleRemoveConstructionItem = (type: 'standard' | 'maintenance', idx: number) => {
    const list = type === 'standard' ? [...systemRules.standardConstructionItems] : [...systemRules.maintenanceConstructionItems];
    list.splice(idx, 1);
    if (type === 'standard') onUpdateSystemRules({ ...systemRules, standardConstructionItems: list });
    else onUpdateSystemRules({ ...systemRules, maintenanceConstructionItems: list });
  };

  const handleAddCompletionCategory = () => {
    const newCat: CompletionCategoryOption = {
      id: crypto.randomUUID(),
      label: '新分類',
      defaultUnit: '項',
      items: ['新項目']
    };
    onUpdateSystemRules({
      ...systemRules,
      completionCategories: [...(systemRules.completionCategories || []), newCat]
    });
  };

  const handleUpdateCompletionCategory = (id: string, field: keyof CompletionCategoryOption, val: any) => {
    onUpdateSystemRules({
      ...systemRules,
      completionCategories: systemRules.completionCategories.map(c => c.id === id ? { ...c, [field]: val } : c)
    });
  };

  const handleRemoveCompletionCategory = (id: string) => {
    if (!confirm('確定刪除整組完工分類？')) return;
    onUpdateSystemRules({
      ...systemRules,
      completionCategories: systemRules.completionCategories.filter(c => c.id !== id)
    });
  };

  const handleAddCompletionItem = (catId: string) => {
    onUpdateSystemRules({
      ...systemRules,
      completionCategories: systemRules.completionCategories.map(c => {
        if (c.id === catId) {
            return { ...c, items: [...c.items, '新項目'] };
        }
        return c;
      })
    });
  };

  const handleUpdateCompletionItemText = (catId: string, idx: number, val: string) => {
    onUpdateSystemRules({
      ...systemRules,
      completionCategories: systemRules.completionCategories.map(c => {
        if (c.id === catId) {
            const newItems = [...c.items];
            newItems[idx] = val;
            return { ...c, items: newItems };
        }
        return c;
      })
    });
  };

  const handleRemoveCompletionItemFromCat = (catId: string, idx: number) => {
    onUpdateSystemRules({
      ...systemRules,
      completionCategories: systemRules.completionCategories.map(c => {
        if (c.id === catId) {
            const newItems = [...c.items];
            newItems.splice(idx, 1);
            return { ...c, items: newItems };
        }
        return c;
      })
    });
  };

  const currentRolePerm = useMemo(() => {
    return systemRules.rolePermissions?.[activeRoleTab] || { displayName: '', allowedViews: [] };
  }, [systemRules.rolePermissions, activeRoleTab]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">權限管理與系統設定</h1>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar flex-shrink-0">
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('users')}>
          <ShieldIcon className="w-4 h-4" /> 使用者與權限
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'rules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('rules')}>
          <PenToolIcon className="w-4 h-4" /> 規則設定
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('logs')}>
          <HistoryIcon className="w-4 h-4" /> 紀錄
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('data')}>
          <BoxIcon className="w-4 h-4" /> 備份
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('settings')}>
          <SettingsIcon className="w-4 h-4" /> 系統設定
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-1">
        {activeTab === 'users' && (
          <div className="space-y-10 pb-10">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-indigo-500" /> 使用者名單</h3>
                <button
                  onClick={() => setIsAdding(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all"
                  title="新增使用者"
                >
                  <PlusIcon className="w-6 h-6" />
                </button>
              </div>

              {isAdding && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-blue-200 shadow-sm animate-fade-in">
                  <h3 className="font-bold mb-3 text-slate-800">新增帳號</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="text" placeholder="姓名" className="px-3 py-2 border rounded-lg" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                    <input type="email" placeholder="Email" className="px-3 py-2 border rounded-lg" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    <select className="px-3 py-2 border rounded-lg bg-white" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                      <option value={UserRole.ADMIN}>管理員</option>
                      <option value={UserRole.MANAGER}>專案經理</option>
                      <option value={UserRole.ENGINEERING}>工務人員</option>
                      <option value={UserRole.FACTORY}>廠務人員</option>
                      <option value={UserRole.WORKER}>現場人員</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-lg py-2">取消</button>
                      <button onClick={handleAddUser} className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-bold">建立</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                        <tr>
                        <th className="px-4 py-3 whitespace-nowrap">使用者</th>
                        <th className="px-4 py-3 whitespace-nowrap">Email</th>
                        <th className="px-4 py-3 whitespace-nowrap">權限類別</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">刪除</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 flex items-center gap-2 whitespace-nowrap">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {user.avatar ? <img src={user.avatar} alt={user.name} /> : <UserIcon className="w-4 h-4 text-slate-500" />}
                            </div>
                            <span className="font-bold text-slate-800 text-sm">{user.name}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{user.email}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                            <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, user.name, e.target.value as UserRole)}
                                className={`text-xs font-black px-3 py-1.5 rounded-lg border-none shadow-sm cursor-pointer ${
                                user.role === UserRole.ADMIN ? 'bg-purple-600 text-white' :
                                user.role === UserRole.MANAGER ? 'bg-blue-600 text-white' :
                                user.role === UserRole.ENGINEERING ? 'bg-indigo-600 text-white' :
                                user.role === UserRole.FACTORY ? 'bg-emerald-600 text-white' :
                                'bg-slate-600 text-white'
                                }`}
                            >
                                <option value={UserRole.ADMIN}>{systemRules.rolePermissions?.[UserRole.ADMIN]?.displayName || '管理員'}</option>
                                <option value={UserRole.MANAGER}>{systemRules.rolePermissions?.[UserRole.MANAGER]?.displayName || '專案經理'}</option>
                                <option value={UserRole.ENGINEERING}>{systemRules.rolePermissions?.[UserRole.ENGINEERING]?.displayName || '工務人員'}</option>
                                <option value={UserRole.FACTORY}>{systemRules.rolePermissions?.[UserRole.FACTORY]?.displayName || '廠務人員'}</option>
                                <option value={UserRole.WORKER}>{systemRules.rolePermissions?.[UserRole.WORKER]?.displayName || '現場人員'}</option>
                            </select>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldIcon className="w-5 h-5 text-blue-600" /> 權限角色細節設定</h3>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
                {[UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEERING, UserRole.FACTORY, UserRole.WORKER].map(role => (
                  <button 
                    key={role}
                    onClick={() => setActiveRoleTab(role)}
                    className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeRoleTab === role ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {systemRules.rolePermissions?.[role]?.displayName || role}
                  </button>
                ))}
              </div>

              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">權限類別自訂名稱</label>
                  <input 
                    type="text"
                    value={currentRolePerm.displayName}
                    onChange={(e) => handleUpdateRolePermission(activeRoleTab, { displayName: e.target.value })}
                    placeholder="例如: 超級管理員"
                    className="w-full max-w-md px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">側邊欄與子項目可見權限</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {PERMISSION_STRUCTURE.map(group => {
                        const isMainChecked = currentRolePerm.allowedViews.includes(group.id);
                        return (
                          <div key={group.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                             <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox"
                                  id={`perm-${activeRoleTab}-${group.id}`}
                                  checked={isMainChecked}
                                  onChange={() => togglePermission(activeRoleTab, group.id)}
                                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor={`perm-${activeRoleTab}-${group.id}`} className="font-black text-slate-700 text-sm cursor-pointer">{group.label}</label>
                             </div>
                             
                             {group.children && (
                               <div className="pl-8 space-y-2 border-l-2 border-blue-100 ml-2.5 py-1">
                                  {group.children.map(child => {
                                    const isChildChecked = currentRolePerm.allowedViews.includes(child.id);
                                    return (
                                      <div key={child.id} className="flex items-center gap-2">
                                        <input 
                                          type="checkbox"
                                          disabled={!isMainChecked}
                                          id={`perm-${activeRoleTab}-${child.id}`}
                                          checked={isChildChecked}
                                          onChange={() => togglePermission(activeRoleTab, child.id)}
                                          className="w-4 h-4 rounded text-blue-400 focus:ring-blue-400 cursor-pointer disabled:opacity-30"
                                        />
                                        <label htmlFor={`perm-${activeRoleTab}-${child.id}`} className={`text-xs font-bold ${isMainChecked ? 'text-slate-500 cursor-pointer' : 'text-slate-300'}`}>{child.label}</label>
                                      </div>
                                    );
                                  })}
                               </div>
                             )}
                          </div>
                        );
                      })}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8 pb-10">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardListIcon className="w-5 h-5 text-blue-600" /> 施工項目清單管理
                </h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-black text-xs text-slate-600">圍籬施工紀錄項目 (Standard)</span>
                    <button onClick={() => handleAddConstructionItem('standard')} className="bg-blue-600 text-white p-1 rounded-lg"><PlusIcon className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {systemRules.standardConstructionItems?.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <input type="text" value={item.name} onChange={e => handleUpdateConstructionItem('standard', idx, 'name', e.target.value)} className="flex-1 bg-slate-50 px-2 py-1 rounded text-xs font-bold outline-none border border-transparent focus:border-blue-300" />
                        <input type="text" value={item.unit} onChange={e => handleUpdateConstructionItem('standard', idx, 'unit', e.target.value)} className="w-12 bg-slate-50 px-1 py-1 rounded text-[10px] text-center outline-none border border-transparent focus:border-blue-300" />
                        <button onClick={() => handleRemoveConstructionItem('standard', idx)} className="text-slate-300 hover:text-red-500"><XIcon className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-black text-xs text-slate-600">維修施工報告項目 (Maintenance)</span>
                    <button onClick={() => handleAddConstructionItem('maintenance')} className="bg-orange-600 text-white p-1 rounded-lg"><PlusIcon className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {systemRules.maintenanceConstructionItems?.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <input type="text" value={item.name} onChange={e => handleUpdateConstructionItem('maintenance', idx, 'name', e.target.value)} className="flex-1 bg-slate-50 px-2 py-1 rounded text-xs font-bold outline-none border border-transparent focus:border-orange-300" />
                        <input type="text" value={item.unit} onChange={e => handleUpdateConstructionItem('maintenance', idx, 'unit', e.target.value)} className="w-16 bg-slate-50 px-1 py-1 rounded text-[10px] text-center outline-none border border-transparent focus:border-orange-300" />
                        <button onClick={() => handleRemoveConstructionItem('maintenance', idx)} className="text-slate-300 hover:text-red-500"><XIcon className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <StampIcon className="w-5 h-5 text-green-600" /> 完工報告分類與項目管理
                    </h3>
                    <button 
                        onClick={handleAddCompletionCategory}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" /> 新增主分類
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {systemRules.completionCategories?.map((cat) => (
                        <div key={cat.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col bg-white group">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center group-hover:bg-green-50/50 transition-colors">
                                <div className="flex gap-2 flex-1 mr-4">
                                    <input 
                                        type="text" value={cat.label} 
                                        onChange={e => handleUpdateCompletionCategory(cat.id, 'label', e.target.value)}
                                        className="bg-transparent border-b border-transparent focus:border-green-500 outline-none font-black text-slate-700 text-sm flex-1"
                                    />
                                    <input 
                                        type="text" value={cat.defaultUnit} placeholder="單位"
                                        onChange={e => handleUpdateCompletionCategory(cat.id, 'defaultUnit', e.target.value)}
                                        className="w-12 bg-white border border-slate-200 rounded px-1 text-[10px] text-center font-bold text-slate-500"
                                    />
                                </div>
                                <button onClick={() => handleRemoveCompletionCategory(cat.id)} className="text-slate-300 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                            <div className="p-4 space-y-2 flex-1">
                                <div className="max-h-[200px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                                    {cat.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 animate-fade-in">
                                            <input 
                                                type="text" value={item}
                                                onChange={e => handleUpdateCompletionItemText(cat.id, idx, e.target.value)}
                                                className="flex-1 bg-transparent text-xs font-bold text-slate-600 outline-none"
                                            />
                                            <button onClick={() => handleRemoveCompletionItemFromCat(cat.id, idx)} className="text-slate-200 hover:text-red-400"><XIcon className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => handleAddCompletionItem(cat.id)}
                                    className="w-full mt-2 py-2 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black text-slate-400 hover:text-green-600 hover:bg-green-50 hover:border-green-200 transition-all"
                                >
                                    + 新增子項目
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BoxIcon className="w-5 h-5 text-indigo-500" /> 生產與協力分流關鍵字 (圍籬)
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    生產／備料關鍵字 (以半形逗號隔開)
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={2}
                    value={systemRules.productionKeywords.join(', ')}
                    onChange={(e) => handleUpdateKeywords('production', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    協力廠商關鍵字 (以半形逗號隔開)
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    rows={2}
                    value={systemRules.subcontractorKeywords.join(', ')}
                    onChange={(e) => handleUpdateKeywords('subcontractor', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && <div className="pb-10"><h3 className="font-bold text-slate-800 mb-4">系統日誌</h3><div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="px-4 py-2">時間</th><th className="px-4 py-2">人員</th><th className="px-4 py-2">細節</th></tr></thead><tbody>{auditLogs.map(log => (<tr key={log.id} className="border-t border-slate-100"><td className="px-4 py-2 text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</td><td className="px-4 py-2 font-bold">{log.userName}</td><td className="px-4 py-2 text-slate-600">{log.details}</td></tr>))}</tbody></table></div></div>}

        {activeTab === 'data' && (
          <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
              <div className="bg-emerald-50 p-4 rounded-full text-emerald-600"><BoxIcon className="w-12 h-12" /></div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold text-slate-800">手動備份與還原</h3>
                <p className="text-sm text-slate-500">下載目前的系統狀態為 JSON 檔案，或從先前存檔還原資料。</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportData} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"><DownloadIcon className="w-5 h-5" /> 下載備份</button>
                <input type="file" accept=".json" ref={importFileRef} className="hidden" onChange={handleFileChange} />
                <button onClick={handleImportClick} className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95"><UploadIcon className="w-5 h-5" /> 匯入還原</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-slate-600" /> 系統偏好設定</h3>
             <div className="space-y-6">
                <div>
                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Excel 匯入：類別識別關鍵字</label>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400">維修判定字串</span>
                        <input 
                          type="text" 
                          value={systemRules.importConfig?.projectKeywords?.maintenance || ''}
                          onChange={(e) => onUpdateSystemRules({ ...systemRules, importConfig: { ...systemRules.importConfig!, projectKeywords: { ...systemRules.importConfig!.projectKeywords, maintenance: e.target.value } } })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400">組合屋判定字串</span>
                        <input 
                          type="text" 
                          value={systemRules.importConfig?.projectKeywords?.modular || ''}
                          onChange={(e) => onUpdateSystemRules({ ...systemRules, importConfig: { ...systemRules.importConfig!, projectKeywords: { ...systemRules.importConfig!.projectKeywords, modular: e.target.value } } })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        />
                      </div>
                   </div>
                </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;