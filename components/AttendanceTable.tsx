
import React, { useMemo } from 'react';
import { Employee, AttendanceRecord, MonthSummaryRemark, DailyDispatch as DailyDispatchType } from '../types';

interface AttendanceTableProps {
  selectedMonth: string;
  employees: Employee[];
  attendance: AttendanceRecord[];
  monthRemarks: MonthSummaryRemark[];
  dailyDispatches: DailyDispatchType[];
  onUpdateAttendance: (list: AttendanceRecord[]) => void;
  onUpdateMonthRemarks: (list: MonthSummaryRemark[]) => void;
}

const ROC_HOLIDAYS = ['01-01', '02-28', '04-04', '04-05', '05-01', '10-10'];
const ATTENDANCE_OPTIONS = ['排休', '請假', '病假', '臨時請假', '廠內', '下午回廠'];

const AttendanceTable: React.FC<AttendanceTableProps> = ({ 
  selectedMonth, employees, attendance, monthRemarks, dailyDispatches, onUpdateAttendance, onUpdateMonthRemarks 
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const monthDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    const days = date.getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay(); 
      const isSunday = dayOfWeek === 0;
      const isHoliday = ROC_HOLIDAYS.includes(dateStr.slice(5));
      const isYesterday = dateStr === yesterdayStr;
      return { day: d, dateStr, isSunday, isHoliday, isYesterday };
    });
  }, [selectedMonth, yesterdayStr]);

  const updateAttendance = (date: string, employeeId: string, status: string) => {
    // 移除現有紀錄
    let newList = attendance.filter(a => !(a.date === date && a.employeeId === employeeId));
    
    const dayOfWeek = new Date(date).getDay();
    const isSunday = dayOfWeek === 0;
    const isToday = date === todayStr;

    // 關鍵修正：如果是星期日或當日，即使 status 是空字串也要存入紀錄
    // 這樣在下次渲染時，find() 就會抓到這個空紀錄，而不會觸發預載邏輯
    if (status !== '' || isSunday || isToday) {
        newList.push({ date, employeeId, status });
    }
    
    onUpdateAttendance(newList);
  };

  const updateMonthRemark = (employeeId: string, remark: string) => {
    const newList = [...monthRemarks.filter(r => !(r.month === selectedMonth && r.employeeId === employeeId))];
    newList.push({ month: selectedMonth, employeeId, remark });
    onUpdateMonthRemarks(newList);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full border-collapse text-[11px] min-w-[1500px]">
          <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-24 p-2 border-r bg-slate-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]">姓名</th>
              {monthDays.map(day => (
                <th 
                  key={day.day} 
                  className={`w-16 p-1 border-r ${day.isSunday || day.isHoliday ? 'bg-red-50 text-red-600' : ''} ${day.isYesterday ? 'ring-2 ring-inset ring-slate-900 z-10 bg-slate-100 shadow-lg' : ''}`}
                >
                  <div>{day.day}</div>
                  <div className="scale-75 opacity-60 font-medium">{['日','一','二','三','四','五','六'][new Date(day.dateStr).getDay()]}</div>
                </th>
              ))}
              <th className="w-32 p-2 min-w-[150px]">當月備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50/50 group">
                <td className="p-2 font-bold text-slate-700 border-r sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] truncate">{emp.name}</td>
                {monthDays.map(day => {
                  const record = attendance.find(a => a.date === day.dateStr && a.employeeId === emp.id);
                  let status = '';
                  
                  if (record) {
                    status = record.status;
                  } else if (day.dateStr === todayStr) {
                    // --- 派工單連動邏輯 ---
                    const dispatch = dailyDispatches.find(d => d.date === todayStr);
                    if (dispatch) {
                      const empNick = emp.nickname || emp.name;
                      // 尋找此人在派工單中是否擔任助手
                      for (const teamId in dispatch.teams) {
                        const team = dispatch.teams[teamId];
                        if (team.assistants.includes(empNick)) {
                          status = team.master; // 填入師傅暱稱
                          break;
                        }
                      }
                    }
                  }

                  // 如果上述邏輯都沒產生狀態且是星期日，才顯示預設排休
                  if (status === '' && !record && day.isSunday) {
                    status = '排休';
                  }

                  return (
                    <td key={day.day} className={`p-0 border-r relative ${day.isSunday || day.isHoliday ? 'bg-red-50/20' : ''} ${day.isYesterday ? 'ring-2 ring-inset ring-slate-900 z-10' : ''}`}>
                      <input 
                        list="att-options"
                        className={`w-full h-8 text-center bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium ${status ? 'text-blue-700 font-bold' : ''}`}
                        value={status}
                        onChange={(e) => updateAttendance(day.dateStr, emp.id, e.target.value)}
                      />
                    </td>
                  );
                })}
                <td className="p-1">
                  <input 
                    type="text" 
                    placeholder="輸入備註..."
                    value={monthRemarks.find(r => r.month === selectedMonth && r.employeeId === emp.id)?.remark || ''}
                    onChange={(e) => updateMonthRemark(emp.id, e.target.value)}
                    className="w-full px-2 py-1 text-[10px] outline-none bg-transparent border border-transparent focus:border-slate-200 rounded text-slate-600"
                  />
                </td>
              </tr>
            ))}
            <datalist id="att-options">
              {ATTENDANCE_OPTIONS.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;
