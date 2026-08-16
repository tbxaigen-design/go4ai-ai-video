import { bootstrap } from './packages/cli/dist/context.js';
import { resolve, join, basename, extname } from 'node:path';
import { readdirSync, readFileSync, existsSync, statSync, copyFileSync, mkdirSync } from 'node:fs';

/**
 * Helper to parse duration (seconds) from HTML content or filename
 * Format 1: Filename like '01_intro_4s.html' or 'scene-1-5.5s.html'
 * Format 2: <meta name="duration" content="4"> inside HTML
 * Default: 5 seconds
 */
function extractDuration(filename, htmlContent, defaultSec = 5) {
  // Check HTML meta tag: <meta name="duration" content="X"> or <meta data-duration="X">
  const metaMatch = htmlContent.match(/<meta\s+[^>]*(?:name=["']duration["']|data-duration=["'])(?:[^>]*content=["']([\d.]+)["']|[^>]*data-duration=["']([\d.]+)["'])[^>]*>/i);
  if (metaMatch) {
    const val = parseFloat(metaMatch[1] || metaMatch[2]);
    if (!isNaN(val) && val > 0) return val;
  }

  // Check filename pattern: _4s.html, -4.5s.html, _4sec.html
  const nameMatch = filename.match(/[_-]([\d.]+)\s*s(?:ec)?(?:\.html)?$/i);
  if (nameMatch) {
    const val = parseFloat(nameMatch[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  return defaultSec;
}

async function renderFolder(folderInput) {
  const projectRoot = resolve(process.cwd());
  const targetDir = resolve(projectRoot, folderInput.startsWith('projects') ? folderInput : join('projects', folderInput));

  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    console.error(`❌ Thư mục không tồn tại: ${targetDir}`);
    console.log(`💡 Hãy tạo thư mục: projects/${folderInput} và cho các file .html vào đó.`);
    process.exit(1);
  }

  const folderName = basename(targetDir);
  console.log(`\n======================================================`);
  console.log(`🎬 RENDER VIDEO TỪ THƯ MỤC: ${folderName}`);
  console.log(`📁 Đường dẫn: ${targetDir}`);
  console.log(`======================================================\n`);

  // 1. Quét các file trong thư mục
  const files = readdirSync(targetDir);
  const htmlFiles = files
    .filter((f) => f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (htmlFiles.length === 0) {
    console.error(`❌ Không tìm thấy file HTML nào trong thư mục: ${targetDir}`);
    process.exit(1);
  }

  console.log(`📑 Tìm thấy ${htmlFiles.length} cảnh HTML:`);
  htmlFiles.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  // 2. Tìm file audio nếu có (.mp3, .wav, .m4a)
  const audioFile = files.find((f) => /\.(mp3|wav|m4a|aac|ogg)$/i.test(f));
  if (audioFile) {
    console.log(`🎵 Phát hiện file âm thanh: ${audioFile}`);
  }

  // 3. Đọc cấu hình tùy chọn config.json / project.json
  let resolution = { width: 1920, height: 1080 }; // Mặc định 16:9
  let fps = 60;
  let defaultDuration = 5;

  const configFile = files.find((f) => f === 'config.json' || f === 'project.json');
  if (configFile) {
    try {
      const cfg = JSON.parse(readFileSync(join(targetDir, configFile), 'utf-8'));
      if (cfg.aspect === '9:16' || cfg.ratio === '9:16' || cfg.format === 'vertical') {
        resolution = { width: 1080, height: 1920 };
      } else if (cfg.aspect === '1:1' || cfg.ratio === '1:1' || cfg.format === 'square') {
        resolution = { width: 1080, height: 1080 };
      } else if (cfg.width && cfg.height) {
        resolution = { width: Number(cfg.width), height: Number(cfg.height) };
      }
      if (cfg.fps) fps = Number(cfg.fps);
      if (cfg.duration) defaultDuration = Number(cfg.duration);
      console.log(`⚙️ Đã nạp cấu hình từ ${configFile}: Resolution ${resolution.width}x${resolution.height}, FPS ${fps}`);
    } catch (err) {
      console.warn(`⚠️ Không thể đọc ${configFile}:`, err.message);
    }
  }

  // 4. Khởi tạo context html-video
  console.log('\n⚙️ Đang khởi tạo bộ render...');
  const ctx = await bootstrap({ cwd: projectRoot });

  const project = await ctx.orchestrator.create({
    name: folderName,
    intent: `Render auto-folder ${folderName}`,
    preferences: {
      resolution,
      fps,
    },
  });

  // 5. Tạo Content Graph các cảnh
  const nodes = [];
  const edges = [];
  const frameContents = [];

  for (let i = 0; i < htmlFiles.length; i++) {
    const file = htmlFiles[i];
    const filePath = join(targetDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const durationSec = extractDuration(file, content, defaultDuration);
    const frameId = `scene_${i + 1}`;

    nodes.push({
      id: frameId,
      kind: 'text',
      text: file.replace(/\.[^/.]+$/, ''),
      durationSec,
    });

    if (i > 0) {
      edges.push({
        from: nodes[i - 1].id,
        to: frameId,
        kind: 'sequence',
      });
    }

    frameContents.push({ frameId, content, file, durationSec });
  }

  console.log('\n📜 Khởi tạo kịch bản (Content Graph):');
  nodes.forEach((n) => console.log(`   - [${n.id}] ${n.text} (${n.durationSec}s)`));

  const graph = {
    schemaVersion: 1,
    intent: 'explainer',
    nodes,
    edges,
  };

  await ctx.orchestrator.writeContentGraph(project.id, graph);

  // 6. Ghi nội dung HTML cho từng cảnh
  for (const { frameId, content } of frameContents) {
    await ctx.orchestrator.writeFrameHtml(project.id, frameId, content);
  }

  // 7. Gắn audio nếu có
  if (audioFile) {
    const audioPath = join(targetDir, audioFile);
    console.log(`\n🎧 Đang gắn âm thanh từ: ${audioFile}`);
    const assetRes = await ctx.orchestrator.addFileAsset(project.id, audioPath, 'Soundtrack');
    const loadedProj = await ctx.projects.load(project.id);
    const addedAsset = assetRes.assets[assetRes.assets.length - 1];
    loadedProj.soundtrack = {
      narrationAssetId: addedAsset.id,
      narrationVolumeDb: 0,
    };
    await ctx.projects.save(loadedProj);
  }

  // 8. Xuất MP4
  console.log(`\n🎬 Đang render video MP4 (${resolution.width}x${resolution.height} @ ${fps}fps)...`);
  const t0 = Date.now();
  const { outputPath } = await ctx.orchestrator.exportMp4({
    projectId: project.id,
    onProgress: (pct, stage) => {
      console.log(`  └ [${pct.toFixed(0)}%] ${stage}`);
    },
  });

  const renderSec = ((Date.now() - t0) / 1000).toFixed(1);

  // 9. Copy file video kết quả về thẳng thư mục dự án của user
  const finalVideoInFolder = join(targetDir, 'output.mp4');
  try {
    copyFileSync(outputPath, finalVideoInFolder);
  } catch {}

  console.log(`\n======================================================`);
  console.log(`🎉 XUẤT VIDEO THÀNH CÔNG (${renderSec}s)!`);
  console.log(`📹 File video lưu tại thư mục dự án:`);
  console.log(`   👉 ${finalVideoInFolder}`);
  console.log(`   👉 ${outputPath}`);
  console.log(`======================================================\n`);
}

// Lấy tham số folder từ command line
const folderArg = process.argv[2] || 'demo';
renderFolder(folderArg).catch((err) => {
  console.error('\n❌ Lỗi khi render video:', err);
  process.exit(1);
});
