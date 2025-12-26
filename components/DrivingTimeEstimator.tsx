
import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectType } from '../types';
import { MapPinIcon, NavigationIcon, PlusIcon, TrashIcon, LoaderIcon, HomeIcon, AlertIcon, CheckCircleIcon, SparklesIcon, BriefcaseIcon } from './Icons';
import { GoogleGenAI } from "@google/genai";

interface DrivingTimeEstimatorProps {
  projects: Project[];
}

const START_ADDRESS = "桃園市龜山區文化三路620巷80弄118-1號";
const START_LABEL = "合家興總部";

const DrivingTimeEstimator: React.FC<DrivingTimeEstimatorProps> = ({ projects }) => {
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [projectLabels, setProjectLabels] = useState<string[]>(['']);
  const [results, setResults] = useState<(number | null)[]>([null]);
  const [normalizedAddrs, setNormalizedAddrs] = useState<string[]>(['']);
  const [isEstimating, setIsEstimating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自動觸發監控
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const hasPending = destinations.some((d, idx) => d.trim().length > 2 && results[idx] === null);

    if (hasPending) {
      const lastInput = destinations[destinations.length - 1];
      const isLikelySelected = lastInput.length > 10 || projectLabels.some(l => l !== '');
      const delay = isLikelySelected ? 100 : 1200;

      debounceTimerRef.current = setTimeout(() => {
        runParallelEstimation();
      }, delay);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [destinations, results, projectLabels]);

  const runParallelEstimation = async () => {
    // 首先檢查全域 API_KEY
    if (!process.env.API_KEY) {
        // Fix: Use any cast for window to avoid declaration conflicts with pre-defined AIStudio type.
        const aistudio = (window as any).aistudio;
        if (aistudio) {
            setLoadingStatus('等待 AI 引擎授權...');
            await aistudio.openSelectKey();
        } else {
            alert('系統偵測不到有效 AI 憑證，請聯絡開發人員。');
            return;
        }
    }

    const pendingIndices = destinations
      .map((d, idx) => ({ val: d.trim(), idx }))
      .filter(item => item.val.length > 2 && results[item.idx] === null)
      .map(item => item.idx);

    if (pendingIndices.length === 0) return;

    setIsEstimating(true);
    setLoadingStatus('AI 並行計算中...');

    try {
      // 規範：每次調用前創建新實例以確保取得最新金鑰
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const estimationPromises = pendingIndices.map(async (idx) => {
        const origin = idx === 0 ? START_ADDRESS : destinations[idx - 1];
        const target = destinations[idx];

        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `[快速模式] 預估從「${origin}」到「${target}」的行車里程。
            
            規則：
            1. 優先精確地址。
            2. 若地圖工具回應慢，請直接根據行政區位置給予模糊估計。
            3. 回報格式僅需：
               地址：[標準化地址]
               里程：[數字] km`,
            config: {
              tools: [{ googleMaps: {} }]
            }
          });

          const text = response.text || "";
          const addrMatch = text.match(/地址：\s*(.+)/);
          const distMatch = text.match(/里程：\s*([\d.]+)/);
          
          const displayAddr = addrMatch ? addrMatch[1].trim().replace(/\*/g, '') : target;
          let distance = distMatch ? parseFloat(distMatch[1]) : 0;

          if (distance === 0) {
            const backupDist = text.match(/(\d+(\.\d+)?)\s*km/i);
            distance = backupDist ? parseFloat(backupDist[1]) : 0;
          }

          return { idx, distance, displayAddr, success: true };
        } catch (e: any) {
          console.error(`Index ${idx} calculation error:`, e);
          
          // 針對「Requested entity was not found」進行處理
          const aistudio = (window as any).aistudio;
          if (e.message?.includes("Requested entity was not found") && aistudio) {
              await aistudio.openSelectKey();
          }
          
          return { idx, distance: 0, displayAddr: target, success: false };
        }
      });

      const allResults = await Promise.all(estimationPromises);

      const nextResults = [...results];
      const nextNormalized = [...normalizedAddrs];

      allResults.forEach(res => {
        nextResults[res.idx] = res.distance;
        nextNormalized[res.idx] = res.displayAddr;
      });

      setResults(nextResults);
      setNormalizedAddrs(nextNormalized);
    } catch (error: any) {
      console.error("Parallel estimation failed", error);
      const aistudio = (window as any).aistudio;
      if (error.message?.includes("Requested entity was not found") && aistudio) {
          await aistudio.openSelectKey();
      }
    } finally {
      setIsEstimating(false);
      setLoadingStatus('');
    }
  };

  const handleAddDestination = () => {
    setDestinations([...destinations, '']);
    setProjectLabels([...projectLabels, '']);
    setResults([...results, null]);
    setNormalizedAddrs([...normalizedAddrs, '']);
  };

  const handleRemoveDestination = (index: number) => {
    if (destinations.length <= 1) return;
    setDestinations(destinations.filter((_, i) => i !== index));
    setProjectLabels(projectLabels.filter((_, i) => i !== index));
    setResults(results.filter((_, i) => i !== index));
    setNormalizedAddrs(normalizedAddrs.filter((_, i) => i !== index));
  };

  const handleUpdateDestination = (index: number, value: string, label?: string) => {
    const newDests = [...destinations];
    newDests[index] = value;
    setDestinations(newDests);

    const newLabels = [...projectLabels];
    newLabels[index] = label || '';
    setProjectLabels(newLabels);

    const newRes = [...results];
    newRes[index] = null;
    setResults(newRes);
  };

  const getProjectDisplayTag = (type: ProjectType) => {
    switch (type) {
      case ProjectType.MAINTENANCE: return '維修';
      case ProjectType.MODULAR_HOUSE: return '組合屋';
      default: return '圍籬';
    }
  };

  const totalKm = results.reduce((acc, curr) => acc + (curr || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in flex flex-col gap-6 pb-24">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-indigo-600 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <NavigationIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-slate-800 tracking-tight">智慧路徑快速估算</h1>
                {isEstimating && <div className="flex items-center gap-1.5 text-indigo-600 text-[10px] font-black animate-pulse bg-indigo-50 px-2 py-1 rounded-full"><LoaderIcon className="w-3 h-3 animate-spin" /> 並列計算中</div>}
            </div>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                選單選取即刻計算，支援多點同步回報
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
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">({START_LABEL})</div>
            </div>
          </div>

          {destinations.map((dest, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-4 ml-[19px] -my-2 relative h-16">
                <div className="w-0.5 h-full bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                
                {results[idx] !== null ? (
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2.5 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm animate-scale-in z-20">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                      <NavigationIcon className="w-3.5 h-3.5" />
                      <span className="text-sm font-mono">{results[idx]?.toFixed(1)} <span className="text-[10px] font-bold opacity-60">km</span></span>
                    </div>
                    {normalizedAddrs[idx] && (
                        <>
                            <div className="w-px h-3 bg-emerald-200"></div>
                            <div className="text-[10px] font-black text-emerald-600 truncate max-w-[150px]">{normalizedAddrs[idx]}</div>
                        </>
                    )}
                  </div>
                ) : (dest.trim().length > 2) ? (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-pulse z-20">
                        <LoaderIcon className="w-3 h-3 animate-spin" />
                        正在極速規劃中...
                    </div>
                ) : null}
              </div>

              <div className="flex items-start gap-4">
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
                  <div className="flex flex-col gap-2">
                    <div className="relative group">
                      <input 
                        list={`projects-list-${idx}`}
                        value={dest}
                        onChange={(e) => handleUpdateDestination(idx, e.target.value)}
                        placeholder="選取案件或手動輸入"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700"
                      />
                      <datalist id={`projects-list-${idx}`}>
                        {projects.map(p => (
                          <option key={p.id} value={p.address}>{p.name}</option>
                        ))}
                      </datalist>
                    </div>
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
                  {Math.round(totalKm * 1.6)} <span className="text-sm font-bold opacity-60 text-emerald-500/70">min</span>
                </span>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4 shadow-sm border-l-4 border-l-amber-500">
        <div className="bg-amber-500 p-2 rounded-xl text-white shadow-md flex-shrink-0">
            <AlertIcon className="w-5 h-5" />
        </div>
        <div className="text-xs text-amber-900 leading-relaxed font-bold">
          <p className="mb-1 uppercase tracking-widest text-[9px] opacity-60">Speed Optimized</p>
          此模式已啟用「並行計算」與「快速估算」技術。若計算失效，請點擊側邊欄「啟動 AI 智慧功能」連結您的 Google Cloud 專案。
        </div>
      </div>
    </div>
  );
};

export default DrivingTimeEstimator;
