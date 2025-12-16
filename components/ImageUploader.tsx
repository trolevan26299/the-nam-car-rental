import React from 'react';
import { Upload, X, CheckCircle, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  image: File | null;
  onImageChange: (file: File | null) => void;
  previewUrl: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, image, onImageChange, previewUrl }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onImageChange(e.dataTransfer.files[0]);
    }
  };

  // Xác định xem có nội dung để hiển thị preview không (File mới hoặc URL cũ)
  const hasContent = image || previewUrl;

  // URL hiển thị: Ưu tiên ảnh mới chọn (blob), nếu không có thì dùng URL cũ (drive)
  const displayUrl = image ? URL.createObjectURL(image) : previewUrl;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      
      {!hasContent ? (
        <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center cursor-pointer relative h-48"
        >
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="bg-blue-100 p-3 rounded-full mb-3">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 text-center font-medium">Kéo thả hoặc chọn ảnh</p>
          <p className="text-xs text-gray-400 mt-1">Hỗ trợ JPG, PNG</p>
        </div>
      ) : (
        <div className="relative border border-gray-200 rounded-lg overflow-hidden h-48 group bg-gray-100">
           {displayUrl ? (
               <img src={displayUrl} alt="Preview" className="w-full h-full object-contain" />
           ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-400">
                   <ImageIcon className="w-8 h-8" />
               </div>
           )}
           
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                    onClick={() => onImageChange(null)}
                    className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50 transition shadow-lg"
                    title="Xóa ảnh"
                >
                    <X className="w-5 h-5" />
                </button>
           </div>
           
           <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
             <CheckCircle className="w-3 h-3" /> {image ? 'Ảnh mới' : 'Ảnh hệ thống'}
           </div>
        </div>
      )}
    </div>
  );
};