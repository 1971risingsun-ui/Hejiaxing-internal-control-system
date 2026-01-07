
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { generateId } from '../App';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [email, setEmail] = useState('demo@hejiaxing.ai');
  const [loading, setLoading] = useState(false);

  const LOGO_URL = 'assets/logo-DgAuV1F6.png';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      try {
        let displayName = 'Site Worker';
        if (role === UserRole.ADMIN) displayName = 'Admin User';
        else if (role === UserRole.MANAGER) displayName = 'Project Manager';
        else if (role === UserRole.ENGINEERING) displayName = 'Engineering Staff';
        else if (role === UserRole.FACTORY) displayName = 'Factory Staff';

        const mockUser: User = {
          id: generateId(),
          name: displayName,
          email: email,
          role: role,
          avatar: LOGO_URL
        };
        
        onLogin(mockUser);
      } catch (err) {
        console.error("Login Error:", err);
        alert("登入發生錯誤，請重新整理頁面。");
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-10 text-center flex flex-col items-center">
          <div className="w-32 h-32 mb-6 rounded-full bg-white p-1 shadow-xl">
             <img src={LOGO_URL} alt="合家興 Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-[0.2em]">
            合家興實業
          </h1>
          <div className="text-[10px] font-bold text-yellow-500 mt-2 uppercase tracking-widest opacity-80">行政管理系統</div>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">選擇身份 (演示用)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.ADMIN)}
                  className={`py-2 px-1 text-xs rounded-lg border transition-all ${role === UserRole.ADMIN ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500 ring-opacity-20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  管理員
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.MANAGER)}
                  className={`py-2 px-1 text-xs rounded-lg border transition-all ${role === UserRole.MANAGER ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500 ring-opacity-20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  專案經理
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.ENGINEERING)}
                  className={`py-2 px-1 text-xs rounded-lg border transition-all ${role === UserRole.ENGINEERING ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500 ring-opacity-20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  工務人員
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.FACTORY)}
                  className={`py-2 px-1 text-xs rounded-lg border transition-all ${role === UserRole.FACTORY ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500 ring-opacity-20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  廠務人員
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.WORKER)}
                  className={`py-2 px-1 text-xs rounded-lg border transition-all ${role === UserRole.WORKER ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500 ring-opacity-20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  現場人員
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center"
            >
              {loading ? (
                <span className="flex items-center gap-2 text-sm">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  認證中...
                </span>
              ) : "登入系統"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
