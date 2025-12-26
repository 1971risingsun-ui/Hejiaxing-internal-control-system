
import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectType } from '../types';
import { MapPinIcon, NavigationIcon, PlusIcon, TrashIcon, HomeIcon, SparklesIcon, BriefcaseIcon, SearchIcon, XIcon } from './Icons';

interface DrivingTimeEstimatorProps {
  projects: Project[];
}

// 總部座標
const START_ADDRESS = "桃園市龜山區文化三路620巷80弄118-1號";
const START_COORDS = { lat: 25.047, lng: 121.371 }; 

// 台灣主要地區座標快取
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "龜山": { lat: 25.021, lng: 121.362 },
  "中壢": { lat: 24.968, lng: 121.224 },
  "桃園": { lat: 24.993, lng: 121.301 },
  "平鎮": { lat: 24.945, lng: 121.218 },
  "八德": { lat: 24.938, lng: 121.284 },
  "楊梅": { lat: 24.907, lng: 121.145 },
  "蘆竹": { lat: 25.045, lng: 121.296 },
  "大溪": { lat: 24.880, lng: 121.286 },
  "龍潭": { lat: 24.863, lng: 121.216 },
  "大園": { lat: 25.063, lng: 121.201 },
  "觀音": { lat: 25.037, lng: 121.082 },
  "新屋": { lat: 24.972, lng: 121.105 },
  "新莊": { lat: 25.033, lng: 121.442 },
  "板橋": { lat: 25.011, lng: 121.465 },
  "林口": { lat: 25.077, lng: 121.391 },
  "五股": { lat: 25.084, lng: 121.437 },
  "泰山": { lat: 25.058, lng: 121.431 },
  "樹林": { lat: 24.991, lng: 121.425 },
  "鶯歌": { lat: 24.954, lng: 121.354 },
  "土城": { lat: 24.972, lng: 121.443 },
  "三重": { lat: 25.063, lng: 121.488 },
  "中和": { lat: 24.998, lng: 121.501 },
  "永和": { lat: 25.009, lng: 121.517 },
  "新店": { lat: 24.967, lng: 121.541 },
};

