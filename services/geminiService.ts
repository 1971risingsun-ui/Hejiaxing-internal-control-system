import { GoogleGenAI } from "@google/genai";

export const analyzeConstructionPhoto = async (base64Image: string): Promise<string> => {
  // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Fix: Extract pure base64 data and mimeType from Data URL if present.
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const mimeType = base64Image.includes(';') ? base64Image.split(';')[0].split(':')[1] : 'image/jpeg';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Analyze this construction site photo. Identify the current stage of construction, list any visible materials, and highlight potential safety hazards if any. Be concise."
          }
        ]
      }
    });

    return response.text || "無法分析圖片";
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return "分析失敗，請稍後再試。";
  }
};

/**
 * 將文字翻譯為中越文對照格式 (Bilingual Side-by-Side)
 */
export const translateProjectContent = async (text: string): Promise<string> => {
  // 增加安全性檢查，避免傳入非字串或空值時報錯
  if (typeof text !== 'string' || !text || text.trim().length === 0) return "";
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位專業的建築工程翻譯人員。請將下方的中文內容翻譯成「中越文對照」格式。
規則：
1. 保留原始中文內容。
2. 在每一段或每一句中文下方，緊接著提供對應的越南文翻譯。
3. 保持條列式格式（若原文有條列）。
4. 請勿輸出任何開場白、結束語或解釋文字。
5. 若內容已經包含越南文，請優化並保持對照格式。

待翻譯內容：
${text}`,
      config: {
        systemInstruction: "你專精於建築工程術語的中越對照翻譯，任務是產出清晰、專業的雙語對照文檔。",
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Error translating content:", error);
    return text;
  }
};
