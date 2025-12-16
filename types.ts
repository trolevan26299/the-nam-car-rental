
export interface ExtractedIdentityData {
  [key: string]: string | number; // Cho phép key động
}

export type FieldSource = 'ai' | 'user' | 'system';
export type FieldGroup = 'customer' | 'car' | 'contract';
export type InputType = 'text' | 'date' | 'number' | 'currency';

export interface ContractField {
  id: string;          // Unique ID (VD: f1)
  key: string;         // Key dùng trong code/AI (VD: ho_ten)
  label: string;       // Label hiển thị (VD: Họ và tên)
  placeholder: string; // Biến trong Word (VD: {{HO_TEN}})
  source: FieldSource; // Nguồn dữ liệu
  group: FieldGroup;   // Nhóm hiển thị
  inputType: InputType;
  aiDescription?: string; // Mô tả cho AI hiểu nếu là source='ai' (VD: "Full name on ID card")
  required?: boolean;
}

export interface ContractData {
  [key: string]: any; // Dữ liệu động hoàn toàn
}

export interface FileWithPreview extends File {
  preview?: string;
}

export interface CarConfig {
  id: string;
  name: string;     
  plate: string;    
  color: string;    
  price: number;    
}

export interface CustomerRecord {
  name: string;       // Họ và tên
  cccd: string;       // Số CCCD
  dob?: string;       // Ngày sinh
  gender?: string;    // Giới tính
  nationality?: string; // Quốc tịch
  hometown?: string;  // Quê quán
  address?: string;   // Nơi thường trú
  issueDate?: string; // Ngày cấp
  expiryDate?: string;// Có giá trị đến
  frontUrl: string;   // Ảnh mặt trước
  backUrl: string;    // Ảnh mặt sau
}

export interface GoogleConfig {
  apiKey?: string;       // Gemini API Key
  clientId: string;
  clientSecret?: string; // Google Client Secret
  refreshToken?: string; // Google Refresh Token
  spreadsheetId: string;
  folderId: string; 
  templateId?: string; 
}
