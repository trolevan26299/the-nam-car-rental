import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ContractField } from "../types";

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractIdentityData = async (frontImage: File, backImage: File, fields: ContractField[]): Promise<Record<string, any>> => {
  try {
    // 1. Lấy API Key từ process.env.API_KEY theo Coding Guidelines
    if (!process.env.API_KEY) {
        throw new Error("Chưa cấu hình API_KEY trong biến môi trường (.env).");
    }

    // 2. Khởi tạo Gemini Instance TẠI ĐÂY (Lazy Init)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const frontPart = await fileToGenerativePart(frontImage);
    const backPart = await fileToGenerativePart(backImage);

    // 3. Lọc ra các trường cần AI xử lý
    const aiFields = fields.filter(f => f.source === 'ai');
    
    if (aiFields.length === 0) {
        return {}; // Không có trường nào cần AI
    }

    // 4. Xây dựng Schema động cho Gemini
    const properties: Record<string, Schema> = {};
    const requiredFields: string[] = [];

    aiFields.forEach(field => {
        properties[field.key] = {
            type: Type.STRING,
            description: field.aiDescription || field.label
        };
        if (field.required) {
            requiredFields.push(field.key);
        }
    });

    const prompt = `
    Hãy trích xuất thông tin từ 2 ảnh Căn cước công dân (CCCD) Việt Nam này.
    
    QUY TẮC QUAN TRỌNG VỀ NGÀY THÁNG:
    - Tất cả các trường ngày tháng (ngày sinh, ngày cấp, ngày hết hạn) BẮT BUỘC phải trích xuất và trả về theo định dạng Việt Nam: DD/MM/YYYY (Ví dụ: 20/10/1990).
    - KHÔNG được tự động chuyển đổi sang định dạng ISO (YYYY-MM-DD).
    - Nếu không tìm thấy ngày tháng năm, hãy để trống.

    Chỉ trích xuất các trường được yêu cầu trong JSON schema.
    `;

    // 5. Gọi Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [frontPart, backPart, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: properties,
          required: requiredFields,
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("Không nhận được dữ liệu từ AI");
    }
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};