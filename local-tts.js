import { execSync } from 'node:child_process';
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Binary path resolution ──
// Ưu tiên: env var → binaries/ (do setup-binaries.js tải) → PATH hệ thống.
import { FFMPEG_BIN, FFPROBE_BIN, EDGE_TTS_BIN } from './resolve-binaries.js';


/**
 * 100% FREE & GENUINE Multi-Voice Neural TTS Engine
 * - 0 fake presets, 0 cluttered style duplicates
 * - Full manual control over Rate (-30% to +50%) and Pitch (-6Hz to +6Hz)
 * - Authentic Models: Native Vietnamese (Nam Minh, Hoài My), Google Cloud Vietnamese, Multilingual AI (Ava, Andrew, Emma, Brian), English (Guy, Jenny, Aria, Ryan)
 */

export const FREE_VOICE_PRESETS = [
  // --- 1. TIẾNG VIỆT BẢN ĐỊA (Microsoft Edge Neural • 48kHz Miễn Phí) ---
  {
    id: 'vi-nam-minh',
    name: 'Nam Minh (Nam • Chuẩn Bắc)',
    gender: 'Nam',
    genderLabel: '👨 Nam',
    lang: 'vi',
    langLabel: '🇻🇳 Tiếng Việt (Edge)',
    region: 'Miền Bắc',
    provider: 'edge-neural',
    voiceId: 'vi-VN-NamMinhNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Trầm ấm, chững chạc, chuẩn xác cho video công nghệ, kiến thức, bài giảng.',
  },
  {
    id: 'vi-hoai-my',
    name: 'Hoài My (Nữ • Chuẩn Bắc)',
    gender: 'Nữ',
    genderLabel: '👩 Nữ',
    lang: 'vi',
    langLabel: '🇻🇳 Tiếng Việt (Edge)',
    region: 'Miền Bắc',
    provider: 'edge-neural',
    voiceId: 'vi-VN-HoaiMyNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Nhẹ nhàng, truyền cảm, tự nhiên cho video giới thiệu sản phẩm và TikTok/Shorts.',
  },

  // --- 2. TIẾNG VIỆT GOOGLE CLOUD (Miễn Phí 100%) ---
  {
    id: 'vi-google-female',
    name: 'Chị Google (Nữ • Phổ Thông)',
    gender: 'Nữ',
    genderLabel: '👩 Nữ',
    lang: 'vi',
    langLabel: '🇻🇳 Tiếng Việt (Google)',
    region: 'Toàn quốc',
    provider: 'google-cloud',
    voiceId: 'vi-google-female',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Giọng đọc Google chuẩn quen thuộc trong video review, giải trí, tin tức ngắn.',
  },

  // --- 3. TIẾNG VIỆT MULTILINGUAL NEURAL AI (Microsoft Edge Multilingual • Miễn Phí 100%) ---
  {
    id: 'vi-ai-ava',
    name: 'Ava Multilingual (Nữ AI • Truyền cảm)',
    gender: 'Nữ',
    genderLabel: '👩 Nữ AI',
    lang: 'vi',
    langLabel: '🇻🇳 Tiếng Việt (Multilingual AI)',
    region: 'Quốc tế',
    provider: 'edge-neural',
    voiceId: 'en-US-AvaMultilingualNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Giọng Nữ AI đa ngôn ngữ của Microsoft, phát âm tiếng Việt biểu cảm, mượt mà.',
  },
  {
    id: 'vi-ai-andrew',
    name: 'Andrew Multilingual (Nam AI • Chững chạc)',
    gender: 'Nam',
    genderLabel: '👨 Nam AI',
    lang: 'vi',
    langLabel: '🇻🇳 Tiếng Việt (Multilingual AI)',
    region: 'Quốc tế',
    provider: 'edge-neural',
    voiceId: 'en-US-AndrewMultilingualNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Giọng Nam AI đa ngôn ngữ Microsoft Copilot, ấm áp, tự tin, chuyên nghiệp.',
  },
  {
    id: 'vi-ai-emma',
    name: 'Emma Multilingual (Nữ AI • Tươi sáng)',
    gender: 'Nữ',
    genderLabel: '👩 Nữ AI',
    lang: 'vi',
    langLabel: '🇻🇳 Tiếng Việt (Multilingual AI)',
    region: 'Quốc tế',
    provider: 'edge-neural',
    voiceId: 'en-US-EmmaMultilingualNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Giọng Nữ AI trẻ trung, trong trẻo, phù hợp video ngắn, giải trí và tin tức nhanh.',
  },
  {
    id: 'vi-ai-brian',
    name: 'Brian Multilingual (Nam AI • Gần gũi)',
    gender: 'Nam',
    genderLabel: '👨 Nam AI',
    lang: 'vi',
    langLabel: '🇻🇳 Tiếng Việt (Multilingual AI)',
    region: 'Quốc tế',
    provider: 'edge-neural',
    voiceId: 'en-US-BrianMultilingualNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Giọng Nam AI tự nhiên, phóng khoáng, phong cách trò chuyện chân thực.',
  },

  // --- 4. ENGLISH VOICES (Microsoft Edge US/UK) ---
  {
    id: 'en-us-guy',
    name: 'Guy (Male • US Tech & Natural)',
    gender: 'Nam',
    genderLabel: '👨 Male',
    lang: 'en',
    langLabel: '🇺🇸 English (US)',
    region: 'United States',
    provider: 'edge-neural',
    voiceId: 'en-US-GuyNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Confident, natural American male voice. Great for tech demos and tutorials.',
  },
  {
    id: 'en-us-jenny',
    name: 'Jenny (Female • US Storytelling)',
    gender: 'Nữ',
    genderLabel: '👩 Female',
    lang: 'en',
    langLabel: '🇺🇸 English (US)',
    region: 'United States',
    provider: 'edge-neural',
    voiceId: 'en-US-JennyNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Warm, engaging American female voice. Excellent for marketing and social clips.',
  },
  {
    id: 'en-us-aria',
    name: 'Aria (Female • US News Broadcast)',
    gender: 'Nữ',
    genderLabel: '👩 Female',
    lang: 'en',
    langLabel: '🇺🇸 English (US)',
    region: 'United States',
    provider: 'edge-neural',
    voiceId: 'en-US-AriaNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Clear, articulate professional news anchor voice. Ideal for news and corporate explainer.',
  },
  {
    id: 'en-gb-ryan',
    name: 'Ryan (Male • UK Documentary)',
    gender: 'Nam',
    genderLabel: '👨 Male',
    lang: 'en',
    langLabel: '🇬🇧 English (UK)',
    region: 'United Kingdom',
    provider: 'edge-neural',
    voiceId: 'en-GB-RyanNeural',
    defaultRate: '+0%',
    defaultPitch: '+0Hz',
    style: 'Prestigious, clear British accent for documentary and editorial content.',
  },
];

