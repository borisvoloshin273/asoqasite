// Transform the claude.ai/design DC prototype (ASOQA.dc.html) into a clean,
// framework-free production index.html. Keeps the markup pixel-identical; only
// swaps the DC runtime constructs for real DOM hooks and points assets at the
// optimized media (webp images, webm+mp4 video).
const fs = require("fs");
const SRC = "/home/claude/incoming/ASOQA222/asoqa7-hig/project/ASOQA.dc.html";
const OUT = "/home/claude/ASOQA/ASOQAsite/index.html";
let s = fs.readFileSync(SRC, "utf8");

// 1) pull the <style> block from <helmet>
const style = s.match(/<style>([\s\S]*?)<\/style>/)[1];

// 2) extract the #asoqa-root ... </x-dc> body
let body = s.slice(s.indexOf('<div id="asoqa-root"'), s.indexOf("</x-dc>")).trim();

// 3) decode literal \uXXXX escapes (Spanish data-es strings) -> real characters
body = body.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

// 4) video tags -> dual <source> (webm primary, mp4 fallback)
body = body.replace(
  /<video([^>]*?)\ssrc="media\/([\w.-]+)\.mp4"([^>]*)><\/video>/g,
  (_, pre, name, post) =>
    `<video${pre}${post}><source src="media/${name}.webm" type="video/webm"><source src="media/${name}.mp4" type="video/mp4"></video>`
);

// 5) image + poster paths -> webp
body = body.replace(/(src|poster)="media\/([\w.-]+)\.(?:png|jpe?g)"/g, '$1="media/$2.webp"');

// 6) DC bindings -> real hooks
body = body.replace(/\s*onClick="\{\{ setEn \}\}"/g, "");            // #langEn already present
body = body.replace(/\s*onClick="\{\{ setEs \}\}"/g, "");            // #langEs already present
body = body.replace(/onClick="\{\{ goForm \}\}"/g, 'data-goform="1"');
body = body.replace(/<form onSubmit="\{\{ onSubmit \}\}"/g, '<form id="leadForm"');

// 7) sc-if conditional blocks -> plain toggled containers
body = body.replace(
  /<sc-if value="\{\{ showForm \}\}"[^>]*>([\s\S]*?)<\/sc-if>/,
  '<div id="formWrap">$1</div>'
);
body = body.replace(
  /<sc-if value="\{\{ submitted \}\}"[^>]*>([\s\S]*?)<\/sc-if>/,
  '<div id="successWrap" style="display:none;">$1</div>'
);

// sanity: no DC leftovers
for (const bad of ["{{", "sc-if", "x-dc", "onSubmit=", "onClick="]) {
  if (body.includes(bad)) { console.error("!! leftover DC construct:", bad); process.exit(1); }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ASOQA — We put your app on the chart</title>
<meta name="description" content="ASOQA — App Store Optimization. One team takes your app from idea to build to launch, all the way into the Top 5. Real apps, real results.">
<meta name="theme-color" content="#020309">
<link rel="canonical" href="https://asoqa.io/">
<meta property="og:title" content="ASOQA — We put your app on the chart">
<meta property="og:description" content="App Store Optimization. From idea to Top 5 — one team, one journey.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://asoqa.io/">
<meta property="og:image" content="https://asoqa.io/assets/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>${style}</style>
</head>
<body>
${body}
<script src="js/app.js"></script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("wrote", OUT, "(" + (html.length / 1024).toFixed(1) + " KB)");
