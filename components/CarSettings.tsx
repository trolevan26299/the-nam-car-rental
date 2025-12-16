import React, { useState, useEffect, useMemo } from 'react';
import { CarConfig } from '../types';
import { saveCarFleet, getCarFleet } from '../services/carService'; // Vẫn giữ để backup local
import { syncFleetToSheet, fetchFleetFromCloud } from '../services/googleService';
import { Trash2, Plus, Car, ArrowLeft, PaintBucket, DollarSign, X, Loader2, Save, Cloud, AlertCircle, Search, Filter, Pencil } from 'lucide-react';

interface CarSettingsProps {
  onBack: () => void;
}

export const CarSettings: React.FC<CarSettingsProps> = ({ onBack }) => {
  const [fleet, setFleet] = useState<CarConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMake, setSelectedMake] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Track ID đang sửa
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // 1. Tự động load từ Google Cloud khi mở trang
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            // Thử lấy từ Cloud trước
            const cloudFleet = await fetchFleetFromCloud();
            setFleet(cloudFleet);
            saveCarFleet(cloudFleet); // Cập nhật luôn local storage
        } catch (err) {
            console.error(err);
            // Nếu lỗi (mất mạng, chưa login), fallback về local
            setError("Không thể lấy dữ liệu từ Google Sheet. Đang hiển thị dữ liệu cũ.");
            setFleet(getCarFleet());
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  // 2. Logic Lọc & Tìm kiếm
  // Tự động lấy danh sách Hãng xe (Lấy từ chữ cái đầu tiên của Tên xe)
  const uniqueMakes = useMemo(() => {
    const makes = new Set(fleet.map(car => car.name.split(' ')[0]));
    return ['ALL', ...Array.from(makes).sort()];
  }, [fleet]);

  const filteredFleet = useMemo(() => {
    return fleet.filter(car => {
      const matchesSearch = 
        car.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        car.plate.toLowerCase().includes(searchTerm.toLowerCase());
      
      const carMake = car.name.split(' ')[0];
      const matchesMake = selectedMake === 'ALL' || carMake === selectedMake;

      return matchesSearch && matchesMake;
    });
  }, [fleet, searchTerm, selectedMake]);

  // 3. Hàm chuẩn bị Edit
  const handleEditClick = (car: CarConfig) => {
    setEditingId(car.id);
    setNewName(car.name);
    setNewPlate(car.plate);
    setNewColor(car.color);
    setNewPrice(car.price.toString());
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    resetForm();
    setIsModalOpen(true);
  };

  // 4. Hàm xử lý lưu (Thêm mới HOẶC Cập nhật)
  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPlate || !newPrice) return;

    let updatedFleet: CarConfig[];

    if (editingId) {
        // UPDATE Existing
        updatedFleet = fleet.map(car => {
            if (car.id === editingId) {
                return {
                    ...car,
                    name: newName,
                    plate: newPlate,
                    color: newColor,
                    price: parseFloat(newPrice)
                };
            }
            return car;
        });
    } else {
        // CREATE New
        const newCar: CarConfig = {
            id: Date.now().toString(),
            name: newName,
            plate: newPlate,
            color: newColor,
            price: parseFloat(newPrice)
        };
        updatedFleet = [...fleet, newCar];
    }
    
    // Optimistic UI update
    setFleet(updatedFleet);
    setIsModalOpen(false);
    resetForm();
    setEditingId(null);

    // Background Sync
    await performSync(updatedFleet);
  };

  // 5. Hàm xử lý xóa
  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa xe này khỏi hệ thống?')) {
      const updatedFleet = fleet.filter(c => c.id !== id);
      setFleet(updatedFleet); // Optimistic Update
      await performSync(updatedFleet);
    }
  };

  // 6. Hàm đồng bộ chung
  const performSync = async (data: CarConfig[]) => {
    setSyncing(true);
    setError(null);
    try {
        await syncFleetToSheet(data);
        saveCarFleet(data); // Save local backup
    } catch (err) {
        console.error(err);
        setError("Lỗi: Không thể lưu thay đổi lên Google Sheet. Kiểm tra kết nối!");
    } finally {
        setSyncing(false);
    }
  };

  const resetForm = () => {
      setNewName('');
      setNewPlate('');
      setNewColor('');
      setNewPrice('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[80vh]">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    Quản lý đội xe
                    {syncing && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Cloud className="w-3 h-3" />
                    {loading ? 'Đang tải dữ liệu...' : 'Đồng bộ Google Sheets'}
                </div>
            </div>
          </div>
          
          <button 
            onClick={handleOpenAddModal}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 active:scale-95 w-full md:w-auto justify-center"
          >
             <Plus className="w-5 h-5" /> Thêm xe mới
          </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
                type="text" 
                placeholder="Tìm kiếm tên xe hoặc biển số..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 placeholder:text-gray-400"
            />
        </div>
        
        <div className="relative md:w-64">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
             <select 
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-gray-800 cursor-pointer"
             >
                {uniqueMakes.map(make => (
                    <option key={make} value={make}>{make === 'ALL' ? 'Tất cả hãng xe' : make}</option>
                ))}
             </select>
             {/* Custom Arrow */}
             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
          <div className="mb-6 bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">{error}</div>
          </div>
      )}

      {/* Loading State */}
      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p>Đang kết nối Google Drive...</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFleet.length === 0 ? (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Không tìm thấy xe phù hợp.</p>
                    {fleet.length === 0 && (
                         <button onClick={handleOpenAddModal} className="text-blue-600 hover:underline mt-2 text-sm font-semibold">
                            Thêm xe mới ngay
                        </button>
                    )}
                </div>
            ) : (
                filteredFleet.map(car => (
                    <div key={car.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all relative overflow-hidden flex flex-col">
                        
                        {/* Decorative Background Icon */}
                        <Car className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 opacity-50 group-hover:text-blue-50 transition-colors pointer-events-none" />

                        <div className="relative z-10 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{car.name}</h3>
                                <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-medium text-gray-600 whitespace-nowrap">
                                    {car.plate}
                                </div>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <PaintBucket className="w-4 h-4 text-gray-400" />
                                    <span>{car.color || 'Chưa cập nhật màu'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    <span className="text-green-700">{new Intl.NumberFormat('vi-VN').format(car.price)} đ / ngày</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="relative z-10 grid grid-cols-2 gap-2 mt-auto">
                            <button 
                                onClick={() => handleEditClick(car)}
                                className="py-2 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Pencil className="w-4 h-4" /> Sửa
                            </button>
                            <button 
                                onClick={() => handleDelete(car.id)}
                                className="py-2 flex items-center justify-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Xóa
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      )}

      {/* MODAL THÊM / SỬA XE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <div className="bg-blue-600 p-1 rounded text-white">
                            {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                        {editingId ? 'Cập nhật thông tin xe' : 'Thêm xe mới'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSaveCar} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên xe / Dòng xe <span className="text-red-500">*</span></label>
                        <input 
                            autoFocus
                            required
                            type="text" 
                            placeholder="VD: Mazda 3 2023 Premium"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 bg-gray-50 text-gray-900 transition-all placeholder:text-gray-400"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Biển số <span className="text-red-500">*</span></label>
                            <input 
                                required
                                type="text" 
                                placeholder="30K-..."
                                value={newPlate}
                                onChange={e => setNewPlate(e.target.value)}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 bg-gray-50 text-gray-900 font-mono transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Màu sắc</label>
                            <input 
                                type="text" 
                                placeholder="Trắng..."
                                value={newColor}
                                onChange={e => setNewColor(e.target.value)}
                                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 bg-gray-50 text-gray-900 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Giá thuê (VNĐ/ngày) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input 
                                required
                                type="number" 
                                placeholder="0"
                                value={newPrice}
                                onChange={e => setNewPrice(e.target.value)}
                                className="w-full pl-4 pr-12 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 bg-gray-50 text-gray-900 font-bold text-lg transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">VND</div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" /> 
                            {editingId ? 'Lưu thay đổi' : 'Thêm mới & Đồng bộ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};