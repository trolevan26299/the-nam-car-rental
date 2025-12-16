import React, { useState, useEffect } from 'react';
import { GoogleConfig } from '../types';
import { getGoogleConfig, saveGoogleConfig } from '../services/googleService';
import { X, Save, FileText, Key, Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<GoogleConfig>({
    apiKey: '',
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    spreadsheetId: '',
    folderId: '',
    templateId: ''
  });

  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getGoogleConfig();
      if (saved) setConfig(saved);
    }
  }, [isOpen]);

  const handleSave = () => {
    saveGoogleConfig(config);
    onClose();
    alert('Đã lưu cấu hình Google & Template vào trình duyệt!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-5 h-5" alt="Google" />
                Cấu hình Hệ thống (Không cần .env)
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-6 space-y-6">
            
            {/* Section 1: Auth Config */}
            <div className="space-y-4 border-b pb-6">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">1. Xác thực & Token (Bảo mật)</h4>
                    <button 
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                    >
                        {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showSecrets ? 'Ẩn token' : 'Hiện token'}
                    </button>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Key className="w-3 h-3" /> Gemini API Key
                    </label>
                    <input 
                        type={showSecrets ? "text" : "password"}
                        value={config.apiKey || ''}
                        onChange={e => setConfig({...config, apiKey: e.target.value})}
                        placeholder="AI... (Lấy từ aistudio.google.com)"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Client ID</label>
                    <input 
                        type="text" 
                        value={config.clientId || ''}
                        onChange={e => setConfig({...config, clientId: e.target.value})}
                        placeholder="...apps.googleusercontent.com"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                             <Lock className="w-3 h-3" /> Client Secret
                        </label>
                        <input 
                            type={showSecrets ? "text" : "password"}
                            value={config.clientSecret || ''}
                            onChange={e => setConfig({...config, clientSecret: e.target.value})}
                            placeholder="GOCSPX-..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                             <Lock className="w-3 h-3" /> Refresh Token
                        </label>
                        <input 
                            type={showSecrets ? "text" : "password"}
                            value={config.refreshToken || ''}
                            onChange={e => setConfig({...config, refreshToken: e.target.value})}
                            placeholder="1//..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        />
                    </div>
                </div>
                <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    Lưu ý: Các thông tin này sẽ được lưu trực tiếp vào trình duyệt (LocalStorage) để bạn không cần file .env. Hãy đảm bảo máy tính này an toàn.
                </p>
            </div>

            {/* Section 2: Storage */}
            <div className="space-y-4 border-b pb-6">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">2. Nơi lưu trữ (Drive & Sheet)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Sheet ID</label>
                        <input 
                            type="text" 
                            value={config.spreadsheetId || ''}
                            onChange={e => setConfig({...config, spreadsheetId: e.target.value})}
                            placeholder="ID trên URL trang tính"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Folder ID (Chứa ảnh/HĐ)</label>
                        <input 
                            type="text" 
                            value={config.folderId || ''}
                            onChange={e => setConfig({...config, folderId: e.target.value})}
                            placeholder="ID thư mục Drive"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: Template Config */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-blue-800 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> 3. Hợp Đồng Mẫu Gốc (Google Doc)
                    </h4>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900 space-y-2">
                    <p><strong>Cơ chế mới:</strong> Mẫu hợp đồng bạn soạn thảo sẽ được lưu thành một file Google Doc riêng biệt (Master).</p>
                    <ul className="list-disc pl-5 mt-1">
                        <li>Nếu ô bên dưới <strong>trống</strong>: Hệ thống sẽ tự động tạo file mới khi bạn bấm Lưu mẫu.</li>
                        <li>Nếu ô bên dưới <strong>có ID</strong>: Hệ thống sẽ cập nhật nội dung vào file đó.</li>
                    </ul>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Master Doc ID</label>
                    <input 
                        type="text" 
                        value={config.templateId || ''}
                        onChange={e => setConfig({...config, templateId: e.target.value})}
                        placeholder="(Tự động điền khi lưu mẫu)"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono border-blue-200 bg-blue-50/50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Bạn có thể xóa ID này để hệ thống tạo file mẫu mới.</p>
                </div>
            </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t sticky bottom-0">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition"
            >
                Đóng
            </button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
                <Save className="w-4 h-4" /> Lưu cấu hình
            </button>
        </div>
      </div>
    </div>
  );
};
