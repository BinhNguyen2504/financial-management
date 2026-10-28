import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Run from any directory with the repository's Node 22 installation.
const root = new URL("./", import.meta.url);
const ink = "#292724";
const paper = "#F7F3EB";
const concepts = [
  {
    key: "a",
    file: "a-jar.svg",
    name: "Hũ mở",
    idea: ["Một khoảng mở để đón thêm.", "Một thân hũ vững để giữ lại."],
    risk: "Gần gũi; vẫn có thể được đọc thành chiếc bình.",
  },
  {
    key: "b",
    file: "b-gather.svg",
    name: "Gom",
    idea: ["Từng phần nhỏ bồi đắp", "thành một tổng thể có trật tự."],
    risk: "Trừu tượng; cần thời gian gắn với thương hiệu.",
  },
  {
    key: "c",
    file: "c-balance.svg",
    name: "Cân bằng",
    idea: ["Hai cung đối ứng giữ nhịp", "quanh một khoảng thở chung."],
    risk: "Có thể gợi biểu tượng đồng bộ hoặc vòng lặp.",
  },
];
for (const c of concepts) c.svg = await readFile(new URL(c.file, root), "utf8");

const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
function symbol(c, x, y, size, color = "#000000", suffix = "") {
  const body = c.svg
    .match(/<path[^>]+\/>/)[0]
    .replace('fill="#000000"', `fill="${color}"`);
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 256 256" aria-label="${c.key}-${suffix}">${body}</svg>`;
}
function text(x, y, value, size = 22, extra = "") {
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(value)}</text>`;
}
const board = [
  '<rect width="1800" height="1160" fill="#FAFAF8"/>',
  text(
    64,
    56,
    "FINANCIAL MANAGER / NGHIÊN CỨU BIỂU TƯỢNG",
    17,
    'letter-spacing="2"',
  ),
  text(1736, 56, "29.10.2026 · 02", 17, 'text-anchor="end"'),
  text(64, 133, "Ba hướng logo.", 58, 'font-weight="600"'),
  text(
    64,
    176,
    "Bình tĩnh. Rõ ràng. Tích lũy từng ngày.",
    23,
    'fill="#65615B"',
  ),
  '<path d="M64 210H1736" stroke="#D9D5CD"/>',
  '<path d="M612 242V854M1188 242V854" stroke="#D9D5CD"/>',
];
concepts.forEach((c, i) => {
  const x = 64 + i * 576;
  board.push(text(x, 264, c.key.toUpperCase(), 20, 'fill="#65615B"'));
  if (c.key === "b")
    board.push(
      text(
        x + 496,
        264,
        "ĐỀ XUẤT",
        16,
        'text-anchor="end" letter-spacing="1.5"',
      ),
    );
  board.push(symbol(c, x + 96, 290, 320));
  board.push(text(x, 654, c.name, 35, 'font-weight="600"'));
  c.idea.forEach((line, j) =>
    board.push(text(x, 697 + j * 30, line, 22, 'fill="#65615B"')),
  );
  let sx = x;
  for (const size of [64, 32, 16]) {
    board.push(symbol(c, sx, 750 + 64 - size, size));
    board.push(
      text(
        sx + size / 2,
        840,
        `${size} px`,
        15,
        'text-anchor="middle" fill="#65615B"',
      ),
    );
    sx += size + 40;
  }
  board.push(text(x, 887, c.risk, 17, 'fill="#65615B"'));
});
board.push(`<rect y="930" width="1800" height="230" fill="${ink}"/>`);
board.push(
  text(
    64,
    971,
    "THỬ MÀU THAN / NGÀ · ICON ỨNG DỤNG VÀ FAVICON",
    16,
    `fill="${paper}" letter-spacing="1.6"`,
  ),
);
concepts.forEach((c, i) => {
  const x = 64 + i * 576;
  board.push(
    `<rect x="${x}" y="1000" width="104" height="104" rx="24" fill="${paper}"/>`,
  );
  board.push(symbol(c, x + 4, 1004, 96, ink));
  board.push(symbol(c, x + 140, 1004, 96, paper));
  board.push(symbol(c, x + 282, 1064, 32, paper));
  board.push(symbol(c, x + 346, 1080, 16, paper));
  board.push(
    text(x + 298, 1129, "32 px", 14, `fill="${paper}" text-anchor="middle"`),
  );
  board.push(
    text(x + 354, 1129, "16 px", 14, `fill="${paper}" text-anchor="middle"`),
  );
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1160" viewBox="0 0 1800 1160" role="img" aria-labelledby="overview-title"><title id="overview-title">Ba phương án biểu tượng: Hũ mở, Gom và Cân bằng</title><g font-family="Arial, Helvetica, sans-serif" fill="${ink}">${board.join("")}</g></svg>\n`;
await writeFile(new URL("concepts.svg", root), svg);
await sharp(Buffer.from(svg))
  .png()
  .toFile(new URL("concepts.png", root).pathname);

