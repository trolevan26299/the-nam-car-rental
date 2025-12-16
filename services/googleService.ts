import { ContractData, GoogleConfig, CarConfig, ContractField, CustomerRecord } from "../types";

declare var google: any;

const GOOGLE_CONFIG_KEY = 'the_nam_google_config';
const TOKEN_STORAGE_KEY = 'the_nam_google_access_token_v3'; 

// --- CẤU HÌNH TỰ ĐỘNG LẤY TỪ .ENV (FALLBACK) ---
// Vite sẽ replace process.env.* tại build time
const ENV_API_KEY = process.env.API_KEY || '';
const ENV_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ENV_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const ENV_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const ENV_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';
const ENV_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const ENV_TEMPLATE_ID = process.env.GOOGLE_DOC_TEMPLATE_ID || '';

// Config mặc định (chỉ dùng khi reset)
const DEFAULT_CONFIG: GoogleConfig = {
  apiKey: '',
  clientId: '', 
  clientSecret: '',
  refreshToken: '',
  spreadsheetId: '',
  folderId: '',
  templateId: ''
};

const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents';

interface StoredToken {
    value: string;
    expiresAt: number;
}

export const getGoogleConfig = (): GoogleConfig => {
  const storedJson = localStorage.getItem(GOOGLE_CONFIG_KEY);
  if (storedJson) {
      try {
          const stored = JSON.parse(storedJson);
          // Logic: Ưu tiên lấy từ LocalStorage (người dùng nhập tay).
          // Nếu LocalStorage trống thì mới thử lấy từ .env
          return {
              apiKey: stored.apiKey || ENV_API_KEY,
              clientId: stored.clientId || ENV_CLIENT_ID,
              clientSecret: stored.clientSecret || ENV_CLIENT_SECRET,
              refreshToken: stored.refreshToken || ENV_REFRESH_TOKEN,
              spreadsheetId: stored.spreadsheetId || ENV_SPREADSHEET_ID,
              folderId: stored.folderId || ENV_FOLDER_ID,
              templateId: stored.templateId || ENV_TEMPLATE_ID
          };
      } catch (e) {
          console.error("Lỗi đọc config từ storage", e);
          return DEFAULT_CONFIG;
      }
  }
  // Nếu chưa có trong storage, trả về Env (nếu có) hoặc rỗng
  return {
      apiKey: ENV_API_KEY,
      clientId: ENV_CLIENT_ID,
      clientSecret: ENV_CLIENT_SECRET,
      refreshToken: ENV_REFRESH_TOKEN,
      spreadsheetId: ENV_SPREADSHEET_ID,
      folderId: ENV_FOLDER_ID,
      templateId: ENV_TEMPLATE_ID
  };
};

export const saveGoogleConfig = (config: GoogleConfig) => {
  localStorage.setItem(GOOGLE_CONFIG_KEY, JSON.stringify(config));
};

// --- HELPER: XỬ LÝ ẢNH DRIVE ---
const getDriveIdFromUrl = (url: string): string | null => {
    if (!url) return null;
    let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
};

const convertToPreviewUrl = (originalUrl: string): string => {
    const id = getDriveIdFromUrl(originalUrl);
    if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    return originalUrl;
};

// --- AUTHENTICATION ---

const refreshAccessTokenSilent = async (): Promise<string | null> => {
    // Lấy config mới nhất từ LocalStorage
    const config = getGoogleConfig();
    const clientId = config.clientId;
    const clientSecret = config.clientSecret;
    const refreshToken = config.refreshToken;

    if (!clientId) {
        console.error("❌ THIẾU CLIENT ID: Vui lòng cấu hình trong Settings.");
        return null;
    }

    if (!clientSecret || !refreshToken) {
        console.warn("⚠️ Chưa cấu hình Client Secret hoặc Refresh Token trong Settings. Không thể chạy ngầm.");
        return null;
    }

    try {
        console.log("🔄 Đang thử lấy Token từ Refresh Token (Chạy ngầm)...");
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("❌ Lỗi Refresh Token:", errText);
            return null;
        }

        const data = await response.json();
        console.log("✅ Đã lấy được Access Token mới từ Refresh Token!");
        return data.access_token;
    } catch (e) {
        console.error("Lỗi kết nối khi refresh token:", e);
        return null;
    }
};

