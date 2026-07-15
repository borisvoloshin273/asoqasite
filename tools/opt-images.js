// Optimize the referenced images to WebP at display-appropriate resolutions.
// Retina-safe (2x display size), visually clean. Big win: 17.2 MB -> ~2 MB.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const SRC = "/home/claude/incoming/ASOQA222/asoqa7-hig/project/media";
const OUT = "/home/claude/ASOQA/ASOQAsite/media";

// [file, maxWidth, quality]  — output always .webp (same basename)
const JOBS = [
  // full-screen background posters (brief flash before video) — cap 1280w
  ["young_hero.png", 1280, 66], ["young_idea.png", 1280, 66], ["young_build.png", 1280, 66],
  ["young_top5.png", 1280, 66], ["young_finale.png", 1280, 66],
  // team photos: card ~230px tall @2x -> width 500
  ["team_herman.jpg", 500, 80], ["team_kirill.jpg", 500, 80], ["team_bek.jpg", 500, 80],
  ["team_serega.jpg", 500, 80], ["team_egor.jpg", 500, 80],
  // store logos: 44px @2x -> 128
  ["logo_appstore.png", 128, 86], ["logo_googleplay.png", 128, 86],
  ["logo_appgallery.png", 128, 86], ["logo_amazon.png", 128, 86],
  // app icons: shown 30-48px @2-3x -> 128
  ["asoqa_icon_a.png", 128, 88], ["icon_flowerhub.png", 144, 88], ["icon_pawtree.png", 144, 88],
  // casidom phone screenshots: up to 300px wide @2x -> 620 (keep native ~620)
  ["casidom_home.png", 620, 82], ["casidom_roles.png", 560, 82], ["casidom_shop.png", 560, 82],
  ["casidom_leaderboard.png", 560, 82], ["casidom_calendar.png", 560, 82],
];
for (let i = 1; i <= 11; i++) JOBS.push([`icon_g${i}.png`, 96, 86]); // chart icons: 30px @3x

(async () => {
  let src = 0, out = 0;
  for (const [f, w, q] of JOBS) {
    const inp = path.join(SRC, f);
    const dst = path.join(OUT, f.replace(/\.(png|jpg|jpeg)$/i, ".webp"));
    const s = fs.statSync(inp).size; src += s;
    await sharp(inp)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: q, effort: 6 })
      .toFile(dst);
    const o = fs.statSync(dst).size; out += o;
    console.log(path.basename(dst).padEnd(26), (s / 1024).toFixed(0).padStart(5) + "KB ->", (o / 1024).toFixed(0).padStart(4) + "KB");
  }
  console.log("--- images:", (src / 1048576).toFixed(1), "MB ->", (out / 1048576).toFixed(2), "MB");
})();
