
import React, { useState, useEffect } from 'react';
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
  const [projectLabels, setProjectLabels] = useState<string[]>(['']); // 新增：儲存選取的案件名稱
  const [results, setResults] = useState<number[]>([]);
  const [normalizedAddrs, setNormalizedAddrs] = useState<string[]>([]);
  const [isEstimating, setIsEstimating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // 當目的地列表變動且內容完整時，自動觸發計算
  useEffect(() => {
    const lastDest = destinations[destinations.length - 1];
    if (lastDest && lastDest.trim().length > 3 && results.length < destinations.length) {
      const timer = setTimeout(() => {
        estimateTime();
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [destinations]);

  const estimateTime = async () => {
    const validDests = destinations.filter(d => d.trim() !== '');
    if (validDests.length === 0) return;

    setIsEstimating(true);
    setLoadingStatus('正在透過 AI 搜尋最佳路徑...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const newResults: number[] = [];
      const newNormalized: string[] = [];

      let currentOrigin = START_ADDRESS;

      for (let i = 0; i < validDests.length; i++) {
        const target = validDests[i];
        setLoadingStatus(`正在分析路段 ${i + 1}：${target}...`);

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `你是一個地理導航助理。請為我執行以下任務：
          1. 使用 Google Maps 找到 "${target}" 的最精確地址。
          2. 計算從 "${currentOrigin}" 到該地點的首選行車距離（公里）。
          
          回報格式請嚴格遵守：
          地址：[標準地址名稱]
          距離：[僅數字] km
          
          若無法取得精確行車里程，請根據地圖經緯度給出一個最粗略的直線距離估計（加成 1.3 倍）。`,
          config: {
            tools: [{ googleMaps: {} }]
          }
        });

        const text = response.text || "";
        
        const addrMatch = text.match(/地址：(.+)/);
        const displayAddr = addrMatch ? addrMatch[1].trim() : target;
        newNormalized.push(displayAddr);

        const distMatch = text.match(/距離：\s*([\d.]+)/);
        let distance = distMatch ? parseFloat(distMatch[1]) : 0;

        if (distance === 0) {
            const anyNum = text.match(/(\d+(\.\d+)?)\s*km/i);
            distance = anyNum ? parseFloat(anyNum[1]) : 0;
        }

        newResults.push(distance);
        currentOrigin = displayAddr;
      }

      setResults(newResults);
      setNormalizedAddrs(newNormalized);
    } catch (error: any) {
      console.error("Estimation failed:", error);
      alert("計算失敗，請稍後再試或檢查地址。");
    } finally {
      setIsEstimating(false);
      setLoadingStatus('');
    }
  };

  const handleAddDestination = () => {
    setDestinations([...destinations, '']);
    setProjectLabels([...projectLabels, '']);
  };

  const handleRemoveDestination = (index: number) => {
    const newDests = destinations.filter((_, i) => i !== index);
    const newLabels = projectLabels.filter((_, i) => i !== index);
    setDestinations(newDests);
    setProjectLabels(newLabels);
    setResults([]);
    setNormalizedAddrs([]);
  };

  const handleUpdateDestination = (index: number, value: string, label?: string) => {
    const newDests = [...destinations];
    newDests[index] = value;
    setDestinations(newDests);

    const newLabels = [...projectLabels];
    newLabels[index] = label || '';
    setProjectLabels(newLabels);
  };

  const getProjectDisplayTag = (type: ProjectType) => {
    switch (type) {
      case ProjectType.MAINTENANCE: return '維修';
      case ProjectType.MODULAR_HOUSE: return '組合屋';
      default: return '圍籬';
    }
  };

  const totalKm = results.reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in flex flex-col gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg">
            <NavigationIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">智慧里程估算</h1>
            <p className="text-xs text-slate-500 font-medium">代入 Google Map 並由 AI 分析不明確地址</p>
          </div>
        </div>

        <div className="space-y-0 relative">
          {/* 起點 */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white z-10 shadow-md">
                <HomeIcon className="w-5 h-5" />
              </div>
              <div className="w-0.5 h-16 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
            </div>
            <div className="flex-1 pt-1.5">
              <div className="text-[10px] font-black text-indigo-500 uppercase mb-1">起始點 ({START_LABEL})</div>
              <div className="text-sm font-bold text-slate-800">{START_ADDRESS}</div>
            </div>
          </div>

          {/* 目的地 */}
          {destinations.map((dest, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-4 ml-[17px] -my-2 relative h-16">
                <div className="w-0.5 h-full bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                {results[idx] !== undefined && results[idx] > 0 && (
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm animate-scale-in z-20">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                      <NavigationIcon className="w-4 h-4" />
                      <span className="text-sm">{results[idx].toFixed(1)} <span className="text-[10px] font-normal opacity-70">km</span></span>
                    </div>
                  </div>
                )}
                {isEstimating && results[idx] === undefined && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 animate-pulse">
                        <LoaderIcon className="w-3 h-3 animate-spin" />
                        AI 分析中...
                    </div>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center text-blue-600 z-10 shadow-sm">
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  {idx < destinations.length - 1 && (
                    <div className="w-0.5 h-16 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                  )}
                </div>
                <div className="flex-1 space-y-2 pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">目的地 {idx + 1}</div>
                        {projectLabels[idx] && (
                            <div className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 animate-fade-in">
                                <BriefcaseIcon className="w-2.5 h-2.5" />
                                {projectLabels[idx]}
                            </div>
                        )}
                    </div>
                    {destinations.length > 1 && (
                      <button onClick={() => handleRemoveDestination(idx)} className="text-slate-300 hover:text-red-500 p-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <input 
                      type="text" 
                      placeholder="輸入地址或點選下方案件"
                      value={dest}
                      onChange={(e) => handleUpdateDestination(idx, e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    />
                    
                    {normalizedAddrs[idx] && normalizedAddrs[idx] !== dest && (
                       <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg text-[10px] text-indigo-600 font-bold border border-indigo-100 animate-fade-in">
                          <SparklesIcon className="w-3 h-3" />
                          AI 解析地址：{normalizedAddrs[idx]}
                       </div>
                    )}

                    <select 
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none text-slate-500 hover:border-indigo-400 transition-colors"
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const p = projects.find(p => p.id === selectedId);
                        if (p) {
                            handleUpdateDestination(idx, p.address, p.name);
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">快速代入現有案件地址...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          [{getProjectDisplayTag(p.type)}] {p.name} ({p.address.substring(0, 3)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}

          <button 
            onClick={handleAddDestination}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-xs pl-12 pt-4 transition-colors group"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <PlusIcon className="w-4 h-4" />
            </div>
            新增中途點
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="w-full md:w-auto flex flex-col gap-2">
             <button 
                onClick={estimateTime}
                disabled={isEstimating}
                className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isEstimating ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5 text-emerald-400" />}
                {isEstimating ? 'AI 計算中...' : '重新估算里程'}
              </button>
              {loadingStatus && <p className="text-[10px] text-indigo-500 font-bold text-center md:text-left animate-pulse">{loadingStatus}</p>}
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-6 bg-slate-900 px-8 py-5 rounded-3xl shadow-2xl animate-fade-in text-white relative overflow-hidden min-w-[240px]">
               <div className="relative z-10">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">總預估總里程</div>
                  <div className="text-4xl font-black flex items-baseline gap-2">
                    <span className="text-emerald-400">{totalKm.toFixed(1)}<span className="text-sm font-normal opacity-60 ml-2">km</span></span>
                  </div>
               </div>
               <div className="bg-white/10 p-3 rounded-2xl">
                 <NavigationIcon className="w-8 h-8 text-white" />
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
        <div className="bg-amber-600 p-1.5 rounded-lg text-white">
            <AlertIcon className="w-5 h-5" />
        </div>
        <div className="text-xs text-amber-800 leading-relaxed font-medium">
          <strong>智慧運算說明：</strong> 本工具結合 Google Maps 實時數據與 AI 地址校正。當您輸入的地址不夠精確時，AI 會自動嘗試分析出最可能的標準地址。若地圖無法計算行車路線（如跨海或無路徑），則會自動以直線距離加權進行「粗略估計」。
        </div>
      </div>
    </div>
  );
};

export default DrivingTimeEstimator;
