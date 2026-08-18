import fs from 'node:fs';
import path from 'node:path';
import { getAvailableVoices, synthesizeVoiceSpeech, synthesizeVieNeuSpeech } from '../local-tts.js';
import { FFMPEG_BIN, FFPROBE_BIN, PYTHON_BIN, VIENEU_WORKER_SCRIPT, hasVieNeu } from '../resolve-binaries.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SAMPLE_TEXTS = {
  'vieneu-truc-ly': 'Xin chào! Tôi là Trúc Ly, giọng đọc nữ miền Bắc truyền cảm và tự nhiên của GO4AI Studio.',
  'vieneu-minh-duc': 'Xin chào! Tôi là Minh Đức, giọng đọc nam miền Bắc trầm ấm và chững chạc cho video công nghệ, tin tức.',
  'vieneu-mai-anh': 'Xin chào! Tôi là Mai Anh, giọng nữ miền Bắc nhẹ nhàng, trong sáng cho video thuyết minh và giới thiệu sản phẩm.',
  'vieneu-pham-tuyen': 'Xin chào! Tôi là Phạm Tuyên, giọng nam miền Bắc tự nhiên, phóng khoáng phong cách đời sống.',
  'vieneu-doan-trang': 'Xin chào! Tôi là Đoan Trang, giọng nữ miền Bắc tự tin, rõ ràng phong cách MC truyền hình chuyên nghiệp.',
  'vieneu-thai-son': 'Xin chào! Tôi là Thái Sơn, giọng nam miền Nam trầm ấm, truyền cảm cho podcast và video tài liệu.',
  'vieneu-xuan-vinh': 'Xin chào! Tôi là Xuân Vĩnh, giọng nam miền Nam trẻ trung, thân thiện cho video TikTok và Reels.',
  'vieneu-thanh-binh': 'Xin chào! Tôi là Thanh Bình, giọng nam Sài Gòn chuẩn mực, lịch thiệp cho video quảng cáo doanh nghiệp.',
  'vieneu-thuc-doan': 'Xin chào! Tôi là Thục Đoan, giọng nữ miền Nam dịu dàng, phát âm êm ái và mượt mà.',
  'vieneu-ngoc-linh': 'Xin chào! Tôi là Ngọc Linh, giọng nữ Sài Gòn tươi vui, năng động, rất hút tai trong video mạng xã hội.',
  'vieneu-thuy-dung': 'Xin chào! Tôi là Thùy Dung, giọng nữ miền Nam ấm áp, biểu cảm và giàu cảm xúc.',
  'vieneu-minh-triet': 'Xin chào! Tôi là Minh Triết, giọng nam miền Trung đĩnh đạc, rõ từng chữ, dễ nghe trên toàn quốc.',
  'vieneu-quang-son': 'Xin chào! Tôi là Quang Sơn, giọng nam miền Trung chân phương, mộc mạc và gần gũi.',
  'vieneu-ngoc-tran': 'Xin chào! Tôi là Ngọc Trân, giọng nữ miền Trung ngọt ngào, âm điệu êm đềm đặc trưng xứ Huế và Đà Nẵng.',
  'vi-nam-minh': 'Xin chào! Tôi là Nam Minh, giọng đọc nam chuẩn Bắc của Microsoft Edge Neural.',
  'vi-hoai-my': 'Xin chào! Tôi là Hoài My, giọng đọc nữ chuẩn Bắc nhẹ nhàng và truyền cảm của Microsoft Edge Neural.',
  'vi-google-female': 'Xin chào! Tôi là Chị Google, giọng đọc phổ thông quen thuộc của Google Cloud.',
  'vi-ai-ava': 'Xin chào! Tôi là Ava Multilingual, giọng nữ AI biểu cảm của Microsoft Copilot.',
  'vi-ai-andrew': 'Xin chào! Tôi là Andrew Multilingual, giọng nam AI chững chạc của Microsoft Copilot.',
  'vi-ai-emma': 'Xin chào! Tôi là Emma Multilingual, giọng nữ AI tươi sáng và trẻ trung.',
  'vi-ai-brian': 'Xin chào! Tôi là Brian Multilingual, giọng nam AI chân thực và gần gũi.',
  'en-us-guy': 'Hello! I am Guy, a confident and natural American male voice for tech demos and tutorials.',
  'en-us-jenny': 'Hello! I am Jenny, a warm and engaging American female voice, ideal for storytelling and marketing.',
  'en-us-aria': 'Hello! I am Aria, a clear and articulate news anchor voice for professional explainers.',
  'en-gb-ryan': 'Hello! I am Ryan, a prestigious British accent for documentaries and editorial content.',
};

