/**
 * Точка входа: шрифты, стили, инициализация блоков.
 * Все модули сами проверяют наличие своих узлов, поэтому порядок безопасен.
 */
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/cyrillic-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/cyrillic-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/cyrillic-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/cyrillic-700.css";


import "@fontsource/jetbrains-mono/cyrillic-400.css";
import "@fontsource/jetbrains-mono/cyrillic-500.css";
import "./styles.css";
import "./extra.css";

import { initBot } from "./bot.js";
import { initTrainer } from "./trainer.js";
import { initGate } from "./gate.js";
import { initPhone } from "./phone.js";
import { initScene } from "./scene.js";

/* ── Крупный текст: помощь аудитории 60+ ───────────────────────────── */

const seniorToggle = document.getElementById("senior-toggle");
const SENIOR_KEY = "ne-kluy:senior";

const applySenior = (on) => {
  document.body.classList.toggle("senior", on);
  seniorToggle?.setAttribute("aria-pressed", String(on));
  try {
    localStorage.setItem(SENIOR_KEY, on ? "1" : "0");
  } catch {
    /* приватный режим — просто не сохраняем */
  }
};

if (seniorToggle) {
  let saved = null;
  try {
    saved = localStorage.getItem(SENIOR_KEY);
  } catch {
    saved = null;
  }
  // По умолчанию — как в системе: крупный шрифт включается вместе с настройкой ОС.
  const prefersLarge = window.matchMedia("(min-width: 1px) and (prefers-contrast: more)").matches;
  applySenior(saved === null ? prefersLarge : saved === "1");

  seniorToggle.addEventListener("click", () => {
    applySenior(seniorToggle.getAttribute("aria-pressed") !== "true");
  });
}

/* ── Появление блоков при прокрутке ────────────────────────────────── */

/* Анимация повторяется при каждом входе блока в кадр: класс снимается, как только
   блок ушёл из виду (вверх или вниз), и возвращается при следующем появлении.
   Раньше класс ставился один раз — при прокрутке туда-обратно блоки оставались
   на месте, и сайт казался «мёртвым». */
const revealItems = [...document.querySelectorAll(".reveal")];
if (revealItems.length) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    revealItems.forEach((item) => item.classList.add("is-in"));
  } else {
    let queued = false;

    const revealVisible = () => {
      queued = false;
      const enter = window.innerHeight * 0.94; // граница «блок вошёл»
      const leave = window.innerHeight * 1.02; // граница «блок ушёл»
      for (const item of revealItems) {
        const rect = item.getBoundingClientRect();
        const shown = item.classList.contains("is-in");
        const onScreen = rect.top < enter && rect.bottom > 0;
        if (onScreen && !shown) item.classList.add("is-in");
        else if (!onScreen && shown && (rect.top > leave || rect.bottom < -40)) {
          item.classList.remove("is-in");
        }
      }
    };

    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(revealVisible);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    revealVisible();
  }
}

/* ── Река переводов: суммы и валюты каждый раз разные ───────────────── */

const riverFlow = document.querySelector(".river__flow");
if (riverFlow) {
  /* Суммы — правдоподобные куски переводов, а не случайные числа:
     человек должен узнавать «свои» суммы, иначе пример не убеждает. */
  const AMOUNTS = [
    [1_200, 2_400, 3_500, 4_800, 6_900, 8_500, 9_900, 12_400, 15_000, 18_700],
    [25_000, 32_000, 45_000, 57_000, 68_000, 75_000, 96_000, 120_000],
    [150_000, 185_000, 240_000, 300_000, 420_000, 500_000, 680_000, 850_000],
  ];
  const CURRENCIES = ["₽", "$", "€", "₸", "¥", "£"];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const makeAmount = () => {
    const tier = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
    return pick(tier);
  };

  const renderRiver = () => {
    const used = new Set();
    const currencies = [...CURRENCIES];
    for (let i = currencies.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [currencies[i], currencies[j]] = [currencies[j], currencies[i]];
    }
    const values = [];
    while (values.length < 5) {
      values.push({ amount: makeAmount(), sign: currencies[values.length] });
    }
    riverFlow.replaceChildren(
      ...values.map((item, index) => {
        const node = document.createElement("b");
        node.textContent = `${item.amount.toLocaleString("ru-RU")} ${item.sign}`;
        node.style.animationDelay = `${-index * 1.4}s`;
        used.add(item.sign);
        return node;
      }),
    );
  };

  renderRiver();

  /* Меняем суммы, пока блок на экране: застывшие цифры выглядят как картинка. */
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(renderRiver, 8200);
  }
}

/* ── Блоки ─────────────────────────────────────────────────────────── */


initScene(document.getElementById("wave-canvas"));
initBot();
initTrainer(document.getElementById("trainer-root"));
initGate();
initPhone();

/* ── Отметка активного раздела в меню ──────────────────────────────── */

const navLinks = [...document.querySelectorAll(".nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (sections.length && "IntersectionObserver" in window) {
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.setAttribute("aria-current", active ? "true" : "false");
          link.style.color = active ? "var(--text)" : "";
        });
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  sections.forEach((section) => spy.observe(section));
}