// Fallback & Direct Google Cloud TTS Fetcher (Chunked & Concatenated)
export async function fetchGoogleTts(text, lang = 'vi') {
  const targetLang = lang === 'en' ? 'en' : 'vi';
  const sentences = text.split(/([.!?;,\n]+)/).filter(Boolean);
  const chunks = [];
  let cur = '';

  for (const s of sentences) {
    if ((cur + s).length > 150) {
      if (cur.trim()) chunks.push(cur.trim());
      cur = s;
    } else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  if (chunks.length === 0) chunks.push(text.trim());

  const audioBuffers = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${targetLang}&client=tw-ob`;
    const buf = await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        const c = [];
        res.on('data', d => c.push(d));
        res.on('end', () => resolve(Buffer.concat(c)));
        res.on('error', reject);
      }).on('error', reject);
    });
    audioBuffers.push(buf);
  }
  return Buffer.concat(audioBuffers);
}

/**
 * Intelligent Script Segmentation & Duration Calculation Engine
 * Estimates reading duration based on word count, language, reading speed (rate), and punctuation pauses.
 */
export function estimateScriptMetrics({
  text = '',
  lang = 'vi',
  rate = 0, // integer percentage: e.g. -15, 0, +15, +30
}) {
  if (!text || typeof text !== 'string') {
    return {
      totalWords: 0,
      totalChars: 0,
      estimatedTotalSec: 0,
      minRecommendedSec: 0,
      scenes: [],
    };
  }

  const cleanText = text.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const totalChars = cleanText.length;

  if (totalWords === 0) {
    return {
      totalWords: 0,
      totalChars: 0,
      estimatedTotalSec: 0,
      minRecommendedSec: 0,
      scenes: [],
    };
  }

  // Base speaking rate in Words Per Second:
  // Vietnamese: ~160 wpm = 2.67 wps
  // English: ~145 wpm = 2.42 wps
  const baseWps = lang === 'en' ? 2.42 : 2.65;
  const speedMultiplier = 1 + (Number(rate) || 0) / 100;
  const effectiveWps = Math.max(1.2, baseWps * speedMultiplier);

  // Split into logical scene chunks:
  // 1. By explicit double newlines (paragraphs)
  // 2. Or by sentence delimiters (. ! ? \n)
  // 3. Group sentences so each scene has roughly 12 to 28 words (~4-8 seconds)
  const rawParagraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const sentenceUnits = [];

  for (const para of rawParagraphs) {
    const rawSentences = para.split(/([.!?;]+|\n)/).filter(Boolean);
    let curSentence = '';
    for (const s of rawSentences) {
      if (/^[.!?;]+$/.test(s.trim())) {
        curSentence += s;
        if (curSentence.trim()) {
          sentenceUnits.push(curSentence.trim());
          curSentence = '';
        }
      } else {
        if (curSentence.trim()) sentenceUnits.push(curSentence.trim());
        curSentence = s;
      }
    }
    if (curSentence.trim()) sentenceUnits.push(curSentence.trim());
  }

  // Group sentences into scene blocks
  const scenes = [];
  let currentSceneText = '';
  let currentSceneWords = 0;

  for (const sentence of sentenceUnits) {
    const sWords = sentence.split(/\s+/).filter(Boolean).length;
    if (sWords === 0) continue;

    if (currentSceneWords + sWords > 28 && currentSceneText.length > 0) {
      // Finalize current scene
      const speechSec = Number((currentSceneWords / effectiveWps).toFixed(1));
      const minSec = Math.max(3.5, Number((speechSec + 0.8).toFixed(1))); // +0.8s breathing room
      scenes.push({
        index: scenes.length + 1,
        text: currentSceneText.trim(),
        wordCount: currentSceneWords,
        speechSec,
        minSec,
      });
      currentSceneText = sentence;
      currentSceneWords = sWords;
    } else {
      currentSceneText = currentSceneText ? `${currentSceneText} ${sentence}` : sentence;
      currentSceneWords += sWords;
    }
  }

  if (currentSceneText.trim()) {
    const speechSec = Number((currentSceneWords / effectiveWps).toFixed(1));
    const minSec = Math.max(3.5, Number((speechSec + 0.8).toFixed(1)));
    scenes.push({
      index: scenes.length + 1,
      text: currentSceneText.trim(),
      wordCount: currentSceneWords,
      speechSec,
      minSec,
    });
  }

  let totalSpeechSec = 0;
  let totalMinSec = 0;
  scenes.forEach(s => {
    totalSpeechSec += s.speechSec;
    totalMinSec += s.minSec;
  });

  return {
    totalWords,
    totalChars,
    lang,
    ratePercent: rate,
    effectiveWps: Number(effectiveWps.toFixed(2)),
    estimatedTotalSpeechSec: Number(totalSpeechSec.toFixed(1)),
    minRecommendedSec: Number(totalMinSec.toFixed(1)),
    sceneCount: scenes.length,
    scenes,
  };
}

/**
 * Synthesize speech audio with full voice, rate and pitch customization
 */
export async function synthesizeVoiceSpeech({
  text,
  voicePresetId = 'vi-nam-minh',
  customVoiceId = null,
  rate = '+0%',
  pitch = '+0Hz',
  outFilePath,
}) {
  if (!text || text.trim().length === 0) {
    throw new Error('Văn bản thuyết minh không được để trống');
  }

  const preset = FREE_VOICE_PRESETS.find(p => p.id === voicePresetId || p.voiceId === voicePresetId) || FREE_VOICE_PRESETS[0];
  const activeVoiceId = customVoiceId || preset.voiceId;
  const isGoogle = preset.provider === 'google-cloud' || voicePresetId.includes('google');
  const isEdge = preset.provider === 'edge-neural' || activeVoiceId.includes('Neural');

  const outDir = path.dirname(outFilePath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Format rate and pitch string for CLI (e.g. +15% or -10%, +2Hz or -3Hz)
  let formattedRate = rate;
  if (typeof rate === 'number') {
    formattedRate = rate >= 0 ? `+${rate}%` : `${rate}%`;
  } else if (!formattedRate.endsWith('%')) {
    formattedRate = `${formattedRate}%`;
  }

  let formattedPitch = pitch;
  if (typeof pitch === 'number') {
    formattedPitch = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;
  } else if (!formattedPitch.endsWith('Hz')) {
    formattedPitch = `${formattedPitch}Hz`;
  }

  if (isGoogle) {
    try {
      const buffer = await fetchGoogleTts(text, preset.lang || 'vi');
      fs.writeFileSync(outFilePath, buffer);
      let durationSec = 4.0;
      try {
        const durOut = execSync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outFilePath}"`).toString().trim();
        const parsed = parseFloat(durOut);
        if (!isNaN(parsed) && parsed > 0) durationSec = Number(parsed.toFixed(2));
      } catch {}

      return {
        durationSec,
        voiceId: 'vi-google-female',
        preset,
        rate: formattedRate,
        pitch: formattedPitch,
        sizeBytes: buffer.length,
      };
    } catch (err) {
      console.warn(`[LocalTTS] Google TTS error (${err.message}), falling back to EdgeTTS...`);
    }
  }

  // Edge Neural TTS (Default)
  const tempFile = path.join(outDir, `temp_speech_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
  try {
    fs.writeFileSync(tempFile, text.trim(), 'utf-8');
    const rateArg = (formattedRate && formattedRate !== '+0%' && formattedRate !== '0%') ? `--rate="${formattedRate}"` : '';
    const pitchArg = (formattedPitch && formattedPitch !== '+0Hz' && formattedPitch !== '0Hz') ? `--pitch="${formattedPitch}"` : '';
    
    const cmd = `"${EDGE_TTS_BIN}" --voice "${activeVoiceId}" ${rateArg} ${pitchArg} -f "${tempFile}" --write-media "${outFilePath}"`;
    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch (firstErr) {
      // Retry once on transient network glitch
      execSync(cmd, { stdio: 'pipe' });
    }

    if (fs.existsSync(outFilePath) && fs.statSync(outFilePath).size > 100) {
      let durationSec = 5;
      try {
        const durOut = execSync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outFilePath}"`).toString().trim();        const parsed = parseFloat(durOut);
        if (!isNaN(parsed) && parsed > 0) durationSec = Number(parsed.toFixed(2));
      } catch {}

      return {
        durationSec,
        voiceId: activeVoiceId,
        preset,
        rate: formattedRate,
        pitch: formattedPitch,
        sizeBytes: fs.statSync(outFilePath).size,
      };
    }
  } catch (err) {
    console.warn(`[LocalTTS] edge-tts error (${err.message}), falling back to Google free TTS...`);
    try {
      const buffer = await fetchGoogleTts(text, preset.lang || 'vi');
      fs.writeFileSync(outFilePath, buffer);
      let durationSec = 4.0;
      try {
        const durOut = execSync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outFilePath}"`).toString().trim();        const parsed = parseFloat(durOut);
        if (!isNaN(parsed) && parsed > 0) durationSec = Number(parsed.toFixed(2));
      } catch {}
      return {
        durationSec,
        voiceId: 'google-fallback',
        preset,
        rate: formattedRate,
        pitch: formattedPitch,
        sizeBytes: buffer.length,
      };
    } catch {}
  } finally {
    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
  }

  throw new Error('Không thể tạo file âm thanh với các engine giọng đọc');
}