function inline(c, size, suffix, cls = "art") {
  return c.svg
    .replace(
      /width="256" height="256"/,
      `width="${size}" height="${size}" class="${cls}"`,
    )
    .replaceAll(
      `${c.key === "a" ? "jar" : c.key === "b" ? "gather" : "balance"}-title`,
      `${c.key}-${suffix}-title`,
    );
}
function ladder(c) {
  return [16, 24, 32, 64]
    .map(
      (n) =>
        `<figure>${inline(c, n, `size-${n}`)}<figcaption>${n} px</figcaption></figure>`,
    )
    .join("");
}
const cards = concepts
  .map(
    (c) => `<article aria-labelledby="${c.key}-heading">
  <div class="card-top"><span>${c.key.toUpperCase()}</span>${c.key === "b" ? '<span class="recommended">Đề xuất</span>' : ""}</div>
  <div class="hero sample">${inline(c, 256, "hero")}</div>
  <h2 id="${c.key}-heading">${c.name}</h2><p>${c.idea.join(" ")}</p>
  <div class="ladder sample" aria-label="So sánh kích thước">${ladder(c)}</div>
  <p class="risk">${c.risk}</p><a href="${c.file}" download>Tải SVG ${c.key.toUpperCase()}</a>
</article>`,
  )
  .join("");
const contexts = concepts
  .map(
    (
      c,
    ) => `<article class="contexts"><h3>${c.key.toUpperCase()} · ${c.name}</h3>
  <div class="context-row"><div class="tile dark" aria-label="Biểu tượng trên nền than">${inline(c, 80, "dark")}</div>
  <div class="tile light" aria-label="Biểu tượng trên nền ngà">${inline(c, 80, "light")}</div></div>
  <div class="browser-tab">${inline(c, 16, "tab")}<span>Financial Manager</span><span aria-hidden="true">×</span></div>
  <div class="pixel-row">${[16, 32].flatMap((n) => ["light", "dark"].map((bg) => `<figure><canvas width="128" height="128" data-concept="${c.key}" data-size="${n}" data-bg="${bg}" aria-label="${c.name} ở ${n} px trên nền ${bg === "light" ? "ngà" : "than"}, phóng lớn"></canvas><figcaption>${n} px · ${bg === "light" ? "ngà" : "than"} · phóng lớn</figcaption></figure>`)).join("")}</div>
  <details><summary>Kiểm tra lật và xoay</summary><div class="context-row"><figure>${inline(c, 72, "mirror", "art mirror")}<figcaption>Lật ngang</figcaption></figure><figure>${inline(c, 72, "rotate", "art rotate")}<figcaption>Xoay 180°</figcaption></figure></div></details>
</article>`,
  )
  .join("");
