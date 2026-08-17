# GO4AI Feedback Relay (Cloudflare Worker)

Nhận góp ý từ app trên máy user và gửi email về **hocvien@go4ai.life**.

> **Không bắt buộc.** Không deploy Worker thì app vẫn hoạt động: nó mở sẵn cửa
> sổ soạn email tới hocvien@go4ai.life và user bấm Gửi. Worker chỉ bỏ đi bước
> bấm Gửi đó.

## Vì sao phải có Worker mà không gửi thẳng từ app

App chạy trên máy user. Muốn tự gửi email thì phải có mật khẩu SMTP hoặc khoá
API, mà mọi thứ đóng gói kèm app đều bị đọc được — người ta sẽ lấy để mạo danh
GO4AI gửi thư rác, kéo theo tên miền `go4ai.life` bị liệt vào danh sách đen và
email thật vào spam.

Worker giữ khoá ở phía server. App chỉ gọi một URL công khai, không cầm bí mật
nào.

## Deploy

Cần 3 bước, khoảng 10 phút. Hai bước đầu phải do chủ tài khoản làm vì liên quan
đến đăng nhập và khoá bí mật.

### 1. Lấy khoá gửi email (Resend)

1. Đăng ký tại [resend.com](https://resend.com) — gói miễn phí 3.000 email/tháng
2. Vào **API Keys** → **Create API Key** → sao chép khoá (dạng `re_...`)

Dùng Resend vì cho gửi ngay bằng tên miền dùng thử `onboarding@resend.dev`,
không cần chuyển DNS của `go4ai.life` lên Cloudflare — việc đó có thể làm gián
đoạn website và email đang chạy.

Muốn thư gửi từ chính `@go4ai.life` thì thêm tên miền trong Resend, khai mấy
bản ghi DNS họ hướng dẫn, rồi sửa `FEEDBACK_FROM` trong `wrangler.toml`.

### 2. Deploy Worker

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

`wrangler login` mở trình duyệt để đăng nhập Cloudflare. `secret put` sẽ hỏi
khoá — dán khoá Resend vào, nó được lưu mã hoá phía Cloudflare và **không bao
giờ nằm trong repo**.

Deploy xong wrangler in ra URL dạng:
`https://go4ai-feedback-relay.<tên-tài-khoản>.workers.dev`

### 3. Trỏ app vào Worker

Kiểm tra Worker sống:

```bash
curl https://go4ai-feedback-relay.<tên-tài-khoản>.workers.dev
```

Phải thấy `{"ok":true,...,"emailConfigured":true}`. Nếu `emailConfigured` là
`false` nghĩa là chưa nạp khoá ở bước 2.

Sau đó đặt biến môi trường cho app trước khi chạy:

```bash
GO4AI_FEEDBACK_RELAY=https://go4ai-feedback-relay.<tên-tài-khoản>.workers.dev
```

Muốn áp dụng cho mọi user thì thêm dòng này vào script khởi động
(`1-Chay-Tren-Windows.bat` / `1-Chay-Tren-Macbook.command`) rồi push lên repo.

## Chạy thử ở máy trước khi deploy

```bash
cd worker
echo 'RESEND_API_KEY=re_khoa_that_cua_ban' > .dev.vars   # .dev.vars đã bị gitignore
npx wrangler dev
curl -X POST http://127.0.0.1:8787 -H "Content-Type: application/json" \
  -d '{"message":"thu gui","type":"bug","contact":"ban@example.com"}'
```

## Hành vi khi có lỗi

Worker luôn trả JSON, không bao giờ làm app treo:

| Tình huống | HTTP | App xử lý |
|---|---|---|
| Gửi thành công | 200 | Báo "đã gửi tới GO4AI" |
| Chưa nạp khoá | 503 | Quay về mở mailto cho user bấm gửi |
| Nhà cung cấp lỗi | 502 | Quay về mở mailto |
| Thiếu nội dung | 400 | Báo lỗi cho user |

Nghĩa là Worker chết hay chưa cấu hình thì góp ý vẫn về được
hocvien@go4ai.life bằng đường mailto.

## Bảo mật

- Khoá API chỉ nằm ở Cloudflare Secrets, không có trong repo và không xuống máy user
- Chặn header injection: lọc ký tự xuống dòng ở các trường nhúng vào tiêu đề thư
- Giới hạn kích thước body 32KB và độ dài từng trường
- Chỉ nhận `POST`; endpoint không đọc hay trả về dữ liệu riêng tư nào
