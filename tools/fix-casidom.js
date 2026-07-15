// The CASIDOM phone mockups have a light shear/streak artifact in the transparent
// margin at the bottom-right corner. Clip each phone to its true rounded-rect
// silhouette (detected from the dark, opaque bezel) so the stray pixels vanish
// while the phone + its CSS drop-shadow stay clean.
const sharp = require("sharp");
const SRC = "/home/claude/incoming/ASOQA222/asoqa7-hig/project/media";
const OUTDIR = process.argv[2] || "/home/claude/ASOQA/ASOQAsite/media"; // default = final webp
const asWebp = OUTDIR.endsWith("media");
const files = ["casidom_home", "casidom_roles", "casidom_shop", "casidom_leaderboard", "casidom_calendar"];
// final display widths (retina) — matches opt-images.js
const WIDTHS = { casidom_home: 620, casidom_roles: 560, casidom_shop: 560, casidom_leaderboard: 560, casidom_calendar: 560 };

(async () => {
  for (const f of files) {
    const src = SRC + "/" + f + ".png";
    const img = sharp(src);
    const meta = await img.metadata();
    const W = meta.width, H = meta.height;
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels; // 4
    // bounding box of the phone's dark, opaque body (excludes light streak in margin)
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * ch;
        const a = data[i + 3];
        const lum = Math.max(data[i], data[i + 1], data[i + 2]);
        if (a > 200 && lum < 45) { // near-black + opaque = true bezel (excludes greenish streak)
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    // small safety margin so we keep the phone's rounded corners fully
    const pad = Math.round((maxX - minX) * 0.012);
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const radius = Math.round(bw * 0.14); // iPhone-ish corner
    // crop to the dark-body box (the light streak sits outside it → removed),
    // then a rounded-rect mask tidies the corners.
    const cropped = await sharp(src).ensureAlpha().extract({ left: minX, top: minY, width: bw, height: bh }).png().toBuffer();
    const maskPng = await sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}"><rect x="0" y="0" width="${bw}" height="${bh}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
    )).resize(bw, bh, { fit: "fill" }).png().toBuffer();
    // composite the rounded mask at full crop size (sharp resizes before compositing,
    // so do it in its own pass), then resize + encode separately.
    const masked = await sharp(cropped).composite([{ input: maskPng, blend: "dest-in" }]).png().toBuffer();
    if (asWebp) {
      await sharp(masked).resize({ width: WIDTHS[f], withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(OUTDIR + "/" + f + ".webp");
      console.log(f, `bbox=${bw}x${bh} r=${radius} -> ${WIDTHS[f]}w webp`);
    } else {
      await sharp(masked).resize({ width: 600 }).png().toFile(OUTDIR + "/fix_" + f + ".png");
      console.log(f, `bbox=${bw}x${bh} r=${radius} (preview png)`);
    }
  }
})();
