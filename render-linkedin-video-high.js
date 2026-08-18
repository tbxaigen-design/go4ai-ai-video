// High‑quality render script for LinkedIn OS video (max visual quality)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FFMPEG_BIN, FFPROBE_BIN } from './resolve-binaries.js';
import { synthesizeVoiceSpeech } from './local-tts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_DIR = path.join(__dirname, 'projects', 'linkedin OS');
const AUDIO_DIR = path.join(PROJECT_DIR, 'audio');
const HTML_FILE = path.join(PROJECT_DIR, '_source', 'go4ai-linkedin-60s-video-mock.html');
const OUTPUT_MP4 = path.join(PROJECT_DIR, 'go4ai-linkedin-60s-video.mp4');
const ROOT_MP4 = path.join(__dirname, 'go4ai-linkedin-os-demo.mp4');

const SEGMENTS = [
  {id:'seg01',scene:'home',title:'Tổng quan',timeLabel:'0–5s',text:'Đây không phải công cụ đăng bài LinkedIn. Đây là một hệ thống giúp biến một ý tưởng thành nội dung có chiến lược và đo được kết quả.'},
  {id:'seg02',scene:'campaign',title:'Chiến dịch',timeLabel:'5–11s',text:'Mọi thứ bắt đầu từ một luận điểm. AI Strategist phân tích nó thành mục tiêu, góc phản biện, câu hỏi nghiên cứu và hành trình nội dung.'},
  {id:'seg03',scene:'research',title:'Nghiên cứu & R&D',timeLabel:'11–18s',text:'AI tiếp tục tìm nguồn, phân loại luận điểm và mô phỏng nhiều vai trò để phản biện trước khi chúng ta đưa một quan điểm ra thị trường.'},
  {id:'seg04',scene:'map',title:'Bản đồ nội dung',timeLabel:'18–24s',text:'Những phát hiện đã được kiểm chứng được chuyển thành các chuỗi bài có logic, và mỗi bài đều trace được về nguồn gốc của nó.'},
  {id:'seg05',scene:'strategy',title:'Chiến lược',timeLabel:'24–31s',text:'Mỗi thương hiệu có thông điệp cốt lõi, đối tượng, bằng chứng, trụ nội dung và nhịp xuất bản riêng.'},
  {id:'seg06',scene:'studio',title:'Xưởng nội dung',timeLabel:'31–38s',text:'Từ toàn bộ bối cảnh đó, hệ thống tạo prompt hoàn chỉnh để AI viết đúng chiến lược, thay vì tạo những bài rời rạc.'},
  {id:'seg07',scene:'posts',title:'Bài viết',timeLabel:'38–52s',text:'Bài viết sau đó đi qua workflow rõ ràng: bản nháp, duyệt, đặt lịch và xuất bản, với các giới hạn vận hành được kiểm soát.'},
  {id:'seg08',scene:'results',title:'Kết quả & ROI',timeLabel:'52–58s',text:'Và cuối cùng, GO4AI theo dõi từ lượt hiển thị, lượt xem hồ sơ, tin nhắn cho tới cuộc gọi và cơ hội kinh doanh.'},
  {id:'seg09',scene:'home',title:'Closing',timeLabel:'58–60s',text:'GO4AI LinkedIn App. Từ ý tưởng, đến nội dung, đến kết quả — trong một hệ thống.'}
];

