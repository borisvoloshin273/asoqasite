// Build a branded 1200x630 OG image from the hero still.
const sharp = require("sharp");
const SRC = "/home/claude/incoming/ASOQA222/asoqa7-hig/project/media/young_hero.png";
const OUT = "/home/claude/ASOQA/ASOQAsite/assets/og-image.jpg";
const W = 1200, H = 630;

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="v" cx="50%" cy="46%" r="70%">
      <stop offset="40%" stop-color="#020309" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#020309" stop-opacity="0.92"/>
    </radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#020309" stop-opacity="0"/>
      <stop offset="100%" stop-color="#020309" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
  <rect width="${W}" height="${H}" fill="url(#b)"/>
  <g transform="translate(80,250)">
    <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="150" letter-spacing="8" fill="#EAF6FF">ASOQA</text>
    <text x="4" y="70" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="34" letter-spacing="1" fill="#cfe0ee">We put your app <tspan fill="#00D4C8">on the chart.</tspan></text>
    <text x="4" y="120" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="20" letter-spacing="4" fill="#7e93a8">APP STORE OPTIMIZATION · IDEA · BUILD · LAUNCH · TOP 5</text>
  </g>
</svg>`);

sharp(SRC)
  .resize(W, H, { fit: "cover", position: "top" })
  .composite([{ input: overlay }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(OUT)
  .then(() => console.log("wrote", OUT))
  .catch((e) => { console.error(e); process.exit(1); });
