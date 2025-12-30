import React, { useState, useRef } from 'react';
import { User, UserRole, AuditLog, Project } from '../types';
import { PlusIcon, TrashIcon, ShieldIcon, UserIcon, HistoryIcon, DownloadIcon, UploadIcon, BoxIcon, SettingsIcon, CheckCircleIcon, LoaderIcon, AlertIcon } from './Icons';
import { downloadBlob } from '../utils/fileHelpers';

interface UserManagementProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  auditLogs: AuditLog[];
  onLogAction: (action: string, details: string) => void;
  projects?: Project[];
  onRestoreData?: (data: { projects: Project[], users: User[], auditLogs: AuditLog[] }) => void;
  onConnectDirectory?: () => Promise<void>;
  onSetStorageDirectory?: () => Promise<void>;
  dirPermission?: 'granted' | 'prompt' | 'denied';
  storagePermission?: 'granted' | 'prompt' | 'denied';
  isWorkspaceLoading?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ 
  users, onUpdateUsers, auditLogs, onLogAction, projects = [], onRestoreData,
  onConnectDirectory, onSetStorageDirectory, dirPermission, storagePermission, isWorkspaceLoading
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'data' | 'settings'>('users');
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.WORKER });
  const importFileRef = useRef<HTMLInputElement>(null);

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

  const handleExportData = () => {
    const backupData = {
      projects,
      users,
      auditLogs,
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">權限管理</h1>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('users')}>
          <ShieldIcon className="w-4 h-4" /> 使用者
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('logs')}>
          <HistoryIcon className="w-4 h-4" /> 紀錄
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('data')}>
          <BoxIcon className="w-4 h-4" /> 備份
        </button>
        <button className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => setActiveTab('settings')}>
          <SettingsIcon className="w-4 h-4" /> 設定
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex justify-end mb-4">
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
              <div className="grid grid-cols-1 gap-3">
                <input type="text" placeholder="姓名" className="px-3 py-2 border rounded-lg" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                <input type="email" placeholder="Email" className="px-3 py-2 border rounded-lg" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                <select className="px-3 py-2 border rounded-lg bg-white" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                  <option value={UserRole.ADMIN}>管理員</option>
                  <option value={UserRole.MANAGER}>專案經理</option>
                  <option value={UserRole.WORKER}>現場人員</option>
                </select>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-lg py-2">取消</button>
                  <button onClick={handleAddUser} className="flex-1 bg-blue-600 text-white rounded-lg py-2">建立</button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                    <th className="px-4 py-3 whitespace-nowrap">使用者</th>
                    <th className="px-4 py-3 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 whitespace-nowrap">權限</th>
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
                        <span className="font-medium text-slate-800">{user.name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{user.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                        <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, user.name, e.target.value as UserRole)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                            user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' :
                            user.role === UserRole.MANAGER ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                            }`}
                        >
                            <option value={UserRole.ADMIN}>管理員</option>
                            <option value={UserRole.MANAGER}>經理</option>
                            <option value={UserRole.WORKER}>現場</option>
                        </select>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-slate-400 hover:text-red-500 p-2">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">時間</th>
                <th className="px-4 py-3 whitespace-nowrap">人員</th>
                <th className="px-4 py-3 whitespace-nowrap">動作</th>
                <th className="px-4 py-3 whitespace-nowrap">內容</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{log.userName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs line-clamp-2 max-w-[200px]">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <HistoryIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    無紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                 <DownloadIcon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">匯出備份</h3>
              <p className="text-slate-500 text-xs mb-4">下載系統完整備份檔 (.json)</p>
              <button 
                onClick={handleExportData}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg shadow-sm font-medium transition-all flex justify-center items-center gap-2 text-sm"
              >
                <DownloadIcon className="w-4 h-4" /> 下載
              </button>
           </div>

           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-3">
                 <UploadIcon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">還原資料</h3>
              <p className="text-slate-500 text-xs mb-4">警告：將覆蓋現有資料</p>
              <input type="file" accept=".json" ref={importFileRef} className="hidden" onChange={handleFileChange} />
              <button 
                onClick={handleImportClick}
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded-lg shadow-sm font-medium transition-all flex justify-center items-center gap-2 text-sm"
              >
                <UploadIcon className="w-4 h-4" /> 選擇檔案
              </button>
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
           <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
             <SettingsIcon className="w-5 h-5 text-slate-400" /> 系統全域設定
           </h3>
           
           <div className="space-y-10">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">自動備份 db.json 權限設定</label>
                <p className="text-xs text-slate-500 mb-4">
                  授權瀏覽器存取電腦特定的實體資料夾。選定後，系統將在每次更動時自動於該目錄寫入 db.json 進行即時同步。
                </p>
                
                <div className="mt-4">
                  <button 
                    onClick={onConnectDirectory}
                    disabled={isWorkspaceLoading || !isBrowserSupported}
                    className={`flex items-center gap-4 px-6 py-5 rounded-2xl w-full transition-all border-2 ${
                      !isBrowserSupported ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed' :
                      dirPermission === 'granted' 
                        ? 'bg-green-50 border-green-500 text-green-700' 
                        : 'bg-blue-50 border-blue-500 text-blue-700'
                    } hover:shadow-md active:scale-[0.99]`}
                  >
                    <div className={`p-3 rounded-xl ${!isBrowserSupported ? 'bg-slate-300' : dirPermission === 'granted' ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
                      {isWorkspaceLoading ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <BoxIcon className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col items-start text-left flex-1 min-w-0">
                      <span className="text-lg font-black tracking-tight">
                        {dirPermission === 'granted' ? '電腦同步已開啟' : '連結電腦自動備份目錄'}
                      </span>
                      <span className="text-xs opacity-70 font-bold">
                        {!isBrowserSupported ? '目前瀏覽器不支援' : dirPermission === 'granted' ? '點擊可更換儲存資料夾' : '選取資料夾以開啟即時備份功能'}
                      </span>
                    </div>
                    {isBrowserSupported && (
                      <div className="flex items-center gap-2">
                        {dirPermission === 'granted' ? <CheckCircleIcon className="w-6 h-6" /> : <AlertIcon className="w-6 h-6" />}
                      </div>
                    )}
                  </button>
                  
                  {dirPermission === 'granted' && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-slate-600">系統目前正在同步您的資料夾根目錄下的 db.json</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">預設下載位置設定 (支援網路資料夾/NAS)</label>
                <p className="text-xs text-slate-500 mb-4">
                  設定一個專屬的資料夾或網路磁碟路徑，用於存放從側邊欄點擊「開啟儲存位置」產生的檔案。支援映射後的網路磁碟機。
                </p>
                <div className="mt-4">
                  <button 
                    onClick={onSetStorageDirectory} 
                    disabled={isWorkspaceLoading || !isBrowserSupported} 
                    className={`flex items-center gap-4 px-6 py-5 rounded-2xl w-full transition-all border-2 ${
                      !isBrowserSupported ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed' :
                      storagePermission === 'granted' 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    } hover:shadow-md active:scale-[0.99]`}
                  >
                    <div className={`p-3 rounded-xl ${!isBrowserSupported ? 'bg-slate-300' : storagePermission === 'granted' ? 'bg-indigo-600' : 'bg-slate-400'} text-white`}>
                      {isWorkspaceLoading ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <DownloadIcon className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col items-start text-left flex-1 min-w-0">
                      <span className="text-lg font-black tracking-tight">
                        {storagePermission === 'granted' ? '預設下載目錄已設定' : '設定下載儲存目錄'}
                      </span>
                      <span className="text-xs opacity-70 font-bold">
                        {!isBrowserSupported ? '目前瀏覽器不支援' : storagePermission === 'granted' ? '已選定資料夾，點擊側邊欄即可存檔至此' : '選取資料夾後，即可從側邊欄一鍵下載檔案至此'}
                      </span>
                    </div>
                    {isBrowserSupported && (
                      <div className="flex items-center gap-2">
                        {storagePermission === 'granted' ? <CheckCircleIcon className="w-6 h-6" /> : <SettingsIcon className="w-6 h-6 opacity-30" />}
                      </div>
                    )}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;