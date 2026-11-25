/**
 * Звонок «сотрудника оператора связи»: 3D-телефон + ветвящийся диалог.
 *
 * Модель — iPhone 18 Pro Max в бургунди (цвет из референсов Figma).
 * Геометрия считана с габаритов 17 Pro Max: 163.4 × 78.0 × 8.75 мм,
 * отношение сторон корпуса 78.0 / 163.4 = 0.477. Здесь корпус 1.90 × 3.98,
 * экран 6.9" (2868 × 1320 → 0.460) — 1.75 × 3.80.
 * Дизайн-сетка экрана 512 × 1097, текстура ×2.
 *
 * Экран живёт как настоящий: блокировка с часами и уведомлениями → свайп
 * вверх → входящий вызов. Если разговор дошёл до кода из СМС, на телефон
 * приходит сообщение с того же номера, что называл «оператор», — баннером,
 * со звуком и записью в списке уведомлений.
 *
 * Заставка-сцена: телефон лежит «лицом вниз» (видно яблоко и блок камер),
 * начинает дрожать — идут сигналы вызова, — затем переворачивается экраном
 * к человеку, и включается неизвестный номер. Кнопки «Ответить» и «Отклонить»
 * находятся на самом экране: попадание считается рейкастом по плоскости экрана,
 * поэтому не зависит от поворота модели и размера окна.
 *
 * Голос — нейросетевой (edge-tts, en-US-AndrewMultilingual — мужчина,
 * en-US-AvaMultilingual — женщина), файлы лежат в src/audio.
 * Если звук не проигрался, диалог всё равно идёт дальше: текст на месте.
 */
import * as THREE from "three";

import helloAudio from "./audio/hello.mp3";
import whoAudio from "./audio/who.mp3";
import pitchAudio from "./audio/pitch.mp3";
import smsAudio from "./audio/sms.mp3";
import pressureAudio from "./audio/pressure.mp3";
import afterCodeAudio from "./audio/after_code.mp3";
import helloAudioF from "./audio/hello-f.mp3";
import whoAudioF from "./audio/who-f.mp3";
import pitchAudioF from "./audio/pitch-f.mp3";
import smsAudioF from "./audio/sms-f.mp3";
import pressureAudioF from "./audio/pressure-f.mp3";
import afterCodeAudioF from "./audio/after_code-f.mp3";
import againAudio from "./audio/again.mp3";
import silenceAudio from "./audio/silence.mp3";
import bridgeAudio from "./audio/bridge.mp3";
import doubtAudio from "./audio/doubt.mp3";
import refuseAudio from "./audio/refuse.mp3";
import waitCodeAudio from "./audio/wait_code.mp3";
import holdOnAudio from "./audio/hold_on.mp3";
import codeExplainAudio from "./audio/code_explain.mp3";
import reassureAudio from "./audio/reassure.mp3";
import moneyAudio from "./audio/money.mp3";
import simpleAudio from "./audio/simple.mp3";
import againAudioF from "./audio/again-f.mp3";
import silenceAudioF from "./audio/silence-f.mp3";
import bridgeAudioF from "./audio/bridge-f.mp3";
import doubtAudioF from "./audio/doubt-f.mp3";
import refuseAudioF from "./audio/refuse-f.mp3";
import waitCodeAudioF from "./audio/wait_code-f.mp3";
import holdOnAudioF from "./audio/hold_on-f.mp3";
import codeExplainAudioF from "./audio/code_explain-f.mp3";
import reassureAudioF from "./audio/reassure-f.mp3";
import moneyAudioF from "./audio/money-f.mp3";
import simpleAudioF from "./audio/simple-f.mp3";
import envStudio from "./assets/env-studio-hi.jpg";
import { CALL_START, LINES, STEPS, classifyUtterance, pickCode } from "./data/call-script.js";
import { createSpeech, speechSupported } from "./speech.js";

/* ── дизайн-сетка экрана ─────────────────────────────────────────── */

const DESIGN = { w: 512, h: 1097 };
/* Масштаб текстуры экрана. Не константа: он подбирается под фактический размер
   холста на странице, иначе текст либо растягивается (мыло), либо сжимается
   втрое и теряет резкость. */
let TEXTURE_SCALE = 2;

const COLOR = {
  screenTop: "#2b141a",
  screenBottom: "#07050a",
  burgundy: "#5c2b33",
  burgundyLight: "#8a4a52",
  text: "#f3f6fb",
  muted: "rgba(186, 198, 216, 0.72)",
  decline: "#ff453a",
  accept: "#30d158",
  island: "#000000",
  vpn: "rgba(126, 228, 255, 0.95)",
};

const BUTTONS = {
  decline: { x: 148, y: 884, r: 52, label: "Отклонить" },
  answer: { x: 364, y: 884, r: 52, label: "Ответить" },
  hangup: { x: 256, y: 884, r: 52, label: "Завершить" },
};
const HIT_PADDING = 26;

const ISLAND = { w: 154, h: 38, top: 44 };

/* ── сценарий ────────────────────────────────────────────────────── */

/* Аудио по id реплики: мужской и женский голос одного и того же текста. */
const AUDIO_M = {
  hello: helloAudio,
  who: whoAudio,
  pitch: pitchAudio,
  sms: smsAudio,
  pressure: pressureAudio,
  after_code: afterCodeAudio,
  again: againAudio,
  silence: silenceAudio,
  bridge: bridgeAudio,
  doubt: doubtAudio,
  refuse: refuseAudio,
  wait_code: waitCodeAudio,
  hold_on: holdOnAudio,
  code_explain: codeExplainAudio,
  reassure: reassureAudio,
  money: moneyAudio,
  simple: simpleAudio,
};
const AUDIO_F = {
  hello: helloAudioF,
  who: whoAudioF,
  pitch: pitchAudioF,
  sms: smsAudioF,
  pressure: pressureAudioF,
  after_code: afterCodeAudioF,
  again: againAudioF,
  silence: silenceAudioF,
  bridge: bridgeAudioF,
  doubt: doubtAudioF,
  refuse: refuseAudioF,
  wait_code: waitCodeAudioF,
  hold_on: holdOnAudioF,
  code_explain: codeExplainAudioF,
  reassure: reassureAudioF,
  money: moneyAudioF,
  simple: simpleAudioF,
};

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── рисование экрана ────────────────────────────────────────────── */

const HANDSET =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 " +
  "19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 " +
  "2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 " +
  "A2 2 0 0 1 22 16.92z";
const handset = new Path2D(HANDSET);

const SHIELD = "M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z";
const shield = new Path2D(SHIELD);
const PLANE = "M22 3 2.5 10.4l5.9 2.1L10 19l3.1-4.2 5.1 3.4z";
const BUBBLE = "M12 3C6.9 3 3 6.4 3 10.6c0 2.4 1.4 4.6 3.6 6L6 21l4-1.9c.6.1 1.3.2 2 .2 5.1 0 9-3.4 9-7.6S17.1 3 12 3z";

/** Пул уведомлений: на блокировке каждый раз новый набор из трёх. */
const NOTIFICATION_POOL = [
  { app: "telegram", color: "#2aabee", title: "Мама", text: "Ты покушал? Позвони, как освободишься." },
  { app: "telegram", color: "#2aabee", title: "Андрей", text: "Скинь, пожалуйста, фотки с рыбалки, я потерял." },
  { app: "telegram", color: "#2aabee", title: "Работа", text: "Совещание перенесли на 11:30, ссылку скину утром." },
  { app: "sms", color: "#30d158", title: "СМС · 900", text: "Списание 1 290 ₽. Если это не вы — 8 800 555-35-35." },
  { app: "sms", color: "#30d158", title: "СМС · Доставка", text: "Заказ №4821 ждёт в пункте выдачи до 21:00." },
  { app: "sms", color: "#30d158", title: "СМС · 900", text: "Зачисление зарплаты 42 000 ₽. Баланс 43 517,40 ₽." },
  { app: "call", color: "#ff453a", title: "Пропущенный", text: "Неизвестный номер, 2 попытки" },
  { app: "call", color: "#ff453a", title: "Пропущенный", text: "Сергей, 1 попытка" },
  { app: "sms", color: "#30d158", title: "СМС · Поликлиника", text: "Приём терапевта завтра в 09:40, кабинет 214." },
  { app: "telegram", color: "#2aabee", title: "Соседи", text: "Воду отключат с 14:00 до 18:00, предупредили." },
];

/** Три разных уведомления, у каждого своё время «назад от текущего». */
function makeNotifications() {
  const pool = [...NOTIFICATION_POOL];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = [];
  for (const app of ["telegram", "sms", "call"]) {
    const hit = pool.find((card) => card.app === app && !picked.includes(card));
    if (hit) picked.push(hit);
  }
  const rest = pool.filter((card) => !picked.includes(card));
  while (picked.length < 3 && rest.length) picked.push(rest.shift());

  const now = new Date();
  return picked.map((card, index) => {
    const at = new Date(now.getTime() - (index * 23 + 4 + Math.floor(Math.random() * 12)) * 60000);
    return {
      ...card,
      time: at.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
  });
}

/** Время и дата берутся заново при каждой отрисовке: экран живёт, а не «замирает». */
/** Плоскость со скруглёнными углами и нормализованными UV — для экрана. */
function roundedPlane(w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geometry = new THREE.ShapeGeometry(shape, 24);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  }
  uv.needsUpdate = true;
  return geometry;
}

const liveClock = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const liveDate = () =>
  new Date().toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

function drawHandset(ctx, cx, cy, size, angle) {
  const k = size / 24;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(k, k);
  ctx.translate(-12, -12);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(handset);
  ctx.restore();
}

let grainCanvas = null;

function drawWallpaper(ctx) {
  /* Обои iPhone 18 Pro / iOS 26: глубокая бордовая тьма, по ней —
     тонкие светящиеся дуги с ярким ядром и мягким ореолом (приём из
     «Prism 100 dark gradients»), плюс редкая пыль. Никаких полос. */
  const bg = ctx.createLinearGradient(0, 0, DESIGN.w * 0.3, DESIGN.h);
  bg.addColorStop(0, "#2b0d16");
  bg.addColorStop(0.28, "#1a0810");
  bg.addColorStop(0.62, "#0e0508");
  bg.addColorStop(1, "#050306");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);

  // основа композиции — два больших мягких пятна света
  const blooms = [
    { x: 90, y: 240, r: 420, c: "212, 96, 108", a: 0.16 },
    { x: 450, y: 700, r: 340, c: "150, 62, 118", a: 0.12 },
    { x: 250, y: 1010, r: 380, c: "120, 40, 58", a: 0.14 },
  ];
  for (const b of blooms) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, `rgba(${b.c}, ${b.a})`);
    g.addColorStop(0.5, `rgba(${b.c}, ${b.a * 0.45})`);
    g.addColorStop(1, `rgba(${b.c}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);
  }

  /* Светящаяся линия: три прохода — широкий ореол, средний, яркое ядро.
     Именно так на живых обоях получается «неон в дымке», а не плоская черта. */
  const glowing = (path, { w = 3, hue = "255, 168, 186", a = 0.5 } = {}) => {
    ctx.save();
    ctx.lineCap = "round";
    const passes = [
      { wid: w * 14, alpha: a * 0.16, blur: 26 },
      { wid: w * 5.5, alpha: a * 0.34, blur: 11 },
      { wid: w * 1.9, alpha: a * 0.6, blur: 4 },
      { wid: w * 0.85, alpha: a * 1.0, blur: 0 },
    ];
    for (const pass of passes) {
      ctx.filter = pass.blur ? `blur(${pass.blur}px)` : "none";
      ctx.strokeStyle = `rgba(${hue}, ${pass.alpha})`;
      ctx.lineWidth = pass.wid;
      ctx.stroke(path);
    }
    ctx.restore();
  };

  // центральная «петля» — из неё часы на блокировке читаются как на стекле
  const loop = new Path2D();
  loop.moveTo(-60, 780);
  loop.bezierCurveTo(150, 470, 380, 1010, 620, 590);
  loop.bezierCurveTo(700, 470, 610, 330, 480, 380);
  glowing(loop, { w: 3.2, a: 0.62 });

  // вторая, более тонкая дуга сверху — даёт глубину и «второй план»
  const upper = new Path2D();
  upper.moveTo(-40, 300);
  upper.bezierCurveTo(120, 120, 300, 250, 410, 90);
  upper.bezierCurveTo(470, 10, 560, 30, 590, 120);
  glowing(upper, { w: 1.7, hue: "214, 176, 236", a: 0.36 });

  // третья — короткая дуга снизу справа, едва заметная
  const lower = new Path2D();
  lower.moveTo(360, 1180);
  lower.bezierCurveTo(390, 1010, 520, 980, 600, 860);
  glowing(lower, { w: 2.4, hue: "255, 132, 150", a: 0.3 });

  // пыль: редкие точки, как в референсе градиентов
  let seed = 20261120;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 90; i += 1) {
    const x = rnd() * DESIGN.w;
    const y = rnd() * DESIGN.h;
    const r = rnd() * 1.5 + 0.35;
    const a = rnd() * 0.4 + 0.06;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 224, 228, ${a})`;
    ctx.fill();
  }

  // зерно: живые обои не идеально гладкие. Рисуем один раз в отдельный холст,
  // иначе 560 000 пикселей пересчитывались бы при каждой перерисовке экрана.
  if (!grainCanvas) {
    grainCanvas = document.createElement("canvas");
    grainCanvas.width = DESIGN.w;
    grainCanvas.height = DESIGN.h;
    const gctx = grainCanvas.getContext("2d");
    const grain = gctx.createImageData(DESIGN.w, DESIGN.h);
    const data = grain.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = 118 + Math.random() * 46;
      data[i] = n;
      data[i + 1] = n;
      data[i + 2] = n;
      data[i + 3] = 8;
    }
    gctx.putImageData(grain, 0, 0);
  }
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(grainCanvas, 0, 0);
  ctx.restore();

  // мягкое затемнение снизу: там живут уведомления и подсказка
  const veil = ctx.createLinearGradient(0, DESIGN.h * 0.6, 0, DESIGN.h);
  veil.addColorStop(0, "rgba(6, 4, 8, 0)");
  veil.addColorStop(1, "rgba(6, 4, 8, 0.74)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);
}

