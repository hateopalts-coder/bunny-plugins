import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const pluginsDir = "./plugins";
const outDir = "./dist";

// Get all plugin folders
const plugins = fs.readdirSync(pluginsDir).filter((f) =>
  fs.statSync(path.join(pluginsDir, f)).isDirectory()
);

for (const plugin of plugins) {
  const srcDir = path.join(pluginsDir, plugin);
  const destDir = path.join(outDir, plugin);

  fs.mkdirSync(destDir, { recursive: true });

  // Bundle index.ts → index.js
  const entryFile = path.join(srcDir, "index.ts");
  if (fs.existsSync(entryFile)) {
    await esbuild.build({
      entryPoints: [entryFile],
      outfile: path.join(destDir, "index.js"),
      bundle: false,       // no bundling needed — vendetta globals are external
      format: "cjs",
      platform: "browser",
      target: "es2017",
      logLevel: "info",
    });
    console.log(`✅ Built: ${plugin}/index.js`);
  }

  // Copy manifest.json
  const manifestSrc = path.join(srcDir, "manifest.json");
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, path.join(destDir, "manifest.json"));
    console.log(`✅ Copied: ${plugin}/manifest.json`);
  }
}

console.log("\n🐇 All plugins built to /dist");
