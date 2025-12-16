import React, { useState, useEffect } from 'react';
import { ContractData } from '../types';
import { generateAndSaveContract } from '../services/googleService';
import { getTemplate } from '../services/templateService';
import { getFields } from '../services/fieldService';
import { Printer, ArrowLeft, CloudUpload, Loader2, FileText, ExternalLink, AlertCircle } from 'lucide-react';

interface ContractPreviewProps {
  data: ContractData;
  frontImage: File | null;
  backImage: File | null;
  onEdit: () => void;
}

export const ContractPreview: React.FC<ContractPreviewProps> = ({ data, frontImage, backImage, onEdit }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [result, setResult] = useState<{ docUrl?: string, message?: string, status: 'idle' | 'success' | 'error' }>({ status: 'idle' });

  // 1. Render Template với dữ liệu thật
  useEffect(() => {
      const template = getTemplate();
      const fields = getFields();
      let rendered = template;

      // Replace các biến
      fields.forEach(field => {
          let value = data[field.key];
          
          // Format dữ liệu hiển thị
          if (field.inputType === 'currency' && value) {
              value = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
          } else if (field.inputType === 'date' && value) {
              const d = new Date(value);
              value = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          } else if (field.source === 'system') {
               const now = new Date();
               if (field.key === 'createdDate') value = now.getDate().toString().padStart(2, '0');
               if (field.key === 'createdMonth') value = (now.getMonth() + 1).toString().padStart(2, '0');
               if (field.key === 'createdYear') value = now.getFullYear().toString();
          }

          if (value === undefined || value === null) value = "....................";

          // Thay thế tất cả các lần xuất hiện
          const regex = new RegExp(field.placeholder, 'g');
          rendered = rendered.replace(regex, String(value));
      });

      setHtmlContent(rendered);
  }, [data]);

  const handleGenerateAndSave = async () => {
    setIsProcessing(true);
    setResult({ status: 'idle' });
    
    try {
        // TRUYỀN DANH SÁCH FIELDS VÀO HÀM ĐỂ GOOGLE SERVICE KHÔNG CẦN IMPORT FIELD SERVICE
        const currentFields = getFields();
        const res = await generateAndSaveContract(htmlContent, data, frontImage, backImage, currentFields);
        setResult({
            status: 'success',
            docUrl: res.docUrl,
            message: res.sheetStatus
        });
    } catch (e: any) {
        console.error(e);
        setResult({
            status: 'error',
            message: e.message || "Lỗi không xác định khi tạo hợp đồng."
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Control Bar */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-20 z-40 no-print">
        <button 
            onClick={onEdit}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
            <ArrowLeft className="w-5 h-5" /> Quay lại chỉnh sửa
        </button>
        
        <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-all"
            >
                <Printer className="w-5 h-5" /> In Ngay
            </button>

            {result.status === 'success' ? (
                 <a 
                    href={result.docUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200"
                >
                    <FileText className="w-5 h-5" /> Mở File Google Doc
                    <ExternalLink className="w-4 h-4 opacity-70" />
                </a>
            ) : (
                <button 
                    onClick={handleGenerateAndSave}
                    disabled={isProcessing}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95
                        ${isProcessing ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
                    `}
                >
                    {isProcessing ? (
                        <> <Loader2 className="w-5 h-5 animate-spin" /> Đang lưu Drive... </>
                    ) : (
                        <> <CloudUpload className="w-5 h-5" /> Lưu lên Google Drive </>
                    )}
                </button>
            )}
        </div>
      </div>

      {/* Result Notification */}
      {result.status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 no-print">
              <div className="bg-red-100 p-1 rounded-full"><AlertCircle className="w-5 h-5 text-red-600"/></div>
              <div>
                  <div className="font-bold">Gặp lỗi khi xử lý:</div>
                  <div className="text-sm mt-1">{result.message}</div>
                  <div className="text-xs mt-2 text-red-500">Hãy thử lại hoặc kiểm tra cấu hình Google Cloud.</div>
              </div>
          </div>
      )}

      {/* 
          PREVIEW PAPER (WYSIWYG)
          Lưu ý: Thẻ ID "printable-content" được đặt ở thẻ con bên trong.
          Thẻ cha chứa shadow, border, padding sẽ bị ẩn khi in nhờ CSS @media print.
      */}
      <div className="bg-white p-12 shadow-2xl border border-gray-100 min-h-[1123px] w-full relative mx-auto">
          <div 
            id="printable-content"
            className="prose max-w-none text-gray-900"
            style={{
                lineHeight: 1.5, 
                fontSize: '13pt', 
                fontFamily: '"Times New Roman", Times, serif', // Fix font chữ
                textAlign: 'justify'
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
      </div>
    </div>
  );
};