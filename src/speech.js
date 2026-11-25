/**
 * Распознавание речи в браузере.
 *
 * Работает на Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`):
 * Chrome, Edge, Opera, Safari. Firefox не умеет — там сразу текстовый ввод.
 *
 * Практические решения, без которых «микрофон молчит»:
 *  1. `continuous = true`: браузер не рвёт сессию после первой паузы. Safari
 *     этот режим не держит, поэтому там `false` и перезапуск.
 *  2. Промежуточные результаты (`interimResults`) отдаём наверх — человек
 *     должен видеть, что его слышат, ещё до конца фразы.
 *  3. `start()` нельзя звать дважды и сразу после `abort()`: держим флаг
 *     `starting` и небольшую паузу, иначе Chrome бросает `InvalidStateError`,
 *     а сессия остаётся мёртвой.
 *  4. `no-speech` / `aborted` — не ошибка, а тишина: просто продолжаем слушать.
 *  5. Никакого параллельного `getUserMedia`: второй захват микрофона ломает
 *     распознавание (Chrome отдаёт тишину). Уровень показываем по факту
 *     распознанного текста, а не отдельным потоком.
 */

const Rec = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const speechSupported = Boolean(Rec);

const IS_SAFARI = typeof navigator !== "undefined" && /^((?!chrome|android|crios|edg).)*safari/i.test(navigator.userAgent);

export function createSpeech({ lang = "ru-RU", onFinal, onInterim, onError, onEnd, onStart } = {}) {
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
  let starting = false;
  let wantListen = false;
  let restartTimer = 0;
  let lastStartAt = 0;
  let restarts = 0;

  const build = () => {
    const instance = new Rec();
    instance.lang = lang;
    instance.continuous = !IS_SAFARI;
    instance.interimResults = true;
    instance.maxAlternatives = 3;

    instance.onstart = () => {
      listening = true;
      starting = false;
      restarts = 0;
      if (onStart) onStart();
    };

    instance.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        let best = result[0];
        for (let a = 1; a < result.length; a += 1) {
          if ((result[a]?.confidence ?? 0) > (best?.confidence ?? 0)) best = result[a];
        }
        if (result.isFinal) finalText += `${best?.transcript ?? ""} `;
        else interim += `${best?.transcript ?? ""} `;
      }
      if (interim.trim() && onInterim) onInterim(interim.trim());
      if (finalText.trim()) {
        restarts = 0;
        if (onFinal) onFinal(finalText.trim());
      }
    };

    instance.onerror = (event) => {
      const code = event.error || "unknown";
      listening = false;
      starting = false;
      /* тишина и наш собственный abort — это норма */
      if (code === "no-speech" || code === "aborted") return;
      wantListen = false;
      if (onError) onError(code);
    };

    instance.onend = () => {
      listening = false;
      starting = false;
      if (onEnd) onEnd();
      if (!wantListen) return;
      /* браузер закрыл сессию (пауза, лимит времени) — поднимаем заново */
      if (restarts >= 40) {
        wantListen = false;
        if (onError) onError("restart-limit");
        return;
      }
      restarts += 1;
      const wait = Math.max(60, 260 - (Date.now() - lastStartAt));
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (!wantListen) return;
        tryStart();
      }, wait);
    };
    return instance;
  };

  const tryStart = () => {
    if (!wantListen || listening || starting) return;
    if (!rec) rec = build();
    starting = true;
    lastStartAt = Date.now();
    try {
      rec.start();
    } catch {
      /* уже запущен — считаем, что слушаем */
      starting = false;
    }
    /* страховка: если onstart не пришёл, сессия не поднялась */
    setTimeout(() => {
      if (starting) {
        starting = false;
        if (wantListen && !listening) {
          try {
            rec.abort();
          } catch {
            /* ничего */
          }
        }
      }
    }, 1200);
  };

  return {
    supported: true,
    start() {
      wantListen = true;
      restarts = 0;
      tryStart();
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
    /** Полный сброс: следующая сессия начнётся с чистого объекта. */
    reset() {
      wantListen = false;
      clearTimeout(restartTimer);
      try {
        rec?.abort();
      } catch {
        /* ничего */
      }
      rec = null;
      listening = false;
      starting = false;
      restarts = 0;
    },
    get listening() {
      return listening;
    },
  };
}
