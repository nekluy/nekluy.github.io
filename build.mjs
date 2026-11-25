// Сборка без магии: esbuild бандлит JS+CSS+шрифты, index.html копируется как есть.
// --serve поднимает локальный сервер и пересобирает при изменениях.
import * as esbuild from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const serve = process.argv.includes("--serve");

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("src/index.html", "dist/index.html");

const options = {
  entryPoints: ["src/main.js"],
  bundle: true,
  outdir: "dist",
  entryNames: "app",
  assetNames: "assets/[name]-[hash]",
  loader: { ".woff2": "file", ".woff": "file", ".png": "file", ".svg": "file", ".jpg": "file", ".mp3": "file", ".gz": "file" },
  target: ["es2022"],
  format: "esm",
  minify: !serve,
  sourcemap: serve,
  legalComments: "none",
  logLevel: "info",
};

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: "dist", port: 5173 });
  console.log(`\n  НЕ КЛЮЙ → http://localhost:${port}\n`);
} else {
  await esbuild.build(options);
  console.log("Сборка готова: dist/");
}
