import React, { useState, useEffect, useMemo } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ContractForm } from './components/ContractForm';
import { ContractPreview } from './components/ContractPreview';
import { CarSettings } from './components/CarSettings';
import { GoogleSettingsModal } from './components/GoogleSettingsModal';
import { FieldSettings } from './components/FieldSettings'; 
import { TemplateSettings } from './components/TemplateSettings'; 
import { extractIdentityData } from './services/geminiService';
import { ContractData, CustomerRecord } from './types';
import { getFields } from './services/fieldService'; 
import { fetchCustomersFromCloud } from './services/googleService';
import { Loader2, Car, ShieldCheck, FileText, Settings, CloudCog, ListChecks, FlaskConical, PenTool, Search, UserCheck, RefreshCw, Check } from 'lucide-react';

enum Step {
  UPLOAD = 1,
  FORM = 2,
  PREVIEW = 3
}

type View = 'wizard' | 'settings_car' | 'settings_fields' | 'settings_template';

// Helper: Xóa dấu Tiếng Việt để tìm kiếm
const removeVietnameseTones = (str: string): string => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase();
};

// Helper: Chuyển đổi ngày từ chuẩn Việt Nam DD/MM/YYYY sang chuẩn Input YYYY-MM-DD
const normalizeDateToISO = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Xử lý các ký tự phân cách khác nhau: / . -
    const cleanStr = dateStr.trim();

    // Regex ưu tiên bắt định dạng DD/MM/YYYY trước
    // Group 1: Ngày (1-2 số)
    // Group 2: Tháng (1-2 số)
    // Group 3: Năm (4 số)
    const matches = cleanStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    
    if (matches) {
        const day = matches[1].padStart(2, '0');
        const month = matches[2].padStart(2, '0');
        const year = matches[3];
        // Trả về YYYY-MM-DD để <input type="date"> hiểu
        return `${year}-${month}-${day}`;
    }

    // Trường hợp AI lỡ trả về YYYY-MM-DD (ISO) thì giữ nguyên
    if (cleanStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return cleanStr;
    }

    // Nếu không khớp định dạng nào, trả về nguyên gốc (có thể là "Không thời hạn"...)
    return dateStr;
};

