import { ContractField } from "../types";

const FIELDS_STORAGE_KEY = 'the_nam_contract_fields_v1';

// Cấu hình mặc định ban đầu (Seed data)
const DEFAULT_FIELDS: ContractField[] = [
  // --- NHÓM KHÁCH HÀNG (AI) ---
  {
    id: '1', key: 'ho_ten', label: 'Họ và tên', placeholder: '{{HO_TEN}}',
    source: 'ai', group: 'customer', inputType: 'text', aiDescription: 'Họ và tên đầy đủ, viết hoa', required: true
  },
  {
    id: '2', key: 'so_cccd', label: 'Số CCCD', placeholder: '{{SO_CCCD}}',
    source: 'ai', group: 'customer', inputType: 'text', aiDescription: 'Số thẻ căn cước công dân', required: true
  },
  {
    id: '3', key: 'ngay_sinh', label: 'Ngày sinh', placeholder: '{{NGAY_SINH}}',
    source: 'ai', group: 'customer', inputType: 'date', aiDescription: 'Ngày sinh (trích xuất chính xác theo định dạng dd/mm/yyyy)'
  },
  {
    id: '4', key: 'gioi_tinh', label: 'Giới tính', placeholder: '{{GIOI_TINH}}',
    source: 'ai', group: 'customer', inputType: 'text', aiDescription: 'Giới tính (Nam/Nữ)'
  },
  {
    id: '5', key: 'quoc_tich', label: 'Quốc tịch', placeholder: '{{QUOC_TICH}}',
    source: 'ai', group: 'customer', inputType: 'text', aiDescription: 'Quốc tịch'
  },
  {
    id: '6', key: 'que_quan', label: 'Quê quán', placeholder: '{{QUE_QUAN}}',
    source: 'ai', group: 'customer', inputType: 'text', aiDescription: 'Quê quán hoặc Nguyên quán'
  },
  {
    id: '7', key: 'dia_chi_thuong_tru', label: 'Nơi thường trú', placeholder: '{{THUONG_TRU}}',
    source: 'ai', group: 'customer', inputType: 'text', aiDescription: 'Nơi thường trú'
  },
  {
    id: '8', key: 'ngay_cap', label: 'Ngày cấp', placeholder: '{{NGAY_CAP}}',
    source: 'ai', group: 'customer', inputType: 'date', aiDescription: 'Ngày cấp thẻ CCCD (trích xuất chính xác theo định dạng dd/mm/yyyy)'
  },
  {
    id: '9', key: 'co_gia_tri_den', label: 'Có giá trị đến', placeholder: '{{GIA_TRI_DEN}}',
    source: 'ai', group: 'customer', inputType: 'date', aiDescription: 'Ngày hết hạn thẻ CCCD (trích xuất chính xác theo định dạng dd/mm/yyyy)'
  },

  // --- NHÓM XE (USER/SYSTEM) ---
  {
    id: '10', key: 'carMake', label: 'Tên xe / Dòng xe', placeholder: '{{TEN_XE}}',
    source: 'user', group: 'car', inputType: 'text', required: true
  },
  {
    id: '11', key: 'carPlate', label: 'Biển số xe', placeholder: '{{BIEN_SO}}',
    source: 'user', group: 'car', inputType: 'text', required: true
  },
  {
    id: '12', key: 'carColor', label: 'Màu xe', placeholder: '{{MAU_XE}}',
    source: 'user', group: 'car', inputType: 'text'
  },

  // --- NHÓM HỢP ĐỒNG (USER) ---
  {
    id: '13', key: 'rentalDateStart', label: 'Ngày bắt đầu', placeholder: '{{NGAY_THUE}}',
    source: 'user', group: 'contract', inputType: 'date', required: true
  },
  {
    id: '14', key: 'rentalDateEnd', label: 'Ngày trả xe', placeholder: '{{NGAY_TRA}}',
    source: 'user', group: 'contract', inputType: 'date', required: true
  },
  {
    id: '15', key: 'pricePerDay', label: 'Giá thuê (VNĐ/ngày)', placeholder: '{{GIA_THUE}}',
    source: 'user', group: 'contract', inputType: 'currency', required: true
  },
  {
    id: '16', key: 'depositAmount', label: 'Tiền cọc (VNĐ)', placeholder: '{{TIEN_COC}}',
    source: 'user', group: 'contract', inputType: 'currency'
  },
  // --- MỚI: CÁC TRƯỜNG TÍNH TOÁN TỰ ĐỘNG ---
  {
    id: '20', key: 'rentalDays', label: 'Số ngày thuê', placeholder: '{{SO_NGAY}}',
    source: 'user', group: 'contract', inputType: 'number'
  },
  {
    id: '21', key: 'totalAmount', label: 'Tổng thành tiền (VNĐ)', placeholder: '{{TONG_TIEN}}',
    source: 'user', group: 'contract', inputType: 'currency'
  },
  
  // --- BIẾN HỆ THỐNG TỰ ĐỘNG (SYSTEM) ---
  {
     id: '17', key: 'createdDate', label: 'Ngày tạo', placeholder: '{{NGAY_TAO}}',
     source: 'system', group: 'contract', inputType: 'text'
  },
  {
     id: '18', key: 'createdMonth', label: 'Tháng tạo', placeholder: '{{THANG_TAO}}',
     source: 'system', group: 'contract', inputType: 'text'
  },
  {
     id: '19', key: 'createdYear', label: 'Năm tạo', placeholder: '{{NAM_TAO}}',
     source: 'system', group: 'contract', inputType: 'text'
  }
];

export const getFields = (): ContractField[] => {
  const stored = localStorage.getItem(FIELDS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(DEFAULT_FIELDS));
    return DEFAULT_FIELDS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_FIELDS;
  }
};

export const saveFields = (fields: ContractField[]) => {
  localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(fields));
};

export const resetFieldsToDefault = () => {
    localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(DEFAULT_FIELDS));
    return DEFAULT_FIELDS;
};