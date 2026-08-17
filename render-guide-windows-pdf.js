import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapterDir = path.join(__dirname, 'packages', 'adapter-hyperframes');
const req = createRequire(path.join(adapterDir, 'package.json'));
const { chromium } = req('playwright');

const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hướng Dẫn Cài Đặt & Sử Dụng GO4AI AI Video Studio Cho Windows</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

    @page {
      size: A4;
      margin: 14mm 16mm 14mm 16mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #94A3B8;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.55;
      color: #1E293B;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-container {
      width: 100%;
    }

    /* HEADER */
    .header {
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-left {
      flex: 1;
    }

    .app-brand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #EFF6FF;
      color: #1E40AF;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 3px 9px;
      border-radius: 9999px;
      margin-bottom: 6px;
    }

    .main-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    .sub-title {
      font-size: 9pt;
      color: #64748B;
      font-weight: 500;
      margin-top: 3px;
    }

    /* META BAR */
    .meta-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 18px;
    }

    .meta-item {
      font-size: 8pt;
    }

    .meta-label {
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 1px;
    }

    .meta-val {
      color: #0F172A;
      font-weight: 600;
    }

    /* SECTIONS */
    .section {
      margin-bottom: 18px;
    }

    .section-title {
      font-size: 11.5pt;
      font-weight: 800;
      color: #1E40AF;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1.5px solid #DBEAFE;
      padding-bottom: 5px;
      margin-bottom: 10px;
    }

    .section-title span.num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: #1E40AF;
      color: #FFFFFF;
      border-radius: 6px;
      font-size: 8pt;
      font-weight: 800;
    }

    /* CALLOUT BOXES */
    .callout {
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0;
      font-size: 9pt;
      line-height: 1.5;
    }

    .callout-success {
      background: #ECFDF5;
      border-left: 4px solid #059669;
      color: #065F46;
    }

    .callout-warning {
      background: #FFFBEB;
      border-left: 4px solid #D97706;
      color: #92400E;
    }

    .callout-info {
      background: #F0F9FF;
      border-left: 4px solid #0284C7;
      color: #0369A1;
    }

    .callout-title {
      font-weight: 700;
      font-size: 9.5pt;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* STEP CARDS */
    .step-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 11px 13px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .step-badge {
      background: #0284C7;
      color: #FFFFFF;
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .step-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0F172A;
    }

    .step-content {
      font-size: 9pt;
      color: #334155;
      padding-left: 2px;
    }

    .step-content ol, .step-content ul {
      margin-left: 18px;
      margin-top: 4px;
    }

    .step-content li {
      margin-bottom: 3px;
    }

    /* CODE BOX */
    .code-box {
      background: #0F172A;
      color: #F8FAFC;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 6px 0;
      display: block;
      word-break: break-all;
    }

    /* TROUBLESHOOTING GRID */
    .faq-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .faq-card {
      border: 1px solid #FEE2E2;
      background: #FFF5F5;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .faq-q {
      font-weight: 700;
      font-size: 9pt;
      color: #991B1B;
      margin-bottom: 4px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }

    .faq-a {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.45;
      padding-left: 18px;
    }

    .faq-a strong {
      color: #0F172A;
    }

    /* FOOTER */
    .footer {
      margin-top: 20px;
      border-top: 1px solid #E2E8F0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #64748B;
    }

    .contact-badge {
      background: #EFF6FF;
      color: #1D4ED8;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 600;
    }

    .highlight {
      background: #FEF08A;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 600;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <div class="page-container">
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <div class="app-brand">💻 GO4AI AI Video Studio • Hướng dẫn Windows 10 & 11</div>
        <div class="main-title">Cẩm Nang Cài Đặt & Sử Dụng Cho Máy Windows</div>
        <div class="sub-title">Dành cho người mới bắt đầu (No-code / Zero Tech) • Tự động tải & chạy 100%</div>
      </div>
    </div>

    <!-- META BAR -->
    <div class="meta-bar">
      <div class="meta-item">
        <div class="meta-label">💻 Thiết bị hỗ trợ</div>
        <div class="meta-val">Windows 10 / Windows 11 (64-bit)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">⚡ Cơ chế hoạt động</div>
        <div class="meta-val">Local Render (Bảo mật 100% trên máy)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">📧 Email hỗ trợ</div>
        <div class="meta-val">hocvien@go4ai.life</div>
      </div>
    </div>

    <!-- LỜI MỞ ĐẦU -->
    <div class="callout callout-success">
      <div class="callout-title">🌟 Dành Riêng Cho Người Dùng No-Code:</div>
      <div>
        Bạn <strong>không cần biết lập trình</strong>, không cần cài đặt môi trường phức tạp trước. GO4AI Studio trên Windows đã tích hợp sẵn tính năng tự động tải môi trường chạy (Node.js portable), bộ dựng video FFmpeg và giọng đọc AI. Bạn chỉ cần thực hiện 3 bước đơn giản dưới đây!
      </div>
    </div>

    <!-- PHẦN 1: 3 BƯỚC CÀI ĐẶT -->
    <div class="section">
      <div class="section-title"><span class="num">1</span> 3 Bước Mở Ứng Dụng Lần Đầu Tiên</div>

      <!-- BƯỚC 1 -->
      <div class="step-card">
        <div class="step-header">
          <span class="step-badge">BƯỚC 1</span>
          <span class="step-title">Tải bộ phần mềm từ GitHub và Giải nén</span>
        </div>
        <div class="step-content">
          <ol>
            <li>Truy cập link tải chính thức: <strong style="color: #2563EB;">https://github.com/tbxaigen-design/go4ai-ai-video</strong></li>
            <li>Nhìn sang góc phải màn hình, bấm vào nút màu xanh lá cây <span class="highlight">&lt; &gt; Code</span>.</li>
            <li>Trong bảng menu hiện ra, bấm vào dòng chữ <strong style="color: #0F172A;">Download ZIP</strong>.</li>
            <li>Sau khi tải xong, vào thư mục <strong>Downloads</strong> ➔ Click chuột phải vào file <code style="background: #F1F5F9; padding: 2px 4px; border-radius: 4px;">go4ai-ai-video-main.zip</code> ➔ Chọn <strong>"Extract All..." (Giải nén tất cả)</strong> ➔ Bấm <strong>Extract</strong> để giải nén ra thư mục.</li>
          </ol>
        </div>
      </div>

      <!-- BƯỚC 2 -->
      <div class="step-card">
        <div class="step-header">
          <span class="step-badge">BƯỚC 2</span>
          <span class="step-title">Khởi động bằng file 1-Chay-Tren-Windows.bat</span>
        </div>
        <div class="step-content">
          <p>Mở thư mục vừa giải nén, bạn tìm file có biểu tượng bánh răng tên <strong>1-Chay-Tren-Windows.bat</strong>.</p>
          <ol style="margin-top: 4px;">
            <li><strong>Nhấp đúp chuột (Double-click)</strong> vào file <code style="background: #F1F5F9; padding: 2px 4px; border-radius: 4px;">1-Chay-Tren-Windows.bat</code>.</li>
          </ol>

          <div class="callout callout-warning" style="margin: 6px 0 8px 0; padding: 8px 10px;">
            <div class="callout-title" style="font-size: 8.5pt;">🛡️ NẾU WINDOWS HIỆN HỘP THOẠI XANH "Windows protected your PC":</div>
            <div style="font-size: 8.5pt;">
              1. Bấm vào dòng chữ <strong>"More info"</strong> (hoặc <em>Thông tin khác</em>).<br/>
              2. Bấm tiếp nút <strong>"Run anyway"</strong> (hoặc <em>Vẫn chạy</em>).
            </div>
          </div>
          <p style="font-size: 8.5pt; color: #64748B;">
            👉 <em>Một cửa sổ màu đen (Command Prompt) sẽ xuất hiện và tự động tải thư viện, bộ render FFmpeg, Chromium và giọng đọc AI (khoảng 2–4 phút). Vui lòng <strong>KHÔNG TẮT</strong> cửa sổ này!</em>
          </p>
        </div>
      </div>

      <!-- BƯỚC 3 -->
      <div class="step-card">
        <div class="step-header">
          <span class="step-badge">BƯỚC 3</span>
          <span class="step-title">Trình duyệt tự động mở giao diện Studio</span>
        </div>
        <div class="step-content">
          <p>Sau khi chuẩn bị xong, trình duyệt mặc định (Chrome / Edge / Cốc Cốc) sẽ tự động mở trang:</p>
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-weight: 700; color: #1E40AF; margin: 4px 0; font-size: 9pt;">
            🌐 http://127.0.0.1:3075
          </div>
          <p style="font-size: 8.5pt; color: #475569;">
            Giao diện GO4AI Studio xuất hiện — bạn đã có thể chọn mẫu template, viết kịch bản và xuất video ngay!
          </p>
        </div>
      </div>
    </div>

    <!-- PAGE BREAK FOR CLEAN PRINTING -->
    <div class="page-break"></div>

    <!-- HEADER TRANG 2 -->
    <div class="header" style="padding-bottom: 10px; margin-bottom: 14px;">
      <div class="header-left">
        <div class="main-title" style="font-size: 13pt;">Cẩm Nang Sử Dụng & Xử Lý Sự Cố Trên Windows</div>
      </div>
      <div class="contact-badge">GO4AI Studio Beta 1.0</div>
    </div>

    <!-- PHẦN 2: SỬ DỤNG HÀNG NGÀY & CẬP NHẬT -->
    <div class="section">
      <div class="section-title"><span class="num">2</span> Sử Dụng Hàng Ngày & Cập Nhật Phiên Bản</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div class="step-card" style="margin-bottom: 0;">
          <div class="step-header">
            <span class="step-badge" style="background: #059669;">MỞ HÀNG NGÀY</span>
          </div>
          <div class="step-content" style="font-size: 8.5pt;">
            Từ lần thứ 2 trở đi, chỉ cần <strong>nhấp đúp</strong> vào <code style="background: #F1F5F9; padding: 1px 3px;">1-Chay-Tren-Windows.bat</code>. App sẽ mở ngay trong 2–3 giây.<br/>
            💡 <em>Mẹo: Click chuột phải vào file .bat ➔ Send to ➔ Desktop để tạo shortcut ra màn hình chính.</em>
          </div>
        </div>

        <div class="step-card" style="margin-bottom: 0;">
          <div class="step-header">
            <span class="step-badge" style="background: #DC2626;">TẮT ỨNG DỤNG</span>
          </div>
          <div class="step-content" style="font-size: 8.5pt;">
            Khi làm việc xong, bạn quay lại cửa sổ màu đen và bấm phím <code style="background: #FEE2E2; padding: 1px 3px; font-weight: 700;">Ctrl + C</code> hoặc bấm nút <strong>[X]</strong> ở góc phải cửa sổ đen để đóng.
          </div>
        </div>
      </div>

      <div class="callout callout-info" style="margin-top: 6px;">
        <div class="callout-title">🔄 Cập Nhật Phiên Bản Mới (OTA Update chỉ 1 thao tác):</div>
        <div>
          Khi GO4AI phát hành bản nâng cấp hoặc template mới: <strong>Nhấp đúp vào file <code style="background: #E0F2FE; padding: 1px 4px; border-radius: 3px;">2-Cap-Nhat-Windows.bat</code></strong>. Hệ thống sẽ tự động đồng bộ bản mới trong 30–60 giây mà <strong>KHÔNG làm mất dự án/video</strong> đã tạo.
        </div>
      </div>
    </div>

    <!-- PHẦN 3: XỬ LÝ SỰ CỐ -->
    <div class="section">
      <div class="section-title"><span class="num">3</span> Bảng Giải Cứu: Xử Lý Các Sự Cố Thường Gặp Trên Windows</div>

      <div class="faq-grid">
        <!-- LỖI 1 -->
        <div class="faq-card">
          <div class="faq-q">🔴 1. Windows hiện bảng xanh "Windows protected your PC" (SmartScreen)</div>
          <div class="faq-a">
            Đây là cơ chế cảnh báo của Windows khi mở file .bat tải từ web về.<br/>
            👉 <strong>Cách xử lý:</strong> Bấm vào dòng chữ <strong>"More info"</strong> (Thông tin khác) ➔ Bấm tiếp nút <strong>"Run anyway"</strong> (Vẫn chạy).
          </div>
        </div>

        <!-- LỖI 2 -->
        <div class="faq-card">
          <div class="faq-q">🔴 2. Lỗi mạng khi tự động tải Node.js portable</div>
          <div class="faq-a">
            Nếu đường truyền mạng bị ngắt quãng giữa chừng khi tải Node.js tự động:<br/>
            👉 <strong>Cách xử lý:</strong> Truy cập website <strong>https://nodejs.org/en/download</strong> ➔ Chọn tải <strong>"Windows Installer (.msi)"</strong> ➔ Cài đặt theo hướng dẫn (bấm Next) ➔ Sau đó mở lại file <code style="background: #F1F5F9; padding: 1px 3px;">1-Chay-Tren-Windows.bat</code>.
          </div>
        </div>

        <!-- LỖI 3 -->
        <div class="faq-card">
          <div class="faq-q">🔴 3. Báo lỗi cổng "Port 3075 already in use"</div>
          <div class="faq-a">
            Do có một phiên bản app đang chạy ngầm trong máy.<br/>
            👉 <strong>Cách xử lý:</strong> Nhấn tổ hợp phím <code style="background: #F1F5F9; padding: 1px 3px;">Ctrl + Shift + Esc</code> để mở <strong>Task Manager</strong> ➔ Tìm mục <strong>Node.js</strong> hoặc <strong>node.exe</strong> ➔ Click chuột phải chọn <strong>End task</strong> ➔ Mở lại file .bat.
          </div>
        </div>

        <!-- LỖI 4 -->
        <div class="faq-card">
          <div class="faq-q">🔴 4. Cài đặt lần đầu tải lâu quá (hơn 5 phút)</div>
          <div class="faq-a">
            Quá trình lần đầu tiên cần tải khoảng 200–300MB thư viện và công cụ render video FFmpeg/Chromium. Bạn hãy kiểm tra lại kết nối mạng Wifi/LAN và giữ nguyên cửa sổ đen cho đến khi hoàn tất.
          </div>
        </div>
      </div>
    </div>

    <!-- PHẦN 4: LIÊN HỆ & FOOTER -->
    <div class="footer">
      <div>
        <strong>Trung Tâm Hỗ Trợ GO4AI:</strong> Email <a href="mailto:hocvien@go4ai.life" style="color: #2563EB; font-weight: 600; text-decoration: none;">hocvien@go4ai.life</a> • Website <a href="https://go4ai.life" style="color: #2563EB; font-weight: 600; text-decoration: none;">go4ai.life</a>
      </div>
      <div>
        <em>GO4AI Video Studio © 2026</em>
      </div>
    </div>

  </div>

</body>
</html>
`;

async function generateWindowsPdf() {
  console.log('[*] Khoi dong trinh duyet render PDF cho Windows...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const pdfPath = path.join(__dirname, 'HUONG-DAN-CAI-DAT-WINDOWS.pdf');
  console.log('[*] Dang xuat file PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '14mm',
      right: '14mm',
    },
  });

  await browser.close();
  console.log(`[OK] Da tao thanh cong file PDF: ${pdfPath}`);
}

generateWindowsPdf().catch((err) => {
  console.error('[LOI] Khong the tao PDF:', err);
  process.exit(1);
});
