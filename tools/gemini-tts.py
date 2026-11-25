"""Озвучка через Gemini TTS (Google AI Studio) — бесплатный лимит, ключ без карты.

Зачем: голоса Gemini звучат живее, чем edge-tts, и умеют «играть» интонацию
по тексту промпта. Ключ берётся из `tools/.gemini-key` (в git не попадает)
или из переменной окружения `GEMINI_API_KEY`.

  python tools/gemini-tts.py --check                 # проверить ключ и список голосов
  python tools/gemini-tts.py --only hello            # одна реплика, мужской голос
  python tools/gemini-tts.py --suffix=-f --voice Kore
  python tools/gemini-tts.py --engine all            # всё, что есть в tools/tts.py LINES

Формат ответа — сырой PCM (24 кГц, 16 бит, моно), поэтому кодируем в MP3
через lameenc: на сайте лежат те же mp3, что и раньше.
"""
import argparse
import base64
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

try:
    import lameenc
except ImportError:
    lameenc = None

from tts import LINES  # единый источник текстов

MODEL = "gemini-2.5-flash-preview-tts"
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / "src" / "audio"
KEY_FILE = ROOT / ".gemini-key"

# Голоса Gemini: Charon/Puck/Fenrir — мужские, Kore/Aoede/Leda — женские.
VOICE_M = "Charon"
VOICE_F = "Kore"

# Как читать: без этого Gemini читает ровно и без интонации оператора.
STYLE = (
    "Прочитай по-русски, как сотрудник колл-центра: спокойно, вежливо, "
    "с лёгким нажимом, без пафоса. Только реплика, без пояснений: "
)


def read_key():
    env = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if env:
        return env.strip()
    if KEY_FILE.exists():
        return KEY_FILE.read_text(encoding="utf-8").strip()
    return ""


def request_tts(key, text, voice):
    body = {
        "contents": [{"parts": [{"text": STYLE + text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    req = urllib.request.Request(
        API.format(model=MODEL) + f"?key={key}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        data = json.loads(res.read().decode("utf-8"))
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return base64.b64decode(inline["data"]), inline.get("mimeType", "")
    raise RuntimeError(f"в ответе нет аудио: {json.dumps(data)[:300]}")


def pcm_to_mp3(pcm, rate=24000, bitrate=64):
    if lameenc is None:
        raise RuntimeError("нет lameenc: pip install lameenc")
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    return bytes(enc.encode(pcm) + enc.flush())


def tts(key, name, text, voice, suffix, pause=4.0):
    pcm = mime = None
    for attempt in range(4):
        try:
            pcm, mime = request_tts(key, text, voice)
            break
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", "replace")
            if err.code in (429, 500, 503) and attempt < 3:
                wait = 8 * (attempt + 1)
                print(f"{name}: {err.code}, ждём {wait} с")
                time.sleep(wait)
                continue
            raise RuntimeError(f"HTTP {err.code}: {body[:200]}")
    if pcm is None:
        raise RuntimeError("нет аудио")
    rate = 24000
    if "rate=" in mime:
        try:
            rate = int(mime.split("rate=")[1].split(";")[0])
        except ValueError:
            pass
    mp3 = pcm_to_mp3(pcm, rate=rate)
    path = OUT / f"{name}{suffix}.mp3"
    path.write_bytes(mp3)
    seconds = len(pcm) / 2 / rate
    print(f"{name}{suffix}: ок ({len(mp3)} байт, {seconds:.1f} с, {voice})")
    time.sleep(pause)


def check(key):
    if not key:
        print("нет ключа: положи его в tools/.gemini-key или задай GEMINI_API_KEY")
        return 1
    try:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}?key={key}"
        )
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.loads(res.read().decode("utf-8"))
        print("модель:", data.get("name"), "| методы:", ", ".join(data.get("supportedGenerationMethods", [])))
        return 0
    except urllib.error.HTTPError as err:
        print("HTTP", err.code, err.read().decode("utf-8")[:300])
        return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="id реплики из tools/tts.py LINES")
    ap.add_argument("--voice", default=VOICE_M)
    ap.add_argument("--suffix", default="")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args()

    key = read_key()
    if args.check:
        sys.exit(check(key))
    if args.list:
        print(" ".join(sorted(LINES)))
        return
    if not key:
        print("нет ключа: положи его в tools/.gemini-key или задай GEMINI_API_KEY")
        sys.exit(1)

    items = [(args.only, LINES[args.only])] if args.only else list(LINES.items())
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in items:
        try:
            tts(key, name, text, args.voice, args.suffix)
        except Exception as err:  # noqa: BLE001
            print(f"{name}: ошибка — {err}")


if __name__ == "__main__":
    main()