export const requestAccessToken = async (allowPopup: boolean = true): Promise<string> => {
  const storedTokenJson = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (storedTokenJson) {
      const storedToken: StoredToken = JSON.parse(storedTokenJson);
      // Trừ hao 1 phút
      if (Date.now() < storedToken.expiresAt - 60000) {
          return storedToken.value;
      }
  }

  // Thử refresh token trước
  const silentToken = await refreshAccessTokenSilent();
  if (silentToken) {
      const expiresAt = Date.now() + (3599 * 1000); 
      const newToken: StoredToken = { value: silentToken, expiresAt: expiresAt };
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newToken));
      return silentToken;
  }

  // Nếu không cho popup (khi chạy ngầm), throw error
  if (!allowPopup) {
      throw new Error("Không thể xác thực ngầm (Thiếu Refresh Token hoặc Token hết hạn). Vui lòng tải lại trang hoặc cấu hình lại.");
  }

  // Fallback: Popup
  return new Promise((resolve, reject) => {
    const config = getGoogleConfig();
    const clientId = config.clientId;

    if (!clientId) {
      alert("CHƯA CẤU HÌNH CLIENT ID!\n\nVui lòng vào phần Cài đặt (Icon bánh răng) -> Cấu hình Google Cloud để nhập Client ID.");
      reject(new Error("Chưa cấu hình Google Client ID."));
      return;
    }

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
         reject(new Error("Thư viện Google chưa tải xong. Vui lòng reload trang."));
         return;
    }

    console.log("⚠️ Đang mở Popup xin quyền truy cập...");
    // @ts-ignore
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          const expiresInSeconds = tokenResponse.expires_in || 3599;
          const expiresAt = Date.now() + (expiresInSeconds * 1000);
          const newToken: StoredToken = { value: tokenResponse.access_token, expiresAt: expiresAt };
          localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newToken));
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error("Người dùng đã đóng Popup hoặc không cấp quyền."));
        }
      },
      error_callback: (err: any) => {
          console.error("GSI Error:", err);
          reject(new Error("Lỗi khi kết nối Google: " + JSON.stringify(err)));
      }
    });
    // @ts-ignore
    client.requestAccessToken();
  });
};

// --- HELPER HTML WRAPPER ---
const wrapHtmlForDoc = (htmlContent: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
                font-family: 'Times New Roman', serif; 
                font-size: 12pt; 
                line-height: 1.5;
            }
            table { border-collapse: collapse; width: 100%; }
            td, th { padding: 6px; vertical-align: top; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;
};

// --- FOLDER MANAGEMENT ---

const findOrCreateFolder = async (folderName: string, parentId: string, accessToken: string): Promise<string> => {
    const safeName = folderName.replace(/'/g, "\\'");
    const query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and '${parentId}' in parents and trashed=false`;
    
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id; 
        }
    }

    const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
    };
    
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
    });

    if (!createRes.ok) {
        throw new Error(`Không thể tạo thư mục khách hàng: ${await createRes.text()}`);
    }

    const createData = await createRes.json();
    return createData.id;
};

// --- CORE FUNCTIONS ---

export const saveMasterTemplate = async (htmlContent: string): Promise<string> => {
    const config = getGoogleConfig();
    const token = await requestAccessToken(true); 
    
    const fullHtml = wrapHtmlForDoc(htmlContent);
    const blob = new Blob([fullHtml], { type: 'text/html' });
    
    if (config.templateId) {
        try {
             const metadata = { mimeType: 'application/vnd.google-apps.document' };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${config.templateId}?uploadType=multipart`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });

            if (response.ok) return config.templateId;
        } catch (e) {
            console.warn("Lỗi update template, tạo mới...", e);
        }
    }

    const metadata = {
        name: 'Mẫu Hợp Đồng Gốc (Thế Nam)',
        parents: [config.folderId],
        mimeType: 'application/vnd.google-apps.document'
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
    });

    if (!response.ok) throw new Error("Không thể tạo file mẫu trên Google Drive.");

    const data = await response.json();
    const newId = data.id;
    saveGoogleConfig({ ...config, templateId: newId });

    return newId;
};

