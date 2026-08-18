import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, execSync } from 'node:child_process';
import {
  FREE_VOICE_PRESETS,
  BGM_PRESETS,
  estimateScriptMetrics,
  synthesizeVoiceSpeech,
  synthesizeMultiSceneVoice,
  mixVoiceWithBgm,
  getAvailableVoices,
  findVoicePreset,
} from './local-tts.js';
// Ưu tiên: env var → @ffmpeg-installer (đúng kiến trúc) → binaries/ → PATH.
import { FFMPEG_BIN, FFPROBE_BIN, hasVieNeu } from './resolve-binaries.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3075;

// ── Phiên bản app: nguồn sự thật duy nhất là version.json ──
const APP_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json'), 'utf-8'));
  } catch {
    return { version: 'unknown', channel: 'unknown', mode: 'FREE_BETA', releasedAt: null, notes: '' };
  }
})();

// ── Kênh nhận góp ý ──
const SUPPORT_EMAIL = process.env.GO4AI_SUPPORT_EMAIL || 'hocvien@go4ai.life';

const FEEDBACK_TYPE_LABEL = {
  bug: 'Báo lỗi',
  feature: 'Đề xuất tính năng',
  feedback: 'Góp ý trải nghiệm',
  general: 'Góp ý',
};

/**
 * Dựng link mailto điền sẵn nội dung góp ý.
 *
 * Vì sao không gửi mail thẳng từ app: gửi SMTP cần tài khoản và mật khẩu,
 * mà app chạy trên máy user nên bất kỳ khoá nào đóng gói kèm đều bị lộ.
 * Mở mail client của chính user vừa không cần bí mật, vừa cho họ thấy rõ
 * mình đang gửi gì cho ai.
 */
function buildFeedbackMailto(entry) {
  const label = FEEDBACK_TYPE_LABEL[entry.type] || FEEDBACK_TYPE_LABEL.general;
  const subject = `[GO4AI Video ${APP_VERSION.version}] ${label}`;
  const body = [
    entry.message,
    '',
    '---',
    'Thông tin kỹ thuật (giúp GO4AI tìm lỗi nhanh hơn):',
    `- Mã góp ý: ${entry.id}`,
    `- Loại: ${entry.type}`,
    `- Liên hệ: ${entry.contact}`,
    `- Phiên bản: ${APP_VERSION.version} (${APP_VERSION.channel})`,
    `- Hệ điều hành: ${entry.platform}`,
    `- Node.js: ${entry.nodeVersion}`,
    `- Thời gian: ${entry.timestamp}`,
  ].join('\n');

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** POST JSON tối giản, dùng cho relay góp ý. */
function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const client = url.startsWith('http://') ? http : https;
    const req = client.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`HTTP ${res.statusCode}`));
      },
    );
    req.on('timeout', () => req.destroy(new Error('hết thời gian chờ')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Directory paths ──
// Mặc định nằm cạnh app; có thể trỏ đi nơi khác bằng biến môi trường
// nếu sau này đóng gói installer và muốn tách dữ liệu user ra thư mục riêng.
const PROJECTS_DIR = process.env.GO4AI_PROJECTS_DIR || path.join(__dirname, 'projects');
const TEMPLATES_DIR = process.env.GO4AI_TEMPLATES_DIR || path.join(__dirname, 'templates');
const PUBLIC_DIR = process.env.GO4AI_PUBLIC_DIR || path.join(__dirname, 'public');

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

process.on('uncaughtException', (err) => {
  console.error('[UnhandledException Caught]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection Caught]:', reason);
});


// Simple YAML metadata extractor for templates
function parseTemplateYaml(yamlContent, folderName) {
  const meta = {
    id: folderName,
    name: folderName,
    description: '',
    category: 'general',
    tags: [],
    minSec: 4,
    maxSec: 10,
    sourceEntry: 'source/index.html',
  };

  const idMatch = yamlContent.match(/^id:\s*(.+)$/m);
  if (idMatch) meta.id = idMatch[1].trim();

  const nameMatch = yamlContent.match(/^name:\s*(.+)$/m);
  if (nameMatch) meta.name = nameMatch[1].trim();

  const descMatch = yamlContent.match(/description:\s*(?:>|\|)?\s*\n?([^\n]+(?:\n\s+[^\n]+)*)/);
  if (descMatch) meta.description = descMatch[1].replace(/\n\s+/g, ' ').trim();

  const catMatch = yamlContent.match(/^category:\s*(.+)$/m);
  if (catMatch) meta.category = catMatch[1].trim();

  const tagsMatch = yamlContent.match(/^tags:\s*\[(.*?)\]/m);
  if (tagsMatch) {
    meta.tags = tagsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, ''));
  }

  const minMatch = yamlContent.match(/min_sec:\s*(\d+)/m);
  if (minMatch) meta.minSec = Number(minMatch[1]);

  const maxMatch = yamlContent.match(/max_sec:\s*(\d+)/m);
  if (maxMatch) meta.maxSec = Number(maxMatch[1]);

  const entryMatch = yamlContent.match(/source_entry:\s*(.+)$/m);
  if (entryMatch) meta.sourceEntry = entryMatch[1].trim();

  return meta;
}

// Get all built-in templates
function getAllTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  const entries = fs.readdirSync(TEMPLATES_DIR);
  const templates = [];

  for (const name of entries) {
    const tDir = path.join(TEMPLATES_DIR, name);
    if (!fs.statSync(tDir).isDirectory()) continue;

    const yamlPath = path.join(tDir, 'template.html-video.yaml');
    let meta = { id: name, name, description: '', category: 'general', tags: [], minSec: 4, maxSec: 10, sourceEntry: 'source/index.html' };

    if (fs.existsSync(yamlPath)) {
      try {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        meta = parseTemplateYaml(content, name);
      } catch {}
    }

    const htmlPath = path.join(tDir, meta.sourceEntry || 'source/index.html');
    const fallbackPath = path.join(tDir, 'index.html');
    const hasHtml = fs.existsSync(htmlPath) || fs.existsSync(fallbackPath);

    const thumbName = `${name}.png`;
    const hasThumb = fs.existsSync(path.join(__dirname, 'docs', 'assets', 'templates', thumbName));

    if (hasHtml) {
      templates.push({
        ...meta,
        hasThumb,
        thumbUrl: hasThumb ? `/docs/assets/templates/${thumbName}` : null,
      });
    }
  }

  return templates;
}

function getProjectExportedVideos(projectName) {
  const dir = path.join(PROJECTS_DIR, projectName);
  const exportsDir = path.join(dir, 'exports');
  const videos = [];

  if (fs.existsSync(exportsDir)) {
    const files = fs.readdirSync(exportsDir).filter((f) => f.toLowerCase().endsWith('.mp4'));
    for (const file of files) {
      const p = path.join(exportsDir, file);
      const stat = fs.statSync(p);
      let duration = null;
      try {
        const durOut = execSync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`).toString().trim();
        duration = parseFloat(durOut);
      } catch {}

      videos.push({
        filename: file,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        mtime: stat.mtime,
        url: `/api/projects/${projectName}/exports/${file}`,
        durationSec: duration ? Number(duration.toFixed(1)) : null,
        isLatest: false,
      });
    }
  }

  // Check root output.mp4
  const mainOut = path.join(dir, 'output.mp4');
  if (fs.existsSync(mainOut)) {
    const stat = fs.statSync(mainOut);
    let duration = null;
    try {
      const durOut = execSync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mainOut}"`).toString().trim();
      duration = parseFloat(durOut);
    } catch {}

    videos.unshift({
      filename: 'output.mp4',
      sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
      mtime: stat.mtime,
      url: `/video/${projectName}/output.mp4`,
      durationSec: duration ? Number(duration.toFixed(1)) : null,
      isLatest: true,
    });
  }

  // Sort by newest
  return videos.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
}

function getProjectStats(projectName) {
  const dir = path.join(PROJECTS_DIR, projectName);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;

  const files = fs.readdirSync(dir);
  const htmlFiles = files
    .filter((f) => f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const audioFiles = files.filter((f) => /\.(mp3|wav|m4a|aac|ogg)$/i.test(f));
  const hasOutput = files.includes('output.mp4');
  let outputSize = 0;
  let outputMtime = null;
  if (hasOutput) {
    const stat = fs.statSync(path.join(dir, 'output.mp4'));
    outputSize = (stat.size / (1024 * 1024)).toFixed(2);
    outputMtime = stat.mtime;
  }

  let config = {
    aspect: '16:9',
    fps: 60,
    defaultDuration: 5,
    ttsVoice: 'vi-nam-standard',
    ttsRate: 0,
    ttsPitch: 0,
    scripts: {},
    sceneSettings: {},
  };
  const configFile = path.join(dir, 'config.json');
  if (fs.existsSync(configFile)) {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(configFile, 'utf-8')) };
    } catch {}
  }

  const exportedVideos = getProjectExportedVideos(projectName);

  return {
    name: projectName,
    htmlCount: htmlFiles.length,
    htmlFiles,
    audioCount: audioFiles.length,
    audioFiles,
    hasOutput,
    outputSizeMb: outputSize,
    outputMtime,
    config,
    exportedVideos,
  };
}

