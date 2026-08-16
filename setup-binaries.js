/**
 * setup-binaries.js — Xác minh FFmpeg + chuẩn bị edge-tts cho máy user.
 *
 * Chạy tự động bởi 1-Chay-Tren-Windows.bat / 1-Chay-Tren-Macbook.command
 * trước khi khởi động server. Idempotent: đã có đủ thì thoát ngay.
 *
 * FFmpeg đến từ đâu:
 *   Đường chính là hai package @ffmpeg-installer / @ffprobe-installer, cài kèm
 *   `pnpm install` và tự chọn đúng binary theo platform + kiến trúc.
 *   File này chỉ TẢI DỰ PHÒNG khi đường chính thất bại (ví dụ user cài bằng
 *   --no-optional, hoặc platform không có sẵn build).
 *
 * edge-tts thì luôn cần bước riêng: nó là package Python (pip), không phải npm,
 * nên không thể đi kèm `pnpm install`. Thiếu nó app vẫn chạy nhưng mất giọng
 * neural tiếng Việt (Nam Minh / Hoài My) và rơi về giọng Google.
 *
 * Chạy thủ công:  node setup-binaries.js
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync, execSync } from 'node:child_process';
import { BINARIES_DIR, checkBinaries } from './resolve-binaries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// Nguồn tải FFmpeg portable chính thức, không cần quyền admin.
//
// QUAN TRỌNG — Windows dùng mirror GitHub của gyan (GyanD/codexffmpeg),
// KHÔNG dùng www.gyan.dev trực tiếp. Đo thực tế từ VN (2026-08-17):
//   www.gyan.dev  → ~36 KB/s  → 111MB mất hơn 45 phút (user sẽ bỏ cuộc)
//   GitHub mirror → ~1.1 MB/s → cùng file đó mất 96 giây
// Cùng một bản build, chỉ khác CDN.
//
// Version được ghim cố định để mọi user cài ra đúng một bản như nhau
// (parity). Muốn nâng cấp: đổi FFMPEG_WIN_VERSION sau khi test lại.
const FFMPEG_WIN_VERSION = '9.0.1';

const FFMPEG_SOURCES = {
  win32: {
    url: `https://github.com/GyanD/codexffmpeg/releases/download/${FFMPEG_WIN_VERSION}/ffmpeg-${FFMPEG_WIN_VERSION}-essentials_build.zip`,
    label: `GitHub / gyan essentials ${FFMPEG_WIN_VERSION} (Windows x64, ~106MB)`,
  },
  darwin: {
    // evermeet.cx cung cấp binary riêng lẻ cho macOS (~26MB mỗi file).
    // Bản build là x86_64; máy Apple Silicon chạy qua Rosetta 2.
    url: 'https://evermeet.cx/ffmpeg/getrelease/zip',
    probeUrl: 'https://evermeet.cx/ffprobe/getrelease/zip',
    label: 'evermeet.cx (macOS)',
  },
};

function log(msg) {
  console.log(msg);
}

/** Tải file qua HTTPS, tự bám theo redirect. */
function download(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft <= 0) return reject(new Error('Quá nhiều redirect'));

    https
      .get(url, { headers: { 'User-Agent': 'GO4AI-Video-Studio' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(download(res.headers.location, destPath, redirectsLeft - 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} khi tải ${url}`));
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        let lastPct = -1;

        const file = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (total) {
            const pct = Math.floor((received / total) * 100);
            if (pct !== lastPct && pct % 10 === 0) {
              process.stdout.write(`\r    Đã tải ${pct}%`);
              lastPct = pct;
            }
          }
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => {
          if (total) process.stdout.write('\r    Đã tải 100%\n');
          resolve();
        }));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * Tìm PowerShell bằng đường dẫn tuyệt đối thay vì tin vào PATH.
 * Một số máy user có PATH bị cắt xén / sửa đổi, gọi `powershell` trần sẽ lỗi
 * "is not recognized" ngay giữa lúc cài đặt.
 */
function findPowerShell() {
  const root = process.env.SystemRoot || 'C:\\Windows';
  const candidates = [
    path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    path.join(root, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'powershell'; // fallback: thử qua PATH
}

/** Giải nén zip bằng công cụ có sẵn của HĐH (không cần thư viện ngoài). */
function unzip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (isWin) {
    execFileSync(
      findPowerShell(),
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`,
      ],
      { stdio: 'pipe' },
    );
  } else {
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', destDir], { stdio: 'pipe' });
  }
}

/** Tìm đệ quy một file theo tên trong thư mục đã giải nén. */
function findFile(dir, targetName) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, targetName);
      if (found) return found;
    } else if (entry.name.toLowerCase() === targetName.toLowerCase()) {
      return full;
    }
  }
  return null;
}