export default function App() {
  const [view, setView] = useState<View>('wizard');
  const [step, setStep] = useState<Step>(Step.UPLOAD);
  
  // Image State
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractData, setContractData] = useState<ContractData>({});
  const [error, setError] = useState<string | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Customer Search State
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Load Customers on Mount
  useEffect(() => {
      if (view === 'wizard' && step === Step.UPLOAD) {
          setIsSearchingCustomer(true);
          fetchCustomersFromCloud()
              .then(setCustomers)
              .catch(console.error)
              .finally(() => setIsSearchingCustomer(false));
      }
  }, [view, step]);

  const filteredCustomers = useMemo(() => {
      // Nếu chưa nhập gì, hiển thị 15 khách mới nhất
      if (!searchTerm) {
          return customers.slice(0, 15);
      }
      
      const normalizedSearch = removeVietnameseTones(searchTerm);
      return customers.filter(c => {
        const normalizedName = removeVietnameseTones(c.name);
        return normalizedName.includes(normalizedSearch) || c.cccd.includes(normalizedSearch);
      }).slice(0, 15); // Limit 15 results
  }, [customers, searchTerm]);

  const handleSelectCustomer = (customer: CustomerRecord) => {
      setSelectedCustomer(customer);
      setSearchTerm(`${customer.name} - ${customer.cccd}`);
      
      // Set preview from URL (Quan trọng: Hiển thị ảnh cũ)
      setFrontPreview(customer.frontUrl || null);
      setBackPreview(customer.backUrl || null);
      
      // Clear file inputs vì đang dùng URL
      setFrontImage(null);
      setBackImage(null);
      setError(null);
      setIsSearchFocused(false);

      // Pre-fill Contract Data (Full Data)
      setContractData(prev => ({
          ...prev,
          ho_ten: customer.name,
          so_cccd: customer.cccd,
          ngay_sinh: normalizeDateToISO(customer.dob || ''),
          gioi_tinh: customer.gender || '',
          quoc_tich: customer.nationality || '',
          que_quan: customer.hometown || '',
          dia_chi_thuong_tru: customer.address || '',
          ngay_cap: normalizeDateToISO(customer.issueDate || ''),
          co_gia_tri_den: normalizeDateToISO(customer.expiryDate || '')
      }));
  };

  const handleClearCustomer = () => {
      setSelectedCustomer(null);
      setSearchTerm('');
      setFrontPreview(null);
      setBackPreview(null);
      setContractData({});
  };

  const handleImageChange = (file: File | null, side: 'front' | 'back') => {
    // Nếu người dùng thay đổi ảnh (file !== null), thoát chế độ "Khách quen"
    if (file) {
        setSelectedCustomer(null);
    }
    
    // Nếu người dùng xóa ảnh (file === null)
    if (file === null) {
        // Nếu đang chọn khách quen, xóa ảnh đồng nghĩa xóa previewUrl
        if (selectedCustomer) {
             if (side === 'front') setFrontPreview(null);
             if (side === 'back') setBackPreview(null);
             // Tạm thời coi như không còn là khách quen nữa để buộc trích xuất lại hoặc nhập tay
             setSelectedCustomer(null);
        }
    }

    if (side === 'front') {
      setFrontImage(file);
      setFrontPreview(file ? URL.createObjectURL(file) : null);
    } else {
      setBackImage(file);
      setBackPreview(file ? URL.createObjectURL(file) : null);
    }
    setError(null);
  };

  const handleAnalyzeOrContinue = async () => {
    // CASE 1: Khách cũ + Không đổi ảnh (có previewUrl) -> Bỏ qua OCR, dùng data có sẵn
    if (selectedCustomer) {
        setStep(Step.FORM);
        return;
    }

    // CASE 2: Upload mới hoặc Khách cũ nhưng đổi ảnh -> Chạy OCR
    // Kiểm tra xem đã có đủ ảnh chưa (Ảnh file hoặc Ảnh preview từ link)
    const hasFront = frontImage || frontPreview;
    const hasBack = backImage || backPreview;

    if (!hasFront || !hasBack) {
      setError("Vui lòng tải lên cả mặt trước và mặt sau CCCD (hoặc chọn khách cũ đầy đủ ảnh).");
      return;
    }

    // Nếu không có file ảnh mới (chỉ có link cũ mà user bấm trích xuất lại???) 
    // Thực tế nút bấm đã đổi text. Nếu user bấm "Trích xuất" nghĩa là có file mới hoặc muốn trích xuất file mới.
    if (!frontImage || !backImage) {
        // Trường hợp hy hữu: Có 1 ảnh cũ, 1 ảnh mới -> Vẫn bắt upload đủ 2 ảnh mới để OCR cho chuẩn
        if (!frontImage || !backImage) {
             setError("Để trích xuất lại dữ liệu, vui lòng tải lên đầy đủ 2 ảnh mới.");
             return;
        }
    }

    setIsProcessing(true);
    setError(null);

    try {
      const currentFields = getFields(); 
      // Ép kiểu chắc chắn khác null vì đã check ở trên
      const extractedData = await extractIdentityData(frontImage!, backImage!, currentFields);
      
      // --- CHUẨN HÓA DỮ LIỆU SAU KHI AI TRẢ VỀ ---
      const processedData = { ...extractedData };
      
      currentFields.forEach(field => {
          // Nếu trường được cấu hình là 'date' và có dữ liệu trả về
          if (field.inputType === 'date' && processedData[field.key]) {
              // Convert DD/MM/YYYY (AI) -> YYYY-MM-DD (Input)
              processedData[field.key] = normalizeDateToISO(String(processedData[field.key]));
          }
      });

      setContractData(prev => ({
        ...prev,
        ...processedData
      }));
      setStep(Step.FORM);
    } catch (err) {
      console.error(err);
      setError("Không thể đọc thông tin từ ảnh. Vui lòng thử lại hoặc ảnh rõ nét hơn.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Hàm tạo dữ liệu giả lập để test nhanh
  const handleTestFill = () => {
      setContractData({
          ho_ten: "NGUYỄN VĂN TEST",
          so_cccd: "001099123456",
          ngay_sinh: "1995-01-01", // YYYY-MM-DD
          gioi_tinh: "Nam",
          quoc_tich: "Việt Nam",
          que_quan: "Ba Đình, Hà Nội",
          dia_chi_thuong_tru: "Số 1 Hùng Vương, Ba Đình, Hà Nội",
          ngay_cap: "2021-01-01", // YYYY-MM-DD
          co_gia_tri_den: "2035-01-01", // YYYY-MM-DD
          rentalDateStart: new Date().toISOString().split('T')[0],
          rentalDateEnd: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], 
          pricePerDay: 1000000,
          depositAmount: 5000000,
          carMake: "VinFast Lux A2.0",
          carPlate: "30H-999.99 (TEST)",
          carColor: "Đỏ"
      });
      setStep(Step.FORM);
  };

  const handleFormChange = (key: string, value: any) => {
    setContractData(prev => ({ ...prev, [key]: value }));
  };

  // Cấu hình các bước Stepper
  const stepsConfig = [
    { id: Step.UPLOAD, label: 'Tải ảnh' },
    { id: Step.FORM, label: 'Thông tin' },
    { id: Step.PREVIEW, label: 'Xuất file' },
  ];

  // Logic click vào stepper: Chỉ cho phép click vào các bước ĐÃ QUA hoặc HIỆN TẠI (để quay lại)
  // Không cho click nhảy cóc tới bước tương lai.
  const handleStepClick = (targetStep: Step) => {
      if (targetStep < step) {
          setStep(targetStep);
      }
  };

  // Render Content based on View
  const renderContent = () => {
      if (view === 'settings_car') return <CarSettings onBack={() => setView('wizard')} />;
      if (view === 'settings_fields') return <FieldSettings onBack={() => setView('wizard')} />;
      if (view === 'settings_template') return <TemplateSettings onBack={() => setView('wizard')} />; 

      return (
          <>
            {/* Step 1: Upload */}
            {step === Step.UPLOAD && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Tạo hợp đồng mới</h2>
                        <p className="text-gray-500">Tải lên ảnh CCCD hoặc tìm kiếm khách hàng cũ.</p>
                    </div>

                    {/* Search Existing Customer Box */}
                    <div className="max-w-2xl mx-auto mb-8 relative z-20">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                                placeholder="Tìm khách cũ: Nhập Tên (không dấu) hoặc số CCCD..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} // Delay để kịp nhận sự kiện click item
                            />
                             {isSearchingCustomer && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                </div>
                            )}
                            {selectedCustomer && (
                                <button 
                                    onClick={handleClearCustomer}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {(isSearchFocused || searchTerm) && filteredCustomers.length > 0 && !selectedCustomer && (
                            <div className="absolute mt-1 w-full bg-white shadow-lg max-h-80 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-100 z-50">
                                {filteredCustomers.map((c, idx) => (
                                    <div
                                        key={`${c.cccd}-${idx}`}
                                        className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                                        onMouseDown={() => handleSelectCustomer(c)} // Dùng onMouseDown để bắt sự kiện trước onBlur input
                                    >
                                        <div className="flex items-center">
                                            <span className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {c.name.charAt(0)}
                                            </span>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                                                <p className="text-xs text-gray-500">CCCD: {c.cccd}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {selectedCustomer && (
                             <div className="mt-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                <UserCheck className="w-4 h-4" />
                                Đã chọn khách hàng: <strong>{selectedCustomer.name}</strong>. Ảnh CCCD đã được tải lại từ hệ thống.
                             </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <ImageUploader 
                            label="Mặt trước CCCD" 
                            image={frontImage} 
                            onImageChange={(f) => handleImageChange(f, 'front')} 
                            previewUrl={frontPreview}
                        />
                        <ImageUploader 
                            label="Mặt sau CCCD" 
                            image={backImage} 
                            onImageChange={(f) => handleImageChange(f, 'back')} 
                            previewUrl={backPreview}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-medium border border-red-100 max-w-2xl mx-auto">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-center pt-4 gap-4">
                        <button
                            onClick={handleTestFill}
                            className="bg-white text-gray-600 border border-gray-300 px-6 py-3 rounded-xl font-bold text-lg hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <FlaskConical className="w-5 h-5" /> Chạy thử
                        </button>

                        <button
                            onClick={handleAnalyzeOrContinue}
                            disabled={isProcessing || (!selectedCustomer && (!frontImage || !backImage))}
                            className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center gap-2
                                ${selectedCustomer 
                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none'
                                }
                            `}
                        >
                            {isProcessing ? (
                                <> <Loader2 className="animate-spin w-5 h-5" /> Đang xử lý AI... </>
                            ) : selectedCustomer ? (
                                <> <FileText className="w-5 h-5" /> Tiếp tục (Dữ liệu cũ) </>
                            ) : (
                                <> <ShieldCheck className="w-5 h-5" /> Trích xuất & Tiếp tục </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Form */}
            {step === Step.FORM && (
                <div className="animate-in fade-in zoom-in-95 duration-300 w-full">
                    <ContractForm 
                        data={contractData} 
                        onChange={handleFormChange} 
                        onSubmit={() => setStep(Step.PREVIEW)}
                        onBack={() => setStep(Step.UPLOAD)}
                    />
                </div>
            )}

            {/* Step 3: Preview */}
            {step === Step.PREVIEW && (
                <div className="animate-in fade-in duration-300 w-full">
                    <ContractPreview 
                        data={contractData} 
                        frontImage={frontImage}
                        backImage={backImage}
                        onEdit={() => setStep(Step.FORM)}
                    />
                </div>
            )}
          </>
      );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <GoogleSettingsModal isOpen={isGoogleModalOpen} onClose={() => setIsGoogleModalOpen(false)} />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50 no-print">
        <div className="w-full px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('wizard')}>
                <div className="bg-blue-600 p-2 rounded-lg">
                    <Car className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">Thế Nam</h1>
                    <p className="text-xs text-gray-500 font-medium">Hệ thống quản lý thuê xe tự lái</p>
                </div>
            </div>
            
            {view === 'wizard' ? (
              <div className="flex items-center gap-4 md:gap-6">
                
                {/* STEPPER NAVIGATOR */}
                <div className="hidden md:flex items-center gap-2">
                    {stepsConfig.map((s, index) => {
                        const isActive = step === s.id;
                        const isCompleted = step > s.id;
                        const isClickable = step > s.id; // Chỉ cho phép click quay lại

                        return (
                            <React.Fragment key={s.id}>
                                <button
                                    disabled={!isClickable}
                                    onClick={() => handleStepClick(s.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border
                                        ${isActive 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                            : isCompleted 
                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer' 
                                                : 'bg-white text-gray-400 border-gray-200 cursor-default'
                                        }
                                    `}
                                >
                                    <span className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${isActive ? 'bg-white text-blue-600' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}
                                    `}>
                                        {isCompleted ? <Check className="w-3 h-3" /> : s.id}
                                    </span>
                                    <span className="text-sm font-semibold">{s.label}</span>
                                </button>
                                {index < stepsConfig.length - 1 && (
                                    <div className={`w-8 h-[2px] ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                                )}
                            </React.Fragment>
                        )
                    })}
                </div>

                <div className="h-6 w-[1px] bg-gray-200 hidden md:block"></div>
                
                <div className="flex items-center gap-2">
                    <button 
                    onClick={() => setIsGoogleModalOpen(true)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-all"
                    title="Cấu hình Google Cloud"
                    >
                    <CloudCog className="w-6 h-6" />
                    </button>

                    <button 
                    onClick={() => setView('settings_template')}
                    className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all"
                    title="Soạn thảo Mẫu Hợp Đồng"
                    >
                    <PenTool className="w-6 h-6" />
                    </button>

                    <button 
                    onClick={() => setView('settings_fields')}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all"
                    title="Cấu hình Trường hợp đồng"
                    >
                    <ListChecks className="w-6 h-6" />
                    </button>

                    <button 
                    onClick={() => setView('settings_car')}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                    title="Cấu hình xe"
                    >
                    <Settings className="w-6 h-6" />
                    </button>
                </div>
              </div>
            ) : (
              <div></div>
            )}
        </div>
      </header>

      <main className="w-full px-6 md:px-12 py-8">
        {renderContent()}
      </main>
    </div>
  );
}