
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
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自動觸發監控：當目的地列表或結果狀態變動時
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 判斷是否有需要計算的項目：地址長度 > 2 且 尚未有結果
    const hasPending = destinations.some((d, idx) => d.trim().length > 2 && results[idx] === null);

    if (hasPending) {
      debounceTimerRef.current = setTimeout(() => {
        runAutoEstimation();
      }, 1200); // 1.2秒防抖，讓輸入更流暢
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [destinations, results]);

  const runAutoEstimation = async () => {
    // 檢查 API Key 是否存在 (針對 GitHub Pages 部署環境)
    if (!process.env.API_KEY) {
      setLoadingStatus('錯誤：找不到 API Key，請檢查部署環境變數。');
      return;
    }

    setIsEstimating(true);
    setErrorIndex(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const newResults = [...results];
      const newNormalized = [...normalizedAddrs];

      let currentOrigin = START_ADDRESS;

      for (let i = 0; i < destinations.length; i++) {
        const target = destinations[i].trim();
        
        // 如果該索引已有結果，直接作為下一段的起點
        if (newResults[i] !== null && newNormalized[i]) {
          currentOrigin = newNormalized[i];
          continue;
        }

        // 跳過無效輸入
        if (target.length <= 2) continue;

        setLoadingStatus(`AI 正在分析路段 ${i + 1}：${target.substring(0, 10)}...`);

        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `你是一個專業的物流路徑規劃專家。
            
            當前任務：
            1. 分析目的地描述：「${target}」。
            2. 如果地址不完整（例如只有建案名、簡簡稱），請使用 Google Maps 工具進行聯想分析，找出該地點「最可能、絕對精確且可供導航搜尋」的完整標準地址。
            3. 計算從「${currentOrigin}」開車到該「修正後地址」的最佳預估里程。
            
            回報格式（嚴格遵守，不要廢話）：
            標準地址：[完整地址內容]
            預估里程：[僅數字] km
            
            注意：里程必須是數字。如果無法取得路徑，請根據經緯度直線距離乘以 1.3 作為替代。`,
            config: {
              tools: [{ googleMaps: {} }]
            }
          });

          const text = response.text || "";
          
          // 強大的解析邏輯，處理各種 AI 可能回傳的格式
          const addrMatch = text.match(/標準地址：\s*(.+)/);
          const distMatch = text.match(/預估里程：\s*([\d.]+)/);
          
          const displayAddr = addrMatch ? addrMatch[1].trim().replace(/\*/g, '') : target;
          let distance = distMatch ? parseFloat(distMatch[1]) : 0;

          // 備援解析：如果固定格式失敗，嘗試搜尋帶有 km 的數字
          if (distance === 0) {
            const backupDist = text.match(/(\d+(\.\d+)?)\s*km/i);
            distance = backupDist ? parseFloat(backupDist[1]) : 0;
          }

          newNormalized[i] = displayAddr;
          newResults[i] = distance;
          currentOrigin = displayAddr; // 更新下一段的起點
          
          // 即時更新進度
          setNormalizedAddrs([...newNormalized]);
          setResults([...newResults]);
        } catch (innerError) {
          console.error(`Row ${i} failed:`, innerError);
          setErrorIndex(i);
          newResults[i] = 0; // 標記失敗
          break; // 停止後續計算，避免路徑斷裂
        }
      }
    } catch (error: any) {
      console.error("Estimation Global Error:", error);
      setLoadingStatus('計算失敗，請檢查網路或地址。');
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
    const filterFn = (_: any, i: number) => i !== index;
    setDestinations(destinations.filter(filterFn));
    setProjectLabels(projectLabels.filter(filterFn));
    setResults(results.filter(filterFn));
    setNormalizedAddrs(normalizedAddrs.filter(filterFn));
  };

  const handleUpdateDestination = (index: number, value: string, label?: string) => {
    const newDests = [...destinations];
    newDests[index] = value;
    setDestinations(newDests);

    const newLabels = [...projectLabels];
    newLabels[index] = label || '';
    setProjectLabels(newLabels);

    // 重置該索引及其後的所有結果，因為路徑是連動的
    const newRes = [...results];
    for (let i = index; i < newRes.length; i++) {
        newRes[i] = null;
    }
    setResults(newRes);
    setErrorIndex(null);
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
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">智慧路徑自動估算</h1>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                填入後 AI 會自動聯想精確地址並同步里程
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
                        AI 正在計算里程...
                    </div>
                ) : null}

                {errorIndex === idx && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 z-20">
                        <AlertIcon className="w-3 h-3" />
                        地址無法辨識或超出範圍
                    </div>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white z-10 shadow-lg border-4 border-white transition-colors duration-500 ${results[idx] !== null && results[idx]! > 0 ? 'bg-emerald-500' : 'bg-indigo-400'}`}>
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  {idx < destinations.length - 1 && (
                    <div className="w-0.5 h-14 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                  )}
                </div>
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">DESTINATION {idx + 1}</div>
                        {projectLabels[idx] && (
                            <div className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 animate-fade-in shadow-sm">
                                <BriefcaseIcon className="w-2.5 h-2.5" />
                                {projectLabels[idx]}
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
                        placeholder="手動輸入或從選單選取專案"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700"
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
             className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 font-black text-xs hover:bg-indigo-50 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
           >
             <PlusIcon className="w-4 h-4" /> ADD STOP
           </button>
           
           <div className="flex items-center gap-4 bg-slate-900 px-8 py-5 rounded-[32px] shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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

      {isEstimating && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 z-[100] animate-fade-in border border-white/10">
           <LoaderIcon className="w-6 h-6 animate-spin text-indigo-400" />
           <span className="text-sm font-black tracking-widest uppercase">{loadingStatus}</span>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4 shadow-sm border-l-4 border-l-amber-500">
        <div className="bg-amber-500 p-2 rounded-xl text-white shadow-md flex-shrink-0">
            <AlertIcon className="w-5 h-5" />
        </div>
        <div className="text-xs text-amber-900 leading-relaxed font-bold">
          <p className="mb-1 uppercase tracking-widest text-[9px] opacity-60">System Notice</p>
          本工具透過 Gemini AI 自動校正地址。若輸入的地點過於模糊，AI 會嘗試搜尋 Google Maps 數據庫聯想最可能的實體地址。估算里程已包含 1.3 倍的行車誤差校正，僅供排程參考。
        </div>
      </div>
    </div>
  );
};

export default DrivingTimeEstimator;