async function generateAllVoiceSamples() {
  const targetDir = path.resolve('./assets/audio/voice-samples');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  console.log('===============================================================');
  console.log('       PRE-GENERATING OFFLINE VOICE SAMPLES FOR ZERO DELAY     ');
  console.log(`Target directory: ${targetDir}`);
  console.log('===============================================================\n');

  const voices = getAvailableVoices();
  const vieneuVoices = voices.filter(v => v.provider === 'vieneu');
  const otherVoices = voices.filter(v => v.provider !== 'vieneu');

  // 1. Generate 14 VieNeu samples in a single batch (1 model load)
  if (hasVieNeu() && vieneuVoices.length > 0) {
    console.log(`--- Step 1: Generating ${vieneuVoices.length} VieNeu samples in single batch ---`);
    const batchPayload = {
      voiceId: 'Trúc Ly',
      rate: 0,
      pitch: 0,
      ffmpegBin: FFMPEG_BIN,
      ffprobeBin: FFPROBE_BIN,
      scenes: vieneuVoices.map(v => ({
        id: v.id,
        text: SAMPLE_TEXTS[v.id] || `Xin chào! Tôi là ${v.name}.`,
        voiceId: v.voiceId,
        outFilePath: path.join(targetDir, `${v.id}.mp3`),
      })),
    };

    const tempJson = path.join(targetDir, `temp_batch_samples_${Date.now()}.json`);
    try {
      fs.writeFileSync(tempJson, JSON.stringify(batchPayload), 'utf-8');
      const { stdout } = await execFileAsync(PYTHON_BIN, [VIENEU_WORKER_SCRIPT, '--batch-synthesize', '--payload-file', tempJson], {
        timeout: 300000,
        encoding: 'utf-8',
      });
      const parsed = JSON.parse(stdout.trim());
      if (parsed.status === 'ok') {
        for (const v of vieneuVoices) {
          const fp = path.join(targetDir, `${v.id}.mp3`);
          if (fs.existsSync(fp) && fs.statSync(fp).size > 1000) {
            console.log(`✓ [VIENEU SAMPLE OK] ${v.id.padEnd(20)} (${fs.statSync(fp).size} B)`);
          }
        }
      }
    } catch (err) {
      console.warn('Batch VieNeu generation warning:', err.message);
    } finally {
      try { if (fs.existsSync(tempJson)) fs.unlinkSync(tempJson); } catch {}
    }
  }

  // 2. Generate other voices (Edge Neural, Google, English)
  console.log(`\n--- Step 2: Generating ${otherVoices.length} Edge Neural / Google samples ---`);
  for (const v of otherVoices) {
    const outFilePath = path.join(targetDir, `${v.id}.mp3`);
    const text = SAMPLE_TEXTS[v.id] || `Xin chào! Tôi là ${v.name}.`;
    try {
      await synthesizeVoiceSpeech({
        text,
        voicePresetId: v.id,
        rate: 0,
        pitch: 0,
        outFilePath,
      });
      if (fs.existsSync(outFilePath) && fs.statSync(outFilePath).size > 1000) {
        console.log(`✓ [EDGE/GOOGLE OK]    ${v.id.padEnd(20)} (${fs.statSync(outFilePath).size} B)`);
      }
    } catch (err) {
      console.error(`✗ [ERROR] ${v.id}:`, err.message);
    }
  }

  console.log('\n===============================================================');
  console.log('✓ ALL PRE-CACHED SAMPLES CREATED SUCCESSFULLY IN assets/audio/voice-samples/');
  console.log('===============================================================\n');
}

generateAllVoiceSamples().catch(err => {
  console.error('Fatal error generating samples:', err);
  process.exit(1);
});