export const loadMasterTemplate = async (): Promise<string | null> => {
    const config = getGoogleConfig();
    if (!config.templateId) return null;
    
    try {
        const token = await requestAccessToken(false); 
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${config.templateId}/export?mimeType=text/html`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error("Lỗi tải mẫu hợp đồng từ Drive");
        }

        const fullHtml = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(fullHtml, 'text/html');
        return doc.body.innerHTML || "";
    } catch (e) {
        console.warn("Chưa tải được template từ cloud:", e);
        return null;
    }
};

const uploadFileToDrive = async (file: File, folderId: string, accessToken: string, customName?: string): Promise<string> => {
  const fileName = customName || file.name;
  const metadata = { name: fileName, parents: [folderId] };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: form
  });

  if (!response.ok) throw new Error(`Upload ảnh thất bại: ${await response.text()}`);
  const data = await response.json();
  return data.webViewLink;
};

const createDocFromHtml = async (title: string, htmlContent: string, folderId: string, accessToken: string): Promise<string> => {
    const metadata = {
        name: title,
        parents: [folderId],
        mimeType: 'application/vnd.google-apps.document'
    };

    const fullHtml = wrapHtmlForDoc(htmlContent);
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fullHtml], { type: 'text/html' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Drive API Error:", errorText);
        throw new Error(`Lỗi tạo hợp đồng (Drive): ${errorText}`);
    }

    const data = await response.json();
    return `https://docs.google.com/document/d/${data.id}/edit`;
};

// --- SHEET HELPERS ---

const normalizeKey = (key: string) => key.trim().toLowerCase();

const getValueForHeader = (header: string, dataMap: Record<string, string>) => {
    const normalizedHeader = normalizeKey(header);
    const matchedKey = Object.keys(dataMap).find(k => normalizeKey(k) === normalizedHeader);
    return matchedKey ? dataMap[matchedKey] : "";
};

const fetchAllRows = async (spreadsheetId: string, sheetName: string, accessToken: string): Promise<string[][]> => {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.values || [];
};

const fetchRow = async (spreadsheetId: string, range: string, accessToken: string): Promise<string[]> => {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.values && data.values[0]) ? data.values[0] : [];
};

const updateRow = async (spreadsheetId: string, range: string, values: string[], accessToken: string) => {
    const body = { values: [values] };
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
};

const appendToSheet = async (values: string[], spreadsheetId: string, sheetName: string, accessToken: string) => {
  const range = `${sheetName}!A:A`;
  const body = { values: [values] };
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) throw new Error(`Ghi Sheet thất bại: ${await response.text()}`);
};

// --- MAIN PROCESS ---

