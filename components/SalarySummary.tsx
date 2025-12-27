import React from 'react';
import { Employee, AttendanceRecord, OvertimeRecord, MonthSummaryRemark } from '../types';
import { BoxIcon } from './Icons';

interface SalarySummaryProps {
  selectedMonth: string;
  employees: Employee[];
  attendance: AttendanceRecord[];
  overtime: OvertimeRecord[];
  monthRemarks: MonthSummaryRemark[];
}

const SalarySummary: React.FC<SalarySummaryProps> = ({ 
  selectedMonth, employees, attendance, overtime, monthRemarks 
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <BoxIcon className="w-4 h-4 text-blue-600" /> {selectedMonth} 月薪資統計彙整
        </h3>
      </div>
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0">
            <tr className="border-b border-slate-200">
              <th className="px-6 py-4">姓名</th>
              <th className="px-6 py-4">職務類別</th>
              <th className="px-6 py-4">出勤摘要 (天數)</th>
              <th className="px-6 py-4 text-center">總加班時數</th>
              <th className="px-6 py-4">月備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => {
              const empAttendance = attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(selectedMonth));
              const empOvertime = overtime.filter(o => o.employeeId === emp.id && o.date.startsWith(selectedMonth));
              const totalOt = empOvertime.reduce((sum, curr) => sum + curr.hours, 0);
              const statusCounts = empAttendance.reduce((acc: Record<string, number>, curr) => {
                acc[curr.status] = (acc[curr.status] || 0) + 1;
                return acc;
              }, {});

              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800">{emp.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      emp.category === '現場' ? 'bg-blue-100 text-blue-700' :
                      emp.category === '做件' ? 'bg-orange-100 text-orange-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {emp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <span key={status} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {status}: {count}
                        </span>
                      ))}
                      {Object.keys(statusCounts).length === 0 && <span className="text-slate-400 italic text-xs">無紀錄</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-black text-orange-600">{totalOt}</span>
                    <span className="text-xs text-slate-400 ml-1">hrs</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                    {monthRemarks.find(r => r.month === selectedMonth && r.employeeId === emp.id)?.remark || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalarySummary;