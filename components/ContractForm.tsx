import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ContractData, CarConfig, ContractField } from '../types';
import { getCarFleet } from '../services/carService';
import { getFields } from '../services/fieldService';
import { ChevronDown, User, Car, FileSignature, Calculator, DollarSign, CalendarClock, Calendar } from 'lucide-react';

interface ContractFormProps {
  data: ContractData;
  onChange: (key: string, value: any) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const ContractForm: React.FC<ContractFormProps> = ({ data, onChange, onSubmit, onBack }) => {
  const [fleet, setFleet] = useState<CarConfig[]>([]);
  const [fields, setFields] = useState<ContractField[]>([]);

  // State cục bộ để hiển thị tính toán realtime
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);

  useEffect(() => {
    setFleet(getCarFleet());
    setFields(getFields().filter(f => f.source !== 'system')); // Không hiển thị biến hệ thống
  }, []);

  // --- LOGIC TÍNH TOÁN TỰ ĐỘNG ---
  useEffect(() => {
    const startDate = data['rentalDateStart'];
    const endDate = data['rentalDateEnd'];
    const price = Number(data['pricePerDay']) || 0;

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        // Tính số ngày (làm tròn lên, tối thiểu 1 ngày)
        let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (days < 0) days = 0; 
        
        setCalculatedDays(days);
        
        // Cập nhật vào data nếu trường 'rentalDays' tồn tại trong cấu hình
        if (fields.some(f => f.key === 'rentalDays') && data['rentalDays'] !== days) {
            onChange('rentalDays', days);
        }

        const total = days * price;
        setCalculatedTotal(total);

        // Cập nhật vào data nếu trường 'totalAmount' tồn tại
        if (fields.some(f => f.key === 'totalAmount') && data['totalAmount'] !== total) {
             onChange('totalAmount', total);
        }
    }
  }, [data['rentalDateStart'], data['rentalDateEnd'], data['pricePerDay'], fields]);

  // Phân nhóm các trường
  const groupedFields = useMemo(() => {
      return {
          customer: fields.filter(f => f.group === 'customer'),
          car: fields.filter(f => f.group === 'car'),
          contract: fields.filter(f => f.group === 'contract'),
      };
  }, [fields]);

  const handleCarSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const carId = e.target.value;
    if (!carId) return;

    const selectedCar = fleet.find(c => c.id === carId);
    if (selectedCar) {
        if (fields.find(f => f.key === 'carMake')) onChange('carMake', selectedCar.name);
        if (fields.find(f => f.key === 'carPlate')) onChange('carPlate', selectedCar.plate);
        if (fields.find(f => f.key === 'carColor')) onChange('carColor', selectedCar.color);
        if (fields.find(f => f.key === 'pricePerDay')) onChange('pricePerDay', selectedCar.price);
    }
  };

  const handleSetToday = (key: string) => {
      const today = new Date().toISOString().split('T')[0];
      onChange(key, today);
  };

  const formatDateDisplay = (isoDate: string) => {
      if (!isoDate) return '';
      // Input: YYYY-MM-DD
      const parts = isoDate.split('-');
      if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`; // Output: DD/MM/YYYY
      }
      return isoDate;
  };

  const renderInput = (field: ContractField) => {
      const commonClasses = "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 bg-white text-gray-900 transition-all placeholder:text-gray-400 font-medium";
      
      switch (field.inputType) {
          case 'date':
              const isoValue = data[field.key] || '';
              const displayDate = formatDateDisplay(isoValue);

              return (
                  <div className="flex gap-2">
                      <div className="relative w-full group date-container">
                        {/* 1. Visible Display Input (Text) - Format VN */}
                        <input
                            type="text"
                            value={displayDate}
                            readOnly
                            placeholder="dd/mm/yyyy"
                            className={`${commonClasses} bg-white cursor-pointer group-hover:bg-gray-50`}
                            required={field.required}
                        />
                        
                        {/* 2. Hidden Date Picker (Overlay) - Logic gốc */}
                        <input
                            type="date"
                            value={isoValue}
                            onChange={(e) => onChange(field.key, e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            required={field.required}
                            // Trigger native picker on click anywhere
                            onClick={(e) => (e.target as HTMLInputElement).showPicker && (e.target as HTMLInputElement).showPicker()}
                        />

                         {/* 3. Icon Lịch */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none pl-2 z-0">
                            <Calendar className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                      
                      {/* Nút Hôm nay chỉ hiện cho ngày bắt đầu thuê */}
                      {field.key === 'rentalDateStart' && (
                          <button 
                            type="button"
                            onClick={() => handleSetToday(field.key)}
                            className="shrink-0 px-4 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 border border-blue-100 transition-colors whitespace-nowrap z-20 relative"
                          >
                            Hôm nay
                          </button>
                      )}
                  </div>
              );
          case 'number':
              return (
                  <div className="relative">
                    <input
                        type="number"
                        value={data[field.key] || ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        className={commonClasses}
                        placeholder="0"
                        required={field.required}
                        readOnly={field.key === 'rentalDays'} // Chỉ đọc nếu là số ngày tính tự động
                    />
                  </div>
              );
          case 'currency':
              // Logic hiển thị tiền tệ có dấu chấm
              const displayValue = data[field.key] 
                  ? Number(data[field.key]).toLocaleString('vi-VN') 
                  : '';
              
              const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                  // Loại bỏ tất cả ký tự không phải số
                  const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                  // Lưu giá trị số nguyên vào state
                  onChange(field.key, rawValue);
              };

              return (
                  <div className="relative">
                    <input
                        type="text" // Dùng type text để hiển thị format
                        value={displayValue}
                        onChange={handleCurrencyChange}
                        className={`${commonClasses} pr-12 font-bold text-gray-800`}
                        placeholder="0"
                        required={field.required}
                        readOnly={field.key === 'totalAmount'} // Chỉ đọc nếu là tổng tiền tính tự động
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">VND</div>
                  </div>
              );
          default:
              return (
                  <input
                      type="text"
                      value={data[field.key] || ''}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      placeholder={field.source === 'ai' ? 'Chưa có thông tin' : ''}
                      className={commonClasses}
                      required={field.required}
                  />
              );
      }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* LEFT COLUMN: FORM INPUTS */}
        <div className="flex-1 w-full bg-white rounded-2xl shadow-xl shadow-blue-50/50 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <FileSignature className="w-8 h-8" /> Xác nhận hợp đồng
                </h2>
                <p className="text-blue-100 text-base mt-2 ml-11">Thông tin đã được điền tự động, vui lòng kiểm tra và bổ sung.</p>
            </div>

            <div className="p-8 md:p-10 space-y-10">
                
                {/* Section 1: Customer - Grid 4-5 cột trên màn hình siêu lớn */}
                {groupedFields.customer.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-blue-800 font-bold border-b border-blue-100 pb-3 mb-4">
                            <User className="w-6 h-6" />
                            <h3 className="uppercase tracking-wide text-base">1. Thông tin khách hàng (AI)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-6">
                            {groupedFields.customer.map(field => {
                                // Xử lý span cho các trường dài
                                let spanClass = '';
                                if (field.key === 'dia_chi_thuong_tru' || field.key === 'que_quan') {
                                    spanClass = 'md:col-span-2 lg:col-span-2 2xl:col-span-2';
                                }
                                return (
                                    <div key={field.id} className={spanClass}>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis" title={field.label}>
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        {renderInput(field)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Section 2: Car - Grid 4-5 cột */}
                {groupedFields.car.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-orange-100 pb-3 mb-4 gap-3">
                            <div className="flex items-center gap-2 text-orange-800 font-bold">
                                <Car className="w-6 h-6" />
                                <h3 className="uppercase tracking-wide text-base">2. Thông tin xe</h3>
                            </div>
                            
                            {fleet.length > 0 && (
                                <div className="relative z-10 w-full sm:w-auto">
                                    <select 
                                        onChange={handleCarSelect} 
                                        defaultValue=""
                                        className="w-full sm:w-72 appearance-none bg-orange-50 border border-orange-200 text-orange-900 text-sm rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold cursor-pointer hover:bg-orange-100 transition shadow-sm"
                                    >
                                        <option value="" disabled>-- Chọn xe có sẵn từ hệ thống --</option>
                                        {fleet.map(car => (
                                            <option key={car.id} value={car.id}>
                                                {car.name} - {car.plate}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-orange-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-6">
                            {groupedFields.car.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {renderInput(field)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 3: Contract - Grid 4-5 cột */}
                {groupedFields.contract.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-green-800 font-bold border-b border-green-100 pb-3 mb-4">
                            <FileSignature className="w-6 h-6" />
                            <h3 className="uppercase tracking-wide text-base">3. Chi tiết thuê & Thanh toán</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-6">
                            {groupedFields.contract.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {renderInput(field)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-50 px-8 py-5 flex justify-between items-center border-t border-gray-200 sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={onBack}
                    className="text-gray-600 font-bold hover:text-gray-900 px-6 py-3 hover:bg-gray-200 rounded-xl transition"
                >
                    Quay lại
                </button>
                <button
                    onClick={onSubmit}
                    className="bg-blue-600 text-white px-12 py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 text-lg"
                >
                    Xem trước & Xuất Hợp Đồng
                </button>
            </div>
        </div>

        {/* RIGHT COLUMN: LIVE ESTIMATE - STICKY */}
        <div className="w-full xl:w-[400px] flex-shrink-0 xl:sticky xl:top-24 space-y-4">
             <div className="bg-white rounded-2xl shadow-xl shadow-gray-200 border border-gray-100 p-8">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-5 mb-6 text-xl">
                     <Calculator className="w-7 h-7 text-blue-600" />
                     Tạm tính chi phí
                 </h3>
                 
                 <div className="space-y-6">
                     <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="flex items-center gap-2 text-base text-gray-600 font-medium">
                             <CalendarClock className="w-5 h-5" /> Số ngày thuê
                         </div>
                         <div className="font-bold text-gray-900 text-xl">{calculatedDays} ngày</div>
                     </div>
                     
                     <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="flex items-center gap-2 text-base text-gray-600 font-medium">
                             <DollarSign className="w-5 h-5" /> Đơn giá
                         </div>
                         <div className="font-bold text-gray-900 text-lg">
                             {Number(data['pricePerDay'] || 0).toLocaleString('vi-VN')} đ
                         </div>
                     </div>

                     <div className="border-t-2 border-dashed my-4 border-gray-200"></div>

                     <div className="flex justify-between items-end">
                         <div className="text-lg font-bold text-gray-800">Thành tiền</div>
                         <div className="text-3xl font-bold text-blue-600">
                             {calculatedTotal.toLocaleString('vi-VN')} đ
                         </div>
                     </div>

                     {data['depositAmount'] && (
                         <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mt-6 text-orange-900 flex justify-between items-center shadow-sm">
                             <span className="font-semibold">Đã đặt cọc:</span>
                             <span className="font-bold text-xl">{Number(data['depositAmount']).toLocaleString('vi-VN')} đ</span>
                         </div>
                     )}
                 </div>
             </div>
        </div>
    </div>
  );
};