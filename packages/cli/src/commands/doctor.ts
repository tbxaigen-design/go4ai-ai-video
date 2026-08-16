import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { CliContext } from '../context.js';
import { ok } from '../output.js';

const require = createRequire(import.meta.url);

interface Check {
  name: string;
  status: 'ok' | 'warning' | 'missing' | 'error';
  value?: string;
  install_hint?: string;
  detail?: string;
}

function version(cmd: string, args = '--version'): string | null {
  try {
    return execFileSync(cmd, args.split(' '), { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('\n')[0]
      ?? null;
  } catch {
    return null;
  }
}

/** Chạy được không — dùng để phân biệt "có file" với "thật sự dùng được". */
function runnable(bin: string): boolean {
  try {
    execFileSync(bin, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Cùng thứ tự ưu tiên với resolve-binaries.js ở gốc dự án. */
function resolveFfmpeg(): string | null {
  const fromEnv = process.env.FFMPEG_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  try {
    const p = require('@ffmpeg-installer/ffmpeg')?.path;
    if (p && existsSync(p)) return p;
  } catch {}

  return runnable('ffmpeg') ? 'ffmpeg' : null;
}

function resolveChromium(projectRoot: string): string | null {
  // playwright được khai báo trong adapter-hyperframes, không phải ở package
  // này, nên require thẳng sẽ trượt — phải resolve từ vị trí của adapter.
  const attempts: Array<() => unknown> = [
    () => require('playwright'),
    () => {
      const adapterPkg = join(projectRoot, 'packages', 'adapter-hyperframes', 'package.json');
      return createRequire(adapterPkg)('playwright');
    },
  ];

  for (const attempt of attempts) {
    try {
      const playwright = attempt() as { chromium: { executablePath(): string } };
      const p = playwright.chromium.executablePath();
      if (p && existsSync(p)) return p;
    } catch {}
  }
  return null;
}

export async function runDoctor(ctx: CliContext): Promise<void> {
  const checks: Check[] = [];

  // Node
  const nodeV = process.version;
  checks.push({
    name: 'node-version',
    status: parseInt(nodeV.slice(1)) >= 20 ? 'ok' : 'warning',
    value: nodeV,
    detail: 'html-video targets Node 20+',
  });

  // ffmpeg — phải dò theo đúng thứ tự mà app thật sự dùng lúc render,
  // không dùng `which` (lệnh này không có trên Windows nên luôn báo missing
  // dù app chạy tốt, khiến user tưởng hỏng và báo lỗi nhầm).
  const ffmpegPath = resolveFfmpeg();
  if (ffmpegPath) {
    checks.push({
      name: 'ffmpeg',
      status: 'ok',
      value: version(ffmpegPath, '-version')?.split(' ')[2] ?? '?',
      detail: ffmpegPath,
    });
  } else {
    checks.push({
      name: 'ffmpeg',
      status: 'missing',
      install_hint: 'Chạy: node setup-binaries.js',
    });
  }

  // chromium — engine render dùng trình duyệt của playwright, không phải
  // Chrome cài sẵn trong máy, nên phải hỏi chính playwright.
  const chromiumPath = resolveChromium(ctx.projectRoot);
  checks.push({
    name: 'chromium',
    status: chromiumPath ? 'ok' : 'warning',
    detail: chromiumPath ?? 'Chưa có Chromium để render. Chạy: node setup-binaries.js',
  });

  // Engines
  for (const engine of ctx.engines.list()) {
    checks.push({
      name: `adapter-${engine.id}`,
      status: 'ok',
      value: engine.upstreamVersion,
      detail: `${engine.name} adapter loaded`,
    });
  }

  // Templates
  const tcount = ctx.templates.list().length;
  checks.push({
    name: 'templates',
    status: tcount >= 1 ? 'ok' : 'warning',
    value: `${tcount} discovered`,
    detail: tcount === 0 ? 'No templates found in templates/ — install or scaffold some' : undefined,
  });

  const overall: 'ok' | 'warning' | 'error' = checks.some((c) => c.status === 'error')
    ? 'error'
    : checks.some((c) => c.status === 'missing' || c.status === 'warning')
      ? 'warning'
      : 'ok';

  ok({
    overall,
    project_root: ctx.projectRoot,
    checks,
  });
}
