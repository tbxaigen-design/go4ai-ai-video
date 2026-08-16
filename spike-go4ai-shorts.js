import { bootstrap } from './packages/cli/dist/context.js';
import { resolve, join } from 'node:path';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { synthesizeMultiSceneVoice } from './local-tts.js';

const projectRoot = resolve('.');
const ctx = await bootstrap({ projectRoot });

async function generateGo4aiShortsVideo() {
  console.log('🚀 === KHỞI ĐỘNG XUẤT VIDEO SHORTS NỘI BỘ GO4AI (9:16) ===');
  
  const projectId = 'go4ai-shorts-coding-agent';
  const projectName = 'GO4AI Shorts • Coding Agent';

  const scenes = [
    {
      id: 'scene_01',
      keyword: 'MẸO SỐ 01',
      title: 'Viết Spec Rõ Ràng',
      subText: 'Luôn định nghĩa rõ ràng mục tiêu, dữ liệu đầu vào và định dạng đầu ra trước khi ra lệnh cho AI Agent.',
      speechText: 'Bí quyết số một: Luôn định nghĩa rõ ràng mục tiêu, dữ liệu đầu vào và định dạng đầu ra trước khi ra lệnh cho AI Agent.',
    },
    {
      id: 'scene_02',
      keyword: 'MẸO SỐ 02',
      title: 'Kiểm Thử Tự Động',
      subText: 'Sử dụng bộ test tự động để AI Agent tự chạy kiểm tra, phát hiện lỗi và tự sửa ngay trong vòng lặp.',
      speechText: 'Bí quyết số hai: Sử dụng bộ test tự động để AI Agent tự chạy kiểm tra, phát hiện lỗi và tự sửa ngay trong vòng lặp.',
    },
    {
      id: 'scene_03',
      keyword: 'MẸO SỐ 03',
      title: 'Tự Động Hóa Với GO4AI',
      subText: 'Tận dụng GO4AI Video Studio để tự động hóa 100% quy trình sản xuất video bằng code HTML mượt mà.',
      speechText: 'Bí quyết số ba: Tận dụng GO4AI Video Studio để tự động hóa 100% quy trình sản xuất video bằng code HTML mượt mà.',
    },
  ];

  // 1. Tạo project trong orchestrator
  console.log('\n📝 Bước 1: Tạo project trong hệ thống orchestrator...');
  let project;
  try {
    project = await ctx.orchestrator.load(projectId);
    console.log(`  ✓ Đã nạp project có sẵn: ${projectId}`);
  } catch {
    project = await ctx.orchestrator.create({
      name: projectName,
      intent: 'Tạo video ngắn 9:16 cho nội bộ GO4AI',
      preferences: {
        resolution: { width: 1080, height: 1920 },
        fps: 60,
      },
    });
    console.log(`  ✓ Đã tạo project mới: ${project.id}`);
  }

  // Set 9:16 resolution preference
  project.preferences = {
    resolution: { width: 1080, height: 1920 },
    fps: 60,
  };
  await ctx.projects.save(project);

  // 2. Sinh giọng đọc tiếng Việt và đo thời lượng chính xác
  const projectDir = await ctx.projects.ensureDir(project.id);
  const audioOutDir = join(projectDir, 'audio');
  if (!existsSync(audioOutDir)) mkdirSync(audioOutDir, { recursive: true });

  console.log('\n🎙️ Bước 2: Sinh giọng đọc tiếng Việt (Nam Minh) & đồng bộ thời lượng (Auto-Timing)...');
  const ttsRes = await synthesizeMultiSceneVoice({
    scenes,
    voicePresetId: 'vi-nam-standard',
    rate: '+5%',
    pitch: '+0Hz',
    outDir: audioOutDir,
  });

  console.log(`  ✓ Đã sinh xong ${ttsRes.scenes.length} đoạn audio. Tổng thời lượng: ${ttsRes.totalDurationSec}s`);
  for (const sc of ttsRes.scenes) {
    console.log(`    - [${sc.id}] Audio: ${sc.audioDurationSec}s ➔ Video Scene Duration: ${sc.durationSec}s`);
  }

  // 3. Tạo Content Graph
  console.log('\n📐 Bước 3: Tạo Content Graph & Scene Sequence...');
  const nodes = ttsRes.scenes.map((s, idx) => ({
    id: s.id,
    kind: 'text',
    title: s.title,
    durationSec: s.durationSec,
  }));

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      from: nodes[i].id,
      to: nodes[i + 1].id,
      type: 'sequence',
    });
  }

  const contentGraph = {
    version: '1.0',
    nodes,
    edges,
  };

  await ctx.orchestrator.writeContentGraph(project.id, contentGraph);
  console.log('  ✓ Đã ghi Content Graph thành công.');

  // 4. Tạo mã HTML cho từng frame (sử dụng mẫu 9:16 chuẩn GO4AI Tech Shorts)
  console.log('\n🎨 Bước 4: Tạo mã HTML phong cách GO4AI Tech Shorts (9:16)...');
  function makeShortsHtml(scene, stepNum, totalSteps) {
    const stepFormatted = String(stepNum).padStart(2, '0');
    const totalFormatted = String(totalSteps).padStart(2, '0');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
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
    background: rgba(15, 23, 42, 0.86);
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
    width: ${(stepNum / totalSteps) * 100}%;
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
      <span class="text-blue-400 text-[26px] font-bold tracking-widest uppercase">${scene.keyword}</span>
    </div>

    <h1 class="text-[72px] font-black leading-[1.12] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200 max-w-[940px] mb-8">
      ${scene.title}
    </h1>

    <div class="w-full flex flex-col gap-4 text-left">
      <div class="card-item flex items-center gap-5">
        <div class="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-extrabold shrink-0">💡</div>
        <div class="text-[26px] font-bold text-white leading-snug">${scene.subText}</div>
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
      “${scene.subText}”
    </p>
    <div class="progress-bar-bg">
      <div class="progress-fill"></div>
    </div>
  </footer>
</body>
</html>`;
  }

  for (let i = 0; i < ttsRes.scenes.length; i++) {
    const s = ttsRes.scenes[i];
    const htmlContent = makeShortsHtml(s, i + 1, ttsRes.scenes.length);
    await ctx.orchestrator.writeFrameHtml(project.id, s.id, htmlContent);
    console.log(`  ✓ Đã lưu Scene HTML ${i + 1}/${ttsRes.scenes.length}: ${s.id}`);
  }

  // 5. Ghép toàn bộ track âm thanh thành voice-narration.mp3
  console.log('\n🎵 Bước 5: Ghép master audio voice-narration.mp3...');
  const sceneAudioTracks = [];
  for (let i = 0; i < ttsRes.scenes.length; i++) {
    const s = ttsRes.scenes[i];
    const sceneTrackPath = join(audioOutDir, `track_${String(i + 1).padStart(3, '0')}.wav`);
    const introPause = 0.3;
    const voiceDuration = s.audioDurationSec;
    const totalSceneDur = s.durationSec;
    const outroSilence = Math.max(0, totalSceneDur - introPause - voiceDuration);

    try {
      if (introPause > 0.05 && outroSilence > 0.05) {
        execSync(
          `ffmpeg -y -f lavfi -t ${introPause.toFixed(2)} -i anullsrc=r=44100:cl=stereo -i "${s.audioPath}" -f lavfi -t ${outroSilence.toFixed(2)} -i anullsrc=r=44100:cl=stereo -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]" -map "[a]" -t ${totalSceneDur.toFixed(2)} "${sceneTrackPath}"`,
          { stdio: 'pipe' }
        );
      } else {
        execSync(
          `ffmpeg -y -i "${s.audioPath}" -af "apad=whole_dur=${totalSceneDur.toFixed(2)}" -t ${totalSceneDur.toFixed(2)} "${sceneTrackPath}"`,
          { stdio: 'pipe' }
        );
      }
      sceneAudioTracks.push(sceneTrackPath);
    } catch (e) {
      console.warn(`Scene audio assemble error for ${s.id}:`, e.message);
    }
  }

  const masterVoicePath = join(projectDir, 'voice-narration.mp3');
  if (sceneAudioTracks.length > 0) {
    const listFile = join(audioOutDir, 'concat_list.txt');
    const fileContent = sceneAudioTracks.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    writeFileSync(listFile, fileContent, 'utf-8');
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -q:a 2 "${masterVoicePath}"`, { stdio: 'pipe' });
    console.log(`  ✓ Đã ghép xong master audio: ${masterVoicePath}`);
  }

  // 6. Render MP4
  console.log('\n🎬 Bước 6: Render toàn bộ video 9:16 MP4 (Headless Chromium + FFmpeg concat)...');
  const t0 = Date.now();
  const { outputPath } = await ctx.orchestrator.exportMp4({
    projectId: project.id,
    onProgress: (pct, stage) => {
      process.stdout.write(`\r  └ [${pct.toFixed(0)}%] ${stage}                     `);
    },
  });

  // Gắn master voice narration vào video cuối
  const finalMuxedPath = join(projectRoot, 'go4ai-tech-shorts-demo.mp4');
  console.log('\n\n🔊 Bước 7: Muxing video với master audio tiếng Việt...');
  execSync(`ffmpeg -y -i "${outputPath}" -i "${masterVoicePath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${finalMuxedPath}"`, { stdio: 'pipe' });

  const renderTimeSec = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n🎉 XUẤT VIDEO SHORTS THÀNH CÔNG trong ${renderTimeSec}s!`);
  console.log(`📁 File video thành phẩm: ${finalMuxedPath}`);
}

generateGo4aiShortsVideo().catch(err => {
  console.error('❌ Lỗi xuất video:', err);
  process.exit(1);
});
