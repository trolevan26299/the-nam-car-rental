import React, { useState, useEffect } from 'react';
import { ContractField, FieldSource, FieldGroup, InputType } from '../types';
import { getFields, saveFields, resetFieldsToDefault } from '../services/fieldService';
import { syncFieldsToSheet, fetchFieldsFromCloud } from '../services/googleService';
import { ArrowLeft, Plus, Trash2, Edit2, RotateCcw, Save, X, Settings2, Sparkles, User, FileText, Cloud, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const FieldSettings: React.FC<Props> = ({ onBack }) => {
  const [fields, setFields] = useState<ContractField[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentField, setCurrentField] = useState<Partial<ContractField>>({});
  
  // Cloud State
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Load data khi mở
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            // Ưu tiên load từ Cloud
            const cloudFields = await fetchFieldsFromCloud();
            if (cloudFields.length > 0) {
                setFields(cloudFields);
                saveFields(cloudFields); // Cache lại local
            } else {
                // Nếu Cloud rỗng (lần đầu), lấy local/default và sync lên
                const localFields = getFields();
                setFields(localFields);
                await performSync(localFields);
            }
        } catch (err) {
            console.error("Cloud fetch error:", err);
            // Fallback về local
            setError("Không kết nối được Google Sheet. Đang dùng dữ liệu nội bộ.");
            setFields(getFields());
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  // 2. Hàm Sync chung
  const performSync = async (data: ContractField[]) => {
      setSyncing(true);
      setError(null);
      try {
          await syncFieldsToSheet(data);
          saveFields(data); // Luôn lưu local
      } catch (err) {
          console.error(err);
          setError("Lỗi đồng bộ: Dữ liệu đã lưu trên máy nhưng chưa lên được Google Sheet.");
      } finally {
          setSyncing(false);
      }
  };

  const handleSaveList = async (newList: ContractField[]) => {
      setFields(newList); // Optimistic UI
      await performSync(newList);
  };

  const handleReset = async () => {
      if(confirm("Bạn có chắc muốn khôi phục mặc định? Hành động này sẽ ghi đè cấu hình trên Google Sheet.")) {
          const defaults = resetFieldsToDefault(); // Lấy data mặc định
          await handleSaveList(defaults);
      }
  };

  const handleDelete = async (id: string) => {
      if(confirm("Xóa trường này?")) {
          const newList = fields.filter(f => f.id !== id);
          await handleSaveList(newList);
      }
  };

  const openAddModal = () => {
      setCurrentField({
          id: Date.now().toString(),
          source: 'user',
          group: 'customer',
          inputType: 'text',
          required: false
      });
      setIsEditing(true);
  };

  const openEditModal = (field: ContractField) => {
      setCurrentField({...field});
      setIsEditing(true);
  };

  const saveField = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentField.key || !currentField.label || !currentField.placeholder) return;

      const newField = currentField as ContractField;
      
      const exists = fields.find(f => f.id === newField.id);
      let updatedList;
      if (exists) {
          updatedList = fields.map(f => f.id === newField.id ? newField : f);
      } else {
          updatedList = [...fields, newField];
      }
      
      setIsEditing(false);
      await handleSaveList(updatedList);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[80vh]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings2 className="w-6 h-6 text-gray-700" />
                        Cấu hình Trường Hợp Đồng
                        {syncing && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    </h2>
                     <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Cloud className="w-3 h-3" />
                        {loading ? 'Đang tải cấu hình...' : 'Lưu trên Google Sheet (Tab: CauHinh)'}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={handleReset} 
                    disabled={syncing || loading}
                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                    <RotateCcw className="w-4 h-4" /> Khôi phục gốc
                </button>
                <button 
                    onClick={openAddModal} 
                    disabled={syncing || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" /> Thêm trường
                </button>
            </div>
        </div>

        {/* Error Banner */}
        {error && (
            <div className="mb-6 bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">{error}</div>
            </div>
        )}

        {/* Table List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p>Đang đồng bộ dữ liệu...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <th className="px-6 py-4">Tên hiển thị (Label)</th>
                                <th className="px-6 py-4">Mã Key & Biến Template</th>
                                <th className="px-6 py-4">Nguồn & Loại</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {fields.map(field => (
                                <tr key={field.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{field.label}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            {field.group === 'customer' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Khách hàng</span>}
                                            {field.group === 'car' && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Xe</span>}
                                            {field.group === 'contract' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Hợp đồng</span>}
                                            {field.required && <span className="text-red-500 font-bold">*</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm">
                                        <div className="text-gray-600">Key: <span className="text-purple-600">{field.key}</span></div>
                                        <div className="text-gray-600 mt-1">Word: <span className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 text-gray-800">{field.placeholder}</span></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {field.source === 'ai' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600">
                                                    <Sparkles className="w-3 h-3" /> AI Trích xuất
                                                </span>
                                            ) : field.source === 'system' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500">
                                                    <Settings2 className="w-3 h-3" /> Hệ thống
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                                                    <User className="w-3 h-3" /> Nhập tay
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 capitalize">{field.inputType}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(field)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(field.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Modal Edit/Add */}
        {isEditing && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg">
                            {currentField.id ? 'Chỉnh sửa trường' : 'Thêm trường mới'}
                        </h3>
                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <form onSubmit={saveField} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên hiển thị (Label)</label>
                                <input required type="text" value={currentField.label || ''} onChange={e => setCurrentField({...currentField, label: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: Họ và tên" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Key (Code)</label>
                                <input required type="text" value={currentField.key || ''} onChange={e => setCurrentField({...currentField, key: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="ho_ten" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Biến trong Word</label>
                                <input required type="text" value={currentField.placeholder || ''} onChange={e => setCurrentField({...currentField, placeholder: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="{{HO_TEN}}" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nguồn dữ liệu</label>
                                <select value={currentField.source} onChange={e => setCurrentField({...currentField, source: e.target.value as FieldSource})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="user">Người dùng nhập</option>
                                    <option value="ai">AI Trích xuất (OCR)</option>
                                    <option value="system">Hệ thống (Ngày/Tháng)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại Input</label>
                                <select value={currentField.inputType} onChange={e => setCurrentField({...currentField, inputType: e.target.value as InputType})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="text">Văn bản (Text)</option>
                                    <option value="date">Ngày tháng (Date)</option>
                                    <option value="number">Số (Number)</option>
                                    <option value="currency">Tiền tệ (Currency)</option>
                                </select>
                            </div>

                             <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nhóm hiển thị</label>
                                <select value={currentField.group} onChange={e => setCurrentField({...currentField, group: e.target.value as FieldGroup})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="customer">Khách hàng</option>
                                    <option value="car">Thông tin Xe</option>
                                    <option value="contract">Hợp đồng</option>
                                </select>
                            </div>
                        </div>

                        {currentField.source === 'ai' && (
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                <label className="block text-sm font-semibold text-purple-800 mb-1">Mô tả cho AI hiểu</label>
                                <input 
                                    type="text" 
                                    value={currentField.aiDescription || ''} 
                                    onChange={e => setCurrentField({...currentField, aiDescription: e.target.value})} 
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" 
                                    placeholder="VD: Số căn cước công dân 12 số"
                                />
                                <p className="text-xs text-purple-600 mt-1">Càng chi tiết AI càng trích xuất chính xác.</p>
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="chkRequired"
                                checked={currentField.required || false}
                                onChange={e => setCurrentField({...currentField, required: e.target.checked})}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="chkRequired" className="text-sm text-gray-700">Bắt buộc nhập</label>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition">Hủy</button>
                            <button type="submit" disabled={syncing} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2 disabled:opacity-70">
                                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu & Đồng bộ
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};