async function installFfmpeg() {
  const source = FFMPEG_SOURCES[process.platform];
  if (!source) {
    log(`[!] Chưa hỗ trợ tự động tải FFmpeg cho hệ điều hành: ${process.platform}`);
    log('    Vui lòng cài thủ công rồi chạy lại.');
    return false;
  }

  fs.mkdirSync(BINARIES_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(BINARIES_DIR, '.tmp-'));

  try {
    log(`[*] Đang tải FFmpeg từ ${source.label}...`);
    log('    (khoảng 30-90 giây tuỳ tốc độ mạng, chỉ cần làm 1 lần)');

    const zipPath = path.join(tmpDir, 'ffmpeg.zip');
    await download(source.url, zipPath);

    log('[*] Đang giải nén...');
    const extractDir = path.join(tmpDir, 'extracted');
    unzip(zipPath, extractDir);

    const exeName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
    const probeName = isWin ? 'ffprobe.exe' : 'ffprobe';

    const ffmpegSrc = findFile(extractDir, exeName);
    if (!ffmpegSrc) throw new Error('Không tìm thấy ffmpeg trong file tải về');
    fs.copyFileSync(ffmpegSrc, path.join(BINARIES_DIR, exeName));

    // Bản Windows có sẵn ffprobe trong cùng zip; macOS phải tải riêng.
    let ffprobeSrc = findFile(extractDir, probeName);
    if (!ffprobeSrc && isMac && source.probeUrl) {
      log('[*] Đang tải thêm ffprobe...');
      const probeZip = path.join(tmpDir, 'ffprobe.zip');
      await download(source.probeUrl, probeZip);
      const probeExtract = path.join(tmpDir, 'probe');
      unzip(probeZip, probeExtract);
      ffprobeSrc = findFile(probeExtract, probeName);
    }
    if (!ffprobeSrc) throw new Error('Không tìm thấy ffprobe trong file tải về');
    fs.copyFileSync(ffprobeSrc, path.join(BINARIES_DIR, probeName));

    if (!isWin) {
      // macOS/Linux cần bit thực thi, nếu không sẽ báo "permission denied".
      fs.chmodSync(path.join(BINARIES_DIR, exeName), 0o755);
      fs.chmodSync(path.join(BINARIES_DIR, probeName), 0o755);
    }

    log('[OK] Đã cài FFmpeg vào thư mục binaries/');
    return true;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Tìm lệnh python khả dụng để cài edge-tts. */
function findPython() {
  for (const cmd of isWin ? ['py', 'python', 'python3'] : ['python3', 'python']) {
    try {
      execFileSync(cmd, ['--version'], { stdio: 'ignore' });
      return cmd;
    } catch {}
  }
  return null;
}

function hasEdgeTts() {
  try {
    execFileSync('edge-tts', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function installEdgeTts() {
  if (hasEdgeTts()) {
    log('[OK] edge-tts đã sẵn sàng (giọng neural tiếng Việt).');
    return true;
  }

  const python = findPython();
  if (!python) {
    log('');
    log('[!] Không tìm thấy Python nên chưa cài được edge-tts.');
    log('    App vẫn chạy được, nhưng sẽ dùng giọng Google thay cho');
    log('    giọng neural Nam Minh / Hoài My (chất lượng thấp hơn).');
    log('    Muốn có giọng hay nhất: cài Python tại https://python.org');
    log('    rồi chạy lại file này.');
    return false;
  }

  log('[*] Đang cài edge-tts (giọng neural tiếng Việt)...');
  try {
    execFileSync(python, ['-m', 'pip', 'install', '--user', '--quiet', 'edge-tts'], {
      stdio: 'inherit',
    });
    log('[OK] Đã cài edge-tts.');
    return true;
  } catch {
    log('[!] Cài edge-tts thất bại. App vẫn chạy với giọng Google dự phòng.');
    log('    Có thể thử thủ công:  pip install edge-tts');
    return false;
  }
}

/**
 * Chromium cho engine render.
 *
 * Package npm `playwright` KHÔNG kèm trình duyệt — phải tải riêng bằng
 * `playwright install chromium` (~150MB). Thiếu bước này thì app mở được,
 * dựng được kịch bản, nhưng BẤM XUẤT VIDEO SẼ LỖI.
 * Máy dev thường đã có sẵn cache ms-playwright từ dự án khác nên không nhận ra.
 */
async function installChromium() {
  const adapterDir = path.join(__dirname, 'packages', 'adapter-hyperframes');

  // Playwright chỉ resolve được từ trong package đã khai báo nó.
  let playwright;
  try {
    const req = createRequire(path.join(adapterDir, 'package.json'));
    playwright = req('playwright');
  } catch {
    log('[!] Chưa cài xong thư viện playwright, bỏ qua bước tải Chromium.');
    return false;
  }

  try {
    const execPath = playwright.chromium.executablePath();
    if (fs.existsSync(execPath)) {
      log('[OK] Chromium đã sẵn sàng.');
      return true;
    }
  } catch {}

  log('[*] Đang tải trình duyệt Chromium để render video (~150MB)...');
  log('    (chỉ cần làm 1 lần, vui lòng không tắt cửa sổ)');
  try {
    execSync('npx --yes playwright install chromium', {
      cwd: adapterDir,
      stdio: 'inherit',
    });
    log('[OK] Đã cài Chromium.');
    return true;
  } catch {
    log('[!] Tải Chromium thất bại. App vẫn mở được nhưng CHƯA XUẤT ĐƯỢC VIDEO.');
    log('    Thử chạy lại file này, hoặc chạy thủ công:');
    log('        npx playwright install chromium');
    return false;
  }
}

async function main() {
  log('');
  log('[*] Kiểm tra công cụ cần thiết...');

  const status = checkBinaries();

  if (status.ffmpeg.ok && status.ffprobe.ok) {
    log('[OK] FFmpeg đã sẵn sàng.');
  } else {
    try {
      await installFfmpeg();
    } catch (err) {
      log('');
      log(`[LỖI] Không cài được FFmpeg tự động: ${err.message}`);
      log('      Không có FFmpeg thì KHÔNG xuất được video MP4.');
      log('      Cách khắc phục: tải FFmpeg tại https://ffmpeg.org/download.html');
      log('      rồi đặt ffmpeg/ffprobe vào thư mục binaries/ của app.');
      process.exitCode = 1;
      return;
    }
  }

  await installChromium();
  installEdgeTts();
  log('');
}

main().catch((err) => {
  console.error(`[LỖI] setup-binaries: ${err.message}`);
  process.exitCode = 1;
});
