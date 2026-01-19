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
 * 將文字翻譯為中越文對照格式
 */
export const translateProjectContent = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `請將下方的建築專案資訊翻譯成「中越文對照」格式。保留原本的中文內容，並在每一段或每一列後方加上對應的越南文翻譯。請勿添加任何解釋性文字或開場白。內容如下：\n\n${text}`,
      config: {
        systemInstruction: "你是一位專業的建築工程翻譯人員。你的任務是將工程描述與備註轉換為中越雙語對照格式，確保專有名詞翻譯準確。",
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Error translating content:", error);
    return text;
  }
};
