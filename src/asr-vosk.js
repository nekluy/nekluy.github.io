/**
 * Локальное распознавание речи в браузере — Vosk (WASM).
 *
 * Нужно там, где Web Speech API нет вообще: Opera, Firefox, часть встроенных
 * браузеров. Модель русская, маленькая (`vosk-model-small-ru-0.22`), лежит
 * рядом с сайтом архивом и скачивается один раз — по требованию, при первом
 * голосовом ответе, с прогрессом.
 *
 * Наружу отдаёт тот же интерфейс, что и `createSpeech()`: start/stop/abort и
 * `listening`, чтобы движки можно было менять не трогая диалог.
 */
export const VOSK_MODEL_SIZE = 46 * 1024 * 1024;

export function createVoskSpeech({ modelUrl, onFinal, onPartial, onError, onState } = {}) {
  let model = null;
  let recognizer = null;
  let ctx = null;
  let source = null;
  let processor = null;
  let stream = null;
  let wantListen = false;
  let loading = null;
  let listeningState = false;

  const state = (value) => {
    listeningState = value;
    onState?.(value);
  };

  const teardown = () => {
    try {
      processor?.disconnect();
      source?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      ctx?.close();
    } catch {
      /* уже закрыто */
    }
    processor = null;
    source = null;
    stream = null;
    ctx = null;
    recognizer?.remove?.();
    recognizer = null;
  };

  /** Загрузка модели с прогрессом: 46 МБ по мобильной сети — не мгновенно. */
  const loadModel = async () => {
    if (model) return model;
    if (loading) return loading;
    loading = (async () => {
      const { createModel } = await import("vosk-browser");
      const res = await fetch(modelUrl);
      if (!res.ok) throw new Error(`модель не скачалась: HTTP ${res.status}`);
      const total = Number(res.headers.get("content-length")) || VOSK_MODEL_SIZE;
      const chunks = [];
      let received = 0;
      const reader = res.body?.getReader();
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          onState?.("loading", Math.min(1, received / total));
        }
      } else {
        chunks.push(new Uint8Array(await res.arrayBuffer()));
        onState?.("loading", 1);
      }
      const blob = new Blob(chunks, { type: "application/gzip" });
      const url = URL.createObjectURL(blob);
      try {
        model = await createModel(url, -1);
      } finally {
        URL.revokeObjectURL(url);
      }
      return model;
    })();
    try {
      return await loading;
    } finally {
      loading = null;
    }
  };

  const startCapture = async () => {
    const instance = await loadModel();
    if (!wantListen) return;
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    /* просим сразу 16 кГц: Vosk ждёт именно их, иначе распознавание молчит */
    const Ctor = window.AudioContext || window.webkitAudioContext;
    try {
      ctx = new Ctor({ sampleRate: 16000 });
    } catch {
      ctx = new Ctor();
    }
    await ctx.resume?.();
    source = ctx.createMediaStreamSource(stream);
    const Recognizer = instance.KaldiRecognizer;
    recognizer = new Recognizer(ctx.sampleRate);
    recognizer.setWords(false);
    recognizer.on("result", (message) => {
      const text = message?.result?.text?.trim();
      if (text) onFinal?.(text);
    });
    recognizer.on("partialresult", (message) => {
      const text = message?.result?.partial?.trim();
      if (text) onPartial?.(text);
    });
    processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      if (!recognizer || !listeningState) return;
      recognizer.acceptWaveformFloat(event.inputBuffer.getChannelData(0), ctx.sampleRate);
    };
    source.connect(processor);
    /* процессору нужен выход, чтобы браузер его вызывал; в колонки не отдаём */
    const mute = ctx.createGain();
    mute.gain.value = 0;
    processor.connect(mute).connect(ctx.destination);
    state(true);
  };

  return {
    supported: true,
    engine: "vosk",
    start() {
      wantListen = true;
      if (listeningState) return;
      if (!model && !loading) onState?.("loading", 0);
      startCapture().catch((err) => {
        wantListen = false;
        state(false);
        teardown();
        onError?.(err?.name === "NotAllowedError" ? "not-allowed" : "audio-capture");
      });
    },
    stop() {
      wantListen = false;
      state(false);
      try {
        recognizer?.retrieveFinalResult?.();
      } catch {
        /* пусто */
      }
    },
    abort() {
      wantListen = false;
      state(false);
      teardown();
    },
    /** Освободить микрофон и память, но модель оставить в кэше. */
    reset() {
      this.abort();
    },
    get listening() {
      return listeningState;
    },
  };
}