const page = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Ba hướng logo · Financial Manager</title><style>
:root{color-scheme:light;--ink:${ink};--paper:${paper};font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#fafaf8}*{box-sizing:border-box}body{margin:0}main{max-width:1500px;margin:auto;padding:40px clamp(16px,4vw,60px) 64px}header{border-bottom:1px solid #d9d5cd;padding-bottom:28px}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(36px,5vw,64px);letter-spacing:-.04em;margin:20px 0 12px;line-height:1.06}p{line-height:1.65;color:#65615b;overflow-wrap:anywhere}a{color:inherit;text-underline-offset:4px}a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #8b653e;outline-offset:4px}a{display:inline-flex;min-height:44px;align-items:center}fieldset{display:flex;flex-wrap:wrap;gap:12px 24px;border:0;padding:16px 0;margin:12px 0}legend{padding:0;font-size:14px}label{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer}input{accent-color:var(--ink);width:18px;height:18px;margin:0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}article{min-width:0}.card-top{display:flex;justify-content:space-between;font-size:13px;letter-spacing:.08em;align-items:center}.recommended{font-size:12px;border-bottom:1px solid;padding-bottom:3px}.hero{height:310px;display:grid;place-items:center;margin-top:12px}.art{display:block;flex-shrink:0;max-width:100%;height:auto}.art path{fill:currentColor}.sample{background:#fff;color:#000}.review[data-treatment="brand"] .sample{background:var(--paper);color:var(--ink)}.review[data-treatment="reverse"] .sample{background:var(--ink);color:var(--paper)}h2{font-size:28px;margin:24px 0 8px}article p{min-height:54px;margin:8px 0 20px}.ladder{display:flex;align-items:flex-end;gap:20px;padding:18px 12px;min-height:122px}figure{margin:0;display:flex;flex-direction:column;gap:10px;align-items:center;min-width:0}figcaption{font-size:11px;line-height:1.4;text-align:center;color:inherit}.risk{font-size:13px}section{margin-top:52px;border-top:1px solid #d9d5cd;padding-top:20px}section>h2{font-size:25px;margin:0 0 16px}.context-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center}.tile{width:96px;height:96px;border-radius:22px;display:grid;place-items:center}.dark{background:var(--ink);color:var(--paper)}.light{background:var(--paper);color:var(--ink)}.browser-tab{margin:24px 0;background:#eeeae3;border-radius:12px 12px 0 0;padding:12px;display:flex;align-items:center;gap:10px;font-size:12px;width:min(100%,280px)}.browser-tab span:last-child{margin-left:auto}.pixel-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px;margin:24px 0}.pixel-row canvas{width:min(100%,128px);height:auto;image-rendering:pixelated;border:1px solid #d9d5cd}details{border-top:1px solid #d9d5cd;padding-top:4px}summary{cursor:pointer;min-height:44px;display:list-item;padding:12px 0}details .context-row{padding:12px 0 20px}.mirror{transform:scaleX(-1)}.rotate{transform:rotate(180deg)}footer{margin-top:40px;font-size:13px;border-top:1px solid #d9d5cd;padding-top:20px}footer p{margin:0}.note{max-width:75ch}.links{display:flex;flex-wrap:wrap;gap:8px 24px}@media(max-width:900px){.grid{gap:20px}.hero{height:240px}.hero .art{width:210px}.ladder{gap:12px;padding:14px 8px}article p{min-height:80px}}@media(max-width:700px){.grid{grid-template-columns:1fr;gap:36px}.hero{height:290px}.hero .art{width:256px}.ladder{gap:24px}article p{min-height:0}.contexts{border-bottom:1px solid #d9d5cd;padding-bottom:20px}.pixel-row{grid-template-columns:repeat(2,minmax(0,160px))}.card-top{padding-top:16px;border-top:1px solid #d9d5cd}fieldset{gap:4px 20px}}
</style></head><body><main class="review" data-treatment="mono"><header><div class="eyebrow">Financial Manager · nghiên cứu biểu tượng · 29.10.2026</div><h1>Ba hướng logo.</h1><p class="note">Biểu tượng độc lập cho một không gian tài chính bình tĩnh, rõ ràng. Chọn theo hình dáng trước, rồi xem trên nền than và ngà.</p><nav class="links" aria-label="Tài liệu thiết kế"><a href="concepts.png">Bảng so sánh PNG</a><a href="concepts.svg">Bảng so sánh SVG</a><a href="README.md">Ghi chú và kiểm chứng</a></nav></header><fieldset><legend>Cách xem ba mẫu</legend><label><input type="radio" name="treatment" value="mono" checked>Đen / trắng</label><label><input type="radio" name="treatment" value="brand">Than / ngà</label><label><input type="radio" name="treatment" value="reverse">Ngà / than</label></fieldset><div class="grid">${cards}</div><section aria-labelledby="context-heading"><h2 id="context-heading">Thử ở nơi logo sẽ xuất hiện</h2><p class="note">Icon ứng dụng, tab trình duyệt và raster 16/32 px phóng lớn. Các ô phóng lớn dùng điểm ảnh thật, không vẽ lại bằng vector.</p><div class="grid">${contexts}</div></section><footer><p>Ba phương án đang chờ lựa chọn. “Gom” và “Hũ mở” là tên ý tưởng, chưa phải tên thương hiệu. Đây là tài liệu thiết kế riêng; logo hiện tại của ứng dụng vẫn được giữ.</p></footer></main><script>
document.querySelectorAll('input[name="treatment"]').forEach(input => input.addEventListener('change', () => {document.querySelector('.review').dataset.treatment=input.value;}));
const sources=${JSON.stringify(Object.fromEntries(concepts.map((c) => [c.key, c.svg])))};
const jobs=[...document.querySelectorAll('canvas[data-concept]')].map(canvas => new Promise((resolve,reject) => {
  const dark=canvas.dataset.bg==='dark', n=Number(canvas.dataset.size);
  const image=new Image();
  image.onload=()=>{const tiny=document.createElement('canvas');tiny.width=n;tiny.height=n;const ctx=tiny.getContext('2d');ctx.fillStyle=dark?'${ink}':'${paper}';ctx.fillRect(0,0,n,n);ctx.drawImage(image,0,0,n,n);const target=canvas.getContext('2d');target.imageSmoothingEnabled=false;target.drawImage(tiny,0,0,128,128);canvas.dataset.ready='true';resolve();};
  image.onerror=()=>reject(new Error('SVG raster could not load'));
  image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sources[canvas.dataset.concept].replace('fill="#000000"','fill="'+(dark?'${paper}':'${ink}')+'"'));
}));
Promise.all(jobs).then(()=>document.documentElement.dataset.pixelsReady='true').catch(()=>document.documentElement.dataset.pixelsReady='error');
</script></body></html>\n`;
await writeFile(new URL("preview.html", root), page);
console.log(
  "Built concepts.svg, concepts.png and preview.html from the three SVG sources.",
);
