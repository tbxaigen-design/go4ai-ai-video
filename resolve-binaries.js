/**
 * Resolve đường dẫn ffmpeg / ffprobe / edge-tts.
 *
 * Lý do tồn tại: trước đây code hardcode chuỗi 'ffmpeg', nên chỉ chạy được
 * trên máy dev đã cài sẵn. Máy user tải từ GitHub về sẽ crash lúc xuất MP4.
 *
 * Thứ tự ưu tiên:
 *   1. Biến môi trường FFMPEG_PATH / FFPROBE_PATH / EDGE_TTS_PATH — dev tự chỉ định
 *   2. @ffmpeg-installer / @ffprobe-installer — ĐƯỜNG CHÍNH cho user cuối.
 *      Hai package npm này cài kèm `pnpm install` và tự chọn đúng binary theo
 *      platform + kiến trúc (bao gồm darwin-arm64 cho MacBook Apple Silicon),
 *      nên không phải đoán kiến trúc hay tải thủ công.
 *   3. Thư mục binaries/ — dự phòng, do setup-binaries.js tải về khi (2) thất bại
 *   4. PATH hệ thống — máy dev đã cài bằng winget/brew
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const BINARIES_DIR = path.join(__dirname, 'binaries');

const isWin = process.platform === 'win32';
const exe = (name) => (isWin ? `${name}.exe` : name);

/**
 * Lấy đường dẫn từ package installer.
 * Bọc try/catch vì optionalDependencies có thể vắng mặt trên platform lạ,
 * hoặc bị bỏ qua khi user cài bằng `--no-optional`.
 */
function fromInstaller(pkgName) {
  try {
    const mod = require(pkgName);
    const p = mod && (mod.path || mod.default?.path);
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return null;
}

function resolve(name, envVar, installerPkg) {
  const fromEnv = process.env[envVar];
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  if (installerPkg) {
    const p = fromInstaller(installerPkg);
    if (p) return p;
  }

  const bundled = path.join(BINARIES_DIR, exe(name));
  if (fs.existsSync(bundled)) return bundled;

  return name; // dựa vào PATH; lỗi sẽ nổi lên rõ ràng ở nơi gọi
}

export const FFMPEG_BIN = resolve('ffmpeg', 'FFMPEG_PATH', '@ffmpeg-installer/ffmpeg');
export const FFPROBE_BIN = resolve('ffprobe', 'FFPROBE_PATH', '@ffprobe-installer/ffprobe');
export const EDGE_TTS_BIN = resolve('edge-tts', 'EDGE_TTS_PATH', null);

/** Binary có thật sự chạy được không (tồn tại + execute được + đúng kiến trúc). */
function isRunnable(bin) {
  try {
    execFileSync(bin, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Dùng cho setup-binaries.js và doctor: liệt kê thứ nào thiếu. */
export function checkBinaries() {
  return {
    ffmpeg: { path: FFMPEG_BIN, ok: isRunnable(FFMPEG_BIN) },
    ffprobe: { path: FFPROBE_BIN, ok: isRunnable(FFPROBE_BIN) },
  };
}