async function main(){
  console.log('===============================================================');
  console.log('🎙️ GO4AI LINKEDIN OS — 60s VIDEO GENERATOR (VIETNAMESE MALE VOICE)');
  console.log('===============================================================\n');

  if(!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR,{recursive:true});

  console.log('🗣️ Step 1: Synthesizing Microsoft Edge Neural Male Voice (Nam Minh)...');
  const audioList=[];let totalSpeechSec=0;
  for(let i=0;i<SEGMENTS.length;i++){
    const s=SEGMENTS[i];
    const outAudio=path.join(AUDIO_DIR,`${s.id}.mp3`);
    process.stdout.write(`  [${i+1}/${SEGMENTS.length}] (${s.timeLabel}) ${s.title}... `);
    const synthRes=await synthesizeVoiceSpeech({text:s.text,voicePresetId:'vi-nam-minh',rate:'+18%',pitch:'+0Hz',outFilePath:outAudio});
    s.durationSec=synthRes.durationSec; s.audioPath=outAudio; totalSpeechSec+=synthRes.durationSec; audioList.push(outAudio);
    console.log(`✓ ${synthRes.durationSec}s`);
  }
  console.log(`\n✓ All 9 voice segments ready. Total speech duration: ${totalSpeechSec.toFixed(2)}s\n`);

  // Assemble master voice
  const concatTxt=path.join(AUDIO_DIR,'concat_list.txt');
  const concatLines=audioList.map(p=>`file '${p.replace(/\\/g,'/')}'`).join('\n');
  fs.writeFileSync(concatTxt,concatLines,'utf-8');
  const voiceMaster=path.join(PROJECT_DIR,'voice_master.mp3');
  execSync(`"${FFMPEG_BIN}" -y -f concat -safe 0 -i "${concatTxt}" -c copy "${voiceMaster}"`);

  const bgmPath=path.join(__dirname,'assets','audio','bgm','tech-ambient.mp3');
  const masterSoundtrack=path.join(PROJECT_DIR,'soundtrack_master.mp3');
  if(fs.existsSync(bgmPath)){
    const filterComplex='[1:a]volume=0.16,afade=t=in:ss=0:d=1.5,afade=t=out:st=57.5:d=2.5[bgm];[0:a][bgm]amix=inputs=2:duration=longest:dropout_transition=0[aout]';
    execSync(`"${FFMPEG_BIN}" -y -i "${voiceMaster}" -stream_loop -1 -i "${bgmPath}" -filter_complex "${filterComplex}" -map "[aout]" -c:a libmp3lame -q:a 2 -t 60.0 "${masterSoundtrack}"`);
  } else {
    execSync(`"${FFMPEG_BIN}" -y -i "${voiceMaster}" -c:a libmp3lame -q:a 2 -t 60.0 "${masterSoundtrack}"`);
  }
  console.log(`✓ Master soundtrack generated: ${masterSoundtrack}\n`);

  // Playwright recording
  // "ultra" quality standard (đồng bộ với 3 tier trong Studio, xem
  // packages/adapter-hyperframes/src/render.ts resolveQualityParams): viewport
  // CSS giữ nguyên 1920x1080 để layout mock không vỡ, nhưng quay ở
  // deviceScaleFactor 2 (như xem trên màn Retina/HiDPI — nét hơn hẳn DSF1) VÀ
  // xuất video ở đúng 2x kích thước đó = 3840x2160 (4K thật, không phải upscale).
  const OUTPUT_SCALE=2;
  const BASE_WIDTH=1920, BASE_HEIGHT=1080;
  const OUT_WIDTH=BASE_WIDTH*OUTPUT_SCALE, OUT_HEIGHT=BASE_HEIGHT*OUTPUT_SCALE;
  console.log(`🎬 Step 3: Launching Chromium (deviceScaleFactor 2, xuất ${OUT_WIDTH}x${OUT_HEIGHT} 4K) to record 60s mock animation...`);
  const playwrightMod=await import('./packages/adapter-hyperframes/node_modules/playwright/index.mjs');
  const playwright=playwrightMod.default||playwrightMod;
  const tempRecordDir=path.join(PROJECT_DIR,'temp_record');
  if(fs.existsSync(tempRecordDir)) fs.rmSync(tempRecordDir,{recursive:true,force:true});
  fs.mkdirSync(tempRecordDir,{recursive:true});
  const browser=await playwright.chromium.launch({headless:true,args:['--no-sandbox','--disable-blink-features=AutomationControlled','--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:BASE_WIDTH,height:BASE_HEIGHT},deviceScaleFactor:OUTPUT_SCALE,recordVideo:{dir:tempRecordDir,size:{width:OUT_WIDTH,height:OUT_HEIGHT}}});
  const page=await context.newPage();
  const fileUrl=pathToFileURL(HTML_FILE).href;
  console.log(`  → Opening HTML: ${fileUrl}`);
  await page.goto(fileUrl,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(500);
  console.log('  → Recording 60.0s timeline...');
  const totalMs=60000; const startT=Date.now();
  while(Date.now()-startT<totalMs){
    const elapsed=((Date.now()-startT)/1000).toFixed(0);
    process.stdout.write(`\r    [${elapsed}s / 60s] Recording scenes in real-time... `);
    await page.waitForTimeout(1000);
  }
  console.log('\n  ✓ 60s recording complete.');
  await context.close();
  await browser.close();

  // Mux high‑quality video
  const webmFiles=fs.readdirSync(tempRecordDir).filter(f=>f.endsWith('.webm'));
  if(webmFiles.length===0) throw new Error('Playwright did not output a webm video file');
  const rawWebm=path.join(tempRecordDir,webmFiles[0]);
  console.log(`\n🎞️ Step 4: Transcoding to H.264 MP4 ${OUT_WIDTH}x${OUT_HEIGHT} & Multiplexing (ultra quality)...`);
  // Bỏ '-vf scale=1920:1080' của bản cũ (nó ép video xuống lại 1080p, xoá mất
  // toàn bộ lợi ích 4K vừa quay được). Bitrate tăng theo tỉ lệ pixel (x4) so
  // với bản 1080p gốc để không bị CRF nén quá tay ở độ phân giải cao hơn.
  const ffmpegCmd=`"${FFMPEG_BIN}" -y -i "${rawWebm}" -i "${masterSoundtrack}" -t 60.0 -c:v libx264 -preset slow -crf 15 -b:v 20000k -pix_fmt yuv420p -r 60 -c:a aac -b:a 256k -movflags +faststart "${OUTPUT_MP4}"`;
  execSync(ffmpegCmd,{stdio:'inherit'});

  fs.copyFileSync(OUTPUT_MP4,ROOT_MP4);
  try{fs.rmSync(tempRecordDir,{recursive:true,force:true});}catch(e){}

  console.log('\n===============================================================');
  console.log('🎉 VIDEO 60S GO4AI LINKEDIN OS HOÀN THÀNH XUẤT SẮC! (HIGH QUALITY)');
  console.log('===============================================================');
  console.log(`📁 Video dự án: ${OUTPUT_MP4}`);
  console.log(`📁 Video thư mục gốc: ${ROOT_MP4}`);
  console.log('===============================================================\n');
}

main().catch(err=>{console.error('\n❌ Lỗi tạo video:',err);process.exit(1);});
