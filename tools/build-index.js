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

// 8) lead form: add EMAIL/TELEGRAM contact-method toggle + single contact input
//    (the email field becomes #contactInput name="contact"; app.js manages it)
const toggleHtml =
  '<div id="contactToggle" role="tablist" aria-label="Contact method" style="display:flex;gap:6px;background:rgba(5,13,18,.7);border:1px solid #1A2A38;border-radius:10px;padding:5px;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);">' +
  '<button type="button" role="tab" data-method="email" aria-selected="true" style="flex:1;cursor:pointer;border:none;border-radius:7px;padding:12px 8px;font-family:\'Chakra Petch\',sans-serif;font-weight:700;font-size:12px;letter-spacing:2px;color:#04130d;background:linear-gradient(90deg,#00FF99,#00D4C8);box-shadow:0 0 16px rgba(0,255,153,.25);transition:color .2s,background .2s,box-shadow .2s;">EMAIL</button>' +
  '<button type="button" role="tab" data-method="telegram" aria-selected="false" style="flex:1;cursor:pointer;border:none;border-radius:7px;padding:12px 8px;font-family:\'Chakra Petch\',sans-serif;font-weight:700;font-size:12px;letter-spacing:2px;color:#7e93a8;background:transparent;transition:color .2s,background .2s,box-shadow .2s;">TELEGRAM</button>' +
  '</div>';
body = body.replace(
  /<input type="email" name="email"[^>]*?style="([^"]*)"[^>]*>/,
  (m, style) => toggleHtml +
    `<input type="text" id="contactInput" name="contact" required placeholder="YOUR&nbsp;EMAIL" autocomplete="email" inputmode="email" style="${style}">`
);
if (!body.includes('id="contactInput"')) { console.error("!! failed to inject contact toggle/input"); process.exit(1); }

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
