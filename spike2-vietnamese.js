import { bootstrap } from './packages/cli/dist/context.js';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

async function runTechnicalSpike2() {
  console.log('=============== GO4AI TECHNICAL SPIKE #2 (VIETNAMESE TTS + SUBTITLE) ===============');
  const projectRoot = resolve(process.cwd());

  const normAudioPath = join(projectRoot, 'voice-vi-normalized.wav');
  if (!existsSync(normAudioPath)) {
    throw new Error(`Normalized audio file missing at ${normAudioPath}`);
  }

  // Measure Normalized Audio Duration using ffprobe
  const ffprobeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${normAudioPath}"`).toString().trim();
  const voiceDuration = parseFloat(ffprobeOut);
  console.log(`✓ Audio narration ready: ${normAudioPath} (Duration: ${voiceDuration.toFixed(2)}s)`);

  // Bootstrap html-video context
  console.log('\n⚙️ Bootstrapping html-video orchestrator context...');
  const ctx = await bootstrap({ cwd: projectRoot });

  // Create Project
  console.log('📁 Creating project: GO4AI Vietnamese Audio & Subtitle Spike (1080x1920)...');
  const project = await ctx.orchestrator.create({
    name: 'GO4AI Vietnamese Audio Spike',
    intent: 'Test Vietnamese audio quality, naturalness, and 6-phrase synchronized subtitle overlay',
    preferences: {
      resolution: { width: 1080, height: 1920 }, // 9:16 Portrait resolution
      fps: 60,
    },
  });

  // Add Audio Asset & Set Soundtrack in Project Schema
  console.log('🎵 Adding normalized voice narration asset to project soundtrack...');
  const narrationAsset = await ctx.orchestrator.addFileAsset(project.id, normAudioPath, 'Vietnamese Voice Narration');
  const loadedProj = await ctx.projects.load(project.id);
  const addedAssetId = narrationAsset.assets[narrationAsset.assets.length - 1].id;
  loadedProj.soundtrack = {
    narrationAssetId: addedAssetId,
    narrationVolumeDb: 0,
  };
  await ctx.projects.save(loadedProj);
  console.log(`✓ Project soundtrack configured with narrationAssetId: ${addedAssetId}`);

  // Define 6-Scene Subtitle Content Graph
  // Total audio duration = ~14.26s. Visual duration = 14.7s (+0.44s tail)
  const phrases = [
    { id: 'phrase1', text: 'AI không tạo ra giá trị', durationSec: 2.8, keyword: 'AI VALUE' },
    { id: 'phrase2', text: 'chỉ vì doanh nghiệp mua thêm công cụ.', durationSec: 2.4, keyword: 'TOOLS ≠ VALUE' },
    { id: 'phrase3', text: 'Giá trị xuất hiện khi AI được đưa vào đúng quy trình,', durationSec: 2.9, keyword: 'RIGHT PROCESS' },
    { id: 'phrase4', text: 'có tiêu chuẩn đầu ra,', durationSec: 1.8, keyword: 'QUALITY STANDARD' },
    { id: 'phrase5', text: 'và có con người kiểm soát chất lượng.', durationSec: 2.4, keyword: 'HUMAN CONTROL' },
    { id: 'phrase6', text: 'Đó là cách AI trở thành năng lực vận hành.', durationSec: 2.4, keyword: 'OPERATIONAL CAPABILITY' },
  ];

  console.log(`\n📜 Creating Content Graph (6 frames, total visual duration = 14.7s)...`);
  const graph = {
    schemaVersion: 1,
    intent: 'explainer',
    synopsis: 'GO4AI Vietnamese Speech & Subtitle Synchronization Storyboard',
    nodes: phrases.map((p) => ({
      id: p.id,
      kind: 'text',
      text: p.text,
      durationSec: p.durationSec,
    })),
    edges: [
      { from: 'phrase1', to: 'phrase2', kind: 'sequence' },
      { from: 'phrase2', to: 'phrase3', kind: 'sequence' },
      { from: 'phrase3', to: 'phrase4', kind: 'sequence' },
      { from: 'phrase4', to: 'phrase5', kind: 'sequence' },
      { from: 'phrase5', to: 'phrase6', kind: 'sequence' },
    ],
  };

  await ctx.orchestrator.writeContentGraph(project.id, graph);
  console.log(`✓ Content graph saved with 6 sequential phrase nodes`);

  // Generate Animated HTML Frames with synchronized Subtitles
  console.log('\n🎨 Generating 6 HTML/CSS animation frames with Vietnamese Unicode subtitles...');

  const makeFrameHtml = (subtitleText, keywordText, stepNum) => `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>GO4AI Vietnamese Scene ${stepNum}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap" rel="stylesheet" />
<style>
  body {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: #070a12;
    color: #f8fafc;
    margin: 0;
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 100px 80px;
    box-sizing: border-box;
  }
  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(150px);
    opacity: 0.55;
    animation: float 7s ease-in-out infinite alternate;
  }
  .glow-1 { width: 750px; height: 750px; background: #2563eb; top: -150px; left: -150px; }
  .glow-2 { width: 650px; height: 650px; background: #7c3aed; bottom: 150px; right: -150px; }
  .glow-3 { width: 550px; height: 550px; background: #0284c7; top: 38%; left: 150px; opacity: 0.35; }
  @keyframes float {
    0% { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.12) translate(30px, -30px); }
  }
  .card-glass {
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 40px;
    padding: 56px 64px;
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6);
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes subtitleFade {
    0% { opacity: 0; transform: translateY(20px) scale(0.97); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-title { animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-sub { animation: subtitleFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards; opacity: 0; }
  .badge {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    padding: 14px 32px;
    border-radius: 9999px;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 24px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    width: ${(stepNum / 6) * 100}%;
    transition: width 0.3s ease;
  }
</style>
</head>
<body>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  <div class="bg-glow glow-3"></div>

  <!-- Top Header -->
  <header class="relative z-10 flex items-center justify-between">
    <div class="badge">GO4AI INSIGHTS</div>
    <div class="text-[26px] text-slate-400 font-bold tracking-wider">0${stepNum} / 06</div>
  </header>

  <!-- Center Content & Keyphrase -->
  <main class="relative z-10 my-auto animate-title text-center">
    <div class="inline-block px-6 py-3 rounded-full bg-blue-500/15 border border-blue-500/30 mb-8">
      <span class="text-blue-400 text-[26px] font-bold tracking-widest uppercase">${keywordText}</span>
    </div>
    <h1 class="text-[105px] font-extrabold leading-[1.05] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-blue-200">
      GO4AI
    </h1>
    <p class="mt-6 text-[34px] text-slate-300 font-semibold max-w-[850px] mx-auto leading-relaxed">
      Enterprise AI Transformation
    </p>
  </main>

  <!-- Bottom Subtitle Overlay Bar -->
  <footer class="relative z-10 card-glass animate-sub">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3 text-blue-400 text-[20px] font-bold tracking-wider uppercase">
        <span class="w-3.5 h-3.5 rounded-full bg-blue-400 animate-ping"></span>
        Vietnamese Narration Subtitle
      </div>
      <div class="text-slate-400 text-[20px] font-bold">vi-VN</div>
    </div>
    <p class="text-[46px] font-bold text-white leading-snug tracking-tight">
      “${subtitleText}”
    </p>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
  </footer>
</body>
</html>`;

  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    await ctx.orchestrator.writeFrameHtml(project.id, p.id, makeFrameHtml(p.text, p.keyword, i + 1));
  }

  console.log('✓ 6 animated HTML frame files generated and written to project store');

  // Export Final MP4 with Video + Audio Muxing
  console.log('\n🎬 Exporting final MP4 (6-frame rendering + ffmpeg concat + soundtrack audio mux)...');
  const t0 = Date.now();
  const { outputPath } = await ctx.orchestrator.exportMp4({
    projectId: project.id,
    onProgress: (pct, stage) => {
      console.log(`  └ [${pct.toFixed(0)}%] ${stage}`);
    },
  });

  const renderWallClockSec = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n🎉 TECHNICAL SPIKE #2 COMPLETE in ${renderWallClockSec}s!`);
  console.log(`Final MP4 Path: ${outputPath}`);
}

runTechnicalSpike2().catch((err) => {
  console.error('❌ Spike #2 Failed:', err);
  process.exit(1);
});