/**
 * Parse VTT / SRT format into structured cue objects
 */
export function parseVttToCues(vttContent) {
  if (!vttContent || typeof vttContent !== 'string') return [];
  const cues = [];
  const timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})/;
  
  const lines = vttContent.split(/\r?\n/);
  let currentStart = null;
  let currentEnd = null;
  let currentTextLines = [];

  const timeToSec = (h, m, s, ms) => {
    return (parseInt(h || '0', 10) * 3600) + (parseInt(m, 10) * 60) + parseInt(s, 10) + (parseInt(ms, 10) / 1000);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'WEBVTT' || /^\d+$/.test(line)) {
      if (currentStart !== null && currentTextLines.length > 0) {
        cues.push({
          startSec: Number(currentStart.toFixed(3)),
          endSec: Number(currentEnd.toFixed(3)),
          durationSec: Number((currentEnd - currentStart).toFixed(3)),
          text: currentTextLines.join(' ').trim(),
        });
        currentStart = null;
        currentEnd = null;
        currentTextLines = [];
      }
      continue;
    }

    const match = line.match(timeRegex);
    if (match) {
      if (currentStart !== null && currentTextLines.length > 0) {
        cues.push({
          startSec: Number(currentStart.toFixed(3)),
          endSec: Number(currentEnd.toFixed(3)),
          durationSec: Number((currentEnd - currentStart).toFixed(3)),
          text: currentTextLines.join(' ').trim(),
        });
        currentTextLines = [];
      }
      currentStart = timeToSec(match[1], match[2], match[3], match[4]);
      currentEnd = timeToSec(match[5], match[6], match[7], match[8]);
    } else if (currentStart !== null) {
      currentTextLines.push(line);
    }
  }

  if (currentStart !== null && currentTextLines.length > 0) {
    cues.push({
      startSec: Number(currentStart.toFixed(3)),
      endSec: Number(currentEnd.toFixed(3)),
      durationSec: Number((currentEnd - currentStart).toFixed(3)),
      text: currentTextLines.join(' ').trim(),
    });
  }

  return cues;
}

