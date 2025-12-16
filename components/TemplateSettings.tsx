import React, { useState, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { getTemplate, saveTemplate, resetTemplate, syncTemplateToCloud, fetchTemplateFromCloud } from '../services/templateService';
import { ArrowLeft, Save, RotateCcw, Cloud, Loader2, FileText } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const TemplateSettings: React.FC<Props> = ({ onBack }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        // Ưu tiên load từ cloud trước
        try {
            const cloudHtml = await fetchTemplateFromCloud();
            if (cloudHtml) {
                setContent(cloudHtml);
                saveTemplate(cloudHtml);
            } else {
                setContent(getTemplate());
            }
        } catch (e) {
            setContent(getTemplate());
        } finally {
            setLoading(false);
        }
    };
    load();
  }, []);

  const handleSave = async () => {
      setSaving(true);
      try {
          saveTemplate(content);
          await syncTemplateToCloud(content);
          alert("Đã lưu mẫu hợp đồng!");
      } catch (e) {
          alert("Lỗi khi lưu!");
          console.error(e);
      } finally {
          setSaving(false);
      }
  };

  const handleReset = () => {
      if(confirm("Bạn có chắc muốn quay về mẫu mặc định?")) {
          const def = resetTemplate();
          setContent(def);
      }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-100px)] flex flex-col">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-gray-700" />
                        Soạn thảo Mẫu Hợp Đồng
                    </h2>
                     <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Cloud className="w-3 h-3" />
                        {loading ? 'Đang tải...' : 'Tự động đồng bộ Google Drive'}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={handleReset} 
                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                    <RotateCcw className="w-4 h-4" /> Mặc định
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu Mẫu
                </button>
            </div>
        </div>

        {/* Editor Wrapper */}
        <div className="flex-1 min-h-0">
            {loading ? (
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
                </div>
            ) : (
                <RichTextEditor 
                    content={content} 
                    onChange={setContent} 
                />
            )}
        </div>
    </div>
  );
};
