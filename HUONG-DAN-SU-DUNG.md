# 📖 Hướng Dẫn Sử Dụng GO4AI AI Video Studio

> **Phiên bản:** Beta 1.0 | **Nền tảng:** Windows & Macbook | **Hỗ trợ:** [GO4AI Community](https://go4ai.life)

---

## ⚙️ Yêu Cầu Cấu Hình Máy Tính

Ứng dụng xử lý dựng hình, hiệu ứng động và xuất video MP4 **trực tiếp trên máy tính của bạn (Local Render)**, vì vậy cấu hình máy sẽ quyết định trực tiếp đến tốc độ xuất video:

| Thành phần | 🟡 Cấu hình tối thiểu (Chạy được) | 🟢 Cấu hình khuyến nghị (Dựng & Xuất nhanh) |
| :--- | :--- | :--- |
| **Hệ điều hành** | • **Windows:** Windows 10 (64-bit)<br/>• **Macbook:** macOS 12 (Monterey) trở lên | • **Windows:** Windows 11 (64-bit)<br/>• **Macbook:** macOS 14 (Sonoma) hoặc mới nhất |
| **Vi xử lý (CPU)** | 4 nhân thực (Intel Core i3/i5 Gen 8+, AMD Ryzen 3, Apple M1) | 6–8 nhân trở lên (Intel Core i5/i7 Gen 11+, AMD Ryzen 5/7, Apple M1/M2/M3/M4) |
| **Bộ nhớ RAM** | **8 GB RAM** *(Nên tắt bớt ứng dụng nặng khi xuất video)* | **16 GB RAM** trở lên *(Preview realtime, đa nhiệm mượt mà)* |
| **Ổ cứng trống** | **5 GB SSD** trống | **15 GB SSD / NVMe** trống *(Chứa cache và lưu trữ nhiều video Full HD)* |
| **Mạng Internet** | Cần kết nối Internet để tải môi trường và sử dụng giọng đọc AI | Tốc độ mạng ổn định $\ge$ 20 Mbps |
| **Độ phân giải màn hình**| 1366 x 768 px | 1920 x 1080 (Full HD) hoặc màn hình Retina |

> 💡 **Mẹo tối ưu:**
> - Nếu dùng laptop cấu hình cơ bản (8GB RAM), hãy đóng các tab trình duyệt nặng hoặc phần mềm đồ họa khác trước khi bấm nút xuất video để tránh nghẽn RAM.
> - Máy dùng chip **Apple Silicon (M1/M2/M3/M4)** hoặc CPU Intel/AMD có card đồ họa hỗ trợ mã hóa video sẽ cho tốc độ render video 1080p 60fps cực nhanh.

---

## 🚀 Cài Đặt Lần Đầu (5 phút)

### Bước 1 — Tải phần mềm về máy

1. Truy cập trang GitHub: **https://github.com/tbxaigen-design/go4ai-ai-video**
2. Bấm nút màu xanh lá **`< > Code`** ở góc phải
3. Chọn **`Download ZIP`**
4. File `go4ai-ai-video-main.zip` sẽ tải về thư mục `Downloads` của bạn

### Bước 2 — Giải nén

- **Windows:** Click chuột phải vào file `.zip` → Chọn **"Giải nén tất cả"** (Extract All) → Chọn nơi lưu (ví dụ: Desktop)
- **Macbook:** Click đúp vào file `.zip` → Tự động giải nén ra thư mục cùng tên

### Bước 3 — Mở ứng dụng

Mở thư mục vừa giải nén. Bạn sẽ thấy các file sau:

```
📁 go4ai-ai-video-main/
 ├── 🟢 1-Chay-Tren-Windows.bat      ← Máy Windows bấm vào đây
 ├── 🍏 1-Chay-Tren-Macbook.command  ← Máy Macbook bấm vào đây
 ├── 🔄 2-Cap-Nhat-Windows.bat       ← Cập nhật (Windows)
 ├── 🔄 2-Cap-Nhat-Macbook.command   ← Cập nhật (Macbook)
 └── 📄 ...các file khác
```

---

## 💻 Máy Windows

### Mở lần đầu

1. **Click đúp (double-click)** vào file `1-Chay-Tren-Windows.bat`
2. Nếu Windows hiện hộp thoại bảo mật xanh **"Windows protected your PC"**:
   - Bấm **"More info"** (Thông tin khác)
   - Bấm **"Run anyway"** (Vẫn chạy)
3. Một cửa sổ đen hiện ra — **đây là bình thường**, không cần làm gì
4. **Lần đầu chạy** sẽ tự động cài thêm một số thứ cần thiết (khoảng 2–5 phút)
5. Trình duyệt web tự động mở giao diện GO4AI Studio tại `http://127.0.0.1:3075`

### Những lần sau

Chỉ cần **click đúp** vào `1-Chay-Tren-Windows.bat` — mở trong vài giây.

> 💡 **Mẹo:** Tạo Shortcut ra Desktop để tiện mở hơn: Click chuột phải vào file `.bat` → "Send to" → "Desktop (create shortcut)"

---

## 🍏 Máy Macbook

### Mở lần đầu

1. **Không nhấp đúp ngay** — thay vào đó: **Click chuột phải** (hoặc giữ `Control` + Click) vào file `1-Chay-Tren-Macbook.command`
2. Chọn **"Mở"** (Open) từ menu hiện ra
3. Bấm **"Mở"** (Open) lần nữa trong hộp thoại xác nhận
4. Terminal mở ra — **lần đầu** sẽ cài thêm thứ cần thiết (2–5 phút)
5. Trình duyệt tự động mở giao diện GO4AI Studio

> ⚠️ **Nếu Mac báo _"đến từ một nhà phát triển chưa được xác định"_ hoặc _"File bị hỏng"_**
>
> Đây là cơ chế bảo vệ của macOS với mọi file tải từ trình duyệt, **không phải app bị lỗi hay nhiễm virus**.
>
> **Cách 1 — nhanh nhất:** Click chuột phải vào file → chọn **"Mở"**. Hộp thoại lúc này sẽ có nút **"Mở"** để bạn xác nhận (nhấp đúp thì chỉ có nút OK, không mở được).
>
> **Cách 2 — nếu vẫn bị chặn:** Vào  → **Cài đặt Hệ thống** → **Quyền riêng tư & Bảo mật**, kéo xuống cuối sẽ thấy dòng nhắc về file vừa bị chặn → bấm **"Vẫn mở"** (Open Anyway).
>
> **Cách 3 — gỡ một lần cho cả thư mục:** Mở Terminal (`Cmd+Space` → gõ "Terminal"), gõ `xattr -cr ` (có dấu cách ở cuối), rồi **kéo thả thư mục app vào cửa sổ Terminal** để nó tự điền đường dẫn, rồi Enter:
> ```
> xattr -cr /duong/dan/den/go4ai-ai-video-main
> ```
>
> 💡 Từ bản 1.0.0-beta trở đi, chỉ cần mở được `1-Chay-Tren-Macbook.command` **một lần**, nó sẽ tự gỡ dấu chặn cho `2-Cap-Nhat-Macbook.command` và các file còn lại — những lần sau không gặp lại hộp thoại này nữa.

### Những lần sau

Chỉ cần **click đúp** vào `1-Chay-Tren-Macbook.command` — mở trong vài giây.

> 💡 **Mẹo:** Kéo file `.command` vào Dock để tiện truy cập.

---

## 🔄 Cập Nhật Khi Có Phiên Bản Mới

Khi GO4AI phát hành tính năng mới hoặc template mới, bạn **không cần tải lại từ đầu**:

- **Windows:** Click đúp vào `2-Cap-Nhat-Windows.bat`
- **Macbook:** **Click chuột phải** → chọn **"Mở"** trên `2-Cap-Nhat-Macbook.command`
  (nhấp đúp sẽ bị macOS chặn — xem mục xử lý ở phần Macbook bên trên)

Phần mềm tự tải bản mới về và cập nhật trong 30–60 giây. **Dữ liệu dự án của bạn không bị mất.**

> ⚠️ **Sau khi cập nhật, nhớ đóng cửa sổ Terminal cũ** rồi mới chạy lại file khởi động.
> Nếu bản cũ còn chạy, trình duyệt có thể vẫn hiển thị bản cũ và bạn sẽ tưởng bản cập nhật không có tác dụng.

---

## ❓ Câu Hỏi Thường Gặp

<details>
<summary><b>🔴 Lỗi: "node is not recognized" trên Windows</b></summary>

Script sẽ tự tải Node.js về cho bạn. Nếu vẫn lỗi, hãy tải Node.js thủ công tại:
👉 **https://nodejs.org/en/download** → Chọn "Windows Installer (.msi)" → Cài đặt → Chạy lại file `.bat`

</details>

<details>
<summary><b>🟡 Báo "Port 3075 đang được sử dụng"</b></summary>

Nghĩa là còn một GO4AI Studio cũ đang chạy ngầm. **App sẽ tự chuyển sang cổng khác** (3076, 3077…) và vẫn mở bình thường — hãy dùng đúng địa chỉ mà cửa sổ Terminal in ra.

⚠️ **Quan trọng khi vừa cập nhật:** nếu bạn để cửa sổ Terminal cũ chạy, trình duyệt có thể vẫn đang xem **bản cũ** ở cổng 3075 và bạn sẽ tưởng bản cập nhật không có tác dụng. Hãy **đóng hết cửa sổ Terminal cũ** rồi chạy lại, hoặc:

- **Windows:** Task Manager (`Ctrl+Shift+Esc`) → kết thúc các tiến trình `node.exe`
- **Macbook:** Terminal → gõ `pkill -f ui-server.js` → Enter

</details>

<details>
<summary><b>🔴 Giọng đọc tiếng Việt sai — chọn giọng nam vẫn ra giọng nữ</b></summary>

Máy chưa cài được bộ giọng neural (`edge-tts`), nên **mọi giọng tiếng Việt đều dùng chung một giọng nữ dự phòng** của Google. Từ bản mới, app sẽ hiện cảnh báo rõ khi rơi vào tình huống này.

Khắc phục: chạy lại file cập nhật (`2-Cap-Nhat-...`) rồi chạy lại file khởi động. Nếu Terminal báo thiếu Python:

- **Macbook:** mở Terminal → gõ `xcode-select --install` → Enter → cài xong chạy lại
- **Windows:** cài Python tại https://python.org rồi chạy lại

</details>

<details>
<summary><b>🔴 Macbook: "Cannot be opened because the developer cannot be verified"</b></summary>

Vào **Cài đặt hệ thống** (System Settings) → **Quyền riêng tư & Bảo mật** (Privacy & Security) → Cuộn xuống phần *Bảo mật* → Bấm **"Vẫn mở"** (Open Anyway).

</details>

<details>
<summary><b>🟡 Cài đặt lần đầu lâu quá (hơn 10 phút)</b></summary>

Kiểm tra kết nối mạng của bạn. Quá trình cài đặt cần tải khoảng 200–400MB thư viện lần đầu. Những lần sau sẽ mở trong vài giây.

</details>

<details>
<summary><b>🟡 Tôi có thể cài đặt trên nhiều máy tính không?</b></summary>

Hoàn toàn được! Chỉ cần copy toàn bộ thư mục hoặc tải lại từ GitHub và thực hiện các bước trên cho mỗi máy.

</details>

---

## 📞 Hỗ Trợ & Liên Hệ

Gặp vấn đề không tự giải quyết được? Liên hệ GO4AI:

- 📧 **Email hỗ trợ:** **hocvien@go4ai.life** ← kênh chính, phản hồi nhanh nhất
- 💬 **Ngay trong app:** bấm nút **Góp ý & Báo lỗi** ở góc trên. App sẽ mở
  sẵn cửa sổ soạn email kèm thông số máy (phiên bản, hệ điều hành) để GO4AI
  tìm lỗi nhanh hơn — bạn chỉ cần bấm **Gửi**.
- 🌐 **Website:** [go4ai.life](https://go4ai.life)

> Nếu máy chưa cài ứng dụng email, nội dung góp ý vẫn được lưu trong file
> `feedback.json` cạnh ứng dụng — bạn có thể mở ra và gửi thủ công tới
> hocvien@go4ai.life.

---

*GO4AI AI Video Studio — Phiên bản Beta 1.0 • Chỉ dùng nội bộ và người dùng thử nghiệm*