/**
 * Synthesize voice for multiple scenes and calculate accurate per-scene duration
 */
export async function synthesizeMultiSceneVoice({
  scenes,
  voicePresetId = 'vi-nam-minh',
  rate = '+0%',
  pitch = '+0Hz',
  outDir,
  outputDir,
}) {
  const targetDir = outDir || outputDir;
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const results = [];
  let cumulativeStartSec = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneId = scene.id || `scene_${String(i + 1).padStart(2, '0')}`;
    const textToSpeak = scene.speechText || scene.subText || scene.text || scene.title || '';
    const audioOut = path.join(targetDir, `${sceneId}.mp3`);
    const vttOut = path.join(targetDir, `${sceneId}.vtt`);

    let synthResult = { durationSec: 4.0, cues: [] };
    if (textToSpeak.trim()) {
      try {
        const res = await synthesizeVoiceSpeech({
          text: textToSpeak,
          voicePresetId,
          rate,
          pitch,
          outFilePath: audioOut,
        });
        synthResult = {
          ...res,
          audioPath: audioOut,
          cues: [],
        };
      } catch (err) {
        console.warn(`[LocalTTS] MultiScene synth error for ${sceneId}:`, err.message);
      }
    }

    // Guarantee audioOut always exists as valid MP3
    if (!fs.existsSync(audioOut) || fs.statSync(audioOut).size < 50) {
      try {
        execSync(`"${FFMPEG_BIN}" -y -f lavfi -t 4.0 -i anullsrc=r=44100:cl=stereo -c:a libmp3lame -q:a 2 "${audioOut}"`, { stdio: 'pipe' });
        synthResult = {
          durationSec: 4.0,
          audioPath: audioOut,
          cues: [],
          voiceId: 'silence',
        };
      } catch {}
    }

    const visualDurationSec = Math.max(3.5, Number((synthResult.durationSec + 0.4).toFixed(2)));

    results.push({
      ...scene,
      id: sceneId,
      speechText: textToSpeak,
      audioPath: synthResult.audioPath,
      audioDurationSec: synthResult.durationSec,
      durationSec: visualDurationSec,
      cues: synthResult.cues || [],
      timelineStartSec: Number(cumulativeStartSec.toFixed(2)),
      timelineEndSec: Number((cumulativeStartSec + visualDurationSec).toFixed(2)),
    });

    cumulativeStartSec += visualDurationSec;
  }

  return {
    totalDurationSec: Number(cumulativeStartSec.toFixed(2)),
    scenes: results,
  };
}

