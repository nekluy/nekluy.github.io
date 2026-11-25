/**
 * Распознавание речи в браузере.
 *
 * Используется Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`):
 * это есть в Chrome, Edge, Opera и Safari; в Firefox — нет. Звук при этом
 * обрабатывает сам браузер своим сервисом распознавания, поэтому в интерфейсе
 * честно написано, что микрофон работает только в этих браузерах.
 *
 * Обёртка решает три практические вещи:
 *  1. `continuous = false` — браузер сам завершает сессию после паузы; для
 *     разговора это удобно, но тогда сессию надо перезапускать, если ответ
 *     ещё не прозвучал (иначе «микрофон молчит»).
 *  2. Ошибки `no-speech` и `aborted` — это норма, а не сбой: молчание бывает.
 *  3. `not-allowed` / `service-not-allowed` — доступа нет, интерфейс должен
 *     переключиться на ввод текста.
 */

const Rec = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const speechSupported = Boolean(Rec);

export function createSpeech({ lang = "ru-RU", onFinal, onInterim, onError, onEnd } = {}) {
  if (!Rec) {
    return {
      supported: false,
      start() {},
      stop() {},
      abort() {},
      get listening() {
        return false;
      },
    };
  }

  let rec = null;
  let listening = false;
  let wantListen = false;
  let restartTimer = 0;
  let restartCount = 0;

  const build = () => {
    const instance = new Rec();
    instance.lang = lang;
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 1;

    instance.onstart = () => {
      listening = true;
      restartCount = 0;
    };

    instance.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (interim && onInterim) onInterim(interim.trim());
      if (finalText.trim()) {
        restartCount = 0;
        wantListen = false;
        if (onFinal) onFinal(finalText.trim());
      }
    };

    instance.onerror = (event) => {
      const code = event.error || "unknown";
      listening = false;
      /* молчание и наш собственный abort — не ошибки */
      if (code === "no-speech" || code === "aborted") return;
      wantListen = false;
      if (onError) onError(code);
    };

    instance.onend = () => {
      listening = false;
      if (onEnd) onEnd();
      /* если ответа всё ещё ждём — поднимаем сессию заново (браузер гасит её
         после каждой фразы), но не бесконечно: 6 попыток подряд достаточно */
      if (wantListen) {
        if (restartCount >= 6) {
          wantListen = false;
          if (onError) onError("restart-limit");
          return;
        }
        restartCount += 1;
        clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          if (!wantListen) return;
          try {
            instance.start();
          } catch {
            /* уже запущен */
          }
        }, 320);
      }
    };
    return instance;
  };

  return {
    supported: true,
    start() {
      if (!rec) rec = build();
      wantListen = true;
      restartCount = 0;
      if (listening) return;
      try {
        rec.start();
      } catch {
        /* start() дважды подряд бросает — это нормально */
      }
    },
    stop() {
      wantListen = false;
      clearTimeout(restartTimer);
      if (!rec) return;
      try {
        rec.stop();
      } catch {
        /* уже остановлен */
      }
    },
    abort() {
      wantListen = false;
      clearTimeout(restartTimer);
      if (!rec) return;
      try {
        rec.abort();
      } catch {
        /* уже остановлен */
      }
    },
    get listening() {
      return listening;
    },
  };
}

/**
 * Уровень микрофона для индикатора «вас слышно»: отдельный запрос доступа,
 * потому что Web Speech не отдаёт поток. Отказ не мешает распознаванию —
 * просто индикатор становится декоративным.
 */
export async function createMeter() {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  let stream = null;
  let ctx = null;
  let analyser = null;
  let source = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    return {
      level() {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) sum += buf[i];
        return Math.min(1, sum / buf.length / 90);
      },
      release() {
        try {
          source?.disconnect();
          stream?.getTracks().forEach((track) => track.stop());
          ctx?.close();
        } catch {
          /* уже закрыто */
        }
      },
    };
  } catch {
    try {
      stream?.getTracks().forEach((track) => track.stop());
      ctx?.close();
    } catch {
      /* ничего */
    }
    return null;
  }
}
