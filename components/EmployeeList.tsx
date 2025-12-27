import React, { useState } from 'react';
import { Employee, EmployeeCategory } from '../types';
import { PlusIcon, TrashIcon } from './Icons';

interface EmployeeListProps {
  employees: Employee[];
  onUpdateEmployees: (list: Employee[]) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onUpdateEmployees }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', category: '現場' as EmployeeCategory });

  const handleAdd = () => {
    if (!newEmp.name) return;
    onUpdateEmployees([...employees, { id: crypto.randomUUID(), ...newEmp }]);
    setNewEmp({ name: '', category: '現場' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0">
        <h3 className="font-black text-slate-800">全體人員管理 ({employees.length})</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <PlusIcon className="w-4 h-4" /> 新增人員
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-xl animate-fade-in flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">人員姓名</label>
              <input 
                type="text" 
                value={newEmp.name}
                onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="輸入姓名"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">職務類別</label>
              <div className="grid grid-cols-3 gap-2">
                {['做件', '現場', '廠內'].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setNewEmp({...newEmp, category: cat as EmployeeCategory})}
                    className={`py-3 text-xs font-bold rounded-xl border transition-all ${newEmp.category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleAdd} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold">確認新增</button>
              <button onClick={() => setIsAdding(false)} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">姓名</th>
                <th className="px-6 py-4">職務類別</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800">{emp.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${
                      emp.category === '現場' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      emp.category === '做件' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {emp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onUpdateEmployees(employees.filter(e => e.id !== emp.id))} className="text-slate-300 hover:text-red-500 p-2"><TrashIcon className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;