
import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectType } from '../types';
import { MapPinIcon, NavigationIcon, PlusIcon, TrashIcon, LoaderIcon, HomeIcon, AlertIcon, CheckCircleIcon, SparklesIcon, BriefcaseIcon } from './Icons';
import { GoogleGenAI } from "@google/genai";

interface DrivingTimeEstimatorProps {
  projects: Project[];
}

const START_ADDRESS = "桃園市龜山區文化三路620巷80弄118-1號";
const START_LABEL = "合家興";

const DrivingTimeEstimator: React.FC<DrivingTimeEstimatorProps> = ({ projects }) => {
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [projectLabels, setProjectLabels] = useState<string[]>(['']);
  const [results, setResults] = useState<(number | null)[]>([null]);
  const [normalizedAddrs, setNormalizedAddrs] = useState<string[]>(['']);
  const [isEstimating, setIsEstimating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 檢查是否有任何有效的目的地需要計算
    const needsCalculation = destinations.some((d, idx) => d.trim().length > 2 && results[idx] === null);

    if (needsCalculation) {
      debounceTimerRef.current = setTimeout(() => {
        estimateTime();
      }, 1500); 
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [destinations, results]);

  const estimateTime = async () => {
    const validIndices = destinations
      .map((d, idx) => ({ val: d.trim(), idx }))
      .filter(item => item.val.length > 2 && results[item.idx] === null);

    if (validIndices.length === 0) return;

    setIsEstimating(true);
    setLoadingStatus('正在透過 AI 規劃路徑...');

    try {
      // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const newResults = [...results];
      const newNormalized = [...normalizedAddrs];

      let currentOrigin = START_ADDRESS;

      for (let i = 0; i < destinations.length; i++) {
        // 如果該索引已有結果，直接作為下一段的起點
        if (results[i] !== null && normalizedAddrs[i]) {
            currentOrigin = normalizedAddrs[i];
            continue;
        }

        const target = destinations[i].trim();
        if (target.length <= 2) continue;

        setLoadingStatus(`正在分析路段 ${i + 1}：${target}...`);

        try {
            const response = await ai.models.generateContent({
              // Guideline: Maps grounding is only supported in Gemini 2.5 series models.
              model: "gemini-2.5-flash",
              contents: `你是一個專業的地理導航助理。請為我執行以下任務：
              1. 使用 Google Maps 找到「${target}」的最精確且可供導航搜尋的完整地址。
              2. 計算從「${currentOrigin}」開車到該地點的首選行車距離（公里）。
              
              回報格式請嚴格遵守：
              地址：[標準完整地址名稱]
              距離：[僅數字] km
              
              備註：若地圖無法取得精確里程，請根據地點經緯度進行直線距離加權估計（乘以 1.3 倍）。`,
              config: {
                tools: [{ googleMaps: {} }]
              }
            });

            // Guideline: Access the .text property directly (do not call as a function).
            const text = response.text || "";
            const addrMatch = text.match(/地址：\s*(.+)/);
            const displayAddr = addrMatch ? addrMatch[1].trim() : target;
            
            const distMatch = text.match(/距離：\s*([\d.]+)/);
            let distance = distMatch ? parseFloat(distMatch[1]) : 0;

            if (distance === 0) {
                const anyNum = text.match(/(\d+(\.\d+)?)\s*km/i);
                distance = anyNum ? parseFloat(anyNum[1]) : 0;
            }

            newNormalized[i] = displayAddr;
            newResults[i] = distance;
            currentOrigin = displayAddr; 
        } catch (innerError) {
            console.error(`Error calculating index ${i}:`, innerError);
            newResults[i] = 0; 
            newNormalized[i] = target;
        }
      }

      setResults(newResults);
      setNormalizedAddrs(newNormalized);
    } catch (error: any) {
      console.error("Main estimation failed:", error);
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in flex flex-col gap-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-600 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <NavigationIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">智慧路徑自動估算</h1>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                填入或選取後 AI 將自動分析地址並顯示里程
            </p>
          </div>
        </div>

        <div className="space-y-0 relative">
          {/* 起點 */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white z-10 shadow-lg border-4 border-white">
                <HomeIcon className="w-5 h-5" />
              </div>
              <div className="w-0.5 h-14 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
            </div>
            <div className="flex-1 pt-1.5">
              <div className="text-[10px] font-black text-indigo-500 uppercase mb-1 tracking-widest opacity-60">STARTING POINT</div>
              <div className="text-sm font-black text-slate-800">{START_ADDRESS}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">({START_LABEL})</div>
            </div>
          </div>

          {/* 目的地清單 */}
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
                    <div className="w-px h-3 bg-emerald-200"></div>
                    <div className="text-[10px] font-black text-emerald-600 truncate max-w-[100px]">{normalizedAddrs[idx]}</div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white z-10 shadow-lg border-4 border-white ${results[idx] !== null ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  {idx < destinations.length - 1 && (
                    <div className="w-0.5 h-14 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                  )}
                </div>
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">DESTINATION {idx + 1}</div>
                    {destinations.length > 1 && (
                      <button onClick={() => handleRemoveDestination(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="relative group">
                      <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        list={`projects-list-${idx}`}
                        value={dest}
                        onChange={(e) => handleUpdateDestination(idx, e.target.value)}
                        placeholder="輸入地址或選擇案件..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                      <datalist id={`projects-list-${idx}`}>
                        {projects.map(p => (
                          <option key={p.id} value={p.address}>{p.name} ({getProjectDisplayTag(p.type)})</option>
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
             className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
           >
             <PlusIcon className="w-4 h-4" /> 追加中繼站
           </button>
           
           <div className="flex items-center gap-4 bg-slate-900 px-6 py-4 rounded-3xl shadow-xl shadow-slate-900/20">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Distance</span>
                <span className="text-2xl font-black text-white leading-tight">{totalKm.toFixed(1)} <span className="text-sm font-bold opacity-60">km</span></span>
              </div>
              <div className="w-px h-8 bg-white/10 mx-2"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Travel Time</span>
                <span className="text-2xl font-black text-indigo-400 leading-tight">
                  {Math.round(totalKm * 1.5)} <span className="text-sm font-bold opacity-60">mins</span>
                </span>
              </div>
           </div>
        </div>
      </div>

      {isEstimating && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 z-[100] animate-fade-in">
           <LoaderIcon className="w-5 h-5 animate-spin text-indigo-400" />
           <span className="text-sm font-bold tracking-wide">{loadingStatus}</span>
        </div>
      )}
    </div>
  );
};

export default DrivingTimeEstimator;
