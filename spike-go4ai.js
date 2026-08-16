import { bootstrap } from './packages/cli/dist/context.js';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

async function runTechnicalSpike() {
  console.log('=============== GO4AI TECHNICAL SPIKE ===============');
  const projectRoot = resolve(process.cwd());

  // Step 1: Ensure Voice Narration File Exists
  const voicePath = join(projectRoot, 'voice-narration.wav');
  if (!existsSync(voicePath)) {
    console.log('🎙️ Synthesizing Windows TTS Voice Narration...');
    const psCmd = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SetOutputToWaveFile('${voicePath.replace(/\\/g, '\\\\')}'); $synth.Speak('GO4AI giup doanh nghiep chuyen AI tu cong cu thu nghiem thanh nang luc van hanh thuc te. Day la Enterprise AI Transformation.'); $synth.Dispose()`;
    execSync(`powershell -Command "${psCmd}"`);
  }

  // Measure Voice Duration using ffprobe
  const ffprobeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voicePath}"`).toString().trim();
  const voiceDuration = parseFloat(ffprobeOut);
  console.log(`✓ Voice narration ready: ${voicePath} (Duration: ${voiceDuration.toFixed(2)}s)`);

  // Step 2: Bootstrap html-video context
  console.log('\n⚙️ Bootstrapping html-video orchestrator context...');
  const ctx = await bootstrap({ cwd: projectRoot });

  // Step 3: Create Project
  console.log('📁 Creating project: GO4AI Enterprise AI Transformation (1080x1920)...');
  const project = await ctx.orchestrator.create({
    name: 'GO4AI Technical Spike',
    intent: 'Multi-frame video with voice narration and synchronized subtitles',
    preferences: {
      resolution: { width: 1080, height: 1920 }, // 9:16 Portrait resolution
      fps: 60,
    },
  });

  // Step 4: Add Audio Asset & Set Soundtrack in Project Schema
  console.log('🎵 Adding voice narration asset to project soundtrack...');
  const narrationAsset = await ctx.orchestrator.addFileAsset(project.id, voicePath, 'Voice Narration');
  const loadedProj = await ctx.projects.load(project.id);
  const addedAssetId = narrationAsset.assets[narrationAsset.assets.length - 1].id;
  loadedProj.soundtrack = {
    narrationAssetId: addedAssetId,
    narrationVolumeDb: 0,
  };
  await ctx.projects.save(loadedProj);
  console.log(`✓ Project soundtrack configured with narrationAssetId: ${addedAssetId}`);

  // Step 5: Define 3-Scene Subtitle Content Graph
  // Sentence timing proportional to total voice duration (~10.05s)
  const d1 = Number((voiceDuration * (3.8 / 10.05)).toFixed(2));
  const d2 = Number((voiceDuration * (3.4 / 10.05)).toFixed(2));
  const d3 = Number((voiceDuration - d1 - d2).toFixed(2));

  console.log(`\n📜 Creating Content Graph (3 frames, total duration = ${voiceDuration.toFixed(2)}s)...`);
  const graph = {
    schemaVersion: 1,
    intent: 'explainer',
    synopsis: 'GO4AI Enterprise AI Transformation narration storyboard',
    nodes: [
      { id: 'sub1', kind: 'text', text: 'GO4AI giúp doanh nghiệp chuyển AI', durationSec: d1 },
      { id: 'sub2', kind: 'text', text: 'từ công cụ thử nghiệm thành năng lực vận hành thực tế.', durationSec: d2 },
      { id: 'sub3', kind: 'text', text: 'Đây là Enterprise AI Transformation.', durationSec: d3 },
    ],
    edges: [
      { from: 'sub1', to: 'sub2', kind: 'sequence' },
      { from: 'sub2', to: 'sub3', kind: 'sequence' },
    ],
  };

  await ctx.orchestrator.writeContentGraph(project.id, graph);
  console.log(`✓ Content graph saved: [sub1: ${d1}s] → [sub2: ${d2}s] → [sub3: ${d3}s]`);

  // Step 6: Generate Animated HTML Frames with synchronized Subtitles
  console.log('\n🎨 Generating HTML/CSS animation frames with subtitle overlays...');

  const makeFrameHtml = (subtitleText, stepNum) => `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>GO4AI Scene ${stepNum}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap" rel="stylesheet" />
<style>
  body {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: #090d16;
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
    filter: blur(140px);
    opacity: 0.6;
    animation: float 8s ease-in-out infinite alternate;
  }
  .glow-1 { width: 700px; height: 700px; background: #3b82f6; top: -100px; left: -100px; }
  .glow-2 { width: 600px; height: 600px; background: #8b5cf6; bottom: 200px; right: -100px; }
  .glow-3 { width: 500px; height: 500px; background: #06b6d4; top: 40%; left: 200px; opacity: 0.4; }
  @keyframes float {
    0% { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.15) translate(40px, -40px); }
  }
  .card-glass {
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 36px;
    padding: 50px 60px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes subtitlePulse {
    0% { transform: scale(0.96); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .animate-title { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-sub { animation: subtitlePulse 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
  .badge {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    padding: 12px 28px;
    border-radius: 9999px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  <div class="bg-glow glow-3"></div>

  <!-- Header -->
  <header class="relative z-10 flex items-center justify-between">
    <div class="badge">Enterprise AI</div>
    <div class="text-[24px] text-slate-400 font-semibold tracking-wide">0${stepNum} / 03</div>
  </header>

  <!-- Center Title Content -->
  <main class="relative z-10 my-auto animate-title text-center">
    <div class="inline-block p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-8">
      <span class="text-blue-400 text-[28px] font-semibold tracking-wider uppercase">Transformation Blueprint</span>
    </div>
    <h1 class="text-[110px] font-extrabold leading-[1.05] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-blue-200">
      GO4AI
    </h1>
    <p class="mt-6 text-[36px] text-slate-300 font-medium max-w-[850px] mx-auto leading-relaxed">
      Enterprise AI Transformation Platform
    </p>
  </main>

  <!-- Subtitle Overlay Bar -->
  <footer class="relative z-10 card-glass animate-sub">
    <div class="flex items-center gap-3 mb-4 text-blue-400 text-[20px] font-bold tracking-wider uppercase">
      <span class="w-3 h-3 rounded-full bg-blue-400 animate-ping"></span>
      Voice Narration Subtitle
    </div>
    <p class="text-[44px] font-bold text-white leading-snug">
      “${subtitleText}”
    </p>
  </footer>
</body>
</html>`;

  await ctx.orchestrator.writeFrameHtml(project.id, 'sub1', makeFrameHtml('GO4AI giúp doanh nghiệp chuyển AI', 1));
  await ctx.orchestrator.writeFrameHtml(project.id, 'sub2', makeFrameHtml('từ công cụ thử nghiệm thành năng lực vận hành thực tế.', 2));
  await ctx.orchestrator.writeFrameHtml(project.id, 'sub3', makeFrameHtml('Đây là Enterprise AI Transformation.', 3));

  console.log('✓ 3 animated HTML frame files generated and written to project store');

  // Step 7: Export Final MP4 with Video + Audio Muxing
  console.log('\n🎬 Exporting final MP4 (multi-frame rendering + ffmpeg concat + soundtrack audio mux)...');
  const t0 = Date.now();
  const { outputPath } = await ctx.orchestrator.exportMp4({
    projectId: project.id,
    onProgress: (pct, stage) => {
      console.log(`  └ [${pct.toFixed(0)}%] ${stage}`);
    },
  });

  const renderWallClockSec = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n🎉 TECHNICAL SPIKE COMPLETE in ${renderWallClockSec}s!`);
  console.log(`Final MP4 Path: ${outputPath}`);
}

runTechnicalSpike().catch((err) => {
  console.error('❌ Spike Failed:', err);
  process.exit(1);
});
