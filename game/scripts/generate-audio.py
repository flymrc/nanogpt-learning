#!/usr/bin/env python3
"""Generate original BGM, tap SFX, and Chinese VO clips for the Phaser game.

BGM / SFX are synthesized here (original, CC0).
VO uses edge-tts (zh-CN-XiaoxiaoNeural) when available, otherwise espeak-ng.

Usage (from repo root or game/):

    python3 game/scripts/generate-audio.py
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"
TMP = OUT / "_tmp"

VOICE = "zh-CN-XiaoxiaoNeural"
VO_LINES = {
    "vo-title": "从一条长纸带讲起。",
    "vo-level1": "每个字符领一张号码牌。",
    "vo-map": "号码只是座位号。",
    "vo-reuse": "本局只有六十五张字符牌。",
    "vo-level2": "每次随手剪一段来看。",
    "vo-shift": "答案往右挪一格。",
    "vo-next": "每个位置都在问下一字。",
    "vo-loss": "押得越少，错题分越大。",
    "vo-clear": "通关啦！",
}


def write_wav(path: Path, samples: np.ndarray) -> None:
    peaked = np.clip(samples, -1.0, 1.0)
    pcm = (peaked * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


def encode(wav_path: Path, stem: str) -> None:
    mp3 = OUT / f"{stem}.mp3"
    ogg = OUT / f"{stem}.ogg"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav_path),
            "-ac",
            "1",
            "-ar",
            "44100",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "80k",
            str(mp3),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav_path),
            "-ac",
            "1",
            "-ar",
            "44100",
            "-c:a",
            "libvorbis",
            "-q:a",
            "3",
            str(ogg),
        ],
        check=True,
    )


def env(n: int, attack: float, release: float) -> np.ndarray:
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    out = np.ones(n, dtype=np.float64)
    out[:a] = np.linspace(0, 1, a)
    if r < n:
        out[-r:] = np.linspace(1, 0, r)
    return out


def sine(freq: float, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t)


def tone(freq: float, dur: float, vol: float, kind: str = "bell") -> np.ndarray:
    n = int(dur * SR)
    if kind == "bell":
        wave_ = (
            0.72 * sine(freq, n)
            + 0.18 * sine(freq * 2.0, n)
            + 0.08 * sine(freq * 3.01, n)
        )
        return wave_ * env(n, 0.008, dur * 0.85) * vol
    if kind == "bass":
        wave_ = 0.7 * sine(freq, n) + 0.3 * sine(freq * 2.0, n)
        return wave_ * env(n, 0.02, dur * 0.4) * vol
    if kind == "pad":
        wave_ = (
            0.45 * sine(freq, n)
            + 0.28 * sine(freq * 1.003, n)
            + 0.18 * sine(freq * 0.5, n)
        )
        return wave_ * env(n, 0.12, dur * 0.35) * vol
    wave_ = sine(freq, n)
    return wave_ * env(n, 0.01, dur * 0.5) * vol


def mix_at(buf: np.ndarray, clip: np.ndarray, start: float) -> None:
    i0 = int(start * SR)
    i1 = min(len(buf), i0 + len(clip))
    if i0 >= len(buf) or i1 <= i0:
        return
    buf[i0:i1] += clip[: i1 - i0]


def make_bgm() -> np.ndarray:
    """Original 4-bar lullaby-like loop in C major. ~10.9s at 88 BPM."""
    bpm = 88.0
    beat = 60.0 / bpm
    bars = 4
    beats = bars * 4
    duration = beats * beat + 0.25
    buf = np.zeros(int(duration * SR), dtype=np.float64)

    # MIDI-ish frequencies
    C3, D3, E3, F3, G3, A3 = 130.81, 146.83, 164.81, 174.61, 196.00, 220.00
    C4, D4, E4, G4, A4 = 261.63, 293.66, 329.63, 392.00, 440.00
    C5, D5, E5, G5, A5 = 523.25, 587.33, 659.25, 783.99, 880.00

    # Pad chords: C, Am, F, C (whole notes)
    pads = [
        (0, [C3, E3, G3, C4]),
        (4, [A3, C4, E4]),
        (8, [F3, A3, C4]),
        (12, [C3, E3, G3, C4]),
    ]
    for start_beat, freqs in pads:
        for f in freqs:
            mix_at(buf, tone(f, beat * 4.1, 0.07, "pad"), start_beat * beat)

    # Soft bass
    bass = [(0, C3), (4, A3 / 2), (8, F3 / 2), (12, C3)]
    for start_beat, f in bass:
        mix_at(buf, tone(f, beat * 3.6, 0.16, "bass"), start_beat * beat)

    # Melody (eighth notes). Original phrase, not from a commercial song.
    melody = [
        (0.0, E5),
        (1.0, D5),
        (2.0, C5),
        (3.0, D5),
        (4.0, E5),
        (5.0, G5),
        (6.0, E5),
        (8.0, A5),
        (9.0, G5),
        (10.0, E5),
        (11.0, D5),
        (12.0, C5),
        (13.0, E5),
        (14.0, D5),
        (15.0, C5),
    ]
    for start_beat, f in melody:
        mix_at(buf, tone(f, beat * 1.15, 0.18, "bell"), start_beat * beat)

    # Light answering fifths
    echo = [(2.5, G4), (6.5, E4), (10.5, D4), (14.5, C4)]
    for start_beat, f in echo:
        mix_at(buf, tone(f, beat * 0.9, 0.07, "bell"), start_beat * beat)

    peak = np.max(np.abs(buf)) or 1.0
    buf = buf / peak * 0.72

    # Seamless loop: crossfade the tail into the head
    fade = int(0.18 * SR)
    head = buf[:fade].copy()
    tail = buf[-fade:].copy()
    ramp = np.linspace(0, 1, fade)
    buf[:fade] = tail * (1 - ramp) + head * ramp
    buf = buf[:-fade]
    return buf


def make_sfx_tap() -> np.ndarray:
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    click = np.sin(2 * np.pi * 740 * t) * np.exp(-t * 46)
    body = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 28)
    return 0.55 * click + 0.35 * body


def make_sfx_pop() -> np.ndarray:
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    sweep = np.sin(2 * np.pi * (520 + 380 * t) * t) * np.exp(-t * 18)
    spark = np.sin(2 * np.pi * 980 * t) * np.exp(-t * 30) * 0.35
    return 0.5 * sweep + spark


async def synth_vo_edge(text: str, mp3_path: Path) -> None:
    import edge_tts

    comm = edge_tts.Communicate(text, VOICE, rate="-8%", pitch="+6Hz")
    await comm.save(str(mp3_path))


def synth_vo_espeak(text: str, wav_path: Path) -> None:
    exe = shutil.which("espeak-ng") or shutil.which("espeak")
    if not exe:
        raise RuntimeError("neither edge-tts nor espeak-ng is available")
    subprocess.run(
        [exe, "-v", "zh", "-s", "155", "-p", "45", "-w", str(wav_path), text],
        check=True,
    )


def make_voice(stem: str, text: str) -> None:
    raw_mp3 = TMP / f"{stem}-raw.mp3"
    raw_wav = TMP / f"{stem}-raw.wav"
    try:
        asyncio.run(synth_vo_edge(text, raw_mp3))
        src = raw_mp3
    except Exception as exc:  # noqa: BLE001 — fallback is intentional
        print(f"edge-tts failed for {stem} ({exc}); trying espeak", file=sys.stderr)
        synth_vo_espeak(text, raw_wav)
        src = raw_wav
    # Normalize loudness and trim leading silence a bit
    wav_norm = TMP / f"{stem}.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(src),
            "-ac",
            "1",
            "-ar",
            "44100",
            "-af",
            "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.05,"
            "loudnorm=I=-16:LRA=11:TP=-1.5",
            str(wav_norm),
        ],
        check=True,
    )
    encode(wav_norm, stem)


def main() -> None:
    vo_only = "--vo" in sys.argv or "--vo-only" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    if TMP.exists():
        shutil.rmtree(TMP)
    TMP.mkdir()

    if not vo_only:
        print("synthesizing BGM / SFX")
        write_wav(TMP / "bgm.wav", make_bgm())
        write_wav(TMP / "sfx-tap.wav", make_sfx_tap())
        write_wav(TMP / "sfx-pop.wav", make_sfx_pop())
        encode(TMP / "bgm.wav", "bgm")
        encode(TMP / "sfx-tap.wav", "sfx-tap")
        encode(TMP / "sfx-pop.wav", "sfx-pop")

    print("synthesizing Chinese VO")
    for stem, text in VO_LINES.items():
        print(f"  {stem}: {text}")
        make_voice(stem, text)

    shutil.rmtree(TMP)
    print(f"wrote audio to {OUT}")
    for p in sorted(OUT.iterdir()):
        print(f"  {p.name:18s} {p.stat().st_size:7d} B")


if __name__ == "__main__":
    main()