const DrivingTimeEstimator: React.FC<DrivingTimeEstimatorProps> = ({ projects }) => {
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [projectLabels, setProjectLabels] = useState<string[]>(['']);
  const [results, setResults] = useState<(number | null)[]>([null]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCoordsFromAddress = (address: string) => {
    for (const district in DISTRICT_COORDS) {
      if (address.includes(district)) return DISTRICT_COORDS[district];
    }
    return { lat: 25.0, lng: 121.4 }; 
  };

  const estimateLocal = (index: number, addr: string, currentDestinations: string[]) => {
    if (addr.trim().length < 2) return null;
    const originCoords = index === 0 ? START_COORDS : getCoordsFromAddress(currentDestinations[index - 1]);
    const targetCoords = getCoordsFromAddress(addr);
    const directDist = getDistanceFromLatLonInKm(originCoords.lat, originCoords.lng, targetCoords.lat, targetCoords.lng);
    const estimatedRoadDist = directDist * 1.4;
    return Math.max(2.5, parseFloat(estimatedRoadDist.toFixed(1)));
  };

  const handleUpdateDestination = (index: number, value: string, label?: string) => {
    const newDests = [...destinations];
    newDests[index] = value;
    setDestinations(newDests);

    const newLabels = [...projectLabels];
    newLabels[index] = label || '';
    setProjectLabels(newLabels);

    const newRes = [...results];
    newRes[index] = estimateLocal(index, value, newDests);
    
    // 連鎖計算後續路段
    for(let i = index + 1; i < newDests.length; i++) {
        newRes[i] = estimateLocal(i, newDests[i], newDests);
    }
    setResults(newRes);
  };

  const handleAddDestination = () => {
    setDestinations([...destinations, '']);
    setProjectLabels([...projectLabels, '']);
    setResults([...results, null]);
  };

  const handleRemoveDestination = (index: number) => {
    if (destinations.length <= 1) return;
    const newDests = destinations.filter((_, i) => i !== index);
    setDestinations(newDests);
    setProjectLabels(projectLabels.filter((_, i) => i !== index));
    
    const newRes: (number | null)[] = [];
    newDests.forEach((d, i) => {
        newRes.push(estimateLocal(i, d, newDests));
    });
    setResults(newRes);
  };

  const getProjectTypeLabel = (type: ProjectType) => {
    switch (type) {
      case ProjectType.MAINTENANCE: return { text: '維修', class: 'bg-orange-100 text-orange-600' };
      case ProjectType.MODULAR_HOUSE: return { text: '組合屋', class: 'bg-emerald-100 text-emerald-600' };
      default: return { text: '圍籬', class: 'bg-blue-100 text-blue-600' };
    }
  };

  const totalKm = results.reduce((acc, curr) => acc + (curr || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in flex flex-col gap-6 pb-24" ref={dropdownRef}>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-indigo-600 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <NavigationIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">極速路徑估算 (本地引擎)</h1>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                點選建議案件即刻完成計算
            </p>
          </div>
        </div>

        <div className="space-y-0 relative">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white z-10 shadow-lg border-4 border-white">
                <HomeIcon className="w-5 h-5" />
              </div>
              <div className="w-0.5 h-14 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
            </div>
            <div className="flex-1 pt-1.5">
              <div className="text-[10px] font-black text-indigo-500 uppercase mb-1 tracking-widest opacity-60">START</div>
              <div className="text-sm font-black text-slate-800">{START_ADDRESS}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">(合家興總部)</div>
            </div>
          </div>

          {destinations.map((dest, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-4 ml-[19px] -my-2 relative h-16">
                <div className="w-0.5 h-full bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                
                {results[idx] !== null && (
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2.5 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm animate-scale-in z-20">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                      <NavigationIcon className="w-3.5 h-3.5" />
                      <span className="text-sm font-mono">{results[idx]?.toFixed(1)} <span className="text-[10px] font-bold opacity-60">km</span></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white z-10 shadow-lg border-4 border-white transition-all duration-300 ${results[idx] !== null ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  {idx < destinations.length - 1 && (
                    <div className="w-0.5 h-14 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                  )}
                </div>
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STOP {idx + 1}</div>
                        {projectLabels[idx] && (
                            <div className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 animate-fade-in">
                                <BriefcaseIcon className="w-2.5 h-2.5" /> {projectLabels[idx]}
                            </div>
                        )}
                    </div>
                    {destinations.length > 1 && (
                      <button onClick={() => handleRemoveDestination(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <div className="relative">
                      <input 
                        value={dest}
                        onFocus={() => setActiveIdx(idx)}
                        onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateDestination(idx, val);
                        }}
                        placeholder="選取案件或手動輸入地址"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                        <SearchIcon className="w-4 h-4" />
                      </div>
                    </div>

                    {/* 自訂搜尋選單 */}
                    {activeIdx === idx && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] max-h-[320px] overflow-y-auto no-scrollbar animate-scale-in">
                        {projects
                          .filter(p => 
                            p.name.toLowerCase().includes(dest.toLowerCase()) || 
                            p.address.toLowerCase().includes(dest.toLowerCase())
                          )
                          .map(p => {
                            const typeTag = getProjectTypeLabel(p.type);
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  handleUpdateDestination(idx, p.address, p.name);
                                  setActiveIdx(null);
                                }}
                                className="w-full text-left px-5 py-4 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-none flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-base font-black text-slate-800 leading-tight truncate">
                                    {p.name}
                                  </div>
                                  <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${typeTag.class}`}>
                                    {typeTag.text}
                                  </span>
                                </div>
                                <div className="text-[11px] font-bold text-slate-400 truncate">
                                  {p.address}
                                </div>
                              </button>
                            );
                          })
                        }
                        {projects.filter(p => p.name.toLowerCase().includes(dest.toLowerCase()) || p.address.toLowerCase().includes(dest.toLowerCase())).length === 0 && (
                          <div className="px-5 py-8 text-center text-slate-400 text-xs font-bold italic">
                            找不到匹配的案件，您可以繼續手動輸入
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-100">
           <button 
             onClick={handleAddDestination}
             className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 font-black text-xs hover:bg-indigo-50 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
           >
             <PlusIcon className="w-4 h-4" /> 新增路段
           </button>
           
           <div className="flex items-center gap-4 bg-slate-900 px-8 py-5 rounded-[32px] shadow-2xl relative overflow-hidden group">
              <div className="flex flex-col relative z-10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Distance</span>
                <span className="text-3xl font-black text-white leading-none tracking-tight">{totalKm.toFixed(1)} <span className="text-sm font-bold text-indigo-400">km</span></span>
              </div>
              <div className="w-px h-10 bg-white/10 mx-2 relative z-10"></div>
              <div className="flex flex-col relative z-10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Drive Time</span>
                <span className="text-3xl font-black text-emerald-400 leading-none tracking-tight">
                  {Math.round(totalKm * 1.8)} <span className="text-sm font-bold opacity-60 text-emerald-500/70">min</span>
                </span>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex items-start gap-4 shadow-sm border-l-4 border-l-indigo-500">
        <div className="bg-indigo-500 p-2 rounded-xl text-white shadow-md flex-shrink-0">
            <SparklesIcon className="w-5 h-5" />
        </div>
        <div className="text-xs text-indigo-900 leading-relaxed font-bold">
          <p className="mb-1 uppercase tracking-widest text-[9px] opacity-60">Geometric Optimization</p>
          選單已優化：顯示案件名稱、類別與地址。點選建議項目可自動帶入座標進行秒級估算。
        </div>
      </div>
    </div>
  );
};

export default DrivingTimeEstimator;
