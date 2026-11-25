"""Озвучка скрипта мошенника. Два движка, оба бесплатные.

  edge  — Microsoft Neural через edge-tts: нужен интернет, ключ не нужен.
          По умолчанию en-US-AndrewMultilingualNeural: это новое поколение
          мультиязычных голосов, русский читает с живой интонацией и без
          «робота» в концах фраз; старые ru-RU-DmitryNeural / ru-RU-SvetlanaNeural
          тоже доступны через --voice.
  piper — Piper (MIT), локально на CPU, офлайн: модели лежат в tools/voices,
          качаются `python -m piper.download_voices ru_RU-dmitri-medium`.

Тексты обязаны совпадать со строками узлов в `src/phone.js`.

Запуск:
    python tools/tts.py                  # edge, как сейчас на сайте
    python tools/tts.py --engine piper    # локальные голоса Piper
    python tools/tts.py --engine piper --voice ru_RU-irina-medium
    python tools/tts.py --only hello      # переозвучить одну реплику
    python tools/tts.py --voice en-US-AvaMultilingualNeural --suffix -f
                                          # женские реплики: те же тексты, другой голос
"""
import argparse
import asyncio
import pathlib
import subprocess
import sys
import wave

try:
    import lameenc
except ImportError:  # без lameenc у Piper будет WAV вместо MP3
    lameenc = None

EDGE_VOICE = "en-US-AndrewMultilingualNeural"
EDGE_RATE = "+4%"           # чуть быстрее обычного — как говорят в колл-центре
PIPER_VOICE = "ru_RU-dmitri-medium"
PIPER_LENGTH = 1.0          # 1.0 — обычный темп, меньше — быстрее

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / "src" / "audio"

LINES = {
    "hello": "Здравствуйте! Это оператор сотовой связи. Вы меня нормально слышите?",
    "who": "Я оператор, звоню по вашему номеру из базы абонентов. Слушайте, у вас подходит к концу срок годности сим-карты.",
    "pitch": "Срок действия вашей сим-карты заканчивается. Продление бесплатное, займёт одну минуту. Пока заявка оформляется — связь и интернет работают нормально, жалоб нет?",
    "sms": "Сейчас придёт СМС с номера четырнадцать четырнадцать — там код подтверждения продления. Назовите его, я внесу в базу, и номер продлится на пять лет.",
    "pressure": "Если не назовёте код — номер заблокируют и внесут в чёрный список, восстановить будет нельзя. Через десять минут будет поздно.",
    "after_code": "Спасибо, номер продлён. И последнее, чтобы закрыть заявку: где вы работаете официально, какая зарплата и в каком банке получаете?",
    # реплики для живого диалога: реакция на речь человека, а не на кнопки
    "again": "Извините, вас плохо слышно. Повторите, пожалуйста.",
    "silence": "Алло? Вы меня слышите?",
    "bridge": "Понимаю. Давайте по существу: у нас вопрос по вашему номеру, это займёт минуту.",
    "doubt": "Что вы, это официальный звонок оператора связи. Всё можно проверить по бесплатному номеру восемь восемьсот.",
    "refuse": "Понимаю ваше нежелание, но если сейчас не продлить, номер уйдёт в блокировку. Давайте не доводить до этого.",
    "wait_code": "Назовите, пожалуйста, код из СМС — четыре цифры.",
    "code_explain": "Код — это формальность. Он подтверждает, что продление оформлено именно на ваш номер: мне нужно внести его в базу, и всё.",
    "hold_on": "Не кладите трубку, осталась одна минута.",
}


# ── edge ────────────────────────────────────────────────────────────

async def edge_line(text: str, target: pathlib.Path, voice: str) -> bool:
    """Сервис периодически отвечает пустым потоком — повторяем."""
    import edge_tts

    for _ in range(6):
        try:
            communicate = edge_tts.Communicate(text, voice, rate=EDGE_RATE)
            data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    data += chunk["data"]
            if data:
                target.write_bytes(data)
                return True
        except Exception:  # noqa: BLE001
            pass
        await asyncio.sleep(2.5)
    return False


# ── piper ───────────────────────────────────────────────────────────

def wav_to_mp3(wav_path: pathlib.Path, mp3_path: pathlib.Path) -> int:
    with wave.open(str(wav_path), "rb") as src:
        channels = src.getnchannels()
        rate = src.getframerate()
        frames = src.readframes(src.getnframes())
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(48)
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(channels)
    encoder.set_quality(7)
    data = encoder.encode(frames) + encoder.flush()
    mp3_path.write_bytes(data)
    return len(data)


def piper_line(text: str, target: pathlib.Path, voice: str) -> bool:
    model = ROOT / "voices" / f"{voice}.onnx"
    if not model.exists():
        print(f"нет модели {model}; скачайте: python -m piper.download_voices {voice}")
        return False
    wav = target.with_suffix(".wav")
    result = subprocess.run(
        [
            sys.executable, "-m", "piper",
            "-m", str(model),
            "-f", str(wav),
            "--length-scale", str(PIPER_LENGTH),
            "--", text,
        ],
        capture_output=True,
    )
    if result.returncode != 0 or not wav.exists():
        return False
    if lameenc is None:
        wav.replace(target.with_suffix(".wav"))
        return False
    size = wav_to_mp3(wav, target)
    wav.unlink(missing_ok=True)
    return size > 5000


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", choices=("edge", "piper"), default="edge")
    parser.add_argument("--voice", default=None)
    parser.add_argument("--only", default=None, help="озвучить одну реплику по id")
    parser.add_argument("--suffix", default="", help="приписка к имени файла, например -f для женского голоса")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    pending = {args.only: LINES[args.only]} if args.only else dict(LINES)

    for key, text in pending.items():
        target = OUT / f"{key}{args.suffix}.mp3"
        if args.engine == "piper":
            ok = piper_line(text, target, args.voice or PIPER_VOICE)
        else:
            ok = asyncio.run(edge_line(text, target, args.voice or EDGE_VOICE))
        print(f"{key}: {'ок' if ok else 'НЕ ПОЛУЧИЛОСЬ'} ({target.stat().st_size if ok else 0} байт)", flush=True)


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
    main()
