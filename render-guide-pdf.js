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
  <title>Hướng Dẫn Cài Đặt & Sử Dụng GO4AI AI Video Studio Cho MacBook</title>
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
      background: #EEF2FF;
      color: #3730A3;
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
      background: #2563EB;
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
      background: #EEF2FF;
      color: #4338CA;
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
        <div class="app-brand">🍏 GO4AI AI Video Studio • Hướng dẫn macOS</div>
        <div class="main-title">Cẩm Nang Cài Đặt & Sử Dụng Cho MacBook</div>
        <div class="sub-title">Dành cho người mới bắt đầu (No-code / Zero Tech) • Tự động hóa 100%</div>
      </div>
    </div>

    <!-- META BAR -->
    <div class="meta-bar">
      <div class="meta-item">
        <div class="meta-label">💻 Thiết bị hỗ trợ</div>
        <div class="meta-val">Mac M1/M2/M3/M4 & Intel (macOS 12+)</div>
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
        Bạn <strong>không cần biết lập trình</strong> hay gõ câu lệnh phức tạp nào. Mọi thiết lập, tải công cụ xử lý video (FFmpeg) và giọng đọc AI đã được đóng gói tự động hoàn toàn. Bạn chỉ cần thực hiện 3 bước đơn giản dưới đây.
      </div>
    </div>

    <!-- PHẦN 1: CHUẨN BỊ -->
    <div class="section">
      <div class="section-title"><span class="num">1</span> Chuẩn Bị Duy Nhất: Cài Đặt Node.js (Nếu máy chưa có)</div>
      <p style="font-size: 9pt; color: #475569; margin-bottom: 8px;">
        Để ứng dụng chạy được trên máy Mac, bạn chỉ cần cài đặt môi trường <strong>Node.js phiên bản 20 trở lên</strong> (thao tác như cài một app bình thường):
      </p>

      <div class="step-card" style="border-left: 3px solid #0284C7;">
        <div class="step-content">
          <ol>
            <li>Truy cập website chính thức: <strong style="color: #0284C7;">https://nodejs.org/en/download</strong></li>
            <li>Chọn bản <strong>LTS (Recommended For Most Users)</strong> để tải file cài đặt <code style="background: #F1F5F9; padding: 2px 4px; border-radius: 4px;">.pkg</code> về máy.</li>
            <li>Mở file <code style="background: #F1F5F9; padding: 2px 4px; border-radius: 4px;">.pkg</code> trong thư mục Downloads ➔ Bấm <strong>Tiếp tục (Continue)</strong> ➔ <strong>Đồng ý (Agree)</strong> ➔ <strong>Cài đặt (Install)</strong> ➔ Nhập mật khẩu máy khi được hỏi ➔ Bấm <strong>Đóng</strong> khi xong.</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- PHẦN 2: 3 BƯỚC CÀI ĐẶT -->
    <div class="section">
      <div class="section-title"><span class="num">2</span> 3 Bước Mở Ứng Dụng Lần Đầu Tiên</div>

      <!-- BƯỚC 1 -->
      <div class="step-card">
        <div class="step-header">
          <span class="step-badge">BƯỚC 1</span>
          <span class="step-title">Tải bộ phần mềm từ GitHub về máy</span>
        </div>
        <div class="step-content">
          <ol>
            <li>Truy cập link GitHub: <strong style="color: #2563EB;">https://github.com/tbxaigen-design/go4ai-ai-video</strong></li>
            <li>Nhìn sang góc phải màn hình, bấm vào nút màu xanh lá cây <span class="highlight">&lt; &gt; Code</span>.</li>
            <li>Trong bảng menu hiện ra, bấm vào dòng chữ <strong style="color: #0F172A;">Download ZIP</strong>.</li>
            <li>File <code style="background: #F1F5F9; padding: 2px 4px; border-radius: 4px;">go4ai-ai-video-main.zip</code> sẽ tải về thư mục <strong>Downloads</strong>. Bạn nhấp đúp vào file này để giải nén.</li>
          </ol>
        </div>
      </div>

      <!-- BƯỚC 2 -->
      <div class="step-card">
        <div class="step-header">
          <span class="step-badge">BƯỚC 2</span>
          <span class="step-title">Khởi động bằng file 1-Chay-Tren-Macbook.command</span>
        </div>
        <div class="step-content">
          <p>Mở thư mục vừa giải nén, bạn tìm file <strong>1-Chay-Tren-Macbook.command</strong>.</p>
          <div class="callout callout-warning" style="margin: 6px 0 8px 0; padding: 8px 10px;">
            <div class="callout-title" style="font-size: 8.5pt;">⚠️ QUY TẮC MỞ LẦN ĐẦU TRÊN MAC (Tránh bị Apple chặn):</div>
            <div style="font-size: 8.5pt;">
              1. <strong>Click chuột phải</strong> (hoặc giữ phím <code style="background: #FEF3C7; padding: 1px 3px;">Control</code> + Click) vào file <strong>1-Chay-Tren-Macbook.command</strong>.<br/>
              2. Chọn <strong>"Mở" (Open)</strong> từ danh sách menu.<br/>
              3. Khi Mac hiện hộp thoại xác nhận bảo mật, bấm tiếp nút <strong>"Mở" (Open)</strong>.
            </div>
          </div>
          <p style="font-size: 8.5pt; color: #64748B;">
            👉 <em>Một cửa sổ dòng lệnh màu đen (Terminal) sẽ mở ra và tự động tải thư viện, bộ render FFmpeg, Chromium và giọng đọc AI (khoảng 2–5 phút). Vui lòng <strong>KHÔNG TẮT</strong> cửa sổ này!</em>
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
          <p>Sau khi chuẩn bị xong, trình duyệt (Safari hoặc Chrome) sẽ tự động mở trang:</p>
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-weight: 700; color: #1E40AF; margin: 4px 0; font-size: 9pt;">
            🌐 http://127.0.0.1:3075
          </div>
          <p style="font-size: 8.5pt; color: #475569;">
            Giao diện GO4AI Studio xuất hiện — bạn đã có thể chọn mẫu template, viết kịch bản và bấm xuất video!
          </p>
        </div>
      </div>
    </div>

    <!-- PAGE BREAK FOR CLEAN PRINTING -->
    <div class="page-break"></div>

    <!-- HEADER TRANG 2 -->
    <div class="header" style="padding-bottom: 10px; margin-bottom: 14px;">
      <div class="header-left">
        <div class="main-title" style="font-size: 13pt;">Cẩm Nang Sử Dụng & Xử Lý Sự Cố Trên MacBook</div>
      </div>
      <div class="contact-badge">GO4AI Studio Beta 1.0</div>
    </div>

    <!-- PHẦN 3: SỬ DỤNG HÀNG NGÀY & CẬP NHẬT -->
    <div class="section">
      <div class="section-title"><span class="num">3</span> Sử Dụng Hàng Ngày & Cập Nhật Phiên Bản</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div class="step-card" style="margin-bottom: 0;">
          <div class="step-header">
            <span class="step-badge" style="background: #059669;">MỞ HÀNG NGÀY</span>
          </div>
          <div class="step-content" style="font-size: 8.5pt;">
            Từ lần thứ 2 trở đi, bạn chỉ cần <strong>nhấp đúp chuột</strong> vào file <code style="background: #F1F5F9; padding: 1px 3px;">1-Chay-Tren-Macbook.command</code>. App sẽ khởi động trong 2–3 giây.
          </div>
        </div>

        <div class="step-card" style="margin-bottom: 0;">
          <div class="step-header">
            <span class="step-badge" style="background: #DC2626;">TẮT ỨNG DỤNG</span>
          </div>
          <div class="step-content" style="font-size: 8.5pt;">
            Khi không dùng nữa, quay lại cửa sổ Terminal màu đen, bấm phím <code style="background: #FEE2E2; padding: 1px 3px; font-weight: 700;">Ctrl + C</code> rồi đóng cửa sổ.
          </div>
        </div>
      </div>

      <div class="callout callout-info" style="margin-top: 6px;">
        <div class="callout-title">🔄 Cập Nhật Phiên Bản Mới (OTA Update chỉ 1 thao tác):</div>
        <div>
          Khi GO4AI có bản nâng cấp hoặc template mới: <strong>Click chuột phải vào file <code style="background: #E0F2FE; padding: 1px 4px; border-radius: 3px;">2-Cap-Nhat-Macbook.command</code> ➔ Chọn Open</strong>. Toàn bộ tính năng mới sẽ được cập nhật trong 30–60 giây mà <strong>KHÔNG làm mất dự án/video</strong> của bạn.
        </div>
      </div>
    </div>

    <!-- PHẦN 4: XỬ LÝ SỰ CỐ -->
    <div class="section">
      <div class="section-title"><span class="num">4</span> Bảng Giải Cứu: Xử Lý Các Sự Cố Thường Gặp Trên Mac</div>

      <div class="faq-grid">
        <!-- LỖI 1 -->
        <div class="faq-card">
          <div class="faq-q">🔴 1. Bị Apple chặn: "Cannot be opened because the developer cannot be verified"</div>
          <div class="faq-a">
            <strong>Cách 1 (Nhanh nhất):</strong> Click chuột phải vào file <code style="background: #F1F5F9; padding: 1px 3px;">.command</code> ➔ Chọn <strong>Mở (Open)</strong> thay vì nhấp đúp.<br/>
            <strong>Cách 2:</strong> Mở <strong>Cài đặt hệ thống (System Settings)</strong> ➔ <strong>Quyền riêng tư & Bảo mật (Privacy & Security)</strong> ➔ Cuộn xuống mục <em>Bảo mật</em> ➔ Bấm <strong>Vẫn mở (Open Anyway)</strong>.
          </div>
        </div>

        <!-- LỖI 2 -->
        <div class="faq-card">
          <div class="faq-q">🔴 2. Báo lỗi: "File is damaged and can't be opened" (File bị hỏng)</div>
          <div class="faq-a">
            Đây là cơ chế kiểm tra file tải từ web của Mac. Bạn mở <strong>Terminal</strong> (<code style="background: #F1F5F9; padding: 1px 3px;">Cmd + Space</code> ➔ gõ "Terminal") và dán dòng lệnh sau rồi bấm <strong>Enter</strong>:
            <div class="code-box">xattr -cr ~/Downloads/go4ai-ai-video-main</div>
            Sau đó mở lại file <code style="background: #F1F5F9; padding: 1px 3px;">1-Chay-Tren-Macbook.command</code> bình thường.
          </div>
        </div>

        <!-- LỖI 3 -->
        <div class="faq-card">
          <div class="faq-q">🔴 3. Báo lỗi: "Permission denied" khi bấm mở file .command</div>
          <div class="faq-a">
            Mở ứng dụng <strong>Terminal</strong> trên Mac, gõ chữ <code style="background: #E2E8F0; padding: 1px 4px; font-weight: bold;">chmod +x </code> (có dấu cách ở cuối), sau đó kéo file <code style="background: #F1F5F9; padding: 1px 3px;">1-Chay-Tren-Macbook.command</code> thả vào cửa sổ Terminal rồi bấm <strong>Enter</strong>.
          </div>
        </div>

        <!-- LỖI 4 -->
        <div class="faq-card">
          <div class="faq-q">🔴 4. Báo lỗi cổng "Port 3075 already in use"</div>
          <div class="faq-a">
            Do một phiên bản app trước đó vẫn đang chạy ngầm. Mở <strong>Terminal</strong>, gõ lệnh:
            <div class="code-box">pkill node</div>
            Sau đó khởi động lại file <code style="background: #F1F5F9; padding: 1px 3px;">1-Chay-Tren-Macbook.command</code>.
          </div>
        </div>
      </div>
    </div>

    <!-- PHẦN 5: LIÊN HỆ & FOOTER -->
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

async function generatePdf() {
  console.log('[*] Khoi dong trinh duyet render PDF...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const pdfPath = path.join(__dirname, 'HUONG-DAN-CAI-DAT-MACBOOK.pdf');
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

generatePdf().catch((err) => {
  console.error('[LOI] Khong the tao PDF:', err);
  process.exit(1);
});
