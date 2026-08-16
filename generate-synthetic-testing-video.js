import { bootstrap } from './packages/cli/dist/context.js';
import { resolve, join } from 'node:path';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import https from 'node:https';
import { execSync } from 'node:child_process';

// 1. Google TTS Chunk Fetcher for Vietnamese
function fetchGoogleTtsChunk(text, lang = 'vi') {
  return new Promise((resolvePromise, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolvePromise(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// 2. High Quality Vietnamese TTS Generator
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

  const durOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outFilePath}"`).toString().trim();
  const durationSec = parseFloat(durOut);
  return { durationSec: Number(durationSec.toFixed(2)), sizeBytes: combinedBuffer.length };
}

// 3. Scene Script Definitions
const SCENES = [
  {
    id: 'scene_01',
    keyword: 'SYNTHETIC TESTING',
    title: 'Thay Đổi Economics Của R&D',
    subText: 'Khi Digital Twin và AI Agent có thể chạy hàng trăm vòng simulation trước human testing, economics của Training R&D, Product R&D và UX Research sẽ thay đổi đến mức nào?',
    speechText: 'Synthetic Testing: Khi Digital Twin và AI Agent có thể chạy hàng trăm vòng simulation trước human testing, economics của Training R&D, Product R&D và UX Research sẽ thay đổi đến mức nào?',
    cardHtml: `
      <div class="grid grid-cols-2 gap-4 mt-6">
        <div class="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-left">
          <div class="text-3xl font-extrabold text-blue-400">100+ Vòng</div>
          <div class="text-slate-300 text-xl mt-1">AI Simulation</div>
        </div>
        <div class="p-6 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-left">
          <div class="text-3xl font-extrabold text-purple-400">Zero Cost</div>
          <div class="text-slate-300 text-xl mt-1">Pre-screening</div>
        </div>
      </div>
    `,
  },
  {
    id: 'scene_02',
    keyword: 'MULTI-PERSPECTIVE R&D',
    title: 'R&D Giáo Trình & AI Passport',
    subText: 'Muốn R&D một giáo trình AI, một phiên bản mới của AI Passport, hay UX/UI của một app mới, chúng ta cần rất nhiều góc nhìn: Học viên có hiểu không? Giảng viên có dạy được không? Reviewer có chấm nhất quán không? HR, L&D có hiểu giá trị đầu ra không?',
    speechText: 'Muốn R&D một giáo trình AI, một phiên bản mới của AI Passport, hay đơn giản là UX UI của một app mới, chúng ta cần rất nhiều góc nhìn: Học viên có hiểu không? Giảng viên có dạy được không? Reviewer có chấm nhất quán không? HR, L&D có hiểu giá trị đầu ra không?',
    cardHtml: `
      <div class="grid grid-cols-2 gap-4 mt-6 text-left">
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold">1</div>
          <div><div class="font-bold text-xl text-white">Học Viên</div><div class="text-slate-400 text-base">Có hiểu kiến thức?</div></div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold">2</div>
          <div><div class="font-bold text-xl text-white">Giảng Viên</div><div class="text-slate-400 text-base">Có dạy được không?</div></div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">3</div>
          <div><div class="font-bold text-xl text-white">Reviewer</div><div class="text-slate-400 text-base">Chấm có nhất quán?</div></div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold">4</div>
          <div><div class="font-bold text-xl text-white">HR & L&D</div><div class="text-slate-400 text-base">Hiểu giá trị đầu ra?</div></div>
        </div>
      </div>
    `,
  },
  {
    id: 'scene_03',
    keyword: 'UX/UI FRICTION',
    title: 'Hành Vi & Quyết Định Của User',
    subText: 'Với một app mới còn thêm: User có tìm đúng chức năng không? Có hiểu CTA không? Có biết bước tiếp theo không? Navigation có gây nhầm không? Điểm nào khiến họ dừng lại?',
    speechText: 'Với một app mới còn thêm: User có tìm đúng chức năng không? Có hiểu CTA không? Có biết bước tiếp theo không? Navigation có gây nhầm không? Điểm nào khiến họ dừng lại?',
    cardHtml: `
      <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-left space-y-4 mt-6">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="text-xl text-slate-300 font-medium">Tìm đúng chức năng?</span>
          <span class="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full font-bold text-sm">Friction Risk</span>
        </div>
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="text-xl text-slate-300 font-medium">Hiểu rõ Call to Action?</span>
          <span class="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full font-bold text-sm">Clarity Gap</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xl text-slate-300 font-medium">Navigation & Drop-off Point</span>
          <span class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full font-bold text-sm">UX Friction</span>
        </div>
      </div>
    `,
  },
  {
    id: 'scene_04',
    keyword: 'TRADITIONAL TESTING',
    title: 'Giới Hạn 3 Tuần Một Vòng Test',
    subText: 'Cách truyền thống là đưa người thật vào test: tuyển học viên, mời giảng viên, bố trí trợ giảng, reviewer chấm. Với UX/UI thì tuyển user, giao task, quan sát hành vi, phỏng vấn, tổng hợp friction. Một vòng có thể mất gần 3 tuần.',
    speechText: 'Cách truyền thống là đưa người thật vào test. Tuyển học viên, mời giảng viên, bố trí trợ giảng, reviewer chấm. Với UX UI thì tuyển user, giao task, quan sát hành vi, phỏng vấn, tổng hợp friction. Một vòng có thể mất gần 3 tuần.',
    cardHtml: `
      <div class="p-6 rounded-3xl bg-rose-950/30 border border-rose-500/30 text-center mt-6">
        <div class="text-6xl font-black text-rose-400">~3 TUẦN</div>
        <div class="text-2xl text-slate-300 font-semibold mt-2">Thời gian hoàn thành 1 vòng thử nghiệm thủ công</div>
        <div class="flex items-center justify-center gap-3 mt-4 text-slate-400 text-lg">
          <span>Tuyển User</span> ➔ <span>Giao Task</span> ➔ <span>Phỏng Vấn</span> ➔ <span>Làm Report</span>
        </div>
      </div>
    `,
  },
  {
    id: 'scene_05',
    keyword: 'R&D BOTTLENECK',
    title: 'Chi Phí Cho 1.000 Vòng Test',
    subText: 'Với một công ty nhỏ, đây là giới hạn R&D. Test 2 phiên bản gần như nhân đôi nguồn lực. Muốn thử 10 cohort, 10 flow UX hoặc hàng chục hypothesis thì rất khó. Nếu cần 1.000 report để nhìn đủ pattern? Chi phí con người là bao nhiêu?',
    speechText: 'Với một công ty nhỏ, đây không chỉ là vấn đề thời gian. Đó là giới hạn R&D. Test 2 phiên bản gần như nhân đôi nguồn lực. Muốn thử 10 cohort, 10 flow UX hoặc hàng chục hypothesis thì rất khó. Nếu cần 1.000 report để nhìn đủ pattern, chi phí con người là bao nhiêu và mất bao lâu mới đủ dữ liệu?',
    cardHtml: `
      <div class="grid grid-cols-2 gap-4 mt-6 text-left">
        <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div class="text-rose-400 text-3xl font-extrabold">2x Nguồn Lực</div>
          <div class="text-slate-400 text-lg mt-1">Khi test 2 phiên bản</div>
        </div>
        <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div class="text-amber-400 text-3xl font-extrabold">1.000 Reports?</div>
          <div class="text-slate-400 text-lg mt-1">Bất khả thi bằng sức người</div>
        </div>
      </div>
    `,
  },
  {
    id: 'scene_06',
    keyword: 'DIGITAL TWIN SIMULATION',
    title: 'Mô Phỏng Toàn Diện Các Vai Trò',
    subText: 'Đó là lý do GO4AI áp dụng Digital Twin + AI Agent Simulation: mô phỏng Learner, Giảng viên, Reviewer, HR, L&D, Manager, CFO, Skeptic. Với App: New User, Power User, Buyer, Admin, Low-tech User.',
    speechText: 'Đó là lý do GO4AI bắt đầu áp dụng một cách khác: Digital Twin kết hợp AI Agent Simulation. Chúng tôi mô phỏng các vai trò: Learner, Giảng viên, Reviewer, HR, L&D, Manager, CFO, Skeptic. Hoặc với một app: New User, Power User, Buyer, Admin, Low-tech User.',
    cardHtml: `
      <div class="flex flex-wrap gap-2.5 mt-6 justify-center">
        <span class="px-4 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full font-bold text-lg">Learner</span>
        <span class="px-4 py-2 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-full font-bold text-lg">Giảng Viên</span>
        <span class="px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full font-bold text-lg">Reviewer</span>
        <span class="px-4 py-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-full font-bold text-lg">HR / L&D</span>
        <span class="px-4 py-2 bg-rose-500/20 border border-rose-400/30 text-rose-300 rounded-full font-bold text-lg">CFO & Skeptic</span>
        <span class="px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 rounded-full font-bold text-lg">New / Power User</span>
      </div>
    `,
  },
  {
    id: 'scene_07',
    keyword: 'FRICTION PATTERNS',
    title: 'Bắt Pattern Lỗi Tự Động',
    subText: 'Cho các agent chạy cùng một curriculum hoặc UX flow có cấu trúc: hiểu sai ở đâu, dừng ở bước nào, CTA nào không rõ, navigation gây lỗi. Nếu 7/8 persona cùng mắc ở onboarding, sửa trước.',
    speechText: 'Sau đó cho các agent chạy cùng một curriculum, workflow hoặc UX flow có cấu trúc: hiểu sai ở đâu, dừng ở bước nào, CTA nào không rõ, navigation nào gây lỗi, trust concern nằm ở đâu. Nếu 7 trên 8 persona cùng mắc ở onboarding, sửa trước.',
    cardHtml: `
      <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-left mt-6">
        <div class="flex items-center justify-between mb-3">
          <span class="font-bold text-2xl text-white">Onboarding Friction</span>
          <span class="px-4 py-1.5 bg-rose-500 text-white rounded-full font-extrabold text-lg">7 / 8 Persona Bị Kẹt</span>
        </div>
        <div class="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-rose-500 to-amber-500 h-full" style="width: 87.5%"></div>
        </div>
        <div class="text-slate-400 text-lg mt-3">➔ Tự động gắn cờ ưu tiên sửa ngay trước khi test người thật</div>
      </div>
    `,
  },
  {
    id: 'scene_08',
    keyword: 'EVIDENCE-BASED R&D',
    title: 'Quy Trình R&D Dựa Trên Bằng Chứng',
    subText: 'R&D không thể dựa vào cảm giác của người thiết kế. Phải có evidence. Trước đây: Build → Tuyển người test → Feedback → Sửa. Bây giờ: Build → AI Simulation → Find Friction → Fix → Re-simulate → Human Validation.',
    speechText: 'Đây là điểm quan trọng: R&D không thể dựa vào cảm giác của người thiết kế sản phẩm. Phải có evidence. Trước đây: Build, tuyển người test, đợi feedback, tổng hợp rồi sửa. Bây giờ: Build, sang AI Simulation, sang Find Friction, sang Fix, sang Re-simulate, rồi mới Human Validation.',
    cardHtml: `
      <div class="p-6 rounded-3xl bg-indigo-950/40 border border-indigo-500/30 text-left mt-6">
        <div class="text-indigo-300 font-bold text-lg uppercase tracking-wider mb-2">Quy Trình R&D Mới</div>
        <div class="text-white font-extrabold text-2xl leading-relaxed">
          Build <span class="text-indigo-400">➔</span> AI Simulation <span class="text-indigo-400">➔</span> Fix Friction <span class="text-indigo-400">➔</span> Re-simulate <span class="text-emerald-400">➔ Human Validation</span>
        </div>
      </div>
    `,
  },
  {
    id: 'scene_09',
    keyword: 'OPTIMIZING HUMAN CAPITAL',
    title: 'Con Người Là Lớp Kiểm Định Cuối',
    subText: 'AI không thay học viên thật, không thay giảng viên, reviewer, hay user thật. Nhưng chúng tôi không còn dùng nguồn lực đắt nhất để phát hiện những lỗi rẻ nhất. Con người được đưa vào sau khi sản phẩm đã vượt qua lớp pre-screening.',
    speechText: 'AI không thay học viên thật. Không thay giảng viên. Không thay reviewer. Cũng không thay user thật trong UX Research. Nhưng chúng tôi không còn dùng nguồn lực đắt nhất để phát hiện những lỗi rẻ nhất. Con người được đưa vào sau khi sản phẩm đã vượt qua một lớp pre-screening.',
    cardHtml: `
      <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-center mt-6">
        <div class="text-3xl font-extrabold text-white">"Không dùng nguồn lực đắt nhất"</div>
        <div class="text-2xl font-bold text-emerald-400 mt-2">"để phát hiện những lỗi rẻ nhất"</div>
        <div class="text-slate-400 text-lg mt-3">Pre-screening bằng AI ➔ Human Testing tạo giá trị tối đa</div>
      </div>
    `,
  },
  {
    id: 'scene_10',
    keyword: 'THROUGHPUT REVOLUTION',
    title: 'R&D Throughput Tăng Vọt',
    subText: 'Với một công ty nhỏ, đây là cách tăng R&D throughput khi thời gian và nguồn lực đều có giới hạn. 1.000 vòng kiểm thử trước đây không đủ tiền và người để làm, nay có thể trở thành một phần bình thường của quy trình R&D.',
    speechText: 'Với một công ty nhỏ, đây không phải dùng AI cho vui. Đây là cách tăng R&D throughput khi thời gian và nguồn lực đều có giới hạn. 1.000 vòng kiểm thử trước đây không đủ tiền và người để làm, nay có thể trở thành một phần bình thường của quy trình R&D. Đó mới là thay đổi đáng theo dõi.',
    cardHtml: `
      <div class="p-8 rounded-3xl bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-slate-900/60 border border-blue-500/30 text-center mt-6 shadow-2xl">
        <div class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400">1.000 VÒNG</div>
        <div class="text-2xl font-bold text-white mt-2">Synthetic Simulation Mỗi Chu Kỳ R&D</div>
        <div class="text-indigo-300 font-semibold text-lg mt-3">GO4AI Enterprise AI Transformation</div>
      </div>
    `,
  },
];

async function generateFullVideo() {
  console.log('================================================================');
  console.log('🚀 GENERATING GO4AI SYNTHETIC TESTING VIDEO WITH VIETNAMESE SUBTITLES');
  console.log('================================================================\n');

  const projectRoot = resolve(process.cwd());
  const audioDir = join(projectRoot, 'temp-audio-synthetic');
  if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

  // Step 1: Generate TTS Audio for all 10 scenes
  console.log('🎙️ Step 1: Synthesizing High Quality Vietnamese Narration Audio...');
  const audioFiles = [];
  let totalNarrationSec = 0;

  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    const outAudio = join(audioDir, `${s.id}.mp3`);
    process.stdout.write(`  [${i + 1}/${SCENES.length}] Synthesizing "${s.id}" (${s.keyword})... `);
    const { durationSec } = await generateSpeechAudio(s.speechText, 'vi', outAudio);
    s.audioDurationSec = durationSec;
    // Add 0.35s cushion for visual comfort
    s.visualDurationSec = Number((durationSec + 0.35).toFixed(2));
    totalNarrationSec += s.visualDurationSec;
    audioFiles.push(outAudio);
    console.log(`✓ ${durationSec}s (visual: ${s.visualDurationSec}s)`);
  }

  console.log(`\n✓ All 10 scene audios generated! Total video duration: ~${totalNarrationSec.toFixed(1)}s`);

  // Step 2: Combine Audios into Master Narration Soundtrack
  console.log('\n🎵 Step 2: Combining audio segments into master soundtrack...');
  const concatListPath = join(audioDir, 'concat_list.txt');
  const concatLines = audioFiles.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  writeFileSync(concatListPath, concatLines, 'utf-8');

  const masterAudioPath = join(projectRoot, 'voice-synthetic-testing.mp3');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${masterAudioPath}"`);
  console.log(`✓ Master audio created: ${masterAudioPath}`);

  // Step 3: Bootstrap html-video context & Create Project
  console.log('\n⚙️ Step 3: Initializing html-video project orchestrator...');
  const ctx = await bootstrap({ cwd: projectRoot });

  const project = await ctx.orchestrator.create({
    name: 'Synthetic Testing & Simulation in R&D',
    intent: 'GO4AI Synthetic Testing explainer with synchronized Vietnamese voice and animated subtitle overlays',
    preferences: {
      resolution: { width: 1080, height: 1920 }, // 9:16 Portrait
      fps: 60,
    },
  });

  // Step 4: Attach Master Audio to Project Soundtrack
  console.log('🎵 Step 4: Attaching master voice soundtrack to project...');
  const narrationAsset = await ctx.orchestrator.addFileAsset(project.id, masterAudioPath, 'Synthetic Testing Master Narration');
  const loadedProj = await ctx.projects.load(project.id);
  const addedAssetId = narrationAsset.assets[narrationAsset.assets.length - 1].id;
  loadedProj.soundtrack = {
    narrationAssetId: addedAssetId,
    narrationVolumeDb: 0,
  };
  await ctx.projects.save(loadedProj);

  // Step 5: Construct 10-Scene Content Graph
  console.log('\n📜 Step 5: Building Content Graph...');
  const graph = {
    schemaVersion: 1,
    intent: 'explainer',
    synopsis: 'GO4AI Synthetic Testing, Digital Twin and AI Agent Simulation in R&D Storyboard',
    nodes: SCENES.map((s) => ({
      id: s.id,
      kind: 'text',
      text: s.subText,
      durationSec: s.visualDurationSec,
    })),
    edges: SCENES.slice(0, -1).map((s, idx) => ({
      from: s.id,
      to: SCENES[idx + 1].id,
      kind: 'sequence',
    })),
  };

  await ctx.orchestrator.writeContentGraph(project.id, graph);
  console.log(`✓ Content Graph written with 10 sequential nodes`);

  // Step 6: Generate Ultra-Premium Animated HTML Frames
  console.log('\n🎨 Step 6: Generating 10 HTML/CSS animated scenes with synchronized Vietnamese subtitles...');

  const makeFrameHtml = (scene, stepNum, totalSteps) => `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>GO4AI Synthetic Testing - Scene ${stepNum}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;0,900;1,600&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: #060913;
    color: #f8fafc;
    margin: 0;
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 90px 70px;
  }
  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(160px);
    opacity: 0.5;
    animation: pulseGlow 8s ease-in-out infinite alternate;
    pointer-events: none;
  }
  .glow-1 { width: 800px; height: 800px; background: #1d4ed8; top: -200px; left: -200px; }
  .glow-2 { width: 700px; height: 700px; background: #6d28d9; bottom: 100px; right: -150px; }
  .glow-3 { width: 600px; height: 600px; background: #0284c7; top: 40%; left: 200px; opacity: 0.3; }

  @keyframes pulseGlow {
    0% { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.15) translate(40px, -30px); }
  }

  .card-glass {
    background: rgba(13, 20, 38, 0.88);
    backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 40px;
    padding: 48px 56px;
    box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.7);
  }

  @keyframes cardSlideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes subtitleIn {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .animate-main { animation: cardSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .animate-sub { animation: subtitleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.08s forwards; opacity: 0; }

  .badge-brand {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    padding: 14px 32px;
    border-radius: 9999px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);
  }

  .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 24px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8, #6366f1, #a855f7);
    width: ${(stepNum / totalSteps) * 100}%;
  }
</style>
</head>
<body>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  <div class="bg-glow glow-3"></div>

  <!-- Top Header Navigation -->
  <header class="relative z-10 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="badge-brand">GO4AI INSIGHTS</div>
      <div class="text-[22px] text-blue-300/80 font-bold tracking-widest uppercase">Digital Twin & Agent</div>
    </div>
    <div class="px-5 py-2.5 rounded-full bg-slate-900/80 border border-slate-800 text-[24px] text-slate-300 font-extrabold tracking-wider">
      ${String(stepNum).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}
    </div>
  </header>

  <!-- Central Dynamic Information Stage -->
  <main class="relative z-10 my-auto animate-main text-center">
    <div class="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-blue-500/15 border border-blue-500/30 mb-8">
      <span class="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></span>
      <span class="text-blue-400 text-[24px] font-bold tracking-widest uppercase">${scene.keyword}</span>
    </div>

    <h1 class="text-[82px] font-black leading-[1.12] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200 max-w-[960px] mx-auto">
      ${scene.title}
    </h1>

    <div class="mt-8 max-w-[940px] mx-auto">
      ${scene.cardHtml}
    </div>
  </main>

  <!-- Bottom Synchronized Vietnamese Subtitle Bar -->
  <footer class="relative z-10 card-glass animate-sub">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3 text-cyan-400 text-[20px] font-extrabold tracking-wider uppercase">
        <span class="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping"></span>
        Vietnamese Narration Subtitle
      </div>
      <div class="text-slate-400 text-[19px] font-bold tracking-wide">Scene ${stepNum}/${totalSteps}</div>
    </div>
    <p class="text-[40px] font-extrabold text-white leading-snug tracking-tight">
      “${scene.subText}”
    </p>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
  </footer>
</body>
</html>`;

  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    const frameHtml = makeFrameHtml(s, i + 1, SCENES.length);
    await ctx.orchestrator.writeFrameHtml(project.id, s.id, frameHtml);
    console.log(`  ✓ Frame ${i + 1}/${SCENES.length} written: ${s.id}`);
  }

  // Step 7: Export Final MP4 Video
  console.log('\n🎬 Step 7: Rendering 10-scene MP4 video (Playwright capture + FFmpeg concat & muxing)...');
  const t0 = Date.now();

  const { outputPath } = await ctx.orchestrator.exportMp4({
    projectId: project.id,
    onProgress: (pct, stage) => {
      process.stdout.write(`\r  └ [${pct.toFixed(0)}%] ${stage}                     `);
    },
  });

  const durationSec = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n\n🎉 VIDEO EXPORT SUCCESSFUL in ${durationSec}s!`);
  console.log(`📁 Output Video Path: ${outputPath}`);

  // Copy final output to project root for convenient viewing
  const rootOutput = join(projectRoot, 'synthetic-testing-go4ai.mp4');
  execSync(`copy /Y "${outputPath}" "${rootOutput}"`);
  console.log(`📁 Convenient Root Link: ${rootOutput}`);
}

generateFullVideo().catch((err) => {
  console.error('❌ Video generation failed:', err);
  process.exit(1);
});