function extractDuration(filename, htmlContent, defaultSec = 5) {
  const metaMatch = htmlContent.match(/<meta\s+[^>]*(?:name=["']duration["']|data-duration=["'])(?:[^>]*content=["']([\d.]+)["']|[^>]*data-duration=["']([\d.]+)["'])[^>]*>/i);
  if (metaMatch) {
    const val = parseFloat(metaMatch[1] || metaMatch[2]);
    if (!isNaN(val) && val > 0) return val;
  }
  const nameMatch = filename.match(/[_-]([\d.]+)\s*s(?:ec)?(?:\.html)?$/i);
  if (nameMatch) {
    const val = parseFloat(nameMatch[1]);
    if (!isNaN(val) && val > 0) return val;
  }
  return defaultSec;
}

function updateDurationInHtml(htmlContent, newDuration) {
  const metaRegex = /<meta\s+[^>]*name=["']duration["'][^>]*content=["'][\d.]+["'][^>]*>/i;
  if (metaRegex.test(htmlContent)) {
    return htmlContent.replace(metaRegex, `<meta name="duration" content="${newDuration}">`);
  }
  const headRegex = /<head[^>]*>/i;
  if (headRegex.test(htmlContent)) {
    return htmlContent.replace(headRegex, `<head>\n  <meta name="duration" content="${newDuration}">`);
  }
  return `<meta name="duration" content="${newDuration}">\n` + htmlContent;
}

/**
 * Intelligent HTML Scene Template Generator
 * Builds high visual quality HTML animations tailored to aspect ratio and scene theme.
 */
function createSceneHtmlContent({
  headline = 'Tiêu đề cảnh',
  subtitle = 'Nội dung phụ giải thích chi tiết cho cảnh',
  stepNumber = 1,
  totalSteps = 4,
  category = 'hero',
  duration = 5,
  aspect = '16:9',
  keyword = 'GO4AI INSIGHTS',
  cardItems = [],
}) {
  const isPortrait = aspect === '9:16';
  const isSquare = aspect === '1:1';
  const width = isPortrait ? 1080 : isSquare ? 1080 : 1920;
  const height = isPortrait ? 1920 : isSquare ? 1080 : 1080;

  const stepFormatted = String(stepNumber).padStart(2, '0');
  const totalFormatted = String(totalSteps || 4).padStart(2, '0');

  if (isPortrait) {
    // --- 9:16 VERTICAL SHORTS FORMAT (TIKTOK / REELS / SHORTS) ---
    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="duration" content="${duration}">
<meta name="viewport" content="width=1080, height=1920, initial-scale=1.0">
<title>GO4AI Tech Shorts</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1080px;
    height: 1920px;
    background-color: #070b14;
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 100px 70px 80px 70px;
  }
  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    opacity: 0.55;
    animation: pulseGlow 6s ease-in-out infinite alternate;
    pointer-events: none;
  }
  .glow-blue { width: 750px; height: 750px; background: #1d4ed8; top: -150px; left: -150px; }
  .glow-purple { width: 680px; height: 680px; background: #7c3aed; bottom: 120px; right: -120px; }
  @keyframes pulseGlow {
    0% { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.12) translate(30px, -20px); }
  }
  .card-glass {
    background: rgba(15, 23, 42, 0.84);
    backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 36px;
    padding: 44px 48px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
  }
  .card-item {
    background: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 28px 32px;
  }
  @keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(40px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes subtitleIn {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-stage { animation: slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-sub { animation: subtitleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; opacity: 0; }
  .badge-brand {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    padding: 16px 36px;
    border-radius: 9999px;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    box-shadow: 0 10px 30px -5px rgba(37, 99, 235, 0.45);
  }
  .progress-bar-bg {
    height: 10px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    overflow: hidden;
    margin-top: 24px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8, #6366f1, #c084fc);
    border-radius: 9999px;
    width: ${(stepNumber / (totalSteps || 4)) * 100}%;
  }
</style>
</head>
<body>
  <div class="bg-glow glow-blue"></div>
  <div class="bg-glow glow-purple"></div>

  <!-- Header -->
  <header class="relative z-10 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="badge-brand">GO4AI SHORTS</div>
      <div class="text-[24px] text-blue-300 font-bold tracking-wider uppercase">AI Academy</div>
    </div>
    <div class="px-6 py-3 rounded-full bg-slate-900/90 border border-slate-800 text-[26px] text-slate-200 font-extrabold tracking-wider">
      ${stepFormatted} / ${totalFormatted}
    </div>
  </header>

  <!-- Stage -->
  <main class="relative z-10 my-auto animate-stage text-center flex flex-col items-center">
    <div class="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-blue-500/15 border border-blue-500/30 mb-8">
      <span class="w-3.5 h-3.5 rounded-full bg-blue-400 animate-pulse"></span>
      <span class="text-blue-400 text-[26px] font-bold tracking-widest uppercase">${keyword || 'GO4AI INSIGHTS'}</span>
    </div>

    <h1 class="text-[72px] font-black leading-[1.12] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200 max-w-[940px] mb-8">
      ${headline}
    </h1>

    <div class="w-full flex flex-col gap-4 text-left">
      <div class="card-item flex items-center gap-5">
        <div class="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-extrabold shrink-0">💡</div>
        <div class="text-[26px] font-bold text-white leading-snug">${subtitle}</div>
      </div>
    </div>
  </main>

  <!-- Bottom Subtitle Bar -->
  <footer class="relative z-10 card-glass animate-sub">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3 text-cyan-400 text-[22px] font-extrabold tracking-wider uppercase">
        <span class="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping"></span>
        Vietnamese Narration
      </div>
      <div class="text-slate-400 text-[20px] font-bold">Scene ${stepFormatted}/${totalFormatted}</div>
    </div>
    <p class="text-[38px] font-extrabold text-white leading-snug tracking-tight">
      “${subtitle}”
    </p>
    <div class="progress-bar-bg">
      <div class="progress-fill"></div>
    </div>
  </footer>
</body>
</html>`;
  }

  // --- 16:9 HORIZONTAL SLIDE / EXPLAINER FORMAT (YOUTUBE / ACADEMY) ---
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="duration" content="${duration}">
<meta name="viewport" content="width=1920, height=1080, initial-scale=1.0">
<title>GO4AI Studio</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px;
    height: 1080px;
    background-color: #060913;
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 80px 50px 80px;
  }
  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(160px);
    opacity: 0.45;
    animation: pulseGlow 8s ease-in-out infinite alternate;
    pointer-events: none;
  }
  .glow-1 { width: 700px; height: 700px; background: #1d4ed8; top: -150px; left: -100px; }
  .glow-2 { width: 650px; height: 650px; background: #6d28d9; bottom: -100px; right: -100px; }
  @keyframes pulseGlow {
    0% { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.15) translate(30px, -20px); }
  }
  .card-glass {
    background: rgba(13, 20, 38, 0.88);
    backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 32px;
    padding: 36px 44px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
  }
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(30px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes subtitleIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-main { animation: slideInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-sub { animation: subtitleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; opacity: 0; }
  .badge-brand {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    padding: 12px 28px;
    border-radius: 9999px;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>

  <!-- Header -->
  <header class="relative z-10 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="badge-brand">GO4AI STUDIO</div>
      <div class="text-[20px] text-blue-300 font-bold tracking-widest uppercase">${keyword || 'AI AGENT & WORKFLOW'}</div>
    </div>
    <div class="px-5 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-[22px] text-slate-300 font-extrabold">
      Slide ${stepFormatted} / ${totalFormatted}
    </div>
  </header>

  <!-- Central Dynamic Information Stage -->
  <main class="relative z-10 my-auto animate-main text-center flex flex-col items-center">
    <div class="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-blue-500/15 border border-blue-500/30 mb-6">
      <span class="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></span>
      <span class="text-blue-400 text-[20px] font-bold tracking-widest uppercase">${category.toUpperCase()}</span>
    </div>

    <h1 class="text-[64px] font-black leading-[1.12] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200 max-w-[1300px] mb-6">
      ${headline}
    </h1>

    <div class="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 max-w-4xl">
      <p class="text-[28px] text-slate-300 font-medium leading-relaxed">
        ${subtitle}
      </p>
    </div>
  </main>

  <!-- Bottom Synchronized Vietnamese Subtitle Bar -->
  <footer class="relative z-10 card-glass animate-sub">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-3 text-cyan-400 text-[18px] font-extrabold tracking-wider uppercase">
        <span class="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
        Vietnamese Narration
      </div>
      <div class="text-slate-400 text-[17px] font-bold">Scene ${stepFormatted}/${totalFormatted}</div>
    </div>
    <p class="text-[32px] font-extrabold text-white leading-snug">
      “${subtitle}”
  </footer>
</body>
</html>`;
}

/**
 * Compile template HTML into self-contained playable document
 * Automatically inlines all referenced sub-compositions and injects the live playback driver
 */
export function compileTemplateHtml(tmplId) {
  const tDir = path.join(TEMPLATES_DIR, tmplId);
  let htmlPath = path.join(tDir, 'source', 'index.html');
  if (!fs.existsSync(htmlPath)) htmlPath = path.join(tDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    return `<!DOCTYPE html><html><body style="background:#0f172a;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>${tmplId}</h2><p>Mẫu Remotion React</p></div></body></html>`;
  }
  let raw = fs.readFileSync(htmlPath, 'utf8');
  const compMap = {};
  const regex = /data-composition-src=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const rel = match[1];
    const compPath = path.join(tDir, rel);
    if (fs.existsSync(compPath)) {
      let compHtml = fs.readFileSync(compPath, 'utf8');
      compHtml = compHtml.replace(/paused\s*:\s*true/g, 'paused: false');
      compMap[rel] = compHtml;
    }
  }

  raw = raw.replace(/paused\s*:\s*true/g, 'paused: false');

  if (Object.keys(compMap).length > 0) {
    const safeJson = JSON.stringify(compMap).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
    const head = '<script>window.__timelines=window.__timelines||{};window.__COMPOSITIONS__=' + safeJson + ';</script>';
    raw = /<head[^>]*>/i.test(raw) ? raw.replace(/<head[^>]*>/i, mm => mm + '\n' + head) : head + '\n' + raw;
    const player = `<script>
(function() {
  function reexec(root) {
    root.querySelectorAll('script').forEach(function(old) {
      if (old.src) return;
      var s = document.createElement('script');
      var code = old.textContent.replace(/paused\\s*:\\s*true/g, 'paused: false');
      s.textContent = '{\\n' + code + '\\n}';
      old.parentNode.replaceChild(s, old);
    });
  }
  function mountOne(host) {
    var src = host.getAttribute('data-composition-src');
    var text = (window.__COMPOSITIONS__ || {})[src];
    if (!text) return;
    var holder = document.createElement('div');
    holder.innerHTML = text;
    var tpl = holder.querySelector('template');
    host.appendChild(tpl ? tpl.content.cloneNode(true) : holder);
    reexec(host);
  }
  window.__hvPlayAll = function() {
    var tls = window.__timelines || {};
    Object.keys(tls).forEach(function(k) {
      var tl = tls[k];
      if (tl && typeof tl.play === 'function') tl.play(0);
    });
    if (window.gsap && window.gsap.globalTimeline) {
      window.gsap.globalTimeline.play();
    }
  };
  function boot() {
    window.__timelines = window.__timelines || {};
    Array.prototype.slice.call(document.querySelectorAll('[data-composition-src]')).forEach(mountOne);
    setTimeout(function() { window.__hvPlayAll(); }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`;
    raw = raw.includes('</body>') ? raw.replace('</body>', player + '\n</body>') : raw + player;
  }
  return raw;
}

/**
 * Generate a complete master synchronized narration audio from scenes
 * Respects each scene's introPause, speech duration, and outro silence gaps!
 */
async function assembleProjectMasterAudio(projectName, scenes) {
  const pDir = path.join(PROJECTS_DIR, projectName);
  const tempAudioDir = path.join(pDir, '__temp_audio_assembly');
  if (!fs.existsSync(tempAudioDir)) fs.mkdirSync(tempAudioDir, { recursive: true });

  const sceneAudioTracks = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneDuration = Number(scene.duration || 5);
    const sceneFile = scene.file;
    const sceneBase = sceneFile.replace(/\.html$/i, '');
    const possibleVoiceFile = path.join(pDir, `voice-${sceneBase}.mp3`);
    const sceneTrackPath = path.join(tempAudioDir, `track_${String(i + 1).padStart(3, '0')}.wav`);

    const hasVoice = fs.existsSync(possibleVoiceFile) && fs.statSync(possibleVoiceFile).size > 100;
    const introPause = Math.max(0, Number(scene.introPause || 0.3));

    if (hasVoice) {
      let voiceDuration = 0;
      try {
        const durOut = execSync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${possibleVoiceFile}"`).toString().trim();
        voiceDuration = parseFloat(durOut) || 0;
      } catch {}

      const outroSilence = Math.max(0, sceneDuration - introPause - voiceDuration);

      // Build scene track: introSilence + voice + outroSilence
      try {
        if (introPause > 0.05 && outroSilence > 0.05) {
          execSync(
            `"${FFMPEG_BIN}" -y -f lavfi -t ${introPause.toFixed(2)} -i anullsrc=r=44100:cl=stereo -i "${possibleVoiceFile}" -f lavfi -t ${outroSilence.toFixed(2)} -i anullsrc=r=44100:cl=stereo -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]" -map "[a]" -t ${sceneDuration.toFixed(2)} "${sceneTrackPath}"`,
          );
        } else if (introPause > 0.05) {
          execSync(
            `"${FFMPEG_BIN}" -y -f lavfi -t ${introPause.toFixed(2)} -i anullsrc=r=44100:cl=stereo -i "${possibleVoiceFile}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" -t ${sceneDuration.toFixed(2)} "${sceneTrackPath}"`,
          );
        } else {
          execSync(
            `"${FFMPEG_BIN}" -y -i "${possibleVoiceFile}" -af "apad=whole_dur=${sceneDuration.toFixed(2)}" -t ${sceneDuration.toFixed(2)} "${sceneTrackPath}"`,
          );
        }
        sceneAudioTracks.push(sceneTrackPath);
      } catch (e) {
        console.warn(`[AudioAssemble] Scene ${i + 1} voice merge failed, generating silence fallback:`, e.message);
        execSync(`"${FFMPEG_BIN}" -y -f lavfi -t ${sceneDuration.toFixed(2)} -i anullsrc=r=44100:cl=stereo "${sceneTrackPath}"`, { stdio: 'pipe' });
        sceneAudioTracks.push(sceneTrackPath);
      }
    } else {
      // Pure silence track for visual-only scenes
      execSync(`"${FFMPEG_BIN}" -y -f lavfi -t ${sceneDuration.toFixed(2)} -i anullsrc=r=44100:cl=stereo "${sceneTrackPath}"`, { stdio: 'pipe' });
      sceneAudioTracks.push(sceneTrackPath);
    }
  }

  // Concatenate all scene tracks into final voice-narration.mp3
  const masterOutPath = path.join(pDir, 'voice-narration.mp3');
  if (sceneAudioTracks.length > 0) {
    const listFile = path.join(tempAudioDir, 'concat_list.txt');
    const fileContent = sceneAudioTracks.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listFile, fileContent, 'utf-8');

    execSync(`"${FFMPEG_BIN}" -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -q:a 2 "${masterOutPath}"`, { stdio: 'pipe' });
  }

  // Clean up temp folder
  try {
    fs.rmSync(tempAudioDir, { recursive: true, force: true });
  } catch {}

  return masterOutPath;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // --- API: SYSTEM STATUS & REMOTE CONFIG ---
  // Đọc từ version.json thay vì hardcode, để sau này script cập nhật OTA có
  // đúng một chỗ so sánh phiên bản (xem COMMERCIALIZATION_PLAN.md Phase 3).
  if (pathname === '/api/system/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      name: 'GO4AI AI Video Studio',
      version: APP_VERSION.version,
      channel: APP_VERSION.channel,
      mode: APP_VERSION.mode,
      releasedAt: APP_VERSION.releasedAt,
      notes: APP_VERSION.notes,
      pricing: {
        monthlyVnd: 500000,
        yearlyVnd: 3500000,
      }
    }));
  }

  // --- API: USER FEEDBACK & ERROR TELEMETRY ---
  if (pathname === '/api/feedback' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const feedbackFile = path.join(__dirname, 'feedback.json');
        let currentFeedbacks = [];
        if (fs.existsSync(feedbackFile)) {
          try { currentFeedbacks = JSON.parse(fs.readFileSync(feedbackFile, 'utf-8')); } catch {}
        }
        if (!Array.isArray(currentFeedbacks)) currentFeedbacks = [];

        const newEntry = {
          id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          type: payload.type || 'general',
          contact: payload.contact || 'N/A',
          message: payload.message || '',
          userAgent: payload.userAgent || '',
          platform: process.platform,
          nodeVersion: process.version,
          appVersion: APP_VERSION.version,
        };

        currentFeedbacks.push(newEntry);
        fs.writeFileSync(feedbackFile, JSON.stringify(currentFeedbacks, null, 2), 'utf-8');

        console.log(`\n[📢 FEEDBACK RECEIVED] [${newEntry.type.toUpperCase()}] from ${newEntry.contact}: ${newEntry.message}`);

        // Chuyển tiếp qua relay nếu có (dành cho Cloudflare Worker sau này).
        // Relay giữ mọi khoá bí mật ở phía server — app trên máy user KHÔNG
        // bao giờ được cầm token, vì ai cũng đọc được file trên máy mình.
        const relayUrl = process.env.GO4AI_FEEDBACK_RELAY;
        if (relayUrl) {
          try {
            await postJson(relayUrl, newEntry);
            newEntry.relayed = true;
          } catch (relayErr) {
            console.error('[feedback] relay lỗi:', relayErr.message);
          }
        }

        // Không có relay thì đường gửi thật là mail client của user: server
        // dựng sẵn link mailto điền đủ nội dung, UI chỉ việc mở.
        const mailto = buildFeedbackMailto(newEntry);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          id: newEntry.id,
          relayed: Boolean(newEntry.relayed),
          supportEmail: SUPPORT_EMAIL,
          mailto,
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: 1-CLICK INTERNAL GO4AI VIDEO GENERATION ---
  if (pathname === '/api/go4ai/generate-video' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const projectName = (payload.projectName || `go4ai-video-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
        const pDir = path.join(PROJECTS_DIR, projectName);
        if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
        if (!fs.existsSync(path.join(pDir, 'exports'))) fs.mkdirSync(path.join(pDir, 'exports'), { recursive: true });

        const aspect = payload.aspect || '9:16';
        const fps = Number(payload.fps) || 60;
        const voicePresetId = payload.voicePresetId || 'vi-nam-standard';
        const rate = payload.rate || '+0%';
        const pitch = payload.pitch || '+0Hz';
        const topic = payload.topic || 'GO4AI AI Solution';

        let rawScenes = payload.scenes;
        if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
          const scriptText = payload.rawText || payload.script || payload.text || '';
          if (!scriptText.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Vui lòng cung cấp danh sách cảnh hoặc văn bản kịch bản' }));
          }
          const preset = findVoicePreset(voicePresetId);
          const metrics = estimateScriptMetrics({ text: scriptText, lang: preset.lang || 'vi', rate: 0 });
          rawScenes = metrics.scenes.map((s, idx) => {
            const words = s.text.split(/\s+/);
            const headline = words.slice(0, Math.min(6, words.length)).join(' ');
            const subtitle = words.length > 6 ? words.slice(6).join(' ') : topic;
            return {
              id: `scene_${String(idx + 1).padStart(2, '0')}`,
              keyword: `BƯỚC ${String(idx + 1).padStart(2, '0')}`,
              headline,
              subtitle,
              speechText: s.text,
            };
          });
        }

        // Clean existing scene files in this project
        const oldFiles = fs.readdirSync(pDir);
        for (const f of oldFiles) {
          if (/\.html$/i.test(f) || /^voice-.*\.mp3$/i.test(f)) {
            try { fs.unlinkSync(path.join(pDir, f)); } catch {}
          }
        }

        // Synthesize audio and precise durations for all scenes
        const synthRes = await synthesizeMultiSceneVoice({
          scenes: rawScenes,
          voicePresetId,
          rate,
          pitch,
          outDir: pDir,
        });

        const scriptsMap = {};
        const sceneSettingsMap = {};
        const totalScenes = synthRes.scenes.length;

        for (let i = 0; i < totalScenes; i++) {
          const sc = synthRes.scenes[i];
          const fileNum = String(i + 1).padStart(2, '0');
          const fileName = `${fileNum}-scene.html`;
          const filePath = path.join(pDir, fileName);

          const targetVoiceFile = path.join(pDir, `voice-${fileNum}-scene.mp3`);
          if (sc.audioPath && fs.existsSync(sc.audioPath) && sc.audioPath !== targetVoiceFile) {
            fs.copyFileSync(sc.audioPath, targetVoiceFile);
          }

          const htmlContent = createSceneHtmlContent({
            headline: sc.headline || sc.title || `Cảnh ${i + 1}`,
            subtitle: sc.speechText || sc.subText || sc.subtitle || topic,
            stepNumber: i + 1,
            totalSteps: totalScenes,
            duration: sc.durationSec,
            aspect,
            keyword: sc.keyword || `BƯỚC ${fileNum}`,
          });

          fs.writeFileSync(filePath, htmlContent, 'utf-8');
          scriptsMap[fileName] = sc.speechText;
          sceneSettingsMap[fileName] = {
            script: sc.speechText,
            voice: voicePresetId,
            rate,
            pitch,
            introPause: 0.3,
            outroPause: 0.5,
            speechDuration: sc.audioDurationSec,
            duration: sc.durationSec,
            isSilenceOnly: false,
          };
        }

        // Write config.json
        const configData = {
          aspect,
          fps,
          defaultDuration: 5,
          ttsVoice: voicePresetId,
          ttsRate: rate,
          ttsPitch: pitch,
          scripts: scriptsMap,
          sceneSettings: sceneSettingsMap,
        };
        fs.writeFileSync(path.join(pDir, 'config.json'), JSON.stringify(configData, null, 2));

        // Assemble full master audio
        const scenesForAssembly = synthRes.scenes.map((s, idx) => ({
          file: `${String(idx + 1).padStart(2, '0')}-scene.html`,
          duration: s.durationSec,
          introPause: 0.3,
          outroPause: 0.5,
        }));
        const rawMasterAudio = await assembleProjectMasterAudio(projectName, scenesForAssembly);

        // Mix with BGM & Auto-Ducking if selected
        const bgmId = payload.bgmId || 'tech-ambient';
        if (bgmId && bgmId !== 'none' && fs.existsSync(rawMasterAudio)) {
          mixVoiceWithBgm({
            voiceMp3Path: rawMasterAudio,
            bgmId,
            outputMp3Path: rawMasterAudio,
            totalDurationSec: synthRes.totalDurationSec,
            bgmVolume: Number(payload.bgmVolume) || 0.22,
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          projectName,
          aspect,
          bgmId,
          totalDurationSec: synthRes.totalDurationSec,
          sceneCount: totalScenes,
          project: getProjectStats(projectName),
          scenes: synthRes.scenes,
        }));
      } catch (err) {
        console.error('Lỗi GO4AI Video Generation:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: AVAILABLE BGM PRESETS CATALOG ---
  if (pathname === '/api/bgm-presets' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, bgms: BGM_PRESETS }));
  }

  // --- API: AVAILABLE VOICES CATALOG ---
  if (pathname === '/api/voices' && req.method === 'GET') {
    const voices = getAvailableVoices();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      hasVieNeu: hasVieNeu(),
      voices,
    }));
  }

  // --- API: TTS ESTIMATE & SMART SEGMENTATION ---
  if (pathname === '/api/tts-estimate' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { text, lang = 'vi', rate = 0 } = JSON.parse(body || '{}');
        const metrics = estimateScriptMetrics({ text, lang, rate });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, ...metrics }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: STATIC PRE-CACHED VOICE SAMPLE (FAST DIRECT GET) ---
  if (pathname.startsWith('/api/voice-sample/') && req.method === 'GET') {
    const rawVoiceId = pathname.replace('/api/voice-sample/', '').replace(/\.mp3$/, '');
    const preset = findVoicePreset(rawVoiceId);
    const samplePath = path.resolve('./assets/audio/voice-samples', `${preset.id}.mp3`);
    if (fs.existsSync(samplePath) && fs.statSync(samplePath).size > 1000) {
      const audioBuffer = fs.readFileSync(samplePath);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'public, max-age=86400',
        'X-Voice-Requested': encodeURIComponent(preset.voiceId),
        'X-Voice-Actual': encodeURIComponent(preset.voiceId),
        'X-Voice-Fallback': '0',
        'X-Voice-Precached': '1',
        'Access-Control-Expose-Headers': 'X-Voice-Requested, X-Voice-Actual, X-Voice-Fallback, X-Voice-Precached',
      });
      return res.end(audioBuffer);
    }
  }

  // --- API: INSTANT TTS AUDIO PREVIEW (STREAM / AUDITION) ---
  if (pathname === '/api/tts-preview' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const { text, voicePresetId = 'vi-nam-minh', rate = 0, pitch = 0 } = JSON.parse(body || '{}');
        const preset = findVoicePreset(voicePresetId);

        const hasCustomText = (text && text.trim().length > 0);
        const isStandardSample = !hasCustomText && Number(rate) === 0 && Number(pitch) === 0;

        // Nếu là nghe thử giọng mẫu tiêu chuẩn và đã có file mẫu offline: trả về tức thì (<2ms)
        const sampleFile = path.resolve('./assets/audio/voice-samples', `${preset.id}.mp3`);
        if (isStandardSample && fs.existsSync(sampleFile) && fs.statSync(sampleFile).size > 1000) {
          const audioBuffer = fs.readFileSync(sampleFile);
          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'public, max-age=86400',
            'X-Voice-Requested': encodeURIComponent(preset.voiceId),
            'X-Voice-Actual': encodeURIComponent(preset.voiceId),
            'X-Voice-Fallback': '0',
            'X-Voice-Precached': '1',
            'Access-Control-Expose-Headers': 'X-Voice-Requested, X-Voice-Actual, X-Voice-Fallback, X-Voice-Precached',
          });
          return res.end(audioBuffer);
        }

        // Nếu là kịch bản tùy chỉnh hoặc tốc độ tùy chỉnh: tổng hợp audio
        let auditionText = hasCustomText ? text.trim() : '';
        if (!auditionText) {
          if (preset.lang === 'en') {
            auditionText = `Hello! I am ${preset.name}. Welcome to GO4AI HTML to Video Studio.`;
          } else {
            auditionText = `Xin chào! Tôi là ${preset.name}. Chào mừng bạn đến với GO4AI HTML to Video Studio.`;
          }
        }

        const scratchDir = path.join(__dirname, 'scratch');
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
        const tempOutFile = path.join(scratchDir, `preview_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

        const synth = await synthesizeVoiceSpeech({
          text: auditionText,
          voicePresetId,
          rate,
          pitch,
          outFilePath: tempOutFile,
        });

        if (fs.existsSync(tempOutFile) && fs.statSync(tempOutFile).size > 0) {
          const audioBuffer = fs.readFileSync(tempOutFile);
          try { fs.unlinkSync(tempOutFile); } catch {}

          // Tự động lưu cache nếu là mẫu chuẩn
          if (isStandardSample && audioBuffer.length > 1000 && synth.voiceId === preset.voiceId) {
            try { fs.writeFileSync(sampleFile, audioBuffer); } catch {}
          }

          const wantedVoice = preset.voiceId;
          const isFallback = synth.voiceId !== wantedVoice;

          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'no-cache',
            'X-Voice-Requested': encodeURIComponent(wantedVoice),
            'X-Voice-Actual': encodeURIComponent(synth.voiceId),
            'X-Voice-Fallback': isFallback ? '1' : '0',
            'X-Voice-Precached': '0',
            'Access-Control-Expose-Headers': 'X-Voice-Requested, X-Voice-Actual, X-Voice-Fallback, X-Voice-Precached',
          });
          return res.end(audioBuffer);
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Không thể tạo file âm thanh mẫu' }));
        }
      } catch (err) {
        console.error('Lỗi TTS Preview:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: STREAM SCENE AUDIO ---
  const sceneAudioMatch = pathname.match(/^\/api\/projects\/([^/]+)\/scene-audio\/([^/]+)$/);
  if (sceneAudioMatch && req.method === 'GET') {
    const projectName = sceneAudioMatch[1];
    const sceneFile = sceneAudioMatch[2];
    const pDir = path.join(PROJECTS_DIR, projectName);
    const audioPath = path.join(pDir, `voice-${sceneFile.replace(/\.html$/i, '')}.mp3`);

    if (fs.existsSync(audioPath)) {
      const stat = fs.statSync(audioPath);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache',
      });
      return fs.createReadStream(audioPath).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Chưa có audio cho cảnh này' }));
  }


  // --- API: TEMPLATES ---
  if (pathname === '/api/templates' && req.method === 'GET') {
    const list = getAllTemplates();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, templates: list }));
  }

  // Preview template HTML directly with dynamic composition inlining and unpaused animation
  const previewTemplateMatch = pathname.match(/^\/preview-template\/([^/]+)$/);
  if (previewTemplateMatch && req.method === 'GET') {
    const templateId = previewTemplateMatch[1];
    const tDir = path.join(TEMPLATES_DIR, templateId);
    if (!fs.existsSync(tDir)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Template HTML not found');
    }
    const compiled = compileTemplateHtml(templateId);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(compiled);
  }

  // --- API: PROJECTS LIST & CREATE ---
  if (pathname === '/api/projects' && req.method === 'GET') {
    const list = fs.readdirSync(PROJECTS_DIR)
      .filter((name) => {
        const p = path.join(PROJECTS_DIR, name);
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      })
      .map(getProjectStats)
      .filter(Boolean);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, projects: list }));
  }

  if (pathname === '/api/projects' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { name, aspect = '16:9' } = JSON.parse(body);
        if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Tên thư mục không hợp lệ (chỉ gồm chữ cái, số, dấu gạch nối/dưới)' }));
        }
        const dir = path.join(PROJECTS_DIR, name);
        if (fs.existsSync(dir)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Thư mục dự án đã tồn tại' }));
        }
        fs.mkdirSync(dir, { recursive: true });
        fs.mkdirSync(path.join(dir, 'exports'), { recursive: true });

        const sampleHtml = createSceneHtmlContent({
          headline: name,
          subtitle: 'Tuỳ chỉnh nội dung và hình ảnh bằng trình soạn thảo trực quan',
          stepNumber: 1,
          category: 'hero',
          duration: 4,
          aspect,
        });

        fs.writeFileSync(path.join(dir, '01-intro.html'), sampleHtml);
        fs.writeFileSync(
          path.join(dir, 'config.json'),
          JSON.stringify(
            {
              aspect,
              fps: 60,
              defaultDuration: 4,
              ttsVoice: 'vi-nam-standard',
              ttsRate: 0,
              ttsPitch: 0,
              scripts: { '01-intro.html': `Chào mừng bạn đến với ${name}` },
              sceneSettings: {
                '01-intro.html': {
                  introPause: 0.3,
                  outroPause: 0.5,
                  script: `Chào mừng bạn đến với ${name}`,
                },
              },
            },
            null,
            2
          )
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, project: getProjectStats(name) }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: PROJECT DETAIL ---
  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && req.method === 'GET') {
    const projectName = projectMatch[1];
    const stats = getProjectStats(projectName);
    if (!stats) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Project not found' }));
    }

    const dir = path.join(PROJECTS_DIR, projectName);
    const scenes = stats.htmlFiles.map((file) => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const duration = extractDuration(file, content, stats.config.defaultDuration || 5);
      const script = (stats.config.scripts && stats.config.scripts[file]) || '';
      const sceneSetting = (stats.config.sceneSettings && stats.config.sceneSettings[file]) || {};

      const voiceFile = path.join(dir, `voice-${file.replace(/\.html$/i, '')}.mp3`);
      const hasVoice = fs.existsSync(voiceFile);
      let speechDuration = null;
      if (hasVoice) {
        try {
          const durOut = execSync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voiceFile}"`).toString().trim();
          speechDuration = parseFloat(durOut) || null;
        } catch {}
      }

      return {
        file,
        duration,
        script: sceneSetting.script || script,
        introPause: sceneSetting.introPause !== undefined ? sceneSetting.introPause : 0.3,
        outroPause: sceneSetting.outroPause !== undefined ? sceneSetting.outroPause : 0.5,
        isSilenceOnly: Boolean(sceneSetting.isSilenceOnly),
        speechDuration: speechDuration ? Number(speechDuration.toFixed(1)) : null,
        hasVoice,
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, project: { ...stats, scenes } }));
  }

  // Delete project
  if (projectMatch && req.method === 'DELETE') {
    const projectName = projectMatch[1];
    const dir = path.join(PROJECTS_DIR, projectName);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Project not found' }));
  }

  // Duplicate project
  const dupProjectMatch = pathname.match(/^\/api\/projects\/([^/]+)\/duplicate$/);
  if (dupProjectMatch && req.method === 'POST') {
    const projectName = dupProjectMatch[1];
    const srcDir = path.join(PROJECTS_DIR, projectName);
    if (!fs.existsSync(srcDir)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Project not found' }));
    }

    let copyName = `${projectName}-copy`;
    let count = 1;
    while (fs.existsSync(path.join(PROJECTS_DIR, copyName))) {
      copyName = `${projectName}-copy-${++count}`;
    }

    fs.cpSync(srcDir, path.join(PROJECTS_DIR, copyName), { recursive: true });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, newName: copyName }));
  }

  // Update project config
  const configMatch = pathname.match(/^\/api\/projects\/([^/]+)\/config$/);
  if (configMatch && req.method === 'POST') {
    const projectName = configMatch[1];
    const dir = path.join(PROJECTS_DIR, projectName);
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const configFile = path.join(dir, 'config.json');
        let currentCfg = {};
        if (fs.existsSync(configFile)) {
          try { currentCfg = JSON.parse(fs.readFileSync(configFile, 'utf-8')); } catch {}
        }
        const newCfg = { ...currentCfg, ...payload };
        fs.writeFileSync(configFile, JSON.stringify(newCfg, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, config: newCfg }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: AUTO-DIRECTOR & AI GENERATE PROJECT ---
  const autoGenMatch = pathname.match(/^\/api\/projects\/([^/]+)\/auto-generate$/);
  if (autoGenMatch && req.method === 'POST') {
    const projectName = autoGenMatch[1];
    const pDir = path.join(PROJECTS_DIR, projectName);
    if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
    if (!fs.existsSync(path.join(pDir, 'exports'))) fs.mkdirSync(path.join(pDir, 'exports'), { recursive: true });

    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const {
          script = '',
          topic = 'Video Giới Thiệu',
          voicePresetId = 'vi-nam-standard',
          rate = 0,
          pitch = 0,
          aspect = '16:9',
          fps = 60,
          generateVoice = true,
        } = JSON.parse(body || '{}');

        if (!script || script.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Vui lòng cung cấp nội dung kịch bản' }));
        }

        const preset = findVoicePreset(voicePresetId);
        const metrics = estimateScriptMetrics({ text: script, lang: preset.lang || 'vi', rate });
        const scenesData = metrics.scenes;

        if (scenesData.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Không thể phân tách câu từ kịch bản' }));
        }

        // Clean existing html and voice files
        const oldFiles = fs.readdirSync(pDir);
        for (const f of oldFiles) {
          if (/\.html$/i.test(f) || /^voice-.*\.mp3$/i.test(f)) {
            try { fs.unlinkSync(path.join(pDir, f)); } catch {}
          }
        }

        const categories = ['hero', 'tech', 'data', 'highlight', 'outro'];
        const scriptsMap = {};
        const sceneSettingsMap = {};

        for (let i = 0; i < scenesData.length; i++) {
          const sc = scenesData[i];
          const fileNum = String(i + 1).padStart(2, '0');
          const isFirst = i === 0;
          const isLast = i === scenesData.length - 1;
          const cat = isFirst ? 'hero' : isLast ? 'outro' : categories[i % categories.length];

          const fileName = `${fileNum}-scene-${cat}.html`;
          const filePath = path.join(pDir, fileName);

          // Split scene text into headline and subtitle
          const words = sc.text.split(/\s+/);
          let headline = words.slice(0, Math.min(6, words.length)).join(' ');
          let subtitle = words.length > 6 ? words.slice(6).join(' ') : topic;

          // Generate speech audio if requested
          let voiceDuration = sc.speechSec;
          if (generateVoice) {
            const outVoiceFile = path.join(pDir, `voice-${fileNum}-scene-${cat}.mp3`);
            try {
              const synthRes = await synthesizeVoiceSpeech({
                text: sc.text,
                voicePresetId,
                rate,
                pitch,
                outFilePath: outVoiceFile,
              });
              if (synthRes.durationSec > 0) voiceDuration = synthRes.durationSec;
            } catch (vErr) {
              console.warn(`[AutoGenerate] Voice synthesis failed for scene ${i + 1}:`, vErr.message);
            }
          }

          const introPause = 0.3;
          const outroPause = 0.5;
          const finalSceneDuration = Number((introPause + voiceDuration + outroPause).toFixed(1));

          const htmlContent = createSceneHtmlContent({
            headline,
            subtitle,
            stepNumber: i + 1,
            category: cat,
            duration: finalSceneDuration,
            aspect,
          });

          fs.writeFileSync(filePath, htmlContent, 'utf-8');
          scriptsMap[fileName] = sc.text;
          sceneSettingsMap[fileName] = {
            script: sc.text,
            introPause,
            outroPause,
            speechDuration: voiceDuration,
            isSilenceOnly: false,
          };
        }

        // Save project config
        const newConfig = {
          aspect,
          fps: Number(fps) || 60,
          defaultDuration: 5,
          ttsVoice: voicePresetId,
          ttsRate: Number(rate) || 0,
          ttsPitch: Number(pitch) || 0,
          scripts: scriptsMap,
          sceneSettings: sceneSettingsMap,
        };
        fs.writeFileSync(path.join(pDir, 'config.json'), JSON.stringify(newConfig, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          project: getProjectStats(projectName),
          metrics,
        }));
      } catch (err) {
        console.error('Auto-generate error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: PROJECT EXPORTS MANAGEMENT ---
  const videosListMatch = pathname.match(/^\/api\/projects\/([^/]+)\/videos$/);
  if (videosListMatch && req.method === 'GET') {
    const projectName = videosListMatch[1];
    const videos = getProjectExportedVideos(projectName);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, videos }));
  }

  // Serve exported video file
  const exportVideoMatch = pathname.match(/^\/api\/projects\/([^/]+)\/exports\/([^/]+)$/);
  if (exportVideoMatch && req.method === 'GET') {
    const projectName = exportVideoMatch[1];
    const filename = exportVideoMatch[2];
    const filePath = path.join(PROJECTS_DIR, projectName, 'exports', filename);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      return res.end('Video not found');
    }
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Delete an exported video
  const deleteVideoMatch = pathname.match(/^\/api\/projects\/([^/]+)\/videos\/([^/]+)$/);
  if (deleteVideoMatch && req.method === 'DELETE') {
    const projectName = deleteVideoMatch[1];
    const filename = deleteVideoMatch[2];
    const dir = path.join(PROJECTS_DIR, projectName);
    const p1 = path.join(dir, 'exports', filename);
    const p2 = path.join(dir, filename);

    if (fs.existsSync(p1)) fs.unlinkSync(p1);
    if (fs.existsSync(p2)) fs.unlinkSync(p2);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  // --- API: TTS VOICE GENERATION ---
  const ttsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/tts$/);
  if (ttsMatch && req.method === 'POST') {
    const projectName = ttsMatch[1];
    const pDir = path.join(PROJECTS_DIR, projectName);
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const {
          text,
          voicePresetId = 'vi-nam-standard',
          customVoiceId = null,
          rate = 0,
          pitch = 0,
          sceneFile,
          autoSyncDuration = true,
          introPause = 0.3,
          outroPause = 0.5,
        } = JSON.parse(body);

        if (!text || text.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Vui lòng nhập lời thoại' }));
        }

        const outFileName = sceneFile ? `voice-${sceneFile.replace(/\.html$/i, '')}.mp3` : 'voice-narration.mp3';
        const outPath = path.join(pDir, outFileName);

        const { durationSec, sizeBytes, preset } = await synthesizeVoiceSpeech({
          text,
          voicePresetId,
          customVoiceId,
          rate,
          pitch,
          outFilePath: outPath,
        });

        // Save script into project config
        const configFile = path.join(pDir, 'config.json');
        let currentCfg = { scripts: {}, sceneSettings: {} };
        if (fs.existsSync(configFile)) {
          try { currentCfg = JSON.parse(fs.readFileSync(configFile, 'utf-8')); } catch {}
        }
        if (!currentCfg.scripts) currentCfg.scripts = {};
        if (!currentCfg.sceneSettings) currentCfg.sceneSettings = {};

        if (sceneFile) {
          currentCfg.scripts[sceneFile] = text;
          currentCfg.sceneSettings[sceneFile] = {
            ...(currentCfg.sceneSettings[sceneFile] || {}),
            script: text,
            voice: voicePresetId,
            rate,
            pitch,
            introPause: Number(introPause) || 0.3,
            outroPause: Number(outroPause) || 0.5,
            speechDuration: durationSec,
            isSilenceOnly: false,
          };
        } else {
          currentCfg.fullScript = text;
        }

        currentCfg.ttsVoice = voicePresetId;
        currentCfg.ttsRate = rate;
        currentCfg.ttsPitch = pitch;
        fs.writeFileSync(configFile, JSON.stringify(currentCfg, null, 2));

        // If auto-sync duration for a specific scene: Duration = introPause + speechDuration + outroPause
        let totalCalculatedDuration = durationSec;
        if (sceneFile && autoSyncDuration) {
          const scenePath = path.join(pDir, sceneFile);
          if (fs.existsSync(scenePath)) {
            totalCalculatedDuration = Number(((Number(introPause) || 0.3) + durationSec + (Number(outroPause) || 0.5)).toFixed(1));
            let htmlContent = fs.readFileSync(scenePath, 'utf-8');
            htmlContent = updateDurationInHtml(htmlContent, totalCalculatedDuration);
            fs.writeFileSync(scenePath, htmlContent, 'utf-8');
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          filename: outFileName,
          speechDurationSec: durationSec,
          totalDurationSec: totalCalculatedDuration,
          sizeBytes,
          voice: preset.name,
        }));
      } catch (err) {
        console.error('TTS Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: SCENE OPERATIONS ---
  const addTemplateMatch = pathname.match(/^\/api\/projects\/([^/]+)\/add-template$/);
  if (addTemplateMatch && req.method === 'POST') {
    const projectName = addTemplateMatch[1];
    const pDir = path.join(PROJECTS_DIR, projectName);
    if (!fs.existsSync(pDir)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Project not found' }));
    }

    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { templateId, duration = 5 } = JSON.parse(body);
        const tDir = path.join(TEMPLATES_DIR, templateId);
        if (!fs.existsSync(tDir)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Template not found' }));
        }

        let htmlContent = compileTemplateHtml(templateId);
        htmlContent = updateDurationInHtml(htmlContent, duration);

        const existingFiles = fs.readdirSync(pDir).filter((f) => f.endsWith('.html'));
        const nextNum = String(existingFiles.length + 1).padStart(2, '0');
        const cleanName = templateId.replace(/^frame-/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
        const newFileName = `${nextNum}-${cleanName}.html`;

        fs.writeFileSync(path.join(pDir, newFileName), htmlContent, 'utf-8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, file: newFileName }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Create Blank Scene
  const newSceneMatch = pathname.match(/^\/api\/projects\/([^/]+)\/scenes\/new$/);
  if (newSceneMatch && req.method === 'POST') {
    const projectName = newSceneMatch[1];
    const pDir = path.join(PROJECTS_DIR, projectName);
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { sceneName = 'scene', duration = 5, isSilenceOnly = false } = JSON.parse(body || '{}');
        const existingFiles = fs.readdirSync(pDir).filter((f) => f.endsWith('.html'));
        const nextNum = String(existingFiles.length + 1).padStart(2, '0');
        const cleanName = sceneName.replace(/[^a-zA-Z0-9_-]/g, '-');
        const newFileName = `${nextNum}-${cleanName}.html`;

        const blankHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="duration" content="${duration}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      width: 1920px;
      height: 1080px;
      background: #080c14;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="text-center p-10">
    <div class="inline-block px-4 py-1 rounded-full bg-slate-800 text-slate-400 text-sm font-bold uppercase mb-4">
      ${isSilenceOnly ? 'CẢNH THUẦN HÌNH ẢNH / KHÔNG LỜI' : `CẢNH 0${existingFiles.length + 1}`}
    </div>
    <h2 class="text-6xl font-black text-white">${sceneName}</h2>
    <p class="text-2xl text-slate-400 mt-4">Chỉnh sửa mã HTML/CSS trong trình soạn thảo</p>
  </div>
</body>
</html>`;
        fs.writeFileSync(path.join(pDir, newFileName), blankHtml);

        if (isSilenceOnly) {
          const configFile = path.join(pDir, 'config.json');
          let currentCfg = { sceneSettings: {} };
          if (fs.existsSync(configFile)) {
            try { currentCfg = JSON.parse(fs.readFileSync(configFile, 'utf-8')); } catch {}
          }
          if (!currentCfg.sceneSettings) currentCfg.sceneSettings = {};
          currentCfg.sceneSettings[newFileName] = {
            isSilenceOnly: true,
            introPause: 0,
            outroPause: 0,
          };
          fs.writeFileSync(configFile, JSON.stringify(currentCfg, null, 2));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, file: newFileName }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Get / Update / Delete Scene
  const sceneFileMatch = pathname.match(/^\/api\/projects\/([^/]+)\/scenes\/([^/]+)$/);
  if (sceneFileMatch) {
    const projectName = sceneFileMatch[1];
    const filename = sceneFileMatch[2];
    const filePath = path.join(PROJECTS_DIR, projectName, filename);

    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Scene not found' }));
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const duration = extractDuration(filename, content, 5);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, content, duration, filename }));
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const { content, duration, script, introPause, outroPause, isSilenceOnly } = JSON.parse(body);
          let finalContent = content;
          if (duration !== undefined && duration !== null) {
            finalContent = updateDurationInHtml(finalContent, duration);
          }
          fs.writeFileSync(filePath, finalContent, 'utf-8');

          const pDir = path.join(PROJECTS_DIR, projectName);
          const configFile = path.join(pDir, 'config.json');
          let currentCfg = { scripts: {}, sceneSettings: {} };
          if (fs.existsSync(configFile)) {
            try { currentCfg = JSON.parse(fs.readFileSync(configFile, 'utf-8')); } catch {}
          }
          if (!currentCfg.scripts) currentCfg.scripts = {};
          if (!currentCfg.sceneSettings) currentCfg.sceneSettings = {};

          if (script !== undefined) currentCfg.scripts[filename] = script;

          currentCfg.sceneSettings[filename] = {
            ...(currentCfg.sceneSettings[filename] || {}),
            script: script !== undefined ? script : (currentCfg.scripts[filename] || ''),
            introPause: introPause !== undefined ? Number(introPause) : (currentCfg.sceneSettings[filename]?.introPause ?? 0.3),
            outroPause: outroPause !== undefined ? Number(outroPause) : (currentCfg.sceneSettings[filename]?.outroPause ?? 0.5),
            isSilenceOnly: isSilenceOnly !== undefined ? Boolean(isSilenceOnly) : Boolean(currentCfg.sceneSettings[filename]?.isSilenceOnly),
          };

          fs.writeFileSync(configFile, JSON.stringify(currentCfg, null, 2));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // Also remove associated voice file
        const voicePath = path.join(PROJECTS_DIR, projectName, `voice-${filename.replace(/\.html$/i, '')}.mp3`);
        if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }
  }

  // Duplicate Scene
  const dupSceneMatch = pathname.match(/^\/api\/projects\/([^/]+)\/scenes\/([^/]+)\/duplicate$/);
  if (dupSceneMatch && req.method === 'POST') {
    const projectName = dupSceneMatch[1];
    const filename = dupSceneMatch[2];
    const pDir = path.join(PROJECTS_DIR, projectName);
    const srcFile = path.join(pDir, filename);

    if (fs.existsSync(srcFile)) {
      const base = filename.replace(/\.html$/i, '');
      const newFile = `${base}-copy.html`;
      fs.copyFileSync(srcFile, path.join(pDir, newFile));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, file: newFile }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Scene not found' }));
  }

  // Reorder Scenes
  const reorderMatch = pathname.match(/^\/api\/projects\/([^/]+)\/scenes\/reorder$/);
  if (reorderMatch && req.method === 'POST') {
    const projectName = reorderMatch[1];
    const pDir = path.join(PROJECTS_DIR, projectName);
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { order } = JSON.parse(body);
        if (!Array.isArray(order)) throw new Error('Order array required');

        const tempNames = [];
        for (let i = 0; i < order.length; i++) {
          const oldName = order[i];
          const oldPath = path.join(pDir, oldName);
          if (fs.existsSync(oldPath)) {
            const cleanName = oldName.replace(/^\d+[-_]/, '');
            const tempName = `__tmp_${String(i + 1).padStart(2, '0')}-${cleanName}`;
            fs.renameSync(oldPath, path.join(pDir, tempName));
            tempNames.push(tempName);
          }
        }
        for (let i = 0; i < tempNames.length; i++) {
          const tmpPath = path.join(pDir, tempNames[i]);
          const finalName = tempNames[i].replace(/^__tmp_/, '');
          fs.renameSync(tmpPath, path.join(pDir, finalName));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Upload file
  const uploadMatch = pathname.match(/^\/api\/projects\/([^/]+)\/upload$/);
  if (uploadMatch && req.method === 'POST') {
    const projectName = uploadMatch[1];
    const pDir = path.join(PROJECTS_DIR, projectName);
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { filename, base64Content } = JSON.parse(body);
        if (!filename || !base64Content) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Filename & content required' }));
        }
        const cleanName = path.basename(filename);
        const buffer = Buffer.from(base64Content.split(',').pop(), 'base64');
        fs.writeFileSync(path.join(pDir, cleanName), buffer);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, filename: cleanName }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Open project root folder in Explorer
  const openFolderMatch = pathname.match(/^\/api\/projects\/([^/]+)\/open$/);
  if (openFolderMatch && req.method === 'POST') {
    const projectName = openFolderMatch[1];
    const dir = path.join(PROJECTS_DIR, projectName);
    if (fs.existsSync(dir)) {
      exec(`explorer.exe "${dir}"`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Folder not found' }));
  }

  // Open exports / videos folder in Explorer
  const openExportsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/open-exports$/);
  if (openExportsMatch && req.method === 'POST') {
    const projectName = openExportsMatch[1];
    const dir = path.join(PROJECTS_DIR, projectName);
    const exportsDir = path.join(dir, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    exec(`explorer.exe "${exportsDir}"`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, path: exportsDir }));
  }

  // Open global projects root folder in Explorer
  if (pathname === '/api/open-projects' && req.method === 'POST') {
    exec(`explorer.exe "${PROJECTS_DIR}"`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }



  // Serve Scene HTML Preview (in iframe)
  const previewMatch = pathname.match(/^\/preview\/([^/]+)\/([^/]+)$/);
  if (previewMatch && req.method === 'GET') {
    const projectName = previewMatch[1];
    const filename = previewMatch[2];
    const filePath = path.join(PROJECTS_DIR, projectName, filename);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('data-composition-src') && !content.includes('__COMPOSITIONS__')) {
        for (const t of fs.readdirSync(TEMPLATES_DIR)) {
          const tDir = path.join(TEMPLATES_DIR, t);
          if (fs.existsSync(path.join(tDir, 'compositions'))) {
            const regex = /data-composition-src=["']([^"']+)["']/g;
            let m;
            const compMap = {};
            while ((m = regex.exec(content)) !== null) {
              const compPath = path.join(tDir, m[1]);
              if (fs.existsSync(compPath)) compMap[m[1]] = fs.readFileSync(compPath, 'utf8');
            }
            if (Object.keys(compMap).length > 0) {
              const safeJson = JSON.stringify(compMap).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
              const head = '<script>window.__timelines=window.__timelines||{};window.__COMPOSITIONS__=' + safeJson + ';</script>';
              content = /<head[^>]*>/i.test(content) ? content.replace(/<head[^>]*>/i, mm => mm + '\n' + head) : head + '\n' + content;
              const player = `<script>
(function() {
  function reexec(root) {
    root.querySelectorAll('script').forEach(function(old) {
      if (old.src) return;
      var s = document.createElement('script');
      s.textContent = '{\\n' + old.textContent + '\\n}';
      old.parentNode.replaceChild(s, old);
    });
  }
  function mountOne(host) {
    var src = host.getAttribute('data-composition-src');
    var text = (window.__COMPOSITIONS__ || {})[src];
    if (!text) return;
    var holder = document.createElement('div');
    holder.innerHTML = text;
    var tpl = holder.querySelector('template');
    host.appendChild(tpl ? tpl.content.cloneNode(true) : holder);
    reexec(host);
  }
  window.__hvPlayAll = function() {
    var tls = window.__timelines || {};
    Object.keys(tls).forEach(function(k) {
      var tl = tls[k];
      if (tl && typeof tl.play === 'function') tl.play(0);
    });
  };
  function boot() {
    window.__timelines = window.__timelines || {};
    Array.prototype.slice.call(document.querySelectorAll('[data-composition-src]')).forEach(mountOne);
    setTimeout(function() { window.__hvPlayAll(); }, 150);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`;
              content = content.includes('</body>') ? content.replace('</body>', player + '\n</body>') : content + player;
              break;
            }
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(content);
    }
    res.writeHead(404);
    return res.end('HTML file not found');
  }

  // Stream output video
  const videoMatch = pathname.match(/^\/video\/([^/]+)\/output\.mp4$/);
  if (videoMatch && req.method === 'GET') {
    const projectName = videoMatch[1];
    const videoPath = path.join(PROJECTS_DIR, projectName, 'output.mp4');
    if (!fs.existsSync(videoPath)) {
      res.writeHead(404);
      return res.end('Video not found');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
    return;
  }

  // Trigger Render with SSE Events & High Precision Audio Alignment
  const renderMatch = pathname.match(/^\/api\/projects\/([^/]+)\/render$/);
  if (renderMatch && req.method === 'GET') {
    const projectName = renderMatch[1];
    const dir = path.join(PROJECTS_DIR, projectName);
    const exportsDir = path.join(dir, 'exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

    if (!fs.existsSync(dir)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Project not found');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('status', { stage: 'Đang nạp kịch bản render...', percent: 0 });

    try {
      const files = fs.readdirSync(dir);
      const htmlFiles = files
        .filter((f) => f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (htmlFiles.length === 0) {
        sendEvent('error', { message: 'Không tìm thấy file HTML nào trong thư mục' });
        return res.end();
      }

      let resolution = { width: 1920, height: 1080 };
      let fps = 60;
      let defaultDuration = 5;

      let cfg = {};
      const configFile = path.join(dir, 'config.json');
      if (fs.existsSync(configFile)) {
        try {
          cfg = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
          if (cfg.aspect === '9:16' || cfg.ratio === '9:16') resolution = { width: 1080, height: 1920 };
          else if (cfg.aspect === '1:1' || cfg.ratio === '1:1') resolution = { width: 1080, height: 1080 };
          else if (cfg.width && cfg.height) resolution = { width: Number(cfg.width), height: Number(cfg.height) };
          if (cfg.fps) fps = Number(cfg.fps);
          if (cfg.defaultDuration) defaultDuration = Number(cfg.defaultDuration);
        } catch {}
      }

      sendEvent('log', { message: `Độ phân giải: ${resolution.width}x${resolution.height} (${fps}fps), ${htmlFiles.length} scenes` });

      // Gather scenes metadata for audio assembly
      const sceneObjects = htmlFiles.map((file) => {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        const duration = extractDuration(file, content, defaultDuration);
        const sceneSetting = (cfg.sceneSettings && cfg.sceneSettings[file]) || {};
        return {
          file,
          duration,
          introPause: sceneSetting.introPause !== undefined ? sceneSetting.introPause : 0.3,
          outroPause: sceneSetting.outroPause !== undefined ? sceneSetting.outroPause : 0.5,
          isSilenceOnly: Boolean(sceneSetting.isSilenceOnly),
        };
      });

      // Assemble master aligned soundtrack with exact timing & silence gaps
      sendEvent('status', { stage: 'Đang xử lý đồng bộ âm thanh & khoảng trống...', percent: 5 });
      const masterAudioPath = await assembleProjectMasterAudio(projectName, sceneObjects);

      const ctx = await bootstrap({ cwd: __dirname });
      const project = await ctx.orchestrator.create({
        name: projectName,
        intent: `UI Render ${projectName}`,
        preferences: { resolution, fps },
      });

      const nodes = [];
      const edges = [];
      const frameContents = [];

      for (let i = 0; i < htmlFiles.length; i++) {
        const file = htmlFiles[i];
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        const durationSec = extractDuration(file, content, defaultDuration);
        const frameId = `scene_${i + 1}`;

        nodes.push({ id: frameId, kind: 'text', text: file, durationSec });
        if (i > 0) edges.push({ from: nodes[i - 1].id, to: frameId, kind: 'sequence' });
        frameContents.push({ frameId, content });
      }

      await ctx.orchestrator.writeContentGraph(project.id, {
        schemaVersion: 1,
        intent: 'explainer',
        nodes,
        edges,
      });

      for (const { frameId, content } of frameContents) {
        await ctx.orchestrator.writeFrameHtml(project.id, frameId, content);
      }

      if (fs.existsSync(masterAudioPath) && fs.statSync(masterAudioPath).size > 100) {
        sendEvent('log', { message: `Đồng bộ âm thanh hoàn tất (${path.basename(masterAudioPath)})` });
        const assetRes = await ctx.orchestrator.addFileAsset(project.id, masterAudioPath, 'Audio');
        const loadedProj = await ctx.projects.load(project.id);
        const addedAsset = assetRes.assets[assetRes.assets.length - 1];
        loadedProj.soundtrack = { narrationAssetId: addedAsset.id, narrationVolumeDb: 0 };
        await ctx.projects.save(loadedProj);
      }

      sendEvent('status', { stage: 'Bắt đầu render video Chromium 60fps...', percent: 10 });

      const { outputPath } = await ctx.orchestrator.exportMp4({
        projectId: project.id,
        onProgress: (pct, stage) => {
          sendEvent('status', { stage, percent: Math.round(pct) });
        },
      });

      // 1. Copy to root output.mp4
      const finalVideoInFolder = path.join(dir, 'output.mp4');
      fs.copyFileSync(outputPath, finalVideoInFolder);

      // 2. Also save timestamped version into exports/
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const exportCopyName = `video_${timestamp}.mp4`;
      const exportPath = path.join(exportsDir, exportCopyName);
      fs.copyFileSync(outputPath, exportPath);

      const stat = fs.statSync(finalVideoInFolder);
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

      sendEvent('complete', {
        videoUrl: `/video/${projectName}/output.mp4?t=${Date.now()}`,
        sizeMb,
        exportFilename: exportCopyName,
        filePath: finalVideoInFolder,
      });
      res.end();
    } catch (err) {
      console.error('Render error:', err);
      sendEvent('error', { message: err.message });
      res.end();
    }
    return;
  }

  // Static files
  let staticPath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(staticPath) || !fs.statSync(staticPath).isFile()) {
    staticPath = path.join(__dirname, pathname.startsWith('/') ? pathname.slice(1) : pathname);
  }

  if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    const ext = path.extname(staticPath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    return fs.createReadStream(staticPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

function openInBrowser(url) {
  try {
    const startCmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(startCmd, () => {});
  } catch {}
}

/**
 * Khi cổng đã bận thì CHUYỂN SANG CỔNG KHÁC, không mở lại bản đang chạy.
 *
 * Trước đây gặp EADDRINUSE là mở trình duyệt vào tiến trình cũ rồi thoát.
 * Hậu quả: user cập nhật bản mới, chạy lại, nhưng vẫn đang dùng BẢN CŨ còn
 * sót trong máy — họ tưởng bản vá không có tác dụng. Đây là cái bẫy khó đoán
 * nhất vì mọi thứ trông như bình thường.
 */
const MAX_PORT_TRIES = 10;
let portAttempt = 0;

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') {
    console.error('[Error] Server error:', err.message);
    return;
  }

  portAttempt += 1;
  if (portAttempt > MAX_PORT_TRIES) {
    console.error(`\n[LOI] Da thu ${MAX_PORT_TRIES} cong deu ban. Vui long dong bot ung dung roi chay lai.`);
    process.exit(1);
  }

  const nextPort = Number(PORT) + portAttempt;
  console.log(`[!] Cong ${Number(PORT) + portAttempt - 1} dang ban (co the la ban CU cua app con chay).`);
  console.log(`[*] Dang thu cong ${nextPort}...`);
  server.listen(nextPort, '127.0.0.1');
});

// Bind vào 127.0.0.1 (loopback nội bộ) thay vì 0.0.0.0
// → Windows Firewall và macOS Firewall sẽ KHÔNG hiện cảnh báo khi mở app lần đầu
server.on('listening', () => {
  const actualPort = server.address().port;
  const openUrl = `http://127.0.0.1:${actualPort}`;

  console.log(`\n======================================================`);
  console.log(`🚀 GO4AI AI Video Studio đang chạy!`);
  console.log(`🌐 Địa chỉ: ${openUrl}`);
  console.log(`   Phiên bản: ${APP_VERSION.version}`);
  console.log(`======================================================\n`);

  if (actualPort !== Number(PORT)) {
    console.log(`[LUU Y] Cong mac dinh ${PORT} dang bi mot ban khac chiem.`);
    console.log(`        Ban DANG XEM o dia chi ${openUrl} — hay dung dia chi nay.`);
    console.log(`        Neu muon dong ban cu: dong cua so Terminal cu di.\n`);
  }

  setTimeout(() => openInBrowser(openUrl), 800);
});

server.listen(PORT, '127.0.0.1');

