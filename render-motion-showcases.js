import { bootstrap } from './packages/cli/dist/context.js';
import { resolve, join, basename } from 'node:path';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import https from 'node:https';
import { execSync } from 'node:child_process';

// Google TTS Chunk Fetcher
function fetchGoogleTtsChunk(text, lang = 'vi') {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Generate Speech Audio file with sentence splitting
async function generateSpeechAudio(text, lang = 'vi', outFilePath) {
  const rawSentences = text.split(/([.!?;,\n]+)/).filter(Boolean);
  const chunks = [];
  let cur = '';

  for (const s of rawSentences) {
    if ((cur + s).length > 150) {
      if (cur.trim()) chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  if (chunks.length === 0) chunks.push(text.trim());

  const audioBuffers = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const buf = await fetchGoogleTtsChunk(chunk, lang);
    audioBuffers.push(buf);
  }

  const combinedBuffer = Buffer.concat(audioBuffers);
  writeFileSync(outFilePath, combinedBuffer);

  let durationSec = 5;
  try {
    const durOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outFilePath}"`).toString().trim();
    const parsed = parseFloat(durOut);
    if (!isNaN(parsed) && parsed > 0) durationSec = Number(parsed.toFixed(2));
  } catch (err) {
    console.warn('ffprobe warning:', err.message);
  }

  return { durationSec, sizeBytes: combinedBuffer.length };
}

// Update or inject <meta name="duration" content="..."> in HTML
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

async function processAndRenderMotionShowcases() {
  console.log('================================================================');
  console.log('🚀 GHÉP HTML VÀ LỒNG TIẾNG VIỆT CHO DỰ ÁN: motion-showcases');
  console.log('================================================================\n');

  const projectRoot = resolve(process.cwd());
  const targetDir = join(projectRoot, 'projects', 'motion-showcases');

  if (!existsSync(targetDir)) {
    throw new Error(`Thư mục không tồn tại: ${targetDir}`);
  }

  // 1. Kịch bản lồng tiếng tiếng Việt chuyên nghiệp cho từng cảnh
  const sceneScripts = [
    {
      file: 'agent-go4ai-telegram-ai-motion-v2.html',
      title: 'GO4AI Agent — Telegram AI Flow',
      script: 'GO4AI Agent tiếp nhận yêu cầu từ Telegram. AI Core phân tích ngữ cảnh, kích hoạt năng lực tra cứu tài liệu, sổ tay học viên, báo giá và kiểm tra bảo mật trước khi phản hồi.',
    },
    {
      file: 'go4ai-operating-loop-motion-final.html',
      title: 'GO4AI Enterprise AI Operating Loop',
      script: 'GO4AI Operating Loop chuyển đổi AI thành năng lực vận hành với bốn trụ cột: Tăng trưởng và điều hành, Quy trình tự động hóa, Nâng cao năng lực con người, và Đóng gói tài sản tri thức.',
    },
    {
      file: 'go4ai-system-center-motion-v1.html',
      title: 'GO4AI System Center',
      script: 'Trung tâm điều phối GO4AI System Center giám sát toàn diện kiến trúc hệ thống, luồng dữ liệu RAG, trạng thái dịch vụ và đo lường độ trễ vận hành theo thời gian thực.',
    },
    {
      file: 'go4ai-workflow-motion-mock.html',
      title: 'GO4AI AI Work Asset Pipeline',
      script: 'Quy trình AI Work Asset Pipeline tự động hóa từ tiếp nhận dữ liệu, chuẩn hóa prompt, xử lý AI, kiểm duyệt chất lượng con người đến đóng gói thành tài sản làm việc tái sử dụng.',
    }
  ];

  // 2. Cập nhật auto-run cho các file HTML nếu cần để video chuyển động sinh động
  console.log('🎬 [1/5] Kiểm tra và tối ưu animation cho các cảnh HTML...');

  // Scene 1: Thêm auto-run sau 400ms nếu chưa có
  const sc1Path = join(targetDir, 'agent-go4ai-telegram-ai-motion-v2.html');
  let sc1Content = readFileSync(sc1Path, 'utf-8');
  if (!sc1Content.includes('setTimeout(run, 400)') && !sc1Content.includes('setTimeout(() => run(), 400)')) {
    sc1Content = sc1Content.replace('ambient();signal();reset();', 'ambient();signal();reset();\nsetTimeout(() => { if (typeof run === "function") run(); }, 400);');
    writeFileSync(sc1Path, sc1Content, 'utf-8');
    console.log('   ✓ Đã kích hoạt auto-play animation cho Scene 1 (Telegram AI Flow)');
  }

  // Scene 4: Thêm auto-run sau 400ms nếu chưa có
  const sc4Path = join(targetDir, 'go4ai-workflow-motion-mock.html');
  let sc4Content = readFileSync(sc4Path, 'utf-8');
  if (!sc4Content.includes('setTimeout(run, 400)') && !sc4Content.includes('setTimeout(() => run(), 400)')) {
    sc4Content = sc4Content.replace('reset();\n</script>', 'reset();\nsetTimeout(() => { if (typeof run === "function") run(); }, 400);\n</script>');
    writeFileSync(sc4Path, sc4Content, 'utf-8');
    console.log('   ✓ Đã kích hoạt auto-play animation cho Scene 4 (Workflow Asset Pipeline)');
  }

  // Scene 3: Thêm auto-highlight node sequence
  const sc3Path = join(targetDir, 'go4ai-system-center-motion-v1.html');
  let sc3Content = readFileSync(sc3Path, 'utf-8');
  if (!sc3Content.includes('// auto-highlight sequence')) {
    const autoSeq = `// auto-highlight sequence
setTimeout(()=>{ if (typeof selectNode === 'function') selectNode('agent'); }, 1800);
setTimeout(()=>{ if (typeof selectNode === 'function') selectNode('rag'); }, 4200);
setTimeout(()=>{ if (typeof selectNode === 'function') selectNode('qdrant'); }, 6600);
`;
    sc3Content = sc3Content.replace("setTimeout(()=>{fit();selectNode('edge')},180);", `setTimeout(()=>{fit();selectNode('edge')},180);\n${autoSeq}`);
    writeFileSync(sc3Path, sc3Content, 'utf-8');
    console.log('   ✓ Đã kích hoạt auto-highlight sequence cho Scene 3 (System Center)');
  }

  // 3. Tạo file voice TTS tiếng Việt cho từng cảnh và đo thời lượng
  console.log('\n🎙️ [2/5] Đang tạo giọng lồng tiếng Việt (TTS) và đo thời lượng từng cảnh...');
  const tempAudioFiles = [];
  const sceneDurations = [];

  for (let i = 0; i < sceneScripts.length; i++) {
    const item = sceneScripts[i];
    const outAudioFile = join(targetDir, `voice_scene_${i + 1}.mp3`);
    console.log(`   └ Cảnh ${i + 1} (${item.title}):`);
    console.log(`     "${item.script}"`);

    const { durationSec } = await generateSpeechAudio(item.script, 'vi', outAudioFile);
    tempAudioFiles.push(outAudioFile);

    // Thời lượng cảnh = thời lượng đọc + 1.2s đệm êm ái
    const paddedDuration = Number((durationSec + 1.2).toFixed(1));
    sceneDurations.push(paddedDuration);

    console.log(`     ⏱️ Thời lượng giọng: ${durationSec}s → Thời lượng cảnh: ${paddedDuration}s`);

    // Ghi thời lượng vào HTML của cảnh
    const sceneHtmlPath = join(targetDir, item.file);
    let htmlContent = readFileSync(sceneHtmlPath, 'utf-8');
    htmlContent = updateDurationInHtml(htmlContent, paddedDuration);
    writeFileSync(sceneHtmlPath, htmlContent, 'utf-8');
  }

  // 4. Ghép các file voice thành một file âm thanh tổng (voice-narration.mp3) khớp chính xác timeline
  console.log('\n🎵 [3/5] Đang khớp và đồng bộ timeline âm thanh tổng thể...');
  const finalAudioPath = join(targetDir, 'voice-narration.mp3');

  // Tạo audio concat / pad bằng ffmpeg
  // Tạo file danh sách filter hoặc padding
  let filterComplex = '';
  let inputs = '';
  let cumulativeTime = 0;

  for (let i = 0; i < tempAudioFiles.length; i++) {
    inputs += `-i "${tempAudioFiles[i]}" `;
    const delayMs = Math.round(cumulativeTime * 1000);
    filterComplex += `[${i}:a]adelay=${delayMs}|${delayMs}[a${i}];`;
    cumulativeTime += sceneDurations[i];
  }

  const mixInputs = tempAudioFiles.map((_, i) => `[a${i}]`).join('');
  filterComplex += `${mixInputs}amix=inputs=${tempAudioFiles.length}:normalize=0[out]`;

  const ffmpegMixCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" -c:a libmp3lame -b:a 192k "${finalAudioPath}"`;
  execSync(ffmpegMixCmd, { stdio: 'inherit' });
  console.log(`   ✓ File âm thanh tổng đã tạo: ${finalAudioPath}`);

  // Lưu cấu hình project config.json
  const config = {
    aspect: '16:9',
    fps: 60,
    defaultDuration: 8,
    ttsLang: 'vi',
    scripts: {
      'agent-go4ai-telegram-ai-motion-v2.html': sceneScripts[0].script,
      'go4ai-operating-loop-motion-final.html': sceneScripts[1].script,
      'go4ai-system-center-motion-v1.html': sceneScripts[2].script,
      'go4ai-workflow-motion-mock.html': sceneScripts[3].script,
    },
    totalDurationSec: cumulativeTime,
  };
  writeFileSync(join(targetDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
  console.log(`   ✓ Đã lưu cấu hình dự án: config.json (Tổng thời lượng: ${cumulativeTime.toFixed(1)}s)`);

  // 5. Khởi tạo bootstrap render orchestrator
  console.log('\n⚙️ [4/5] Đang khởi tạo bộ máy render video (Chromium + Playwright + Puppeteer)...');
  const ctx = await bootstrap({ cwd: projectRoot });

  const project = await ctx.orchestrator.create({
    name: 'motion-showcases',
    intent: 'Render full GO4AI Motion Showcases video with Vietnamese narration',
    preferences: {
      resolution: { width: 1920, height: 1080 }, // 1080p 16:9 Landscape
      fps: 60,
    },
  });

  // Tạo Content Graph
  const nodes = [];
  const edges = [];
  const frameContents = [];

  for (let i = 0; i < sceneScripts.length; i++) {
    const item = sceneScripts[i];
    const frameId = `scene_${i + 1}`;
    const durationSec = sceneDurations[i];
    const content = readFileSync(join(targetDir, item.file), 'utf-8');

    nodes.push({
      id: frameId,
      kind: 'text',
      text: item.title,
      durationSec,
    });

    if (i > 0) {
      edges.push({
        from: nodes[i - 1].id,
        to: frameId,
        kind: 'sequence',
      });
    }

    frameContents.push({ frameId, content });
  }

  console.log('   📜 Kịch bản render (Content Graph):');
  nodes.forEach((n, i) => console.log(`      ${i + 1}. [${n.id}] ${n.text} (${n.durationSec}s)`));

  await ctx.orchestrator.writeContentGraph(project.id, {
    schemaVersion: 1,
    intent: 'explainer',
    nodes,
    edges,
  });

  for (const { frameId, content } of frameContents) {
    await ctx.orchestrator.writeFrameHtml(project.id, frameId, content);
  }

  // Gắn Soundtrack
  console.log('\n🎧 Đang gắn file lồng tiếng Việt vào soundtrack dự án...');
  const assetRes = await ctx.orchestrator.addFileAsset(project.id, finalAudioPath, 'Vietnamese Voiceover Narration');
  const loadedProj = await ctx.projects.load(project.id);
  const addedAsset = assetRes.assets[assetRes.assets.length - 1];
  loadedProj.soundtrack = {
    narrationAssetId: addedAsset.id,
    narrationVolumeDb: 0,
  };
  await ctx.projects.save(loadedProj);

  // 6. Xuất video MP4
  console.log('\n🎬 [5/5] Đang xuất video MP4 độ phân giải cao 1080p (60fps)...');
  const t0 = Date.now();
  const { outputPath } = await ctx.orchestrator.exportMp4({
    projectId: project.id,
    onProgress: (pct, stage) => {
      process.stdout.write(`\r   └ Tiến độ: [${pct.toFixed(0)}%] ${stage}                     `);
    },
  });

  const renderSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n🎉 XUẤT VIDEO THÀNH CÔNG trong ${renderSec}s!`);

  // Copy video vào thư mục dự án và exports/
  const finalVideoInFolder = join(targetDir, 'output.mp4');
  const exportsDir = join(targetDir, 'exports');
  if (!existsSync(exportsDir)) mkdirSync(exportsDir, { recursive: true });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const exportCopyPath = join(exportsDir, `go4ai_motion_showcases_${timestamp}.mp4`);

  copyFileSync(outputPath, finalVideoInFolder);
  copyFileSync(outputPath, exportCopyPath);

  const stat = statSync(finalVideoInFolder);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

  console.log(`================================================================`);
  console.log(`✅ KẾT QUẢ RENDER:`);
  console.log(`   - Kích thước file: ${sizeMb} MB`);
  console.log(`   - Độ dài video: ${cumulativeTime.toFixed(1)}s (4 cảnh)`);
  console.log(`   - Độ phân giải: 1920x1080 @ 60fps`);
  console.log(`   - Âm thanh: Lồng tiếng Việt chuẩn khớp 100% từng cảnh`);
  console.log(`   - File chính: ${finalVideoInFolder}`);
  console.log(`   - File lưu trữ: ${exportCopyPath}`);
  console.log(`================================================================\n`);
}

processAndRenderMotionShowcases().catch((err) => {
  console.error('\n❌ Lỗi trong quá trình render:', err);
  process.exit(1);
});
