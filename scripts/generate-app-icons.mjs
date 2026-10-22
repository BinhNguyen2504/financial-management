import { readFile } from "node:fs/promises";
import sharp from "sharp";

// The Next.js installation already supplies sharp. The SVG is the editable master.
const source = await readFile(
  new URL("../public/icons/icon.svg", import.meta.url),
  "utf8",
);
for (const [name, size, fullBackground] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, true],
]) {
  const svg = fullBackground ? source.replace('rx="104"', 'rx="0"') : source;
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(new URL(`../public/icons/${name}`, import.meta.url).pathname);
}