export const generateAndSaveContract = async (
  finalHtmlContent: string,
  contractData: ContractData,
  frontImage: File | null,
  backImage: File | null,
  fields: ContractField[] 
): Promise<{ docUrl: string; sheetStatus: string }> => {
  const config = getGoogleConfig();
  const token = await requestAccessToken(true); 
  
  const nameKey = fields.find(f => f.key === 'ho_ten')?.key || 'ho_ten';
  const cccdKey = fields.find(f => f.key === 'so_cccd')?.key || 'so_cccd';
  
  const dobKey = fields.find(f => f.key === 'ngay_sinh')?.key || 'ngay_sinh';
  const genderKey = fields.find(f => f.key === 'gioi_tinh')?.key || 'gioi_tinh';
  const nationKey = fields.find(f => f.key === 'quoc_tich')?.key || 'quoc_tich';
  const hometownKey = fields.find(f => f.key === 'que_quan')?.key || 'que_quan';
  const addressKey = fields.find(f => f.key === 'dia_chi_thuong_tru')?.key || 'dia_chi_thuong_tru';
  const issueDateKey = fields.find(f => f.key === 'ngay_cap')?.key || 'ngay_cap';
  const expiryDateKey = fields.find(f => f.key === 'co_gia_tri_den')?.key || 'co_gia_tri_den';

  const customerName = contractData[nameKey] || 'KHACH_HANG';
  const customerCCCD = contractData[cccdKey] || 'KHONG_SO';

  const folderName = `${customerName} - ${customerCCCD}`;
  let targetFolderId = config.folderId;
  
  try {
      targetFolderId = await findOrCreateFolder(folderName, config.folderId, token);
  } catch (folderErr) {
      console.error("Lỗi tạo folder con, dùng folder gốc.", folderErr);
  }

  let frontLink = "", backLink = "";
  const uploadPromises = [];
  
  const frontName = `${customerCCCD} - ${customerName} - Mặt Trước`;
  const backName = `${customerCCCD} - ${customerName} - Mặt Sau`;

  if (frontImage) uploadPromises.push(uploadFileToDrive(frontImage, targetFolderId, token, frontName).then(l => frontLink = l));
  if (backImage) uploadPromises.push(uploadFileToDrive(backImage, targetFolderId, token, backName).then(l => backLink = l));
  
  await Promise.all(uploadPromises);

  const docTitle = `Hợp Đồng - ${customerName}`;
  const contractUrl = await createDocFromHtml(docTitle, finalHtmlContent, targetFolderId, token);

  if (config.spreadsheetId) {
      const SHEET_CONTRACT = 'HopDong';
      const CONTRACT_HEADERS_DEFAULT = ['Thời gian tạo', 'Họ tên khách hàng', 'Số CCCD', 'Link File Hợp đồng'];

      const contractDataMap: Record<string, string> = {
          'Thời gian tạo': new Date().toLocaleString('vi-VN'),
          'Họ tên khách hàng': customerName,
          'Số CCCD': `'${customerCCCD}`,
          'Link File Hợp đồng': contractUrl
      };

      try {
          let contractHeaders = await fetchRow(config.spreadsheetId, `${SHEET_CONTRACT}!1:1`, token);
          if (contractHeaders.length === 0) {
              contractHeaders = CONTRACT_HEADERS_DEFAULT;
              await updateRow(config.spreadsheetId, `${SHEET_CONTRACT}!1:1`, contractHeaders, token);
          }
          const contractRow = contractHeaders.map(header => getValueForHeader(header, contractDataMap));
          await appendToSheet(contractRow, config.spreadsheetId, SHEET_CONTRACT, token);
      } catch (e) {
          console.error("Lỗi lưu Sheet HopDong:", e);
      }

      const SHEET_CUSTOMER = 'KhachHang';
      const CUSTOMER_HEADERS_DEFAULT = [
          'Số CCCD', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Quốc tịch', 'Quê quán', 'Nơi thường trú', 'Ngày cấp', 'Có giá trị đến', 'Link Ảnh Trước', 'Link Ảnh Sau', 'Ngày tạo', 'Cập nhật cuối'
      ];

      try {
          const allRows = await fetchAllRows(config.spreadsheetId, SHEET_CUSTOMER, token);
          let customerHeaders = allRows[0] || [];
          
          if (customerHeaders.length === 0) {
              customerHeaders = CUSTOMER_HEADERS_DEFAULT;
              await updateRow(config.spreadsheetId, `${SHEET_CUSTOMER}!1:1`, customerHeaders, token);
          }

          const findIdx = (name: string) => customerHeaders.findIndex(h => normalizeKey(h) === normalizeKey(name));
          const cccdColIdx = findIdx('Số CCCD');
          const createdColIdx = findIdx('Ngày tạo');
          const frontImgColIdx = findIdx('Link Ảnh Trước');
          const backImgColIdx = findIdx('Link Ảnh Sau');

          let existingRowIndex = -1;
          let existingCreatedDate = '';
          let existingFrontLink = '';
          let existingBackLink = '';

          if (cccdColIdx !== -1) {
              for (let i = 1; i < allRows.length; i++) {
                  const rowCCCD = (allRows[i][cccdColIdx] || '').replace(/^'/, '');
                  if (rowCCCD === customerCCCD) {
                      existingRowIndex = i;
                      if (createdColIdx !== -1) existingCreatedDate = allRows[i][createdColIdx];
                      if (frontImgColIdx !== -1) existingFrontLink = allRows[i][frontImgColIdx];
                      if (backImgColIdx !== -1) existingBackLink = allRows[i][backImgColIdx];
                      break;
                  }
              }
          }

          const now = new Date().toLocaleString('vi-VN');
          const finalFrontLink = frontLink || existingFrontLink;
          const finalBackLink = backLink || existingBackLink;

          const customerDataMap: Record<string, string> = {
              'Số CCCD': `'${customerCCCD}`, 
              'Họ và tên': customerName,
              'Ngày sinh': contractData[dobKey] || '', 
              'Giới tính': contractData[genderKey] || '',
              'Quốc tịch': contractData[nationKey] || '',
              'Quê quán': contractData[hometownKey] || '',
              'Nơi thường trú': contractData[addressKey] || '',
              'Ngày cấp': contractData[issueDateKey] || '',
              'Có giá trị đến': contractData[expiryDateKey] || '',
              'Link Ảnh Trước': finalFrontLink,
              'Link Ảnh Sau': finalBackLink,
              'Ngày tạo': existingCreatedDate || now,
              'Cập nhật cuối': now
          };

          const customerRow = customerHeaders.map(header => getValueForHeader(header, customerDataMap));

          if (existingRowIndex !== -1) {
              const range = `${SHEET_CUSTOMER}!A${existingRowIndex + 1}`;
              await updateRow(config.spreadsheetId, range, customerRow, token);
          } else {
              await appendToSheet(customerRow, config.spreadsheetId, SHEET_CUSTOMER, token);
          }

      } catch (e) {
          console.error("Lỗi lưu Sheet KhachHang:", e);
          throw new Error("Có lỗi khi lưu thông tin vào Sheet Khách Hàng.");
      }
  }

  return { 
      docUrl: contractUrl,
      sheetStatus: config.spreadsheetId ? "Đã lưu vào Sheet" : "Chưa cấu hình Sheet"
  };
};

export const fetchCustomersFromCloud = async (): Promise<CustomerRecord[]> => {
    const config = getGoogleConfig();
    if (!config.spreadsheetId) return [];
    
    const SHEET_CUSTOMER = 'KhachHang'; 
    try {
        const token = await requestAccessToken(false); 
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${SHEET_CUSTOMER}!A:Z`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        const rows = data.values;
        if (!rows || rows.length < 2) return [];

        const headers = rows[0] as string[];
        const getIdx = (colName: string) => headers.findIndex(h => normalizeKey(h) === normalizeKey(colName));

        const nameIdx = getIdx('Họ và tên');
        const cccdIdx = getIdx('Số CCCD');
        const dobIdx = getIdx('Ngày sinh');
        const genderIdx = getIdx('Giới tính');
        const nationIdx = getIdx('Quốc tịch');
        const hometownIdx = getIdx('Quê quán');
        const addressIdx = getIdx('Nơi thường trú');
        const issueIdx = getIdx('Ngày cấp');
        const expiryIdx = getIdx('Có giá trị đến');
        const frontIdx = getIdx('Link Ảnh Trước');
        const backIdx = getIdx('Link Ảnh Sau');

        if (nameIdx === -1 || cccdIdx === -1) return [];

        const customers: CustomerRecord[] = rows.slice(1).map((row: any[]) => ({
            name: row[nameIdx] || '',
            cccd: (row[cccdIdx] || '').replace(/^'/, ''), 
            dob: dobIdx !== -1 ? row[dobIdx] : '',
            gender: genderIdx !== -1 ? row[genderIdx] : '',
            nationality: nationIdx !== -1 ? row[nationIdx] : '',
            hometown: hometownIdx !== -1 ? row[hometownIdx] : '',
            address: addressIdx !== -1 ? row[addressIdx] : '',
            issueDate: issueIdx !== -1 ? row[issueIdx] : '',
            expiryDate: expiryIdx !== -1 ? row[expiryIdx] : '',
            frontUrl: frontIdx !== -1 ? convertToPreviewUrl(row[frontIdx]) : '',
            backUrl: backIdx !== -1 ? convertToPreviewUrl(row[backIdx]) : ''
        })).filter((c: CustomerRecord) => c.name && c.cccd);

        const uniqueCustomers = new Map<string, CustomerRecord>();
        customers.forEach((c: CustomerRecord) => uniqueCustomers.set(c.cccd, c));

        return Array.from(uniqueCustomers.values()).reverse(); 
    } catch (e) {
        console.warn("Chưa tải được danh sách khách hàng:", e);
        return [];
    }
};

export const syncFleetToSheet = async (fleet: CarConfig[]) => {
    const config = getGoogleConfig();
    if (!config.spreadsheetId) return;
    const token = await requestAccessToken(true);
    const range = "Xe!A:E";
    const body = { range, values: [["ID", "Tên Xe", "Biển Số", "Màu", "Giá Thuê"], ...fleet.map(c => [c.id, c.name, c.plate, c.color, c.price])] };
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
};

export const fetchFleetFromCloud = async (): Promise<CarConfig[]> => {
    const config = getGoogleConfig();
    if (!config.spreadsheetId) return [];
    try {
        const token = await requestAccessToken(false);
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Xe!A2:E`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) return [];
        const data = await response.json();
        return (data.values || []).map((row: any[]) => ({ id: row[0] || Date.now().toString(), name: row[1] || '', plate: row[2] || '', color: row[3] || '', price: parseFloat(row[4] || '0') }));
    } catch(e) {
         console.warn("Chưa tải được danh sách xe:", e);
         return [];
    }
};