function drawIsland(ctx, state) {
  const w = state.islandW;
  const h = state.islandH;
  const x = DESIGN.w / 2 - w / 2;
  const y = ISLAND.top;

  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = COLOR.island;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const camX = x + w - 27;
  const camY = y + h / 2;
  ctx.beginPath();
  ctx.arc(camX, camY, 6.6, 0, Math.PI * 2);
  ctx.fillStyle = "#141c2c";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(camX - 2, camY - 2, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(120, 170, 255, 0.5)";
  ctx.fill();

  if (state.mode === "active") {
    const pulse = 0.45 + 0.35 * Math.abs(Math.sin(state.phase * 1.6));
    ctx.beginPath();
    ctx.arc(x + 30, camY, 7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(48, 209, 88, ${pulse})`;
    ctx.fill();
  }
}

/** Значок включённого VPN в строке состояния. */
/** Значок VPN в строке состояния: справа, крупнее системных иконок. */
function drawVpn(ctx) {
  const w = 56;
  const h = 30;
  const x = 341; // справа, сразу за островом и перед иконками сети
  const y = 53;

  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(126, 228, 255, 0.16)";
  ctx.fill();
  ctx.strokeStyle = "rgba(126, 228, 255, 0.32)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(x + 15, y + h / 2);
  ctx.scale(0.56, 0.56);
  ctx.translate(-12, -12);
  ctx.fillStyle = COLOR.vpn;
  ctx.fill(shield);
  ctx.restore();

  ctx.fillStyle = COLOR.vpn;
  ctx.font = "700 12px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("VPN", x + 26, y + h / 2 + 0.5);
  ctx.textBaseline = "alphabetic";
}

function drawStatusBar(ctx, state) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLOR.text;
  ctx.font = "600 26px 'Golos Text', sans-serif";
  ctx.fillText(liveClock(), 38, 78);

  drawVpn(ctx);

  // соты: правый край 405, чтобы не наезжать на Wi-Fi
  const bars = [5, 9, 13, 17];
  const sx = 403;
  bars.forEach((h, i) => {
    roundRect(ctx, sx + i * 6.5, 72 - h, 4.6, h, 1.8);
    ctx.fillStyle = "rgba(243, 246, 251, 0.9)";
    ctx.fill();
  });

  // Wi-Fi: центр 430, дуги до 445 — до батареи остаётся 13 px
  const wx = 440;
  ctx.strokeStyle = "rgba(243, 246, 251, 0.9)";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  for (let i = 0; i < 2; i += 1) {
    ctx.beginPath();
    ctx.arc(wx, 72, 6.5 + i * 6, Math.PI * 1.22, Math.PI * 1.78);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(wx, 71, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(243, 246, 251, 0.9)";
  ctx.fill();

  const bx = 462;
  const by = 57;
  ctx.strokeStyle = "rgba(243, 246, 251, 0.5)";
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, 26, 15, 4.5);
  ctx.stroke();
  roundRect(ctx, bx + 3, by + 3, 17, 9, 2.6);
  ctx.fillStyle = "rgba(243, 246, 251, 0.9)";
  ctx.fill();
  roundRect(ctx, bx + 28, by + 5, 2.4, 5.5, 1.2);
  ctx.fillStyle = "rgba(243, 246, 251, 0.5)";
  ctx.fill();
}

function drawContact(ctx, state) {
  const cx = DESIGN.w / 2;
  const cy = 302;
  const r = 92;

  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, "rgba(178, 104, 116, 0.34)");
  grad.addColorStop(1, "rgba(120, 58, 74, 0.26)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(243, 246, 251, 0.92)";
  ctx.font = "600 64px 'Sofia Sans Extra Condensed', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("?", cx, cy + 24);

  ctx.fillStyle = COLOR.text;
  ctx.font = "600 44px 'Sofia Sans Extra Condensed', sans-serif";
  ctx.fillText(state.name, cx, 456);

  ctx.fillStyle = "rgba(240, 245, 252, 0.92)";
  ctx.font = "500 27px 'JetBrains Mono', monospace";
  ctx.fillText(state.number, cx, 500);

  ctx.fillStyle = COLOR.muted;
  ctx.font = "400 20px 'Golos Text', sans-serif";
  ctx.fillText("мобильный", cx, 534);

  if (state.mode !== "incoming") {
    ctx.fillStyle = "rgba(243, 246, 251, 0.9)";
    ctx.font = "500 26px 'JetBrains Mono', monospace";
    ctx.fillText(state.timer, cx, 590);
  }
  ctx.textAlign = "left";
}

function drawButton(ctx, id, hover) {
  const b = BUTTONS[id];
  const isDecline = id !== "answer";
  const fill = isDecline ? COLOR.decline : COLOR.accept;

  if (hover) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.10)";
    ctx.fill();
  }

  const grad = ctx.createLinearGradient(b.x, b.y - b.r, b.x, b.y + b.r);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, isDecline ? "#d32a20" : "#22a844");
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  drawHandset(ctx, b.x, b.y, b.r * 0.78, isDecline ? Math.PI * 0.75 : 0);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(243, 246, 251, 0.92)";
  ctx.font = "400 21px 'Golos Text', sans-serif";
  ctx.fillText(b.label, b.x, b.y + b.r + 34);
  ctx.textAlign = "left";
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawGlyph(ctx, kind, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 24, size / 24);
  ctx.translate(-12, -12);
  ctx.fillStyle = color;
  if (kind === "telegram") {
    ctx.fill(new Path2D(PLANE));
  } else if (kind === "sms") {
    roundRect(ctx, 4, 5, 16, 12, 4.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8.5, 15.5);
    ctx.lineTo(8.5, 20);
    ctx.lineTo(13.5, 16.4);
    ctx.fill();
  } else {
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke(handset);
  }
  ctx.restore();
}

/** Карточка уведомления: матовое стекло поверх обоев, как в iOS 26. */
function drawNotificationCard(ctx, card, x, y, w, h, alpha = 1, maxLines = 2) {
  ctx.save();
  ctx.globalAlpha = alpha;

  roundRect(ctx, x, y, w, h, 34);
  // подложка: тёмная плотная база + светлое стекло сверху.
  // Так текст читается поверх любых обоев, а не просвечивает лентами.
  const glass = ctx.createLinearGradient(x, y, x, y + h);
  glass.addColorStop(0, "rgba(44, 21, 28, 0.84)");
  glass.addColorStop(1, "rgba(28, 14, 20, 0.8)");
  ctx.fillStyle = glass;
  ctx.fill();
  const sheen = ctx.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, "rgba(255, 240, 242, 0.2)");
  sheen.addColorStop(1, "rgba(255, 236, 238, 0.08)");
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const icon = 56;
  const ix = x + 20;
  const iy = y + 20;
  roundRect(ctx, ix, iy, icon, icon, 16);
  const tint = ctx.createLinearGradient(ix, iy, ix, iy + icon);
  tint.addColorStop(0, card.color);
  tint.addColorStop(1, "rgba(8, 6, 10, 0.25)");
  ctx.fillStyle = card.color;
  ctx.fill();
  ctx.fillStyle = tint;
  ctx.globalAlpha = alpha * 0.35;
  ctx.fill();
  ctx.globalAlpha = alpha;
  drawGlyph(ctx, card.app, ix + icon / 2, iy + icon / 2, 30, "rgba(255, 255, 255, 0.96)");

  const tx = ix + icon + 16;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 244, 246, 0.96)";
  ctx.font = "600 21px 'Golos Text', sans-serif";
  const timeWidth = 58;
  const title = card.title;
  let shown = title;
  while (ctx.measureText(shown).width > w - (tx - x) - timeWidth && shown.length > 3) {
    shown = shown.slice(0, -1);
  }
  if (shown !== title) shown = `${shown.trimEnd()}…`;
  ctx.fillText(shown, tx, y + 40);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 238, 240, 0.72)";
  ctx.font = "500 17px 'Golos Text', sans-serif";
  ctx.fillText(card.time, x + w - 20, y + 39);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 246, 248, 0.9)";
  ctx.font = "400 19px 'Golos Text', sans-serif";
  const maxWidth = w - (tx - x) - 26;
  ctx.save();
  roundRect(ctx, x, y, w, h, 34);
  ctx.clip();
  wrapText(ctx, card.text, maxWidth)
    .slice(0, maxLines)
    .forEach((line, i) => ctx.fillText(line, tx, y + 74 + i * 27));
  ctx.restore();

  ctx.restore();
}

function drawNotifications(ctx, state) {
  const w = 440;
  const x = (DESIGN.w - w) / 2;
  const h = 132;
  const gap = 14;
  let y = 420;

  const list = [...(state.smsHistory ?? []), ...(state.notifications ?? [])].slice(0, 3);
  list.forEach((card) => {
    drawNotificationCard(ctx, card, x, y, w, h);
    y += h + gap;
  });
}

/** Слой блокировки: часы, дата, уведомления, домашний индикатор.
    Рисуется на прозрачном фоне — при свайпе он уезжает вверх как меш,
    перерисовывать его в каждом кадре не нужно. */
function drawLockLayer(ctx, state) {
  ctx.setTransform(TEXTURE_SCALE, 0, 0, TEXTURE_SCALE, 0, 0);
  ctx.clearRect(0, 0, DESIGN.w, DESIGN.h);
  /* лёгкая подложка: под шторкой может быть экран вызова, и сквозь
     полупрозрачные карточки он не должен читаться деталями.
     Непрозрачной заливки нет — иначе низ экрана выглядел чёрной плашкой. */
  const veil = ctx.createLinearGradient(0, 0, 0, DESIGN.h);
  veil.addColorStop(0, "rgba(12, 7, 12, 0.5)");
  veil.addColorStop(0.62, "rgba(10, 6, 10, 0.44)");
  veil.addColorStop(1, "rgba(8, 5, 9, 0.36)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);
  drawStatusBar(ctx, state);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255, 238, 240, 0.72)";
  ctx.font = "500 26px 'Golos Text', sans-serif";
  ctx.fillText(liveDate(), DESIGN.w / 2, 192);

  ctx.fillStyle = "rgba(255, 248, 249, 0.97)";
  ctx.font = "400 160px 'Golos Text', sans-serif";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "-4px";
  ctx.fillText(liveClock(), DESIGN.w / 2, 338);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  drawNotifications(ctx, state);

  roundRect(ctx, DESIGN.w / 2 - 84, DESIGN.h - 40, 168, 6, 3);
  ctx.fillStyle = "rgba(255, 246, 247, 0.62)";
  ctx.fill();

}

/** СМС от того номера, который называл «оператор»: выезжает сверху баннером. */
function drawSmsBanner(ctx, state) {
  const sms = state.sms;
  if (!sms) return;
  const age = performance.now() - sms.at;
  const inflow = Math.min(1, age / 380);
  const ease = 1 - Math.pow(1 - inflow, 3);
  const outflow = age > 7000 ? Math.min(1, (age - 7000) / 320) : 0;
  const y = ISLAND.top + ISLAND.h + 16 - (1 - ease) * 190 - outflow * 190;
  const alpha = (1 - outflow) * Math.min(1, ease * 1.2);

  drawNotificationCard(
    ctx,
    { app: "sms", color: "#30d158", title: `СМС · ${sms.from}`, text: sms.text, time: "сейчас" },
    (DESIGN.w - 452) / 2,
    y,
    452,
    178,
    alpha,
    3,
  );
}

function drawScreen(ctx, state) {
  ctx.setTransform(TEXTURE_SCALE, 0, 0, TEXTURE_SCALE, 0, 0);
  ctx.clearRect(0, 0, DESIGN.w, DESIGN.h);

  ctx.save();
  roundRect(ctx, 0, 0, DESIGN.w, DESIGN.h, 74);
  ctx.clip();

  drawWallpaper(ctx);

  // во время вызова обои приглушены — как размытый фон на экране звонка iOS
  if (state.view !== "locked") {
    const veil = ctx.createLinearGradient(0, 0, 0, DESIGN.h);
    veil.addColorStop(0, "rgba(10, 6, 10, 0.56)");
    veil.addColorStop(0.5, "rgba(10, 6, 10, 0.34)");
    veil.addColorStop(1, "rgba(8, 5, 9, 0.62)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);
  }

  // на блокировке статус-бар живёт в слое: при свайпе он уезжает вместе с часами
  if (state.view !== "locked") drawStatusBar(ctx, state);

  if (state.view === "locked") {
    // поверх обоев ничего не рисуем: контент блокировки живёт в отдельном слое
  } else {
    drawContact(ctx, state);

    if (state.mode === "incoming") {
      drawButton(ctx, "decline", state.hover === "decline");
      drawButton(ctx, "answer", state.hover === "answer");
    } else if (state.mode === "active") {
      drawButton(ctx, "hangup", state.hover === "hangup");
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(214, 198, 202, 0.75)";
      ctx.font = "400 22px 'Golos Text', sans-serif";
      ctx.fillText("вызов завершён", DESIGN.w / 2, 900);
      ctx.textAlign = "left";
    }
  }

  ctx.restore();

  // экран «утоплен» в корпус: тень по краям + диагональный блик стекла.
  // Всё это режем по скруглению, иначе в углах остаются тёмные прямоугольные уголки.
  ctx.save();
  roundRect(ctx, 0, 0, DESIGN.w, DESIGN.h, 74);
  ctx.clip();

  const shade = ctx.createRadialGradient(
    DESIGN.w / 2,
    DESIGN.h * 0.45,
    DESIGN.w * 0.32,
    DESIGN.w / 2,
    DESIGN.h * 0.5,
    DESIGN.w * 0.98,
  );
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.46)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);

  ctx.save();
  ctx.translate(DESIGN.w * 0.1, -DESIGN.h * 0.12);
  ctx.rotate(-0.36);
  const sheen = ctx.createLinearGradient(0, 0, 0, DESIGN.h * 1.25);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(0.4, "rgba(255, 255, 255, 0.06)");
  sheen.addColorStop(0.56, "rgba(255, 255, 255, 0.018)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, DESIGN.w * 1.7, DESIGN.h * 1.4);
  ctx.restore();
  ctx.restore();

  // остров рисуем поверх — он чёрный и перекрывает фон
  drawIsland(ctx, state);
  drawSmsBanner(ctx, state);
}

/* ── вспомогательные текстуры ────────────────────────────────────── */

const APPLE =
  "M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35" +
  "C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8" +
  "-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z";

function makeBackTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1097;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 512, 1097);
  bg.addColorStop(0, "#6b3540");
  bg.addColorStop(0.45, "#4a2129");
  bg.addColorStop(1, "#2a1218");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 1097);

  // мягкий блик по диагонали — как у стеклянной задней панели
  const shine = ctx.createLinearGradient(60, 40, 460, 700);
  shine.addColorStop(0, "rgba(255, 220, 225, 0.18)");
  shine.addColorStop(0.4, "rgba(255, 210, 215, 0.04)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, 512, 1097);

  // антенные полосы: тонкие светлые линии у торцов, как на настоящем корпусе
  ctx.fillStyle = "rgba(226, 176, 182, 0.30)";
  ctx.fillRect(120, 26, 272, 3);

  ctx.fillRect(120, 1068, 272, 3);
  ctx.fillStyle = "rgba(226, 176, 182, 0.16)";
  ctx.fillRect(24, 150, 2.5, 40);
  ctx.fillRect(485, 150, 2.5, 40);

  // яблоко
  ctx.save();
  ctx.translate(256, 585);
  ctx.scale(6.5, 6.5);
  ctx.translate(-12, -12);
  ctx.fillStyle = "rgba(226, 178, 184, 0.55)";
  ctx.fill(new Path2D(APPLE));
  ctx.restore();

  // скруглённые углы панели
  ctx.globalCompositeOperation = "destination-in";
  roundRect(ctx, 0, 0, 512, 1097, 74);
  ctx.fillStyle = "#fff";
  ctx.fill();

  return canvas;
}

function makeRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const cx = 128;
  const cy = 128;

  const glow = ctx.createRadialGradient(cx, cy, 60, cx, cy, 124);
  glow.addColorStop(0, "rgba(90, 225, 255, 0)");
  glow.addColorStop(0.72, "rgba(90, 225, 255, 0.16)");
  glow.addColorStop(1, "rgba(90, 225, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = "rgba(190, 250, 255, 1)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, 108, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(186, 92, 106, 0.5)");
  grad.addColorStop(0.35, "rgba(170, 84, 98, 0.26)");
  grad.addColorStop(0.7, "rgba(150, 74, 88, 0.08)");
  grad.addColorStop(1, "rgba(150, 74, 88, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return canvas;
}

/**
 * Нимб вокруг силуэта: мягкая светящаяся рамка. Плоскость с этой текстурой
 * масштабируется по проекции габаритов корпуса, поэтому свет как будто
 * облегает аппарат и сжимается вместе с ним, когда телефон ставят ребром.
 */
function makeHaloTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const pad = 150;
  const x0 = pad;
  const y0 = pad;
  const w = size - pad * 2;
  const h = size - pad * 2;
  const r = Math.min(w, h) * 0.42;
  const path = new Path2D();
  path.moveTo(x0 + r, y0);
  path.lineTo(x0 + w - r, y0);
  path.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  path.lineTo(x0 + w, y0 + h - r);
  path.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  path.lineTo(x0 + r, y0 + h);
  path.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  path.lineTo(x0, y0 + r);
  path.quadraticCurveTo(x0, y0, x0 + r, y0);
  path.closePath();

  // три прохода: широкое грязное свечение → среднее → тонкое ядро
  ctx.shadowColor = "rgba(255, 118, 146, 0.9)";
  ctx.shadowBlur = 86;
  ctx.strokeStyle = "rgba(255, 126, 152, 0.14)";
  ctx.lineWidth = 30;
  ctx.stroke(path);

  ctx.shadowBlur = 44;
  ctx.strokeStyle = "rgba(255, 150, 172, 0.35)";
  ctx.lineWidth = 12;
  ctx.stroke(path);

  ctx.shadowBlur = 16;
  ctx.strokeStyle = "rgba(255, 202, 214, 0.75)";
  ctx.lineWidth = 3.5;
  ctx.stroke(path);
  return canvas;
}

/* ── инициализация ───────────────────────────────────────────────── */

const escapeHtml = (value) =>
  String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

const randomNumber = () => {
  const d = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");
  return `+7 9${d(2)} ${d(3)}-${d(2)}-${d(2)}`;
};

export function initPhone() {
  const stage = document.getElementById("phone-root");
  const canvas = document.getElementById("phone-canvas");
  const log = document.getElementById("phone-log");
  const choices = document.getElementById("phone-choices");
  const status = document.getElementById("phone-status");
  const reset = document.getElementById("phone-reset");
  const hint = document.getElementById("phone-hint");
  if (!stage || !canvas || !log || !choices) return;

  const isReduced = reduced();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      /* Буфер сохраняем всегда: иначе снимок экрана (и системный, и canvas.toDataURL)
         может получиться пустым — жалоба «фотографирую, а экрана нет».
         Для этой сцены цена копии буфера незаметна. */
      preserveDrawingBuffer: true,
    });
  } catch {
    stage.classList.add("phone--flat");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 5.95);

  const group = new THREE.Group();
  group.rotation.y = Math.PI; // до заставки телефон лежит «лицом вниз»
  scene.add(group);

  /* Корпус: iPhone 18 Pro Max. Габариты 17 Pro Max — 163.4 × 78.0 × 8.75 мм,
     это отношение 78.0 / 163.4 = 0.477 (у 16 Pro Max было 0.485). */
  const bodyW = 1.9;
  const bodyH = 3.98;
  const bodyR = 0.31;
  const depth = 0.2;
  const bevel = 0.05;

  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-bodyW / 2 + bodyR, -bodyH / 2);
  bodyShape.lineTo(bodyW / 2 - bodyR, -bodyH / 2);
  bodyShape.quadraticCurveTo(bodyW / 2, -bodyH / 2, bodyW / 2, -bodyH / 2 + bodyR);
  bodyShape.lineTo(bodyW / 2, bodyH / 2 - bodyR);
  bodyShape.quadraticCurveTo(bodyW / 2, bodyH / 2, bodyW / 2 - bodyR, bodyH / 2);
  bodyShape.lineTo(-bodyW / 2 + bodyR, bodyH / 2);
  bodyShape.quadraticCurveTo(-bodyW / 2, bodyH / 2, -bodyW / 2, bodyH / 2 - bodyR);
  bodyShape.lineTo(-bodyW / 2, -bodyH / 2 + bodyR);
  bodyShape.quadraticCurveTo(-bodyW / 2, -bodyH / 2, -bodyW / 2 + bodyR, -bodyH / 2);

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bodyShape, {
      depth,
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: 0.045,
      bevelSegments: 5,
      curveSegments: 18,
    }),
    new THREE.MeshStandardMaterial({ color: 0x632c36, metalness: 0.94, roughness: 0.28, envMapIntensity: 1.55 }),
  );
  body.position.z = -depth / 2;
  group.add(body);

  /* боковые кнопки: громкость и «действие» слева, питание справа */
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0x6f3b45, metalness: 0.95, roughness: 0.32, envMapIntensity: 1.35 });
  const sideX = bodyW / 2 + bevel;
  const sideButton = (sign, y, h) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, h, 0.085), buttonMat);
    mesh.position.set(sign * (sideX + 0.012), y, 0);
    group.add(mesh);
  };
  sideButton(-1, 0.74, 0.17); // «действие»
  sideButton(-1, 0.4, 0.33); // громкость +
  sideButton(-1, 0.0, 0.33); // громкость −
  sideButton(1, 0.44, 0.55); // питание

  /* экран: 1.75 × 3.75 = 0.467 */
  const screenW = 1.75;
  const screenH = 3.8;

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = DESIGN.w * TEXTURE_SCALE;
  screenCanvas.height = DESIGN.h * TEXTURE_SCALE;
  const ctx = screenCanvas.getContext("2d");
  const texture = new THREE.CanvasTexture(screenCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 8);

  const screenMat = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    transparent: true,
    opacity: 0,
  });
  const screenGeometry = roundedPlane(screenW, screenH, (74 / DESIGN.w) * screenW);
  const screen = new THREE.Mesh(screenGeometry, screenMat);
  screen.position.z = depth / 2 + 0.052;
  group.add(screen);

  /* Мягкая смена экрана: снимок предыдущего кадра тает поверх нового —
     переход «блокировка → входящий» больше не щёлкает. */
  const fadeCanvas = document.createElement("canvas");
  fadeCanvas.width = screenCanvas.width;
  fadeCanvas.height = screenCanvas.height;
  const fadeCtx = fadeCanvas.getContext("2d");
  const fadeTexture = new THREE.CanvasTexture(fadeCanvas);
  fadeTexture.colorSpace = THREE.SRGBColorSpace;
  const fadeMat = new THREE.MeshBasicMaterial({
    map: fadeTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const fadeMesh = new THREE.Mesh(screenGeometry, fadeMat);
  fadeMesh.position.z = screen.position.z + 0.0015;
  fadeMesh.visible = false;
  group.add(fadeMesh);

  let fadeAt = 0;
  let fadeGuard = 0;
  const crossfade = () => {
    fadeCanvas.width = screenCanvas.width;
    fadeCanvas.height = screenCanvas.height;
    fadeCtx.clearRect(0, 0, fadeCanvas.width, fadeCanvas.height);
    fadeCtx.drawImage(screenCanvas, 0, 0);
    fadeTexture.needsUpdate = true;
    fadeMat.opacity = 1;
    fadeMesh.visible = true;
    fadeAt = performance.now();
    /* Страховка: если цикл кадров остановится (вкладка ушла в фон),
       снимок не должен остаться висеть поверх экрана. */
    if (fadeGuard) clearTimeout(fadeGuard);
    fadeGuard = setTimeout(() => {
      fadeMat.opacity = 0;
      fadeMesh.visible = false;
    }, 600);
  };

  /* Слой блокировки: часы и уведомления лежат отдельной текстурой.
     При свайпе мы двигаем этот меш и гасим прозрачность — ни одной
     перерисовки холста, поэтому жест идёт ровно, без просадок. */
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = DESIGN.w * TEXTURE_SCALE;
  layerCanvas.height = DESIGN.h * TEXTURE_SCALE;
  const lctx = layerCanvas.getContext("2d");
  const layerTexture = new THREE.CanvasTexture(layerCanvas);
  layerTexture.colorSpace = THREE.SRGBColorSpace;
  layerTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 8);

  const layerMat = new THREE.MeshBasicMaterial({
    map: layerTexture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    opacity: 1,
  });
  /* Расфокус контента при протяжке: три уровня резкости, построенные
     заранее (в половинном разрешении — на глаз не отличить, а вдвое дешевле). */
  const blurTextures = [];
  let blurDirty = true;
  let blurTimer = 0;
  const buildBlurs = () => {
    if (!blurDirty) return;
    blurDirty = false;
    while (blurTextures.length) {
      const old = blurTextures.pop();
      if (old !== layerTexture) old.dispose();
    }
    const radii = [0, 3, 5.5, 10];
    radii.forEach((r) => {
      if (r === 0) { blurTextures.push(layerTexture); return; }
      const c = document.createElement("canvas");
      c.width = Math.max(2, Math.round(layerCanvas.width / 2));
      c.height = Math.max(2, Math.round(layerCanvas.height / 2));
      const bx = c.getContext("2d");
      if (!("filter" in bx)) { blurTextures.push(layerTexture); return; }
      bx.filter = `blur(${(r * TEXTURE_SCALE * 0.5).toFixed(1)}px)`;
      bx.drawImage(layerCanvas, 0, 0, c.width, c.height);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 8);
      blurTextures.push(t);
    });
  };
  const setLayerSharpness = (level) => {
    if (!blurTextures.length) return;
    const next = blurTextures[Math.min(level, blurTextures.length - 1)] || layerTexture;
    if (layerMat.map === next) return;
    /* без needsUpdate: иначе three.js пересобирает программу и кадр мигает */
    layerMat.map = next;
  };

  const lockLayer = new THREE.Mesh(roundedPlane(screenW, screenH, (74 / DESIGN.w) * screenW), layerMat);
  lockLayer.position.z = depth / 2 + 0.068;
  // Слой уезжает за верхний край экрана, поэтому режем его плоскостью —
  // иначе часы и карточки «висели» бы над корпусом.
  renderer.localClippingEnabled = true;
  /* Плоскость обрезания — в мировых координатах и по мировому верхнему краю экрана:
     иначе при повороте модели слой блокировки «вылезает» на корпус. */
  const clipPlane = new THREE.Plane();
  const clipNormal = new THREE.Vector3();
  const clipPoint = new THREE.Vector3();
  const updateClip = () => {
    clipNormal.set(0, -1, 0).transformDirection(group.matrixWorld).normalize();
    clipPoint.set(0, screenH / 2 - 0.012, depth / 2 + 0.07).applyMatrix4(group.matrixWorld);
    clipPlane.setFromNormalAndCoplanarPoint(clipNormal, clipPoint);
  };
  layerMat.clippingPlanes = [clipPlane];
  group.add(lockLayer);

  /* ── Динамический остров отдельным мешем ────────────────────────────
     Он должен быть поверх плашки разблокировки: она уезжает вверх, и если
     остров нарисован только в текстуре экрана, плашка проходит над ним.
     Меш повторяет капсулу, камеру и зелёную точку звонка. */
  const islandCanvas = document.createElement("canvas");
  const islandTexture = new THREE.CanvasTexture(islandCanvas);
  islandTexture.colorSpace = THREE.SRGBColorSpace;
  // размеры передаём аргументами: state объявляется позже, обращаться к нему нельзя
  const paintIsland = (w = ISLAND.w, h = ISLAND.h) => {
    const k = 3;
    islandCanvas.width = Math.round(w * k);
    islandCanvas.height = Math.round(h * k);
    const ic = islandCanvas.getContext("2d");
    ic.setTransform(k, 0, 0, k, 0, 0);
    ic.clearRect(0, 0, w, h);
    roundRect(ic, 0, 0, w, h, h / 2);
    ic.fillStyle = "#000000";
    ic.fill();
    ic.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ic.lineWidth = 1;
    ic.stroke();
    // камера Face ID справа
    const camX = w - 27;
    const camY = h / 2;
    ic.beginPath();
    ic.arc(camX, camY, 6.6, 0, Math.PI * 2);
    ic.fillStyle = "#141c2c";
    ic.fill();
    ic.beginPath();
    ic.arc(camX - 2, camY - 2, 2.2, 0, Math.PI * 2);
    ic.fillStyle = "rgba(120, 170, 255, 0.5)";
    ic.fill();
    islandTexture.needsUpdate = true;
  };
  paintIsland();

  const islandMat = new THREE.MeshBasicMaterial({
    map: islandTexture,
    transparent: true,
    depthWrite: false,
  });
  const islandMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), islandMat);
  islandMesh.position.z = depth / 2 + 0.074;
  group.add(islandMesh);

  // зелёная точка «идёт звонок» — отдельный меш, чтобы пульсировать без перерисовки
  const islandDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.026, 24),
    new THREE.MeshBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  islandDot.position.z = depth / 2 + 0.075;
  islandDot.visible = false;
  group.add(islandDot);

  const layoutIsland = (w = ISLAND.w, h = ISLAND.h) => {
    islandMesh.scale.set((1.75 * w) / DESIGN.w, (3.8 * h) / DESIGN.h, 1);
    const cy = screenH / 2 - ((ISLAND.top + h / 2) / DESIGN.h) * screenH;
    islandMesh.position.y = cy;
    const dotX = -screenW / 2 + ((DESIGN.w / 2 - w / 2 + 30) / DESIGN.w) * screenW;
    islandDot.position.set(dotX, cy, depth / 2 + 0.075);
  };
  layoutIsland();

  /* Стекло экрана — отдельный слой на своём расстоянии от картинки.
     За счёт перспективы при повороте блик от студии едет по стеклу
     отдельно от интерфейса: экран перестаёт быть плоской наклейкой. */
  const glassRadius = (74 / DESIGN.w) * screenW;
  const gw = screenW / 2;
  const gh = screenH / 2;
  const glassShape = new THREE.Shape();
  glassShape.moveTo(-gw + glassRadius, -gh);
  glassShape.lineTo(gw - glassRadius, -gh);
  glassShape.quadraticCurveTo(gw, -gh, gw, -gh + glassRadius);
  glassShape.lineTo(gw, gh - glassRadius);
  glassShape.quadraticCurveTo(gw, gh, gw - glassRadius, gh);
  glassShape.lineTo(-gw + glassRadius, gh);
  glassShape.quadraticCurveTo(-gw, gh, -gw, gh - glassRadius);
  glassShape.lineTo(-gw, -gh + glassRadius);
  glassShape.quadraticCurveTo(-gw, -gh, -gw + glassRadius, -gh);

  const screenGlass = new THREE.Mesh(
    new THREE.ShapeGeometry(glassShape, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.13,
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.9,
      depthWrite: false,
    }),
  );
  screenGlass.position.z = depth / 2 + 0.088;
  group.add(screenGlass);

  /* задняя панель: стекло, яблоко, блок камер */
  const backGroup = new THREE.Group();
  backGroup.rotation.y = Math.PI;
  backGroup.position.z = -(depth / 2 + bevel + 0.002);
  group.add(backGroup);

  const backTexture = new THREE.CanvasTexture(makeBackTexture());
  backTexture.colorSpace = THREE.SRGBColorSpace;
  const backPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(screenW + 0.14, screenH + 0.16),
    new THREE.MeshStandardMaterial({
      map: backTexture,
      transparent: true,
      roughness: 0.52,
      metalness: 0.06,
      envMapIntensity: 1.12,
    }),
  );
  backGroup.add(backPanel);

  // Блок камер — по фото владельца: скруглённая площадка в левом верхнем углу,
  // три объектива треугольником (два слева друг под другом, третий правее),
  // справа в той же площадке вспышка и LiDAR.
  const plateShape = new THREE.Shape();
  // фото: площадка 208 × 174 px при корпусе 230 × 503 → 0.90 ширины, 0.35 высоты
  const pw = 1.7;
  const ph = 1.35;
  const pr = 0.36;
  plateShape.moveTo(-pw / 2 + pr, -ph / 2);
  plateShape.lineTo(pw / 2 - pr, -ph / 2);
  plateShape.quadraticCurveTo(pw / 2, -ph / 2, pw / 2, -ph / 2 + pr);
  plateShape.lineTo(pw / 2, ph / 2 - pr);
  plateShape.quadraticCurveTo(pw / 2, ph / 2, pw / 2 - pr, ph / 2);
  plateShape.lineTo(-pw / 2 + pr, ph / 2);
  plateShape.quadraticCurveTo(-pw / 2, ph / 2, -pw / 2, ph / 2 - pr);
  plateShape.lineTo(-pw / 2, -ph / 2 + pr);
  plateShape.quadraticCurveTo(-pw / 2, -ph / 2, -pw / 2 + pr, -ph / 2);

  const panelW = screenW + 0.14;
  const panelH = screenH + 0.16;
  const plateX = -panelW / 2 + 0.05 + pw / 2;
  const plateY = panelH / 2 - 0.06 - ph / 2;

  const camPlate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelSize: 0.016,
      bevelThickness: 0.018,
      bevelSegments: 3,
      curveSegments: 14,
    }),
    new THREE.MeshStandardMaterial({ color: 0x7a4550, metalness: 0.32, roughness: 0.55, envMapIntensity: 0.85 }),
  );
  camPlate.position.set(plateX, plateY, 0.022);
  backGroup.add(camPlate);

  // светлый кант по контуру площадки — как фаска на живом корпусе
  const plateEdge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSize: 0.026,
      bevelThickness: 0.014,
      bevelSegments: 2,
      curveSegments: 14,
    }),
    new THREE.MeshStandardMaterial({ color: 0x4d2630, metalness: 0.55, roughness: 0.5, envMapIntensity: 0.8 }),
  );
  plateEdge.scale.set(1.018, 1.022, 1);
  plateEdge.position.set(plateX, plateY, 0.012);
  backGroup.add(plateEdge);

  /* ── Объектив по фото владельца ──────────────────────────────────────
     На снимке 149 × 134 видно устройство «глаза»: широкое светлое
     металлическое кольцо (внешний диаметр 58 px, стекло 46 px → 0.79),
     тёмный зазор между кольцом и стеклом, тёмное стекло с крупным
     рассеянным бликом-полумесяцем и маленькой звёздочкой-точкой.
     Плоский чёрный круг без этого — брак, а не стилизация. */
  const LENS = 0.258;
  /* Стекло объектива: тёмное, почти чёрное, с сильным отражением.
     Металличность низкая — иначе купол заливается цветом окружения
     и вместо «глубины» получается розовый пузырь, как на первом проходе. */
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x060a12,
    metalness: 0.35,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.5,
    reflectivity: 0.75,
  });
  /* внутренняя оправа: на фото внутри стекла видно ещё одно тёмное кольцо */
  const lensInnerRing = new THREE.MeshStandardMaterial({
    color: 0x12171d,
    metalness: 0.5,
    roughness: 0.4,
    envMapIntensity: 0.6,
  });
  const lensRimSide = new THREE.MeshStandardMaterial({
    color: 0x7a4550,
    metalness: 0.85,
    roughness: 0.3,
    envMapIntensity: 1.2,
  });
  const lensRim = new THREE.MeshStandardMaterial({
    color: 0x8c4a52,
    metalness: 0.92,
    roughness: 0.24,
    envMapIntensity: 1.35,
  });
  const lensRimInner = new THREE.MeshStandardMaterial({
    color: 0x2a1a21,
    metalness: 0.75,
    roughness: 0.42,
    envMapIntensity: 0.6,
  });
  const lensGap = new THREE.MeshStandardMaterial({
    color: 0x1b0e13,
    metalness: 0.2,
    roughness: 0.9,
    envMapIntensity: 0.4,
  });

  /* Блик-полумесяц и звёздочка — рисуем текстурой: у настоящего объектива
     блик мягкий и рваный, а не идеальный кружок. */
  const makeGlareTexture = () => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");

    // крупный рассеянный блик сверху-слева
    const halo = g.createRadialGradient(size * 0.36, size * 0.3, 2, size * 0.36, size * 0.3, size * 0.34);
    halo.addColorStop(0, "rgba(226, 238, 255, 0.92)");
    halo.addColorStop(0.35, "rgba(150, 182, 226, 0.42)");
    halo.addColorStop(1, "rgba(90, 120, 180, 0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);

    // «полумесяц» — светлая дуга по верхнему краю стекла
    g.save();
    g.beginPath();
    g.ellipse(size * 0.42, size * 0.28, size * 0.3, size * 0.16, -0.5, 0, Math.PI * 2);
    g.clip();
    const arc = g.createLinearGradient(0, size * 0.05, 0, size * 0.5);
    arc.addColorStop(0, "rgba(200, 220, 255, 0.55)");
    arc.addColorStop(1, "rgba(200, 220, 255, 0)");
    g.fillStyle = arc;
    g.fillRect(0, 0, size, size);
    g.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const glareTexture = makeGlareTexture();
  const starMat = new THREE.MeshBasicMaterial({
    color: 0xf2f8ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glareMat = new THREE.MeshBasicMaterial({
    map: glareTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.42,
  });

  const lensLip = new THREE.MeshStandardMaterial({
    color: 0xd8c3bf,
    metalness: 0.96,
    roughness: 0.2,
    envMapIntensity: 1.6,
  });
  const coldMat = new THREE.MeshBasicMaterial({
    color: 0x9cc4ff,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lensPodium = new THREE.MeshStandardMaterial({
    color: 0x6d3c47,
    metalness: 0.36,
    roughness: 0.5,
    envMapIntensity: 0.85,
  });

  /* ── Объектив ────────────────────────────────────────────────────────
     Собран послойно, как настоящий: приподнятая бобышка на площадке →
     широкое металлическое кольцо со скосом → тёмный зазор → стакан →
     стекло-мениск с бликами. Все тела вращения — 128 сегментов, чтобы
     на близком плане не было граней. Профиль снят с фото владельца. */
  const SEG = 128;
  const cylinder = (rTop, rBottom, height, mat) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, SEG), mat);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };

  const lens = (x, y, radius = LENS) => {
    const r = radius;

    // 1. бобышка площадки — объектив стоит на небольшом выступе
    const podium = cylinder(r * 1.14, r * 1.17, 0.026, lensPodium);
    podium.position.set(x, y, 0.07);
    backGroup.add(podium);

    // 2. внешняя стенка кольца: бордовый металл, чуть сужается вверх
    const ringSide = cylinder(r * 1.0, r * 1.025, 0.062, lensRimSide);
    ringSide.position.set(x, y, 0.114);
    backGroup.add(ringSide);

    // 3. скос к торцу — именно он читается как «толстое» кольцо на фото
    const ringBevel = cylinder(r * 0.9, r * 1.0, 0.016, lensRim);
    ringBevel.position.set(x, y, 0.153);
    backGroup.add(ringBevel);

    // 4. торцевая плоскость кольца вокруг стекла
    const ringTop = cylinder(r * 0.705, r * 0.9, 0.006, lensRim);
    ringTop.position.set(x, y, 0.164);
    backGroup.add(ringTop);

    // 5. светлая металлическая окантовка по внешнему краю
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, r * 0.006, 10, SEG), lensLip);
    lip.position.set(x, y, 0.146);
    backGroup.add(lip);

    // 6. тёмный зазор между кольцом и стеклом
    const gap = cylinder(r * 0.715, r * 0.715, 0.05, lensGap);
    gap.position.set(x, y, 0.15);
    backGroup.add(gap);

    // 7. стекло: плоский диск + пологий мениск сверху
    const glassDisc = cylinder(r * 0.7, r * 0.7, 0.026, lensGlass);
    glassDisc.position.set(x, y, 0.166);
    backGroup.add(glassDisc);

    // 8. тонкое тёмное кольцо оправы в глубине стекла
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(r * 0.56, r * 0.012, 12, SEG), lensInnerRing);
    innerRing.position.set(x, y, 0.181);
    backGroup.add(innerRing);

    // 9. блики: мягкий ореол, звёздочка, холодный отблик
    const glare = new THREE.Mesh(new THREE.CircleGeometry(r * 0.71, SEG), glareMat);
    glare.position.set(x, y, 0.182);
    backGroup.add(glare);

    const star = new THREE.Mesh(new THREE.CircleGeometry(r * 0.06, 24), starMat);
    star.position.set(x - r * 0.17, y - r * 0.1, 0.184);
    backGroup.add(star);

    const cold = new THREE.Mesh(new THREE.CircleGeometry(r * 0.16, 32), coldMat);
    cold.position.set(x + r * 0.24, y + r * 0.23, 0.183);
    backGroup.add(cold);
  };
  lens(plateX - 0.462, plateY + 0.339);
  lens(plateX - 0.462, plateY - 0.347);
  lens(plateX + 0.099, plateY + 0.017);

  const flashCanvas = document.createElement("canvas");
  flashCanvas.width = 128;
  flashCanvas.height = 128;
  const fctx = flashCanvas.getContext("2d");
  const fg = fctx.createRadialGradient(64, 60, 4, 64, 64, 62);
  fg.addColorStop(0, "#ffffff");
  fg.addColorStop(0.45, "#efe6e2");
  fg.addColorStop(0.78, "#cbb9b6");
  fg.addColorStop(1, "#8d7a7b");
  fctx.fillStyle = fg;
  fctx.fillRect(0, 0, 128, 128);
  fctx.strokeStyle = "rgba(255,255,255,0.5)";
  for (let r = 12; r < 60; r += 9) {
    fctx.beginPath();
    fctx.arc(64, 64, r, 0, Math.PI * 2);
    fctx.lineWidth = 1;
    fctx.stroke();
  }
  const flashTexture = new THREE.CanvasTexture(flashCanvas);
  flashTexture.colorSpace = THREE.SRGBColorSpace;

  const flash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.132, 0.132, 0.03, 28),
    new THREE.MeshStandardMaterial({
      map: flashTexture,
      color: 0xffffff,
      emissive: 0xffe9e0,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.1,
    }),
  );
  flash.rotation.x = Math.PI / 2;
  flash.position.set(plateX + 0.677, plateY + 0.339, 0.085);
  backGroup.add(flash);

  const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 22), lensGlass);
  lidar.rotation.x = Math.PI / 2;
  lidar.position.set(plateX + 0.677, plateY - 0.347, 0.085);
  backGroup.add(lidar);

  /* блик стекла: рисуем уже со скруглёнными углами, иначе появятся уголки */
  const sheenCanvas = document.createElement("canvas");
  sheenCanvas.width = 512;
  sheenCanvas.height = 1097;
  const sctx = sheenCanvas.getContext("2d");
  const sheen = sctx.createLinearGradient(0, 0, 512, 700);
  sheen.addColorStop(0, "rgba(255,255,255,0.10)");
  sheen.addColorStop(0.42, "rgba(255,255,255,0.02)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  sctx.fillStyle = sheen;
  sctx.fillRect(0, 0, 512, 1097);
  sctx.globalCompositeOperation = "destination-in";
  roundRect(sctx, 0, 0, 512, 1097, 74);
  sctx.fillStyle = "#fff";
  sctx.fill();

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(screenW, screenH),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sheenCanvas),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glass.position.z = screen.position.z + 0.002;
  group.add(glass);

  /* ── фоновый свет и сигналы вызова ─────────────────────────────────
     Раньше оба слоя лежали ВНУТРИ группы телефона: ореол поворачивался
     вместе с корпусом и вставал ребром («видно, что это текстура»),
     а кольца стояли на фиксированной глубине −0.55 и при развороте
     корпуса оказывались в его толще — просвечивали сквозь экран.
     Теперь свет живёт в сцене, всегда в плоскости кадра, а глубину
     получает в каждом кадре: ровно за габаритом, который телефон
     занимает по Z при текущем повороте. */

  const backFx = new THREE.Group();
  scene.add(backFx);

  /* широкое мягкое пятно: «воздух», который подсвечивает телефон */
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.7, 4.7),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(makeGlowTexture()),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  glow.position.z = -1.2;
  backFx.add(glow);

  /* нимб по силуэту: масштаб считается из проекции габаритов корпуса,
     поэтому при повороте он сжимается вместе с силуэтом и «облегает»
     телефон, а не висит плоской картинкой позади. */
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(makeHaloTexture()),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.5,
    }),
  );
  halo.position.z = -1.1;
  backFx.add(halo);

  /* сигналы вызова: расходящиеся кольца — только фон, за корпусом */
  const signalGroup = new THREE.Group();
  signalGroup.position.z = -1.3;
  scene.add(signalGroup);
  const ringTexture = new THREE.CanvasTexture(makeRingTexture());
  const rings = Array.from({ length: 7 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: ringTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    );
    mesh.visible = false;
    signalGroup.add(mesh);
    return { mesh, start: -1 };
  });
  const RING_TIMES = [1.7, 2.15, 2.6, 3.05, 3.5, 3.95, 4.35];

  /* свет и окружение */
  /* Свет тёплый, а не голубой: холодный поднимал G/B и бургунди выглядел
     серо-розовым (сверено с фото: панель 72/41/48 против 75/50/55). */
  scene.add(new THREE.AmbientLight(0xffdde3, 0.28));
  const key = new THREE.DirectionalLight(0xffe2e2, 0.95);
  key.position.set(2.2, 3.2, 3.6);
  scene.add(key);
  const rim = new THREE.PointLight(0xffb1a6, 20, 14);
  rim.position.set(-3.1, -1.4, 2.2);
  scene.add(rim);
  const warn = new THREE.PointLight(0xff6157, 14, 12);
  warn.position.set(3, 2.4, -1.6);
  scene.add(warn);
  const backLight = new THREE.DirectionalLight(0xffcccc, 0.9);
  backLight.position.set(-2.4, 2.0, -3.4);
  scene.add(backLight);

  // Окружение — настоящая HDR-студия Poly Haven studio_small_09 (CC0),
  // сжатая до equirect 512×256 (tools/polyhaven.py hdri studio_small_09):
  // металл получает реальные блики софтбоксов, а не нарисованный градиент.
  const envTexture = new THREE.TextureLoader().load(envStudio);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;
  scene.environment = envTexture;

  /* ── состояние ─────────────────────────────────────────────────── */

  let generation = 0;
  let gaveCode = false;
  let voice = null;

  const state = {
    node: "incoming",
    view: "locked",
    unlock: 0,
    mode: "incoming",
    gender: Math.random() < 0.5 ? "m" : "f",
    code: String(1000 + Math.floor(Math.random() * 9000)),
    sms: null,
    smsShown: false,
    smsHistory: [],
    notifications: makeNotifications(),
    name: "Неизвестный",
    number: randomNumber(),
    timer: "00:00",
    seconds: 0,
    phase: 0,
    clock: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    hover: null,
    islandW: ISLAND.w,
    islandH: ISLAND.h,
  };

  const paint = () => {
    drawScreen(ctx, state);
    texture.needsUpdate = true;
  };

  const paintLayer = () => {
    drawLockLayer(lctx, state);
    layerTexture.needsUpdate = true;
    blurDirty = true;
    clearTimeout(blurTimer);
    blurTimer = setTimeout(buildBlurs, 90);
  };

  let ticker = null;
  const startTicker = () => {
    if (ticker) return;
    ticker = setInterval(() => {
      state.seconds += 1;
      const mm = String(Math.floor(state.seconds / 60)).padStart(2, "0");
      const ss = String(state.seconds % 60).padStart(2, "0");
      state.timer = `${mm}:${ss}`;
      if (status && state.mode === "active") status.textContent = `разговор · ${state.timer} · запись`;
      paint();
    }, 1000);
  };
  const stopTicker = () => {
    clearInterval(ticker);
    ticker = null;
  };

  /* ── телефонный звук ───────────────────────────────────────────────
     Голос проходит ту же обработку, что и в настоящей трубке: срез ниже
     300 Гц и выше 3400 Гц, подъём разборчивости около 1,9 кГц, мягкое
     насыщение и компрессия. Плюс регулятор громкости и сигнал отбоя. */

  const volumeBox = document.getElementById("phone-volume");
  const volumeRange = document.getElementById("phone-volume-range");
  const volumeValue = document.getElementById("phone-volume-value");

  let audioCtx = null;
  let voiceGain = null;
  let voiceInput = null;

  const softClip = () => {
    const size = 2048;
    const curve = new Float32Array(size);
    const norm = Math.tanh(1.7);
    for (let i = 0; i < size; i += 1) {
      const x = (i * 2) / size - 1;
      curve[i] = Math.tanh(x * 1.7) / norm;
    }
    return curve;
  };

  /* По умолчанию 30%: голос не глушит и не пугает — так просил автор. */
  const volumeFraction = () => (volumeRange ? Number(volumeRange.value) / 100 : 0.3);

  const ensureAudio = () => {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();

    const highpass = audioCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 310;
    highpass.Q.value = 0.7;

    const presence = audioCtx.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 1900;
    presence.gain.value = 4;
    presence.Q.value = 0.9;

    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3400;
    lowpass.Q.value = 0.7;

    const shaper = audioCtx.createWaveShaper();
    shaper.curve = softClip();
    shaper.oversample = "2x";

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -26;
    compressor.knee.value = 20;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;

    voiceGain = audioCtx.createGain();
    /* закрыт, пока не играет реплика: открытый усилитель без источника —
       это и был шум, который слышно сразу после клика по странице */
    voiceGain.gain.value = 0;

    highpass.connect(presence).connect(lowpass).connect(shaper).connect(compressor).connect(voiceGain);
    voiceGain.connect(audioCtx.destination);
    voiceInput = highpass;
    return audioCtx;
  };

  /** Сигнал отбоя: 425 Гц, три коротких гудка — как в обычной телефонии. */
  const playHangup = () => {
    const ctx = ensureAudio();
    if (!ctx) return;
    ctx.resume?.();
    const start = ctx.currentTime + 0.05;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 425;
    const gate = ctx.createGain();
    gate.gain.value = 0;
    osc.connect(gate).connect(ctx.destination);
    for (let i = 0; i < 3; i += 1) {
      const at = start + i * 0.62;
      gate.gain.setValueAtTime(0, at);
      gate.gain.linearRampToValueAtTime(0.13, at + 0.015);
      gate.gain.setValueAtTime(0.13, at + 0.28);
      gate.gain.linearRampToValueAtTime(0, at + 0.32);
    }
    osc.start(start);
    osc.stop(start + 2.1);
  };

  const applyVolume = () => {
    const value = volumeFraction();
    if (voiceGain) voiceGain.gain.value = voice ? value * 0.95 : 0;
    if (voice) voice.volume = Math.min(1, value + 0.15);
    if (volumeValue) volumeValue.textContent = `${Math.round(value * 100)}%`;
    // заливка дорожки подстраивается под значение — как в системных контролах
    if (volumeRange) volumeRange.style.setProperty("--fill", `${Math.round(value * 100)}%`);
  };

  volumeRange?.addEventListener("input", applyVolume);
  applyVolume();

  const stopVoice = () => {
    const el = voice;
    voice = null;
    if (voiceGain) voiceGain.gain.value = 0;
    document.querySelector(".call__rec")?.classList.remove("is-speaking");
    if (!el) return;
    el.onended = null;
    el.onerror = null;
    try {
      el.pause();
    } catch {
      /* уже остановлен */
    }
    try {
      el.currentTime = 0;
    } catch {
      /* нет метаданных */
    }
    /* Без этого элемент держит декодер и поток открытыми: после разговора
       браузер продолжает показывать «звук играет», а в наушниках слышен шум. */
    try {
      el.removeAttribute("src");
      el.load();
    } catch {
      /* не критично */
    }
  };

  /**
   * Полная тишина после разговора: обрываем реплику, снимаем индикатор
   * записи и усыпляем звуковой граф. Гудок отбоя при этом успевает доиграть.
   */
  let sleepTimer = 0;
  const quietAudio = (delay = 1600) => {
    stopVoice();
    if (sleepTimer) clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => {
      sleepTimer = 0;
      if (audioCtx && audioCtx.state === "running") audioCtx.suspend?.().catch(() => {});
    }, delay);
  };

  /** Голос мошенника: ждём окончания реплики, но не бесконечно. */
  const playVoice = (url, onEnd) => {
    stopVoice();
    let finished = false;
    const el = new Audio(url);
    voice = el;
    const finish = () => {
      if (finished) return;
      finished = true;
      /* Если реплику уже оборвали (отбой, «Начать заново», новый звонок),
         страховочный таймер не должен двигать диалог дальше. */
      if (voice !== el) return;
      onEnd();
    };
    try {
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      // через фильтры проходит только этот элемент; если WebAudio недоступен,
      // остаётся обычное воспроизведение
      const ctx = ensureAudio();
      if (ctx && voiceInput) {
        ctx.resume?.();
        try {
          ctx.createMediaElementSource(el).connect(voiceInput);
        } catch {
          /* элемент уже был подключён — играем как есть */
        }
      }
      applyVolume();
      el.onended = () => {
        document.querySelector(".call__rec")?.classList.remove("is-speaking");
        finish();
      };
      el.onerror = () => {
        document.querySelector(".call__rec")?.classList.remove("is-speaking");
        setTimeout(finish, 2400);
      };
      document.querySelector(".call__rec")?.classList.add("is-speaking");
      el.play().catch(() => setTimeout(finish, 2400));
      setTimeout(finish, 30000); // страховка: диалог не должен застрять
    } catch {
      finish();
    }
  };

  const setHint = (text) => {
    if (!hint) return;
    hint.textContent = text;
    hint.hidden = !text;
  };

  /** Три ноты «СМС» — как системный звук iPhone, синтезом. */
  const playSmsTone = () => {
    const ac = ensureAudio();
    if (!ac) return;
    // контекст мог быть усыплён после прошлого разговора
    ac.resume?.();
    const now = ac.currentTime;
    [1046.5, 1318.5, 1568].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = now + i * 0.11;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  };

  /** СМС приходит с того самого номера, который называл «оператор». */
  const showSms = () => {
    if (state.smsShown) return;
    state.smsShown = true;
    state.sms = {
      from: state.number,
      text: `Код ${state.code} — подтверждение продления номера. Никому не сообщайте.`,
      at: performance.now(),
    };
    playSmsTone();
    paint();
  };

  const appendLine = (entry) => {
    const el = document.createElement("p");
    el.className =
      entry.who === "scam" ? "line line--scam" : entry.who === "you" ? "line line--victim" : "line line--note";
    if (entry.who === "note") {
      el.textContent = entry.text;
    } else {
      const text = entry.text.replace("{code}", state.code);
      const who = entry.who === "scam" ? "мошенник" : "Вы";
      el.innerHTML = `<span class="line__who">${who}</span><span>${escapeHtml(text)}</span>`;
      /* визуально колонки разделены сеткой, а скринридеру нужен цельный текст */
      el.setAttribute("aria-label", `${who}: ${text}`);
    }
    log.append(el);
    log.scrollTop = log.scrollHeight;
  };

  /* ── голосовой диалог ─────────────────────────────────────────────
     Мошенник говорит (аудио), затем телефон слушает человека. Распознанный
     текст классифицируется по смыслу, и маршрут шага решает: ответить и идти
     дальше, ответить и переспросить (если человек не по теме) или закончить.
     Кнопок-вариантов нет: человек говорит своим голосом, а если браузер не
     умеет распознавать речь — пишет ответ в поле. */

  const speech = createSpeech({
    lang: "ru-RU",
    onFinal: (text) => onHeard(text),
    onInterim: (text) => showInterim(text),
    onError: (code) => onSpeechError(code),
    onEnd: () => updateVoiceState(),
  });

  let listenTimer = 0;
  let silenceCount = 0;
  let offtopicCount = 0;
  let heardAny = false;
  let panelMode = "speaking";
  let stepId = CALL_START;
  let awaiting = false;
  let typeFallback = !speechSupported;
  let lastHeard = "";
  let speechError = "";
  let lastIntent = "";
  let lastRoute = "";
  const sayQueue = [];

  const trackFor = (id) => (state.gender === "f" ? AUDIO_F[id] : AUDIO_M[id]) || AUDIO_M[id];

  /** Реплика мошенника: текст в лог + голос. */
  const sayLine = (id, done) => {
    const text = LINES[id];
    if (!text) {
      done?.();
      return;
    }
    appendLine({ who: "scam", text });
    const track = trackFor(id);
    if (track) playVoice(track, () => done?.());
    else setTimeout(() => done?.(), isReduced ? 120 : 720);
  };

  /* Сколько ждём тишины. Человек говорит — таймер продлевается по interim. */
  const WAIT_MS = () => (typeFallback ? 60000 : 6000);

  const clearListenTimer = () => {
    clearTimeout(listenTimer);
    listenTimer = 0;
  };

  /* Полоски «вас слышно» рисуются по распознанному тексту, без второго
     захвата микрофона: параллельный getUserMedia ломает распознавание. */
  const pulseMeter = (strength = 0) => {
    const bars = Array.from(choices.querySelectorAll(".voice__meter i"));
    if (!bars.length) return;
    const n = Math.max(2, Math.round(Math.min(1, 0.25 + strength) * bars.length));
    bars.forEach((bar, index) => {
      const on = index < n;
      bar.style.opacity = on ? "1" : "0.2";
      bar.style.transform = `scaleY(${on ? 0.45 + (strength || 0.25) : 0.3})`;
    });
  };

  const renderVoicePanel = (step, mode = "speaking") => {
    panelMode = mode;
    const live = mode === "listening";
    const waiting = mode === "thinking";
    const typing = mode === "typing";
    const statusText = live
      ? "слушаю вас"
      : waiting
        ? "разбираю ваш ответ"
        : typing
          ? "напишите ответ"
          : "говорит мошенник";
    choices.innerHTML = `
      <div class="voice">
        <div class="voice__head">
          <span class="voice__dot ${live ? "is-live" : ""}"></span>
          <span class="voice__state">${statusText}</span>
          <span class="voice__mic">${live ? "микрофон включён" : ""}</span>
        </div>
        ${live ? `<div class="voice__meter" aria-hidden="true">${"<i></i>".repeat(28)}</div>` : ""}
        <p class="voice__heard" id="phone-heard">${
          lastHeard
            ? `вы сказали: «${escapeHtml(lastHeard)}»`
            : live
              ? "скажите что-нибудь — я запишу ваш ответ"
              : typing
                ? "наберите ответ и нажмите «Сказать»"
                : "…"
        }</p>
        <p class="voice__hint">${escapeHtml(step?.hint ?? "")}</p>
        <form class="voice__type" id="phone-type" ${live || typeFallback ? "" : "hidden"}>
          <input id="phone-type-input" type="text" autocomplete="off" enterkeyhint="send"
                 placeholder="${typeFallback ? "Микрофон недоступен — напишите ответ" : "или напишите ответ текстом"}" />
          <button type="submit" class="voice__send">Сказать</button>
        </form>
        <p class="voice__note" id="phone-voice-note">${
          typeFallback
            ? "Этот браузер не распознаёт речь: ответьте текстом. Полноценный разговор — в Chrome или Edge."
            : "Говорите обычным голосом. Распознаёт речь сам браузер."
        }</p>
      </div>`;
    const form = choices.querySelector("#phone-type");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector("input");
        const value = input?.value.trim();
        if (!value) return;
        input.value = "";
        /* напечатать можно и пока мошенник говорит: ответ не теряем, а
           применяем в момент, когда придёт очередь слушать */
        if (awaiting) onHeard(value);
        else sayQueue.push(value);
      });
    }
    if (live) pulseMeter();
  };

  const updateVoiceState = () => {
    const stateEl = choices.querySelector(".voice__state");
    /* в текстовом режиме панель не должна «звучать»: микрофона там нет */
    if (stateEl) {
      stateEl.textContent =
        panelMode === "typing" ? "напишите ответ" : awaiting ? "слушаю вас" : "говорит мошенник";
    }
    const dot = choices.querySelector(".voice__dot");
    if (dot) dot.classList.toggle("is-live", awaiting);
  };

  const showInterim = (text) => {
    const line = document.getElementById("phone-heard");
    if (line) line.textContent = `слышу: «${text}…»`;
    /* человек говорит — панель должна это показывать, а не «говорит мошенник» */
    const stateEl = choices.querySelector(".voice__state");
    if (stateEl) stateEl.textContent = "слышу вас";
    choices.querySelector(".voice__dot")?.classList.add("is-live");
    /* человек говорит — ожидание продлевается: таймер считает тишину, а не время */
    if (awaiting) {
      clearListenTimer();
      const my = generation;
      listenTimer = setTimeout(() => {
        if (my !== generation || !awaiting) return;
        onSilence(STEPS[stepId] ?? {});
      }, WAIT_MS());
    }
    pulseMeter(Math.min(1, text.length / 24));
    showLiveLine(text);
  };

  /* Строка «Вы: …» в журнале, которая обновляется по мере распознавания. */
  let liveLine = null;
  const showLiveLine = (text) => {
    if (!liveLine) {
      liveLine = document.createElement("p");
      liveLine.className = "line line--victim line--live";
      liveLine.setAttribute("aria-live", "polite");
      log.append(liveLine);
    }
    liveLine.innerHTML = `<span class="line__who">Вы</span><span>${escapeHtml(text)}</span>`;
    liveLine.setAttribute("aria-label", `Вы (распознаётся): ${text}`);
    log.scrollTop = log.scrollHeight;
  };
  const clearLiveLine = () => {
    liveLine?.remove();
    liveLine = null;
  };

  const showHeard = (text) => {
    const line = document.getElementById("phone-heard");
    if (line) line.textContent = `вы сказали: «${text}»`;
    lastHeard = text;
  };

  const onSpeechError = (code) => {
    speechError = code;
    typeFallback = true;
    const reason =
      code === "audio-capture"
        ? "Микрофон не найден — подключите его или напишите ответ текстом."
        : code === "not-allowed" || code === "service-not-allowed"
          ? "Нет доступа к микрофону — ответьте текстом в поле ниже."
          : code === "network"
          ? "Распознавание речи недоступно без сети — напишите ответ текстом."
          : "Не расслышал. Напишите ответ текстом — или попробуйте сказать ещё раз.";
    /* панель перерисовывается целиком: иначе остаётся «слушаю вас» с мёртвым
       микрофоном — человек думает, что его слышат */
    renderVoicePanel(STEPS[stepId] ?? {}, "typing");
    const note = document.getElementById("phone-voice-note");
    if (note) note.textContent = reason;
    document.getElementById("phone-type-input")?.focus({ preventScroll: true });
    setHint("микрофон недоступен — напишите ответ в поле справа");
    /* перезапускаем ожидание с «печатным» лимитом */
    if (awaiting) {
      clearListenTimer();
      const my = generation;
      listenTimer = setTimeout(() => {
        if (my !== generation || !awaiting) return;
        onSilence(STEPS[stepId] ?? {});
      }, 60000);
    }
  };

  /** Слушаем ответ человека. */
  const listen = (step) => {
    awaiting = true;
    /* если микрофон уже отвалился — слушать нечего, сразу текстовый режим */
    renderVoicePanel(step, typeFallback ? "typing" : "listening");
    clearListenTimer();
    const my = generation;
    listenTimer = setTimeout(() => {
      if (my !== generation || !awaiting) return;
      onSilence(step);
    }, WAIT_MS());
    if (!typeFallback) speech.start();
    /* отладочная очередь фраз: позволяет прогнать диалог без микрофона */
    if (sayQueue.length) {
      const next = sayQueue.shift();
      setTimeout(() => {
        if (my === generation && awaiting) onHeard(next);
      }, 120);
    }
  };

  const onSilence = (step) => {
    awaiting = false;
    speech.stop();
    silenceCount += 1;
    const action = step.silence ?? { say: "silence", reask: true };
    const my = generation;
    /* два раза тишина и ни одного распознанного слова — вероятно, сервис
       распознавания не отвечает: предлагаем текст, а не гоняем «Алло?» */
    if (silenceCount >= 2 && !heardAny) {
      typeFallback = true;
      speechError = speechError || "no-results";
      renderVoicePanel(step, "typing");
      const note = document.getElementById("phone-voice-note");
      if (note) note.textContent = "Распознавание не ответило — напишите ответ текстом, разговор продолжится.";
      setHint("напишите ответ в поле справа");
      awaiting = true;
      return;
    }
    if (silenceCount >= 2) {
      /* третий раз молчит — мошенник не отступает и идёт по скрипту */
      const next = step.routes?.yes?.next ?? "pressure";
      enterStep(next);
      return;
    }
    sayLine(action.say, () => {
      if (my !== generation) return;
      listen(step);
    });
  };

  /** Разбор сказанного и маршрут шага. */
  const onHeard = (text) => {
    if (!awaiting) return;
    awaiting = false;
    silenceCount = 0;
    clearListenTimer();
    speech.stop();
    const step = STEPS[stepId];
    if (!step) return;
    const intent = classifyUtterance(text, step);
    heardAny = true;
    clearLiveLine();
    appendLine({ who: "you", text });
    showHeard(text);
    if (intent === "code") {
      const code = pickCode(text);
      if (code) {
        state.code = code;
        gaveCode = true;
      }
    }
    if (intent === "offtopic") offtopicCount += 1;
    else offtopicCount = 0;
    /* второй раз «не по теме» — не переспрашиваем вечно: мошенник сам
       подводит разговор к следующему шагу скрипта */
    if (offtopicCount >= 2) {
      const next = step.routes?.yes?.next ?? "pressure";
      lastIntent = "offtopic→next";
      lastRoute = JSON.stringify({ next });
      const gen = generation;
      sayLine("bridge", () => {
        if (generation === gen) enterStep(next);
      });
      return;
    }
    const action = step.routes?.[intent] ?? step.routes?.offtopic ?? {};
    lastIntent = intent;
    lastRoute = JSON.stringify(action);
    const my = generation;
    if (action.say) {
      sayLine(action.say, () => {
        if (my !== generation) return;
        if (action.reask || !action.next) listen(step);
        else enterStep(action.next);
      });
      return;
    }
    if (action.next) {
      enterStep(action.next);
      return;
    }
    listen(step);
  };

  const finishCall = (step) => {
    state.mode = "ended";
    awaiting = false;
    clearListenTimer();
    speech.abort();
    stopTicker();
    quietAudio();
    if (volumeBox) volumeBox.hidden = true;
    playHangup();
    crossfade();
    paint();
    if (status) status.textContent = `разговор завершён · ${state.timer}`;
    (step.outro ?? []).forEach((text) => appendLine({ who: "note", text }));
    choices.innerHTML = `
      <div class="voice voice--done">
        <p class="voice__title">${escapeHtml(step.title ?? "Разговор завершён")}</p>
        <p class="voice__note">Разбор — в журнале слева. «Начать заново» подберёт новый номер и новый голос.</p>
      </div>`;
    if (reset) reset.hidden = false;
    setHint("нажмите «Начать заново», чтобы пройти разговор другим путём");
  };

  const enterStep = (id) => {
    /* фраза, сказанная на прошлом шаге, не должна «переехать» в новый */
    if (id !== stepId) {
      sayQueue.length = 0;
      offtopicCount = 0;
      silenceCount = 0;
    }
    const step = STEPS[id];
    if (!step) return;
    generation += 1;
    stepId = id;
    state.step = id;
    state.node = id;
    awaiting = false;
    clearListenTimer();
    speech.abort();
    choices.innerHTML = "";
    lastHeard = "";

    if (step.end) {
      finishCall(step);
      return;
    }

    if (step.gaveCode) gaveCode = true;
    if (id === "sms" && !state.smsShown) {
      const my = generation;
      setTimeout(() => {
        if (my === generation) showSms();
      }, 2400);
    }
    if (state.mode !== "active") {
      state.mode = "active";
      startTicker();
    }
    if (status) status.textContent = `разговор · ${state.timer} · запись`;
    setHint("говорите обычным голосом — мошенник ответит");
    paint();

    renderVoicePanel(step, "speaking");
    const replies = (step.replies ?? []).slice();
    const my = generation;
    const nextReply = () => {
      if (my !== generation) return;
      const replyId = replies.shift();
      if (replyId) {
        sayLine(replyId, () => {
          if (my !== generation) return;
          nextReply();
        });
        return;
      }
      (step.notes ?? []).forEach((text) => appendLine({ who: "note", text }));
      listen(step);
    };
    nextReply();
  };

  const bindActions = () => {
    choices.querySelectorAll("[data-phone-action]").forEach((button) => {
      button.addEventListener("click", () => runAction(button.dataset.phoneAction));
    });
  };

  const renderLockKeys = () => {
    choices.innerHTML = `
      <div class="call__keys">
        <button type="button" class="choice" data-phone-action="unlock">Разблокировать</button>
      </div>`;
    bindActions();
    setHint("");
  };

  const renderIncomingKeys = () => {
    choices.innerHTML = `
      <div class="call__keys">
        <button type="button" class="choice" data-phone-action="answer">Ответить</button>
        <button type="button" class="choice" data-phone-action="decline">Отклонить</button>
      </div>`;
    bindActions();
    setHint("нажмите «Ответить» на экране телефона и говорите обычным голосом");
  };

  /** Экран входящего: кнопки на самом телефоне дублируются на панели. */
  const showIncoming = () => {
    generation += 1;
    stepId = "incoming";
    state.node = "incoming";
    state.mode = "incoming";
    awaiting = false;
    clearListenTimer();
    speech.abort();
    renderIncomingKeys();
    revealed = true;
    paint();
    if (status) status.textContent = "входящий · 00:00";
  };

  const runAction = (action) => {
    if (action === "unlock") {
      finishUnlock();
      return;
    }
    if (action === "answer" && state.mode === "incoming" && introDone) {
      /* жест пользователя: разблокируем звук и просим микрофон */
      ensureAudio()?.resume?.();
      if (!typeFallback) pulseMeter();
      enterStep(CALL_START);
      return;
    }
    if (action === "decline" && state.mode === "incoming" && introDone) {
      enterStep("end_declined");
      return;
    }
    if (action === "hangup" && state.mode === "active") {
      enterStep(gaveCode ? "end_after_code" : "end_declined");
    }
  };

  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

  const restart = () => {
    generation += 1;
    gaveCode = false;
    /* диалог начинается заново: сбрасываем шаг и ожидание речи */
    stepId = "incoming";
    awaiting = false;
    silenceCount = 0;
    lastHeard = "";
    /* нет доступа к микрофону — оставляем текстовый режим; сетевые сбои пробуем снова */
    if (speechError !== "not-allowed" && speechError !== "service-not-allowed") {
      typeFallback = false;
      speechError = "";
    }
    sayQueue.length = 0;
    clearListenTimer();
    speech.abort();
    stopTicker();
    quietAudio(0);
    // сигналы вызова с прошлого прохода не должны висеть на новом
    ringsAt = -1;
    rings.forEach((ring) => {
      ring.mesh.visible = false;
      ring.mesh.material.opacity = 0;
    });
    log.innerHTML = "";
    choices.innerHTML = "";
    if (reset) reset.hidden = true;
    if (volumeBox) volumeBox.hidden = true;
    Object.assign(state, {
      node: "incoming",
      /* телефон после «Начать заново» сразу на входящем — свайп не нужен */
      view: isMobile() ? "call" : "locked",
      unlock: 0,
      mode: "incoming",
      gender: Math.random() < 0.5 ? "m" : "f",
      code: String(1000 + Math.floor(Math.random() * 9000)),
      sms: null,
      smsShown: false,
      smsHistory: [],
      notifications: makeNotifications(),
      number: randomNumber(),
      timer: "00:00",
      seconds: 0,
      phase: 0,
      clock: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      hover: null,
      islandW: ISLAND.w,
      islandH: ISLAND.h,
    });
    paint();
    paintLayer();
    if (status) status.textContent = "";
    if (state.view === "call") {
      revealed = true;
      showIncoming();
    } else {
      renderLockKeys();
    }
    crossfade();
  };

  reset?.addEventListener("click", restart);

  /* ── попадания по экрану ───────────────────────────────────────── */

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();

  const pointerToDesign = (event) => {
    const box = canvas.getBoundingClientRect();
    ndc.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    ndc.y = -((event.clientY - box.top) / box.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(screen, false)[0];
    if (!hit) return null;
    hitPoint.copy(hit.point);
    screen.worldToLocal(hitPoint);
    const u = hitPoint.x / screenW + 0.5;
    const v = 0.5 - hitPoint.y / screenH;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { x: u * DESIGN.w, y: v * DESIGN.h };
  };

  const activeButtons = () => {
    if (!introDone || state.view === "locked") return [];
    if (state.mode === "incoming") return ["decline", "answer"];
    if (state.mode === "active") return ["hangup"];
    return [];
  };

  const hitTest = (point) => {
    if (!point) return null;
    return (
      activeButtons().find((id) => {
        const b = BUTTONS[id];
        return Math.hypot(point.x - b.x, point.y - b.y) <= b.r + HIT_PADDING;
      }) ?? null
    );
  };

  let hovering = false;
  const setHover = (id) => {
    if (state.hover === id) return;
    state.hover = id;
    canvas.style.cursor = id ? "pointer" : "grab";
    paint();
  };

  /* Телефон можно взять и крутить: тянем мышью или пальцем в любую сторону,
     угол ограничен ±77° по горизонтали и ±48° по вертикали. */
  const swipe = { active: false, pointerId: null, startY: 0, lastMoveAt: 0 };
  let unlocking = false;
  let revealed = false;
  let unlockStartedAt = 0;
  let unlockFrom = 0;
  /* Разблокировка — как в iOS: экран должен уехать почти до половины,
     а если дотянуть до самого верха — открывается само, без отпускания. */
  const UNLOCK_THRESHOLD = 0.42;
  const UNLOCK_SNAP = 0.9;

  const finishUnlock = () => {
    if (state.view !== "locked" || unlocking) return;
    unlocking = true;
    unlockStartedAt = performance.now();
    unlockFrom = state.unlock ?? 0;
  };

  const endSwipe = (cancel = false) => {
    if (!swipe.active) return false;
    swipe.active = false;
    if (swipe.pointerId !== null) {
      try {
        canvas.releasePointerCapture(swipe.pointerId);
      } catch {
        /* уже отпущен */
      }
    }
    swipe.pointerId = null;
    if (!cancel && (state.unlock ?? 0) >= UNLOCK_THRESHOLD) {
      finishUnlock();
    } else if (revealed) {
      /* шторка возвращается — под ней снова экран блокировки */
      revealed = false;
      paint();
    }
    return true;
  };

  const grab = { active: false, pointerId: null, startX: 0, startY: 0, baseY: 0, baseX: 0, lastT: 0 };
  const manual = { y: 0, x: 0 };
  /* инерция: отпустил телефон на ходу — он ещё немного докручивается сам */
  const spin = { y: 0, x: 0 };
  /* возврат в исходное положение по двойному клику — анимированный */
  const home = { active: false, fromY: 0, fromX: 0, at: 0 };
  let lastGrabAt = 0;

  const releaseGrab = (event) => {
    if (!grab.active) return;
    grab.active = false;
    lastGrabAt = performance.now();
    spin.y = clamp(spin.y, -9, 9);
    spin.x = clamp(spin.x, -9, 9);
    if (grab.pointerId !== null) {
      try {
        canvas.releasePointerCapture(grab.pointerId);
      } catch {
        /* уже отпущен */
      }
    }
    grab.pointerId = null;
    canvas.style.cursor = "grab";
    if (event) setHover(hitTest(pointerToDesign(event)));
  };

  canvas.style.touchAction = "manipulation";

  canvas.style.cursor = "grab";

  /* Браузер на телефоне всё равно начинает прокрутку страницы, пока палец
     на экране телефона: touch-action в CSS до эффективного значения не доходит.
     Гасим события касания сами — тогда свайп разблокировки не уезжает вместе
     со страницей. */
  /* Прокрутку страницы гасим только во время движения пальца: на touchstart
     этого делать нельзя — смена overflow сдвигает макет и тап уходит мимо
     кнопки «Ответить». */
  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length < 2) event.preventDefault();
    },
    { passive: false },
  );

  canvas.addEventListener("pointerdown", (event) => {
    // на заблокированном экране жест — свайп вверх, а не вращение модели
    if (introDone && state.view === "locked" && pointerToDesign(event)) {
      event.preventDefault();
      swipe.active = true;
      swipe.pointerId = event.pointerId;
      swipe.startY = event.clientY;
      swipe.lastMoveAt = performance.now();
      unlocking = false; // новый жест отменяет прежний досчёт
      /* один раз на жест: под шторкой должен быть звонок, а не обои */
      if (!revealed) {
        revealed = true;
        const keep = state.view;
        state.view = "call";
        paint();
        state.view = keep;
      }
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* не критично */
      }
      return;
    }

    const action = hitTest(pointerToDesign(event));
    if (action) {
      event.preventDefault();
      runAction(action);
      return;
    }
    grab.active = true;
    grab.pointerId = event.pointerId;
    grab.startX = event.clientX;
    grab.startY = event.clientY;
    grab.baseY = manual.y;
    grab.baseX = manual.x;
    grab.lastT = performance.now();
    spin.y = 0;
    spin.x = 0;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* не критично */
    }
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("pointermove", (event) => {
    if (swipe.active && event.pointerId === swipe.pointerId) {
      /* 1:1 по высоте экрана: палец прошёл половину — экран уехал наполовину.
         Никакого paint() здесь — слой уже отдельный меш, перерисовка давала «20 fps». */
      const dy = (event.clientY - swipe.startY) / Math.max(1, canvas.clientHeight);
      state.unlock = clamp(-dy, 0, 1);
      swipe.lastMoveAt = performance.now();
      return;
    }
    if (grab.active && event.pointerId === grab.pointerId) {
      const dx = (event.clientX - grab.startX) / Math.max(1, canvas.clientWidth);
      const dy = (event.clientY - grab.startY) / Math.max(1, canvas.clientHeight);
      /* Вращение свободное: и по горизонтали, и по вертикали, без упоров —
         телефон можно положить на бок и перевернуть. */
      const prevY = manual.y;
      const prevX = manual.x;
      manual.y = grab.baseY + dx * 2.7;
      manual.x = grab.baseX - dy * 1.7;
      const now = performance.now();
      const dt = Math.max(8, now - grab.lastT);
      grab.lastT = now;
      spin.y = ((manual.y - prevY) / dt) * 16;
      spin.x = ((manual.x - prevX) / dt) * 16;
      canvas.style.cursor = "grabbing";
      return;
    }
    setHover(hitTest(pointerToDesign(event)));
  });

  const onPointerUp = (event) => {
    if (endSwipe()) return;
    releaseGrab(event);
  };
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", (event) => {
    if (endSwipe()) return;
    releaseGrab(event);
  });
  canvas.addEventListener("pointerleave", () => {
    hovering = false;
    releaseGrab(null);
    setHover(null);
  });
  /* Указатель может уйти за пределы холста и отпуститься там: без этих
     обработчиков шторка «залипала» и оставалась висеть в воздухе. */
  canvas.addEventListener("lostpointercapture", () => {
    endSwipe();
  });
  window.addEventListener("pointerup", (event) => {
    if (swipe.active && event.pointerId === swipe.pointerId) endSwipe();
  });
  window.addEventListener("pointercancel", () => {
    endSwipe();
  });
  window.addEventListener("blur", () => {
    endSwipe();
  });
  canvas.addEventListener("pointerenter", () => {
    hovering = true;
  });

  // двойной клик — плавно вернуть телефон в исходное положение
  canvas.addEventListener("dblclick", () => {
    home.active = true;
    home.fromY = manual.y;
    home.fromX = manual.x;
    home.at = performance.now();
  });

  /* ── заставка: спина → дрожь и сигналы → переворот ─────────────── */

  const TIMELINE = { backEnd: 1.6, flipStart: 3.45, flipEnd: 4.85, ready: 5.25 };
  let introStart = -1;
  /* Отдельное время жизни колец: раньше они обновлялись только внутри
     ветки заставки, и последнее кольцо, стартовавшее на 4.35 с, застревало
     на экране навсегда — при повороте телефона оно «плавало» вокруг него. */
  let ringsAt = -1;
  const RINGS_TOTAL = 5.9;
  let introDone = isReduced;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  /* smoothstep мягче кубического ease: максимальная скорость вдвое ниже —
     переворот перестаёт «прыгать» в середине. */
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const startIntro = () => {
    if (introStart >= 0 || introDone) return;
    introStart = performance.now();
    ringsAt = introStart;
    RING_TIMES.forEach((time, index) => {
      rings[index].start = time;
    });
  };

  /* ── рендер ────────────────────────────────────────────────────── */

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return;
    renderer.setSize(box.width, box.height, false);
    camera.aspect = box.width / box.height;
    camera.updateProjectionMatrix();

    /* Резкость текста: текстура должна быть чуть крупнее экранных пикселей.
       Раньше масштаб был фиксированный (2, потом 3) — на одном размере текст
       растягивался, на другом сжимался, и в обоих случаях выглядел мыльным. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wanted = clamp(Math.ceil((box.width * dpr * 1.15) / DESIGN.w), 1, 4);
    if (wanted !== TEXTURE_SCALE) {
      TEXTURE_SCALE = wanted;
      screenCanvas.width = DESIGN.w * TEXTURE_SCALE;
      screenCanvas.height = DESIGN.h * TEXTURE_SCALE;
      fadeCanvas.width = screenCanvas.width;
      fadeCanvas.height = screenCanvas.height;
      layerCanvas.width = DESIGN.w * TEXTURE_SCALE;
      layerCanvas.height = DESIGN.h * TEXTURE_SCALE;
      texture.needsUpdate = true;
      layerTexture.needsUpdate = true;
      paint();
      paintLayer();
      return;
    }
    paint();
  };

  let visible = true;
  /* Отладочный флаг: держит цикл кадров живым, даже если наблюдатель говорит иное. */
  let forceVisible = false;
  let frame = 0;
  let lastRepaint = 0;
  let lastAnimPaint = 0;
  const startedAt = performance.now();
  let lastFrameAt = startedAt;
  /* Только для отладки: даёт прокручивать время вручную там, где rAF стоит. */
  let fixedDt = 0;
  const target = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };

  stage.addEventListener(
    "pointermove",
    (event) => {
      const box = canvas.getBoundingClientRect();
      target.x = (event.clientX - box.left) / box.width - 0.5;
      target.y = (event.clientY - box.top) / box.height - 0.5;
    },
    { passive: true },
  );

  const updateRings = (t) => {
    rings.forEach((ring) => {
      if (ring.start < 0) return;
      const progress = clamp01((t - ring.start) / 1.3);
      if (progress <= 0) {
        ring.mesh.visible = false;
        return;
      }
      if (progress >= 1) {
        ring.mesh.visible = false;
        return;
      }
      ring.mesh.visible = true;
      const scale = 1.1 + progress * 3.4;
      ring.mesh.scale.set(scale, scale, 1);
      ring.mesh.material.opacity = 0.8 * (1 - progress) ** 0.85;
    });
  };

  /**
   * Ошибка внутри кадра не должна замораживать страницу: гасим цикл и
   * запоминаем сообщение (в консоль и в localStorage — чтобы было видно, что стряслось).
   */
  const fail = (error) => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    try {
      localStorage.setItem("ne-kluy:phone-error", String(error?.stack || error));
    } catch {
      /* приватный режим */
    }
    console.error("[phone]", error);
  };

  const loop = () => {
    // вне экрана не рисуем вовсе: телефон может висеть ниже вьюпорта
    if (!forceVisible && !visible) {
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(loop);
    if (window.__phoneFrames !== undefined) window.__phoneFrames += 1;
    try {
      tick();
    } catch (error) {
      fail(error);
    }
  };

  const tick = () => {
    const now = performance.now();
    const t = (now - startedAt) / 1000;

    let animPaint = false;

    /* Шаг времени: сглаживания на фиксированном коэффициенте ведут себя
       по-разному на 60 и 120 Гц — отсюда и ощущение «рваности». Считаем dt. */
    const dt = fixedDt || clamp((now - lastFrameAt) / 1000, 0.001, 0.05);
    lastFrameAt = now;

    if (state.view === "locked") {
      lockLayer.visible = true;
      /* Сторожевой таймер на случай потерянного pointerup. Он НЕ разблокирует:
         «нет движения» не значит «отпустил» — человек может просто держать
         палец. Жест отменяется, шторка мягко возвращается. */
      if (swipe.active && now - swipe.lastMoveAt > 6000) endSwipe(true);

      /* Дотянул до самого верха — открываем, не ждём отпускания. */
      if (swipe.active && !unlocking && (state.unlock ?? 0) >= UNLOCK_SNAP) finishUnlock();

      if (unlocking) {
        // свайп принят: слой уезжает вверх до конца
        const prev = state.unlock ?? 0;
        state.unlock = Math.min(1, prev + (1 - prev) * (1 - Math.exp(-dt / 0.1)));
        if (state.unlock >= 0.995) {
          unlocking = false;
          state.unlock = 0;
          state.view = "call";
          lockLayer.visible = false;
          lockLayer.position.y = 0;
          lockLayer.scale.set(1, 1, 1);
          layerMat.opacity = 1;
          revealed = false;
          swipe.active = false;
          swipe.pointerId = null;
          showIncoming();
          paint();
        }
      } else if (!swipe.active && (state.unlock ?? 0) > 0) {
        /* Пока жест активен, слой держится за пальцем: раньше tick гасил
           unlock прямо во время перетаскивания — отсюда «дёргание»,
           самопроизвольное опускание и застревание шторки. */
        state.unlock += (0 - (state.unlock ?? 0)) * (1 - Math.exp(-dt / 0.13));
        if (state.unlock < 0.004) state.unlock = 0;
      }
      const u = state.unlock ?? 0;
      /* Экран под шторкой переключается ТОЛЬКО в начале жеста (pointerdown)
         и при его отмене. Раньше это делалось по порогу u прямо в кадре:
         рука слегка колеблется вокруг порога — и текстура экрана
         перерисовывалась десятки раз, отсюда мигание прозрачности. */
      lockLayer.position.y = u * (screenH + 0.15);
      /* Плашка не должна таять на старте жеста: до 55% хода она полностью
         непрозрачна (по жалобе «исчезает почти сразу»), и только на
         последних сантиметрах уходит в прозрачность. */
      const vanish = clamp01((u - 0.55) / 0.45);
      /* К самому верху шторка должна исчезнуть полностью: раньше она
         оставалась на 50% и читалась тёмной плашкой поверх звонка. */
      layerMat.opacity = 1 - vanish;
      /* Чем дальше уехала шторка, тем сильнее расфокус контента:
         на настоящем экране блокировки часы и уведомления мутнеют,
         а не уезжают резкой картинкой. */
      setLayerSharpness(u > 0.6 ? 3 : u > 0.34 ? 2 : u > 0.08 ? 1 : 0);
      // лёгкий уход в глубину — шторка отъезжает, а не просто скользит
      const shrink = 1 - vanish * 0.05;
      lockLayer.scale.set(shrink, shrink, 1);
    } else {
      lockLayer.visible = false;
      lockLayer.scale.set(1, 1, 1);
      setLayerSharpness(0);
    }

    if (state.sms) {
      const age = now - state.sms.at;
      if (age < 1400 || (age > 6900 && age < 7500)) animPaint = true;
      if (age > 7500) {
        const card = {
          app: "sms",
          color: "#30d158",
          title: `СМС · ${state.sms.from}`,
          text: state.sms.text,
          time: state.clock,
        };
        state.smsHistory = [card, ...state.smsHistory].slice(0, 2);
        state.sms = null;
        paint();
      }
    }

    if (introStart > 0 && !introDone) {
      const elapsed = (now - introStart) / 1000;

      if (elapsed < TIMELINE.backEnd) {
        // спина: медленный разворот, чтобы было видно яблоко и блок камер
        const k = easeInOut(clamp01(elapsed / TIMELINE.backEnd));
        group.rotation.y = Math.PI + 0.5 - k * 0.3;
        group.rotation.x = -0.06 + Math.sin(k * Math.PI) * 0.05;
        group.rotation.z = 0;
      } else if (elapsed < TIMELINE.flipStart) {
        /* дрожь: телефон «звонит», из него идут сигналы.
           Амплитуда входит плавно и гаснет к перевороту — раньше на стыке
           фаз был скачок позиции и угла, и переворот начинался рывком. */
        const local = elapsed - TIMELINE.backEnd;
        const shake = clamp01(local / 0.5);
        const ramp = Math.sin((shake * Math.PI) / 2);
        const fadeOut = 1 - clamp01((elapsed - (TIMELINE.flipStart - 0.45)) / 0.45);
        const amp = (0.005 + shake * 0.009) * fadeOut;
        const wob = Math.sin(local * 6) * 0.045 * ramp * fadeOut;
        group.rotation.y = Math.PI + 0.2 + wob;
        group.rotation.x = -0.06;
        group.rotation.z = Math.sin(local * 40) * amp * 0.4;
        group.position.x = Math.sin(local * 46) * amp;
        group.position.y = Math.sin(local * 34) * amp * 0.6;
      } else if (elapsed < TIMELINE.flipEnd) {
        // переворот экраном к человеку — от того угла, на котором кончилась дрожь
        const k = smoothstep(clamp01((elapsed - TIMELINE.flipStart) / (TIMELINE.flipEnd - TIMELINE.flipStart)));
        group.rotation.y = (Math.PI + 0.2) * (1 - k);
        group.rotation.z = Math.sin(k * Math.PI) * -0.045;
        group.rotation.x = -0.06 * (1 - k);
        group.position.x = 0;
        group.position.y = Math.sin(k * Math.PI) * 0.04;
        screenMat.opacity = clamp01((k - 0.4) / 0.6);
      } else {
        // экран перед нами: гасим остатки анимации
        const k = clamp01((elapsed - TIMELINE.flipEnd) / (TIMELINE.ready - TIMELINE.flipEnd));
        group.rotation.y = 0;
        group.rotation.z = 0;
        group.rotation.x = 0;
        group.position.x = 0;
        group.position.y = Math.sin((1 - k) * Math.PI) * 0.012;
        screenMat.opacity = 1;
        if (elapsed >= TIMELINE.ready && !introDone) {
          introDone = true;
          group.rotation.set(0, 0, 0);
          /* на телефоне свайп по экрану конфликтует с прокруткой страницы,
             поэтому сразу показываем входящий — кнопки видны и нажимаются */
          if (isMobile()) {
            state.view = "call";
            showIncoming();
          } else if (status) {
            status.textContent = "экран блокировки";
          }
        }
      }
    } else if (!introDone) {
      // заставка ещё не запускалась: спина, лёгкое покачивание
      group.rotation.y = Math.PI + Math.sin(t * 0.4) * 0.06;
      group.rotation.x = -0.05;
      screenMat.opacity = 0;
    } else {
      const damp = hovering || grab.active ? 0.15 : 1;
      const follow = 1 - Math.exp(-dt / 0.075);
      pointer.x += (target.x * damp - pointer.x) * follow;
      pointer.y += (target.y * damp - pointer.y) * follow;
      const free = grab.active || home.active ? 0 : damp;
      // пока на телефон не навели курсор — он мелко дрожит: живой аппарат ждёт звонка
      const tremble = Math.sin(t * 26.5) * 0.0024 * free + Math.sin(t * 41) * 0.0009 * free;

      /* Плавный возврат в исходное положение по двойному клику. */
      if (home.active) {
        const k = clamp01((now - home.at) / 620);
        const eased = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        manual.y = home.fromY * (1 - eased);
        manual.x = home.fromX * (1 - eased);
        spin.y = 0;
        spin.x = 0;
        if (k >= 1) home.active = false;
      }
      /* Докрутка после отпускания. Телефон остаётся в том положении,
         в котором его оставили: он твой, а не «возвращается сам». */
      if (!grab.active && !home.active && (Math.abs(spin.y) > 0.0005 || Math.abs(spin.x) > 0.0005)) {
        manual.y += spin.y * dt;
        manual.x += spin.x * dt;
        const decay = Math.exp(-dt * 3.6);
        spin.y *= decay;
        spin.x *= decay;
        if (Math.abs(spin.y) < 0.0005) spin.y = 0;
        if (Math.abs(spin.x) < 0.0005) spin.x = 0;
      }
      group.rotation.y = manual.y + pointer.x * 0.3;
      group.rotation.x = manual.x - pointer.y * 0.16;
      group.rotation.z = tremble * 0.5;
      group.position.y = Math.sin(t * 0.55) * 0.022 + Math.sin(t * 33) * 0.0009 * free;
    }

    /* Кольца живут своим таймером: после последнего сигнала все гасим,
       иначе они остаются висеть навсегда и «плавают» вокруг телефона. */
    if (ringsAt > 0) {
      const ringTime = (now - ringsAt) / 1000;
      updateRings(ringTime);
      if (ringTime > RINGS_TOTAL) {
        ringsAt = -1;
        rings.forEach((ring) => {
          ring.mesh.visible = false;
          ring.mesh.material.opacity = 0;
        });
      }
    }

    /* ── фоновый свет: всегда позади корпуса ───────────────────────────
       Считаем, насколько телефон вытянут в глубину при текущем повороте,
       и отодвигаем за это расстояние и ореол, и кольца. Так они никогда
       не оказываются внутри корпуса и не просвечивают сквозь экран. */
    const cosY = Math.abs(Math.cos(group.rotation.y));
    const sinY = Math.abs(Math.sin(group.rotation.y));
    const cosX = Math.abs(Math.cos(group.rotation.x));
    const sinX = Math.abs(Math.sin(group.rotation.x));
    const extent = (bodyW * sinY + depth * cosY + bodyH * sinX + depth * cosX) * 0.5;
    const projW = bodyW * cosY + depth * sinY;
    const projH = bodyH * cosX + depth * sinX;
    const face = cosY * cosX; // 1 — экран к камере, 0 — телефон ребром

    backFx.position.set(group.position.x, group.position.y, -(extent + 0.75));
    halo.position.z = 0.4;
    halo.scale.set((projW + 0.5) / 0.414, (projH + 0.5) / 0.414, 1);
    /* Пятно тоже тянется по силуэту, а не висит кругом: в профиль оно
       сжимается в узкую полосу вместе с корпусом. */
    glow.scale.set((projW + 2.1) / 4.7, (projH + 2.1) / 4.7, 1);

    const active = state.mode === "active";
    const incoming = state.mode === "incoming";
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.1);
    /* На входящем звонке аппарат «вибрирует» — нимб дышит чаще. */
    const beat = incoming ? 0.5 + 0.5 * Math.sin(t * 8.8) : pulse;
    /* Широкое пятно — это «воздух», а не наклейка: когда телефон ставят
       ребром, экран смотрит в сторону, и такого света быть не должно. */
    glow.material.opacity = (active ? 0.26 : 0.32) * (0.12 + 0.88 * face ** 1.2) + pulse * 0.035;
    /* Нимб — наоборот, от корпуса: он остаётся и в профиль, и со спины. */
    halo.material.opacity = (active ? 0.36 : 0.32) * (0.82 + 0.18 * face) + beat * 0.045;

    signalGroup.position.set(group.position.x, group.position.y, -(extent + 0.55));

    const targetW = state.mode === "active" ? ISLAND.w + 26 : ISLAND.w;
    const targetH = state.mode === "active" ? ISLAND.h + 2 : ISLAND.h;
    const dw = targetW - state.islandW;
    const dh = targetH - state.islandH;
    if (Math.abs(dw) > 0.4 || Math.abs(dh) > 0.2) {
      const kIsland = 1 - Math.exp(-dt / 0.11);
      state.islandW += dw * kIsland;
      state.islandH += dh * kIsland;
      paintIsland(state.islandW, state.islandH);
      layoutIsland(state.islandW, state.islandH);
      paint();
    }

    // зелёная точка звонка пульсирует поверх всех слоёв
    islandDot.visible = state.mode === "active";
    if (islandDot.visible) {
      islandDot.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(t * 1.6));
    }

    /* Затухание снимка предыдущего экрана — плавная смена кадра. */
    if (fadeMesh.visible) {
      const k = clamp01((now - fadeAt) / 340);
      const eased = 1 - (1 - k) ** 2;
      fadeMat.opacity = 1 - eased;
      if (k >= 1) {
        fadeMesh.visible = false;
        fadeMat.opacity = 0;
      }
    }

    if (animPaint && now - lastAnimPaint > 40) {
      lastAnimPaint = now;
      paint();
    }

    if (state.mode === "active" && now - lastRepaint > 480) {
      state.phase = t * 1.5;
      lastRepaint = now;
      paint();
    }

    group.updateMatrixWorld(true);
    updateClip();
    renderer.render(scene, camera);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !frame) loop();
        if (entry.intersectionRatio > 0.35) startIntro();
      },
      { threshold: [0, 0.35, 0.6] },
    );
    observer.observe(stage);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else if (visible && !frame) {
      loop();
    }
  });

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener("resize", resize, { passive: true });

  resize();
  paint();
  if (document.fonts?.ready) document.fonts.ready.then(paint);
  loop();

  if (isReduced) {
    introDone = true;
    screenMat.opacity = 1;
    group.rotation.set(0, 0, 0);
    if (isMobile()) {
      state.view = "call";
      showIncoming();
    }
  }

  if (location.search.includes("dbg")) {
    window.__phoneFrames = 0;
    window.__phone = {
      seek: (s) => { introStart = performance.now() - s * 1000; ringsAt = introStart; introDone = false; RING_TIMES.forEach((t, i) => { rings[i].start = t; }); tick(); group.updateMatrixWorld(true); updateClip(); renderer.render(scene, camera); },
      tick,
      go: (id) => {
        /* в отладке телефон уже «разблокирован», иначе экран остаётся на блокировке */
        if (id !== "incoming") {
          state.view = "call";
          revealed = true;
        }
        id === "incoming" ? showIncoming() : enterStep(id);
        paint();
      },
      /* Проверка диалога без микрофона: прогнать фразу как распознанную. */
      say: (text) => {
        if (awaiting) onHeard(text);
        else sayQueue.push(text);
      },
      answer: () => runAction("answer"),
      simulateSpeechError: (code = "network") => onSpeechError(code),
      classify: (text) => classifyUtterance(text, STEPS[stepId] ?? {}),
      designAt: (x, y) => pointerToDesign({ clientX: x, clientY: y }),
      buttons: () => activeButtons(),
      hitAt: (x, y) => hitTest(pointerToDesign({ clientX: x, clientY: y })),
      buttonPos: (id) => BUTTONS[id],
      interim: (text) => showInterim(text),
      forceUnlock: () => { state.view = "call"; showIncoming(); paint(); },
      state,
      /* Отладка сцены: поворот, состояние фона и кадр. Только под ?dbg. */
      rotate: (y, x = 0) => {
        manual.y = y;
        manual.x = x;
        home.active = false;
        spin.y = 0;
        spin.x = 0;
        introDone = true;
        introStart = 0;
        tick();
        renderer.render(scene, camera);
      },
      ringsAt: (at) => {
        updateRings(at);
        renderer.render(scene, camera);
      },
      /* Принудительно запустить цикл кадров: в headless-превью
         IntersectionObserver молчит и rAF не крутится. */
      show: () => {
        visible = true;
        startIntro();
        if (!frame) loop();
        return true;
      },
      /* Прокрутка сценария без rAF: шаг фиксированный, время честное. */
      simulate: (seconds, step = 1 / 60) => {
        fixedDt = step;
        try {
          const steps = Math.round(seconds / step);
          for (let i = 0; i < steps; i += 1) tick();
          return steps;
        } finally {
          fixedDt = 0;
          renderer.render(scene, camera);
        }
      },
      probe: () => ({
        rotY: +group.rotation.y.toFixed(3),
        rotX: +group.rotation.x.toFixed(3),
        backZ: +backFx.position.z.toFixed(3),
        haloScale: [+halo.scale.x.toFixed(2), +halo.scale.y.toFixed(2)],
        ringsZ: +signalGroup.position.z.toFixed(3),
        lockY: +lockLayer.position.y.toFixed(3),
        lockOpacity: +layerMat.opacity.toFixed(3),
        unlock: +(state.unlock ?? 0).toFixed(3),
        view: state.view,
        mode: state.mode,
        introDone,
        swipeActive: swipe.active,
        awaiting,
        speechListening: speech.listening,
        speechError,
        lastIntent,
        lastRoute,
        step: stepId,
        heard: lastHeard,
        unlocking,
        fade: +fadeMat.opacity.toFixed(2),
        glowOpacity: +glow.material.opacity.toFixed(3),
        audio: audioCtx ? audioCtx.state : null,
        gain: voiceGain ? +voiceGain.gain.value.toFixed(3) : null,
        voice: voice ? "играет" : "нет",
        ringsVisible: rings.filter((r) => r.mesh.visible).length,
      }),
      setUnlock: (v) => {
        state.view = "locked";
        state.unlock = v;
        unlocking = false;
        tick();
        renderer.render(scene, camera);
      },
      snap: async (name) => {
        renderer.render(scene, camera);
        const data = canvas.toDataURL("image/png");
        const blob = await (await fetch(data)).blob();
        const res = await fetch(`http://127.0.0.1:5199/shot?name=${encodeURIComponent(name)}`, { method: "POST", body: blob });
        return res.text();
      },
    };
  }
  paint();
  paintLayer();
  renderLockKeys();
  if (status) status.textContent = "";
}
