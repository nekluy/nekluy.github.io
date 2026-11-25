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
export const VOSK_MODEL_SIZE = 46236673;

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
  let starting = false;
  /* Каждый start получает номер. Пока модель грузится, пользователь может
     нажать «стоп» или начать заново — поздний ответ не должен поднять
     второй микрофон и оставить висеть первый поток. */
  let captureId = 0;

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

  const MODEL_CACHE = "ne-kluy-vosk-v1";
  const RANGE_CHUNK = 4 * 1024 * 1024;
  const RANGE_CONCURRENCY = 1;
  const RANGE_TIMEOUT = 20000;

  const abortAfter = (ms) => {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), ms);
    return ctrl.signal;
  };

  const readCachedModel = async () => {
    if (!("caches" in window)) return null;
    try {
      const cache = await caches.open(MODEL_CACHE);
      const hit = await cache.match(modelUrl);
      if (!hit) return null;
      const blob = await hit.blob();
      if (blob.size < 1024) {
        await cache.delete(modelUrl);
        return null;
      }
      const magic = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
      if (magic[0] !== 0x1f || magic[1] !== 0x8b) {
        await cache.delete(modelUrl);
        return null;
      }
      return blob;
    } catch {
      return null;
    }
  };

  const cacheModel = (blob) => {
    if (!("caches" in window)) return;
    caches
      .open(MODEL_CACHE)
      .then((cache) => cache.put(modelUrl, new Response(blob)))
      .catch(() => {});
  };

  const readFull = async (res) => {
    const total = Number(res.headers.get("content-length")) || VOSK_MODEL_SIZE;
    const chunks = [];
    let received = 0;
    const reader = res.body?.getReader();
    if (!reader) {
      chunks.push(new Uint8Array(await res.arrayBuffer()));
      onState?.("loading", 1);
      return new Blob(chunks, { type: "application/gzip" });
    }
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onState?.("loading", Math.min(0.99, received / total));
    }
    return new Blob(chunks, { type: "application/gzip" });
  };

  const readRange = async (start, end, index, progress, add) => {
    const expected = end - start + 1;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const res = await fetch(modelUrl, {
          headers: { Range: "bytes=" + start + "-" + end },
          signal: abortAfter(RANGE_TIMEOUT),
          cache: "no-store",
        });
        if (res.status !== 206) throw new Error("range " + res.status);
        const buffer = new Uint8Array(expected);
        let offset = 0;
        const reader = res.body?.getReader();
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (offset + value.length > expected) throw new Error("range overflow");
            buffer.set(value, offset);
            offset += value.length;
            add(index, value.length);
          }
        } else {
          const body = new Uint8Array(await res.arrayBuffer());
          offset = Math.min(expected, body.length);
          buffer.set(body.subarray(0, offset), 0);
          add(index, offset);
        }
        if (offset !== expected) throw new Error("range short");
        return buffer;
      } catch (err) {
        progress.received -= progress.parts[index];
        progress.parts[index] = 0;
        if (attempt === 4) throw err;
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
    throw new Error("range failed");
  };

  /* GitHub Pages отдаёт 46 МБ одной качалкой с обрывом на 89%;
     качаем кусками по 4 МБ последовательно, чтобы не залипали потоки. */
  const downloadModel = async () => {
    const cached = await readCachedModel();
    if (cached) {
      onState?.("loading", 1);
      return cached;
    }
    const probe = await fetch(modelUrl, {
      headers: { Range: "bytes=0-0" },
      signal: abortAfter(RANGE_TIMEOUT),
      cache: "no-store",
    });
    if (!probe.ok) throw new Error("модель не скачалась: HTTP " + probe.status);
    if (probe.status !== 206) {
      /* локальный http.server не умеет Range — забираем ответ целиком */
      return readFull(probe);
    }
    const total = Number((probe.headers.get("content-range") || "").split("/")[1]) || VOSK_MODEL_SIZE;
    await probe.arrayBuffer();
    if (!total || total < 1024) throw new Error("модель пустая");
    const ranges = [];
    for (let start = 0; start < total; start += RANGE_CHUNK) {
      ranges.push({ start, end: Math.min(total - 1, start + RANGE_CHUNK - 1) });
    }
    const buffers = new Array(ranges.length);
    const progress = { received: 0, parts: new Array(ranges.length).fill(0) };
    const add = (index, bytes) => {
      progress.parts[index] += bytes;
      progress.received += bytes;
      onState?.("loading", Math.min(0.99, progress.received / total));
    };
    let next = 0;
    const worker = async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= ranges.length) return;
        const { start, end } = ranges[index];
        buffers[index] = await readRange(start, end, index, progress, add);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(RANGE_CONCURRENCY, ranges.length) }, worker),
    );
    onState?.("loading", 1);
    return new Blob(buffers, { type: "application/gzip" });
  };

  /** Загрузка модели с прогрессом: 46 МБ по мобильной сети — не мгновенно. */
  const loadModel = async () => {
    if (model) return model;
    if (loading) return loading;
    loading = (async () => {
      const { createModel } = await import("vosk-browser");
      const blob = await downloadModel();
      const url = URL.createObjectURL(blob);
      try {
        model = await createModel(url, -1);
      } finally {
        URL.revokeObjectURL(url);
      }
      cacheModel(blob);
      return model;
    })();
    try {
      return await loading;
    } finally {
      loading = null;
    }
  };
  const startCapture = async (id) => {
    const instance = await loadModel();
    if (id !== captureId || !wantListen) return;
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    if (id !== captureId || !wantListen) {
      mic.getTracks().forEach((track) => track.stop());
      return;
    }
    stream = mic;
    /* просим сразу 16 кГц: Vosk ждёт именно их, иначе распознавание молчит */
    const Ctor = window.AudioContext || window.webkitAudioContext;
    try {
      ctx = new Ctor({ sampleRate: 16000 });
    } catch {
      ctx = new Ctor();
    }
    await ctx.resume?.();
    if (id !== captureId || !wantListen) {
      teardown();
      return;
    }
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
    starting = false;
    state(true);
    onState?.("ready");
  };

  return {
    supported: true,
    engine: "vosk",
    start() {
      wantListen = true;
      if (listeningState || starting) return;
      starting = true;
      const id = ++captureId;
      if (!model && !loading) onState?.("loading", 0);
      startCapture(id).catch((err) => {
        starting = false;
        if (id !== captureId) return;
        wantListen = false;
        state(false);
        teardown();
        onError?.(
          err?.name === "NotAllowedError"
            ? "not-allowed"
            : err?.name === "NotFoundError"
              ? "audio-capture"
              : "model",
        );
      });
    },
    stop() {
      wantListen = false;
      starting = false;
      captureId += 1;
      try {
        recognizer?.retrieveFinalResult?.();
      } catch {
        /* пусто */
      }
      state(false);
      teardown();
    },
    abort() {
      wantListen = false;
      starting = false;
      captureId += 1;
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