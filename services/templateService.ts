import { saveMasterTemplate, loadMasterTemplate } from "./googleService";

const TEMPLATE_KEY = 'the_nam_contract_template_html';

const DEFAULT_TEMPLATE = `
<div style="text-align: center;">
    <p><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
    <span style="text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</span></p>
    <br>
    <h2><strong>HỢP ĐỒNG THUÊ XE TỰ LÁI</strong></h2>
    <p><em>Số: {{NGAY_TAO}}{{THANG_TAO}}/HĐTX-TN</em></p>
</div>
<br>
<p>Hôm nay, ngày {{NGAY_TAO}} tháng {{THANG_TAO}} năm {{NAM_TAO}}, tại Cửa hàng Thế Nam, chúng tôi gồm:</p>
<br>
<p><strong>BÊN A (BÊN CHO THUÊ): CỬA HÀNG THẾ NAM</strong><br>
Đại diện: <strong>Nguyễn Thế Nam</strong><br>
Địa chỉ: Hà Nội, Việt Nam<br>
Điện thoại: 0912.345.678</p>
<br>
<p><strong>BÊN B (BÊN THUÊ XE):</strong><br>
Ông/Bà: <strong>{{HO_TEN}}</strong><br>
Sinh ngày: {{NGAY_SINH}}<br>
Số CCCD: <strong>{{SO_CCCD}}</strong><br>
Thường trú: {{THUONG_TRU}}</p>
<br>
<p><strong>NỘI DUNG HỢP ĐỒNG:</strong></p>
<p>Bên A đồng ý cho Bên B thuê xe ô tô với thông tin sau:</p>
<ul>
    <li>Loại xe: <strong>{{TEN_XE}}</strong></li>
    <li>Biển kiểm soát: <strong>{{BIEN_SO}}</strong></li>
    <li>Màu xe: {{MAU_XE}}</li>
</ul>
<p>Thời gian thuê: Từ ngày <strong>{{NGAY_THUE}}</strong> đến ngày <strong>{{NGAY_TRA}}</strong>.</p>
<p>Giá thuê: <strong>{{GIA_THUE}}</strong> / ngày.</p>
<p>Đặt cọc: Bên B đặt cọc số tiền <strong>{{TIEN_COC}}</strong>.</p>
<br>
<br>
<table style="width: 100%; border-collapse: collapse; border: none;">
    <tr>
        <td style="text-align: center; width: 50%;"><strong>ĐẠI DIỆN BÊN A</strong><br><em>(Ký, ghi rõ họ tên)</em><br><br><br><br><strong>Nguyễn Thế Nam</strong></td>
        <td style="text-align: center; width: 50%;"><strong>ĐẠI DIỆN BÊN B</strong><br><em>(Ký, ghi rõ họ tên)</em><br><br><br><br><strong>{{HO_TEN}}</strong></td>
    </tr>
</table>
`;

// Lấy template local (dùng cho hiển thị ngay lập tức)
export const getTemplate = (): string => {
  return localStorage.getItem(TEMPLATE_KEY) || DEFAULT_TEMPLATE;
};

// Lưu template local
export const saveTemplate = (html: string) => {
  localStorage.setItem(TEMPLATE_KEY, html);
};

export const resetTemplate = () => {
    saveTemplate(DEFAULT_TEMPLATE);
    return DEFAULT_TEMPLATE;
};

// ĐỒNG BỘ LÊN CLOUD (GOOGLE DOC MASTER)
export const syncTemplateToCloud = async (html: string) => {
    // Gọi hàm bên googleService để update/create file Doc
    const docId = await saveMasterTemplate(html);
    return docId;
};

// TẢI TỪ CLOUD (GOOGLE DOC MASTER)
export const fetchTemplateFromCloud = async (): Promise<string | null> => {
    const html = await loadMasterTemplate();
    return html;
};