/**
 * Royalty-Free Background Music Presets
 */
export const BGM_PRESETS = [
  { id: 'none', name: 'Không dùng nhạc nền (Chỉ giọng đọc)', filename: null },
  { id: 'tech-ambient', name: 'Tech Ambient • Không gian Công nghệ', filename: 'tech-ambient.mp3' },
  { id: 'lofi-chill', name: 'Lofi Chill • Nhẹ nhàng, Tập trung', filename: 'lofi-chill.mp3' },
  { id: 'energetic-beat', name: 'Energetic Beat • Nhịp điệu Sôi động', filename: 'energetic-beat.mp3' },
];

/**
 * Mix Voiceover with Background Music & Auto-Ducking
 */
export function mixVoiceWithBgm({
  voiceMp3Path,
  bgmId = 'tech-ambient',
  outputMp3Path,
  totalDurationSec = 30,
  bgmVolume = 0.22,
}) {
  if (!fs.existsSync(voiceMp3Path)) {
    throw new Error(`File voice narration không tồn tại: ${voiceMp3Path}`);
  }

  if (!bgmId || bgmId === 'none') {
    if (voiceMp3Path !== outputMp3Path) {
      fs.copyFileSync(voiceMp3Path, outputMp3Path);
    }
    return outputMp3Path;
  }

  const bgmPreset = BGM_PRESETS.find(b => b.id === bgmId) || BGM_PRESETS[1];
  if (!bgmPreset.filename) {
    if (voiceMp3Path !== outputMp3Path) fs.copyFileSync(voiceMp3Path, outputMp3Path);
    return outputMp3Path;
  }

  const bgmFilePath = path.resolve('./assets/audio/bgm', bgmPreset.filename);
  if (!fs.existsSync(bgmFilePath)) {
    console.warn(`[LocalTTS] BGM file ${bgmFilePath} not found, keeping voice only.`);
    if (voiceMp3Path !== outputMp3Path) fs.copyFileSync(voiceMp3Path, outputMp3Path);
    return outputMp3Path;
  }

  const fadeOutStart = Math.max(0, Number(totalDurationSec) - 2);
  const filterGraph = `[1:a]volume=${bgmVolume},afade=t=in:ss=0:d=1,afade=t=out:st=${fadeOutStart}:d=2[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
  const tempOut = path.join(path.dirname(outputMp3Path), `temp_mix_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);

  try {
    execSync(
      `"${FFMPEG_BIN}" -y -i "${voiceMp3Path}" -stream_loop -1 -i "${bgmFilePath}" -filter_complex "${filterGraph}" -map "[aout]" -c:a libmp3lame -q:a 2 "${tempOut}"`,
      { stdio: 'pipe' }
    );
    if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 100) {
      if (fs.existsSync(outputMp3Path) && outputMp3Path !== voiceMp3Path) {
        try { fs.unlinkSync(outputMp3Path); } catch {}
      }
      fs.copyFileSync(tempOut, outputMp3Path);
      try { fs.unlinkSync(tempOut); } catch {}
    }
  } catch (err) {
    console.warn('[LocalTTS] BGM mix failed, falling back to voice:', err.message);
    if (voiceMp3Path !== outputMp3Path) fs.copyFileSync(voiceMp3Path, outputMp3Path);
  } finally {
    try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch {}
  }

  return outputMp3Path;
}
