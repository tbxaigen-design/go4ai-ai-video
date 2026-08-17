/**
 * GO4AI Feedback Relay — Cloudflare Worker.
 *
 * Nhận góp ý từ app trên máy user rồi gửi email về hocvien@go4ai.life.
 *
 * Vì sao cần Worker: app chạy trên máy user, nên bất kỳ khoá API nào đóng gói
 * kèm app đều bị lộ — ai cũng mở file ra đọc được. Worker giữ khoá ở phía
 * server, app chỉ gọi một URL công khai không kèm bí mật gì.
 *
 * Cách app dùng: đặt biến môi trường GO4AI_FEEDBACK_RELAY = URL của Worker.
 * Không đặt thì app quay về mở sẵn mailto cho user tự bấm gửi.
 *
 * Deploy: xem worker/README.md
 */

const MAX_FIELD = 4000;
const MAX_BODY_BYTES = 32 * 1024;

const CORS = {
  // App chạy ở 127.0.0.1 với cổng thay đổi nên không cố định được origin.
  // Endpoint này chỉ nhận góp ý, không đọc/trả dữ liệu riêng tư nào.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

/** Cắt ngắn và ép về chuỗi — chặn payload khổng lồ và kiểu dữ liệu lạ. */
function clean(value, max = MAX_FIELD) {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, max);
}

/**
 * Loại ký tự xuống dòng khỏi các trường được nhúng vào header email.
 * Không làm việc này thì người gửi có thể chèn header giả (header injection).
 */
function headerSafe(value) {
  return clean(value, 200).replace(/[\r\n]+/g, ' ').trim();
}

const TYPE_LABEL = {
  bug: 'Báo lỗi',
  feature: 'Đề xuất tính năng',
  template: 'Yêu cầu mẫu mới',
  feedback: 'Góp ý trải nghiệm',
  general: 'Góp ý',
};

function buildEmail(fb, env) {
  const label = TYPE_LABEL[fb.type] || TYPE_LABEL.general;
  const subject = `[GO4AI Video] ${label} — ${headerSafe(fb.contact) || 'ẩn danh'}`;

  const lines = [
    fb.message,
    '',
    '────────────────────────',
    `Mã góp ý:   ${fb.id}`,
    `Loại:       ${fb.type}`,
    `Liên hệ:    ${fb.contact || '(không cung cấp)'}`,
    `Phiên bản:  ${fb.appVersion || 'không rõ'}`,
    `Hệ điều hành: ${fb.platform || 'không rõ'}`,
    `Node.js:    ${fb.nodeVersion || 'không rõ'}`,
    `Trình duyệt: ${fb.userAgent || 'không rõ'}`,
    `Thời gian:  ${fb.timestamp}`,
  ];

  return {
    subject,
    text: lines.join('\n'),
    to: env.FEEDBACK_TO || 'hocvien@go4ai.life',
    from: env.FEEDBACK_FROM || 'GO4AI Video <onboarding@resend.dev>',
    replyTo: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fb.contact || '') ? fb.contact : undefined,
  };
}

/**
 * Gửi qua Resend. Chọn Resend vì có gói miễn phí và cho gửi thử ngay bằng
 * tên miền onboarding@resend.dev, không bắt phải chuyển DNS của go4ai.life
 * lên Cloudflare (việc đó rủi ro cho website và email đang chạy).
 */
async function sendViaResend(mail, env) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mail.from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      ...(mail.replyTo && { reply_to: mail.replyTo }),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // GET để kiểm tra Worker sống chưa mà không cần gửi góp ý thật.
    if (request.method === 'GET') {
      return json({
        ok: true,
        service: 'go4ai-feedback-relay',
        emailConfigured: Boolean(env.RESEND_API_KEY),
      });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Chỉ chấp nhận POST' }, 405);
    }

    let payload;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return json({ ok: false, error: 'Nội dung quá dài' }, 413);
      }
      payload = JSON.parse(raw || '{}');
    } catch {
      return json({ ok: false, error: 'JSON không hợp lệ' }, 400);
    }

    const message = clean(payload.message);
    if (!message.trim()) {
      return json({ ok: false, error: 'Thiếu nội dung góp ý' }, 400);
    }

    const fb = {
      id: clean(payload.id, 64) || `fb_${Date.now()}`,
      type: clean(payload.type, 32) || 'general',
      contact: clean(payload.contact, 200),
      message,
      appVersion: clean(payload.appVersion, 64),
      platform: clean(payload.platform, 64),
      nodeVersion: clean(payload.nodeVersion, 64),
      userAgent: clean(payload.userAgent, 400),
      timestamp: clean(payload.timestamp, 64) || new Date().toISOString(),
    };

    if (!env.RESEND_API_KEY) {
      // Chưa gắn khoá thì nói thẳng, để app biết mà quay về đường mailto
      // thay vì báo với user là "đã gửi" trong khi chẳng gửi đi đâu cả.
      console.log('[feedback] chưa cấu hình RESEND_API_KEY:', fb.id);
      return json({ ok: false, error: 'Relay chưa được cấu hình gửi email' }, 503);
    }

    try {
      await sendViaResend(buildEmail(fb, env), env);
      return json({ ok: true, id: fb.id });
    } catch (err) {
      console.error('[feedback] gửi email lỗi:', err.message);
      return json({ ok: false, error: 'Không gửi được email' }, 502);
    }
  },
};