export const syncFieldsToSheet = async (fields: ContractField[]) => {
    const config = getGoogleConfig();
    if (!config.spreadsheetId) return;
    const token = await requestAccessToken(true);
    const range = "CauHinh!A:I";
    const header = ["ID", "Key", "Label", "Placeholder", "Source", "Group", "InputType", "Required", "AIDescription"];
    const rows = fields.map(f => [
        f.id,
        f.key,
        f.label,
        f.placeholder,
        f.source,
        f.group,
        f.inputType,
        f.required ? "TRUE" : "FALSE",
        f.aiDescription || ""
    ]);
    const body = { range, values: [header, ...rows] };
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
};

export const fetchFieldsFromCloud = async (): Promise<ContractField[]> => {
    const config = getGoogleConfig();
    if (!config.spreadsheetId) return [];
    try {
        const token = await requestAccessToken(false);
        const range = "CauHinh!A2:I"; 
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Không thể tải cấu hình từ Sheet");
        const data = await response.json();
        const rows = data.values;
        if (!rows || rows.length === 0) return [];
        return rows.map((row: any[]) => ({
            id: row[0] || Date.now().toString(),
            key: row[1] || '',
            label: row[2] || '',
            placeholder: row[3] || '',
            source: row[4] as any || 'user',
            group: row[5] as any || 'customer',
            inputType: row[6] as any || 'text',
            required: row[7] === 'TRUE',
            aiDescription: row[8] || undefined
        }));
    } catch (e) {
        console.warn("Chưa tải được cấu hình fields:", e);
        return [];
    }
};
