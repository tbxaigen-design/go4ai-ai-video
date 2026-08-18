#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
vieneu_worker.py — CLI Bridge between Node.js and VieNeu-TTS SDK.

Commands:
  --check               Check if vieneu is installed and operational.
  --list-voices         Output JSON array of available preset voices from SDK.
  --synthesize          Synthesize a single text string (used for preview / single scene).
  --batch-synthesize    Synthesize multiple scenes in a single run (model initialized ONCE).

Input/Output is JSON-based via stdin/file and stdout.
"""

import sys
import os
import json
import argparse
import subprocess
import time
import unicodedata

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_model_instance = None

def get_model():
    global _model_instance
    if _model_instance is None:
        from vieneu import Vieneu
        _model_instance = Vieneu()
    return _model_instance

def convert_wav_to_mp3(wav_path, mp3_path, ffmpeg_bin=None, rate_percent=0, pitch_semitones=0):
    """
    Convert WAV to MP3 using ffmpeg, optionally applying tempo (rate) adjustment.
    """
    if not ffmpeg_bin:
        ffmpeg_bin = os.environ.get("FFMPEG_PATH") or "ffmpeg"

    filters = []
    
    # Rate adjustment: e.g. +15% -> atempo=1.15; -10% -> atempo=0.90
    if rate_percent and rate_percent != 0:
        multiplier = max(0.5, min(2.0, 1.0 + (rate_percent / 100.0)))
        filters.append(f"atempo={multiplier:.3f}")
        
    cmd = [ffmpeg_bin, "-y", "-i", wav_path]
    if filters:
        cmd.extend(["-filter:a", ",".join(filters)])
    cmd.extend(["-c:a", "libmp3lame", "-q:a", "2", mp3_path])

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg conversion failed: {res.stderr.decode('utf-8', errors='replace')}")

def get_audio_duration(file_path, ffprobe_bin=None):
    if not ffprobe_bin:
        ffprobe_bin = os.environ.get("FFPROBE_PATH") or "ffprobe"
    cmd = [
        ffprobe_bin,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0:
        try:
            return float(res.stdout.strip())
        except ValueError:
            pass
    return 4.0

def parse_voice_metadata(raw_desc, voice_name):
    """
    Parse description tuple from vieneu:
    e.g. ('Minh Đức — Nam · Bắc · Phong cách tin tức', 'Minh Đức')
    """
    gender = "Nữ"
    gender_label = "👩 Nữ"
    region = "Toàn quốc"
    style = raw_desc

    if "—" in raw_desc:
        parts = raw_desc.split("—", 1)
        sub_tokens = [t.strip() for t in parts[1].split("·")]
        if len(sub_tokens) >= 1:
            g_token = sub_tokens[0].lower()
            if "nam" in g_token:
                gender = "Nam"
                gender_label = "👨 Nam"
            elif "nữ" in g_token or "nu" in g_token:
                gender = "Nữ"
                gender_label = "👩 Nữ"
        if len(sub_tokens) >= 2:
            r_token = sub_tokens[1].lower()
            if "bắc" in r_token or "bac" in r_token:
                region = "Miền Bắc"
            elif "nam" in r_token:
                region = "Miền Nam"
            elif "trung" in r_token:
                region = "Miền Trung"
        if len(sub_tokens) >= 3:
            style = sub_tokens[2]
        else:
            style = parts[1].strip()
    else:
        desc_lower = raw_desc.lower()
        if "nam" in desc_lower:
            gender = "Nam"
            gender_label = "👨 Nam"

    slug_id = f"vieneu-{voice_name.lower().replace(' ', '-').replace('đ', 'd').replace('Đ', 'D')}"
    slug_ascii = unicodedata.normalize('NFKD', slug_id).encode('ascii', 'ignore').decode('ascii')
    slug_ascii = "".join(c if c.isalnum() or c == '-' else '' for c in slug_ascii)

    region_short = region.replace("Miền ", "")
    display_title = f"{voice_name} ({gender} · {region_short} · {style})"

    return {
        "id": slug_ascii,
        "voiceId": voice_name,
        "name": f"{voice_name} ({gender} · {region_short})",
        "displayName": display_title,
        "gender": gender,
        "genderLabel": gender_label,
        "lang": "vi",
        "langLabel": "🇻🇳 Tiếng Việt (VieNeu AI Local)",
        "region": region,
        "provider": "vieneu",
        "defaultRate": "+0%",
        "defaultPitch": "+0Hz",
        "style": style,
    }

def cmd_check():
    try:
        from vieneu import Vieneu
        print(json.dumps({"status": "ok", "provider": "vieneu", "message": "VieNeu-TTS is ready"}))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)

def cmd_list_voices():
    try:
        tts = get_model()
        preset_list = tts.list_preset_voices()
        voices = []
        for item in preset_list:
            if isinstance(item, (tuple, list)) and len(item) >= 2:
                desc, vname = item[0], item[1]
            else:
                desc, vname = str(item), str(item)
            meta = parse_voice_metadata(desc, vname)
            voices.append(meta)
        print(json.dumps({"status": "ok", "voices": voices}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
        sys.exit(1)

def cmd_synthesize(args):
    """
    Synthesize single text string.
    Payload read from --payload-file or --payload.
    """
    try:
        payload = {}
        if args.payload_file:
            with open(args.payload_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
        elif args.payload:
            payload = json.loads(args.payload)

        text = payload.get("text", "").strip()
        voice_name = payload.get("voiceId") or payload.get("voice") or "Trúc Ly"
        out_path = payload.get("outFilePath")
        rate = int(payload.get("rate", 0))
        pitch = int(payload.get("pitch", 0))
        ffmpeg_bin = payload.get("ffmpegBin")
        ffprobe_bin = payload.get("ffprobeBin")

        if not text:
            raise ValueError("Văn bản thoại không được để trống")
        if not out_path:
            raise ValueError("Đường dẫn xuất file không được để trống")

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

        tts = get_model()
        t0 = time.time()
        audio = tts.infer(text=text, voice=voice_name)
        infer_time = time.time() - t0

        temp_wav = out_path + ".tmp.wav"
        tts.save(audio, temp_wav)

        if out_path.lower().endswith(".mp3"):
            convert_wav_to_mp3(temp_wav, out_path, ffmpeg_bin=ffmpeg_bin, rate_percent=rate, pitch_semitones=pitch)
            if os.path.exists(temp_wav):
                try: os.unlink(temp_wav)
                except Exception: pass
        else:
            if os.path.exists(out_path):
                os.unlink(out_path)
            os.rename(temp_wav, out_path)

        duration_sec = get_audio_duration(out_path, ffprobe_bin=ffprobe_bin)
        size_bytes = os.path.getsize(out_path) if os.path.exists(out_path) else 0

        print(json.dumps({
            "status": "ok",
            "durationSec": round(duration_sec, 2),
            "sizeBytes": size_bytes,
            "voiceId": voice_name,
            "inferTimeSec": round(infer_time, 2),
            "outFilePath": out_path
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
        sys.exit(1)

def cmd_batch_synthesize(args):
    """
    Synthesize multiple scenes with a SINGLE model initialization.
    """
    try:
        payload = {}
        if args.payload_file:
            with open(args.payload_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
        elif args.payload:
            payload = json.loads(args.payload)

        scenes = payload.get("scenes", [])
        default_voice = payload.get("voiceId") or "Trúc Ly"
        rate = int(payload.get("rate", 0))
        pitch = int(payload.get("pitch", 0))
        ffmpeg_bin = payload.get("ffmpegBin")
        ffprobe_bin = payload.get("ffprobeBin")

        if not scenes:
            raise ValueError("Danh sách cảnh (scenes) trống")

        t_init_start = time.time()
        tts = get_model()
        model_init_sec = time.time() - t_init_start

        results = []
        total_infer_start = time.time()

        for idx, sc in enumerate(scenes):
            scene_id = sc.get("id", f"scene_{idx+1:02d}")
            text = sc.get("text", "").strip()
            voice_name = sc.get("voiceId") or default_voice
            out_path = sc.get("outFilePath")

            if not out_path:
                raise ValueError(f"Thiếu outFilePath cho {scene_id}")

            os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

            if not text:
                if not os.path.exists(out_path):
                    if not ffmpeg_bin:
                        ffmpeg_bin = os.environ.get("FFMPEG_PATH") or "ffmpeg"
                    subprocess.run([
                        ffmpeg_bin, "-y", "-f", "lavfi", "-t", "4.0",
                        "-i", "anullsrc=r=44100:cl=stereo",
                        "-c:a", "libmp3lame", "-q:a", "2", out_path
                    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

                results.append({
                    "id": scene_id,
                    "durationSec": 4.0,
                    "sizeBytes": os.path.getsize(out_path) if os.path.exists(out_path) else 0,
                    "voiceId": "silence",
                    "audioPath": out_path,
                })
                continue

            t_sc_start = time.time()
            audio = tts.infer(text=text, voice=voice_name)
            sc_infer_sec = time.time() - t_sc_start

            temp_wav = out_path + ".tmp.wav"
            tts.save(audio, temp_wav)

            if out_path.lower().endswith(".mp3"):
                convert_wav_to_mp3(temp_wav, out_path, ffmpeg_bin=ffmpeg_bin, rate_percent=rate, pitch_semitones=pitch)
                if os.path.exists(temp_wav):
                    try: os.unlink(temp_wav)
                    except Exception: pass
            else:
                if os.path.exists(out_path):
                    os.unlink(out_path)
                os.rename(temp_wav, out_path)

            duration_sec = get_audio_duration(out_path, ffprobe_bin=ffprobe_bin)
            size_bytes = os.path.getsize(out_path) if os.path.exists(out_path) else 0

            results.append({
                "id": scene_id,
                "durationSec": round(duration_sec, 2),
                "sizeBytes": size_bytes,
                "voiceId": voice_name,
                "audioPath": out_path,
                "inferTimeSec": round(sc_infer_sec, 2),
            })

        total_infer_sec = time.time() - total_infer_start

        print(json.dumps({
            "status": "ok",
            "modelInitCount": 1,
            "modelInitSec": round(model_init_sec, 2),
            "totalInferSec": round(total_infer_sec, 2),
            "scenes": results
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="VieNeu-TTS Worker CLI")
    parser.add_argument("--check", action="store_true", help="Check vieneu availability")
    parser.add_argument("--list-voices", action="store_true", help="List preset voices")
    parser.add_argument("--synthesize", action="store_true", help="Synthesize single text")
    parser.add_argument("--batch-synthesize", action="store_true", help="Batch synthesize multiple scenes")
    parser.add_argument("--payload", type=str, help="JSON payload string")
    parser.add_argument("--payload-file", type=str, help="Path to JSON payload file")

    args = parser.parse_args()

    if args.check:
        cmd_check()
    elif args.list_voices:
        cmd_list_voices()
    elif args.synthesize:
        cmd_synthesize(args)
    elif args.batch_synthesize:
        cmd_batch_synthesize(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
