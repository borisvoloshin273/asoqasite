/* ASOQA — framework-free runtime.
   Ported 1:1 from the claude.ai/design DC prototype (scroll cinematics, EN/ES,
   preloader, chart animation, spark canvas) + real form→Telegram submission. */
(function () {
  "use strict";
  var root = document.getElementById("asoqa-root");
  if (!root) return;

  /* ---------- language (EN default, ES optional, remembered) ---------- */
  var lang = "en";
  try { if (localStorage.getItem("asoqa_lang") === "es") lang = "es"; } catch (e) {}

  /* contact method for the lead form: "email" (default) or "telegram" */
  var contactMethod = "email";
  function updateContactUI() {
    var es = lang === "es", tg = contactMethod === "telegram";
    var ci = root.querySelector("#contactInput");
    if (ci) {
      ci.setAttribute("placeholder", tg ? (es ? "TU TELEGRAM (@usuario)" : "YOUR TELEGRAM (@username)")
                                        : (es ? "TU EMAIL" : "YOUR EMAIL"));
      ci.setAttribute("inputmode", tg ? "text" : "email");
      ci.setAttribute("autocomplete", tg ? "off" : "email");
    }
    root.querySelectorAll("#contactToggle [data-method]").forEach(function (b) {
      var on = b.getAttribute("data-method") === contactMethod;
      b.style.color = on ? "#04130d" : "#7e93a8";
      b.style.background = on ? "linear-gradient(90deg,#00FF99,#00D4C8)" : "transparent";
      b.style.boxShadow = on ? "0 0 16px rgba(0,255,153,.25)" : "none";
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function applyLang() {
    var es = lang === "es";
    root.querySelectorAll("[data-es]").forEach(function (el) {
      if (el._en == null) el._en = el.innerHTML;
      el.innerHTML = es ? el.getAttribute("data-es") : el._en;
    });
    root.querySelectorAll("[data-es-ph]").forEach(function (el) {
      if (el._enph == null) el._enph = el.getAttribute("placeholder") || "";
      el.setAttribute("placeholder", es ? el.getAttribute("data-es-ph") : el._enph);
    });
    var en = root.querySelector("#langEn"), esb = root.querySelector("#langEs");
    if (en) en.style.color = es ? "#5d7384" : "#EAF6FF";
    if (esb) esb.style.color = es ? "#EAF6FF" : "#5d7384";
    document.documentElement.lang = lang;
    updateContactUI();
  }
  function setLang(l) { lang = l; try { localStorage.setItem("asoqa_lang", l); } catch (e) {} applyLang(); }

  var lEn = root.querySelector("#langEn"), lEs = root.querySelector("#langEs");
  if (lEn) lEn.addEventListener("click", function () { setLang("en"); });
  if (lEs) lEs.addEventListener("click", function () { setLang("es"); });

  /* ---------- smooth-scroll CTAs to the form ---------- */
  root.querySelectorAll('[data-goform="1"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var f = document.getElementById("finaleSec");
      if (f) window.scrollTo({ top: f.offsetTop, behavior: "smooth" });
    });
  });

  /* ---------- state trackers used across the loop ---------- */
  var introStart = 0, started = false, preStarted = false, parInit = false, lastSy = -1;
  var sparkEl = null;

  /* ---------- chart animation (ASOQA rises into the Top 5) ---------- */
  function chartTick(p) {
    var list = root.querySelector("#chartList"); if (!list) return;
    var rowH = 46;
    var comp = ["aether", "pulse", "vortex", "lumina", "cadence", "nimbus", "drift", "halcyon", "mosaic", "forge", "quanta"];
    var e = p * p * (3 - 2 * p);
    var target = Math.round(comp.length * (1 - e));
    var order = comp.slice(0, target).concat(["asoqa"]).concat(comp.slice(target));
    var aIdx = order.indexOf("asoqa");
    order.forEach(function (id, i) {
      var el = list.querySelector('[data-id="' + id + '"]'); if (!el) return;
      el.style.top = (i * rowH) + "px";
      var rk = el.querySelector("[data-rank]"); if (rk) rk.textContent = "#" + (i + 1);
      if (id !== "asoqa") {
        var tr = el.querySelector("[data-trend]");
        if (tr) { if (i > aIdx) { tr.textContent = "▼"; tr.style.color = "#FF6680"; } else { tr.textContent = "—"; tr.style.color = "#3a4a5a"; } }
      }
    });
    var a = list.querySelector('[data-id="asoqa"]');
    if (a) {
      var top5 = aIdx < 5, num1 = aIdx === 0;
      a.style.borderColor = top5 ? "rgba(0,255,153,.85)" : "rgba(0,255,153,.5)";
      a.style.background = top5 ? "rgba(0,255,153,.15)" : "rgba(0,255,153,.09)";
      a.style.boxShadow = (num1 ? "0 0 40px rgba(0,255,153,.5)" : (top5 ? "0 0 30px rgba(0,255,153,.32)" : "0 0 22px rgba(0,255,153,.22)")) + ",inset 0 0 0 1px rgba(0,255,153,.14)";
      var rk2 = a.querySelector("[data-rank]"); if (rk2) rk2.style.color = num1 ? "#FFE08A" : "#00FF99";
    }
  }

  /* ---------- spark canvas behind the chart ---------- */
  function startSpark(cv) {
    var cx = cv.getContext("2d"), W = 0, H = 0, DPR = 1;
    function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth || window.innerWidth; H = cv.clientHeight || window.innerHeight; cv.width = Math.max(1, W * DPR); cv.height = Math.max(1, H * DPR); cx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    resize(); window.addEventListener("resize", resize, { passive: true });
    var N = 70, ps = []; for (var i = 0; i < N; i++) ps.push({ x: Math.random(), y: Math.random(), sp: 0.02 + Math.random() * 0.06, r: 0.4 + Math.random() * 1.6, tw: Math.random() * 6.28 });
    function draw(t) {
      if (sparkEl !== cv) return;
      var b = cv.getBoundingClientRect();
      if (b.bottom < -80 || b.top > window.innerHeight + 80) { requestAnimationFrame(draw); return; }
      if (!W || !H) resize();
      cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = "lighter";
      for (var k = 0; k < ps.length; k++) { var p = ps[k]; p.y -= p.sp * 0.01; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); } var px = p.x * W, py = p.y * H, a = (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t / 600 + p.tw))) * 0.7; cx.beginPath(); cx.arc(px, py, p.r, 0, 6.283); cx.fillStyle = "rgba(0,255,153," + a.toFixed(3) + ")"; cx.fill(); }
      cx.globalCompositeOperation = "source-over";
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ---------- preloader (buffer scene videos up front, then fade) ---------- */
  function bootPreloader() {
    var pre = root.querySelector("#preloader"), preBar = root.querySelector("#preBar"), prePct = root.querySelector("#prePct");
    if (!pre || preStarted) return; preStarted = true;
    var vids = [].slice.call(root.querySelectorAll(".scenevid"));
    var total = vids.length || 1, done = 0, finished = false;
    function setP(p) { if (preBar) preBar.style.width = p + "%"; if (prePct) prePct.textContent = "LOADING ASSETS · " + p + "%"; }
    function finish() { if (finished) return; finished = true; if (preBar) preBar.style.width = "100%"; if (prePct) prePct.textContent = "READY"; setTimeout(function () { pre.style.opacity = "0"; setTimeout(function () { pre.style.display = "none"; }, 950); }, 180); }
    function bump() { done++; setP(Math.min(99, Math.round(done / total * 100))); if (done >= total) finish(); }
    vids.forEach(function (v) {
      v.preload = "auto"; var c = false; function ok() { if (c) return; c = true; bump(); }
      if (v.readyState >= 3) ok(); else { v.addEventListener("canplay", ok, { once: true }); v.addEventListener("loadeddata", ok, { once: true }); v.addEventListener("error", ok, { once: true }); }
      try { v.load(); } catch (e) {}
    });
    setTimeout(finish, 7000);
  }

  /* ---------- main critical loop (works even while tab hidden) ---------- */
  function update() {
    var R = root;
    var vh = window.innerHeight, sy = window.scrollY;
    var intro = R.querySelector("#introWash");
    if (intro) { var dt = performance.now() - introStart; if (dt > 100) { intro.style.transition = "opacity 1.6s ease"; intro.style.opacity = "0"; } if (dt > 1900) intro.style.display = "none"; }
    R.querySelectorAll("[data-reveal]").forEach(function (el) { var b = el.getBoundingClientRect(); if (b.top < vh * 0.92 && b.bottom > vh * 0.04) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; } });
    R.querySelectorAll(".scenevid").forEach(function (v) { if (v.dataset.scrub) return; var b = v.getBoundingClientRect(); var vis = b.top < vh * 0.95 && b.bottom > vh * 0.05; if (vis) { if (v.paused) { var pr = v.play && v.play(); if (pr && pr.catch) pr.catch(function () {}); } } else if (!v.paused) v.pause(); });
    var spark = R.querySelector("#chartSpark"); if (spark && sparkEl !== spark) { sparkEl = spark; startSpark(spark); }
    var cs = R.querySelector("#chartScene"); if (cs) { var r = cs.getBoundingClientRect(); var range = cs.offsetHeight - vh; var cp = range > 0 ? Math.min(1, Math.max(0, (-r.top) / range)) : 0; chartTick(cp); }
    var prog = R.querySelector("#progBar"), rankNum = R.querySelector("#rankNum"), hint = R.querySelector("#scrollHint");
    var max = document.body.scrollHeight - vh;
    var sPct = max > 0 ? Math.min(1, Math.max(0, sy / max)) : 0;
    if (prog) prog.style.width = (sPct * 100).toFixed(2) + "%";
    if (rankNum) {
      var chart = R.querySelector("#chartScene");
      var chartEnd = chart ? (chart.offsetTop + chart.offsetHeight - vh * 0.92) : Infinity;
      if (sy >= chartEnd) { rankNum.textContent = "TOP 5"; rankNum.style.color = "#00C9A7"; rankNum.style.textShadow = "0 0 16px rgba(0,201,167,.75)"; }
      else {
        var specs = [["#heroSec", 847], ["#p01", 738], ["#lockScene", 582], ["#p03", 457], ["#chartScene", 138]];
        var pts = specs.map(function (a) { var e = R.querySelector(a[0]); return e ? { y: e.offsetTop, rk: a[1] } : null; }).filter(Boolean);
        var ref = sy, rk = pts.length ? pts[0].rk : 847;
        if (pts.length) { if (ref <= pts[0].y) rk = pts[0].rk; else { rk = pts[pts.length - 1].rk; for (var i = 0; i < pts.length - 1; i++) { if (ref >= pts[i].y && ref < pts[i + 1].y) { var tt = (ref - pts[i].y) / ((pts[i + 1].y - pts[i].y) || 1); rk = Math.round(pts[i].rk + (pts[i + 1].rk - pts[i].rk) * tt); break; } } } }
        rankNum.textContent = "#" + rk; rankNum.style.textShadow = "0 0 12px currentColor"; rankNum.style.color = rk > 600 ? "#FF6680" : (rk > 300 ? "#E8A84A" : "#00D4C8");
      }
    }
    if (hint) hint.style.opacity = sy > 120 ? "0" : "0.7";
  }

  /* ---------- background parallax (cosmetic; pauses when hidden) ---------- */
  function raf() {
    var R = root;
    var vh = window.innerHeight, sy = window.scrollY;
    if (sy === lastSy && parInit) { requestAnimationFrame(raf); return; }
    lastSy = sy; parInit = true;
    R.querySelectorAll("[data-par]").forEach(function (el) {
      if (el._base == null) { var t0 = el.style.transform; el.style.transform = "none"; var r = el.getBoundingClientRect(); el._base = r.top + sy; el._h = r.height; el.style.transform = t0; }
      var rel = ((el._base + el._h / 2 - sy) - vh / 2) / vh;
      var sp = parseFloat(el.dataset.par) || 0, dz = parseFloat(el.dataset.depth) || 0;
      el.style.transform = "translate3d(0," + (rel * sp).toFixed(1) + "px," + dz + "px)";
    });
    requestAnimationFrame(raf);
  }

  function boot() {
    if (started) return; started = true;
    introStart = performance.now();
    function muteAll() { root.querySelectorAll("video").forEach(function (v) { v.muted = true; v.defaultMuted = true; v.volume = 0; }); }
    muteAll(); setTimeout(muteAll, 500); setTimeout(muteAll, 1600);
    bootPreloader();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    document.addEventListener("visibilitychange", update);
    setInterval(update, 250);
    requestAnimationFrame(raf);
  }

  /* ---------- form → Telegram lead ---------- */
  function initForm() {
    var form = document.getElementById("leadForm");
    var formWrap = document.getElementById("formWrap");
    var successWrap = document.getElementById("successWrap");
    if (!form) return;

    // honeypot: bots fill hidden fields, humans don't
    var hp = document.createElement("input");
    hp.type = "text"; hp.name = "website"; hp.tabIndex = -1; hp.autocomplete = "off";
    hp.setAttribute("aria-hidden", "true");
    hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
    form.appendChild(hp);
    var loadedAt = Date.now();

    // contact method toggle (EMAIL / TELEGRAM)
    form.querySelectorAll("#contactToggle [data-method]").forEach(function (b) {
      b.addEventListener("click", function () {
        contactMethod = b.getAttribute("data-method") === "telegram" ? "telegram" : "email";
        updateContactUI();
        var ci = form.querySelector("#contactInput");
        if (ci) ci.focus();
      });
    });
    updateContactUI();

    var btn = form.querySelector('button[type="submit"]');
    var btnLabel = btn ? btn.innerHTML : "";
    var errEl = null;
    function showErr(msg) {
      if (!errEl) { errEl = document.createElement("div"); errEl.style.cssText = "text-align:center;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:1px;color:#FF6680;margin-top:8px;"; form.appendChild(errEl); }
      errEl.textContent = msg;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var appEl = form.querySelector('[name="app"]'), contactEl = form.querySelector('[name="contact"]');
      var app = (appEl && appEl.value || "").trim();
      var contact = (contactEl && contactEl.value || "").trim();
      if (!app || !contact) return;

      // validate the contact by the selected method
      if (contactMethod === "telegram") {
        var handle = contact.replace(/^@/, "").replace(/^(https?:\/\/)?t\.me\//i, "");
        if (!/^[A-Za-z0-9_]{3,32}$/.test(handle)) { showErr(lang === "es" ? "Usuario de Telegram no válido." : "Enter a valid Telegram @username."); return; }
        contact = "@" + handle;
      } else {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) { showErr(lang === "es" ? "Email no válido." : "Enter a valid email."); return; }
      }

      if (btn) { btn.disabled = true; btn.style.opacity = "0.6"; btn.style.cursor = "wait"; btn.innerHTML = lang === "es" ? "ENVIANDO…" : "SENDING…"; }
      if (errEl) errEl.textContent = "";

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: app, method: contactMethod, contact: contact, lang: lang, website: hp.value, elapsed: Date.now() - loadedAt })
      }).then(function (res) {
        if (!res.ok) throw new Error("bad status " + res.status);
        return res.json().catch(function () { return {}; });
      }).then(function () {
        if (formWrap) formWrap.style.display = "none";
        if (successWrap) successWrap.style.display = "";
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.style.opacity = ""; btn.style.cursor = "pointer"; btn.innerHTML = btnLabel; }
        showErr(lang === "es" ? "No se pudo enviar. Inténtalo de nuevo." : "Couldn't send. Please try again.");
      });
    });
  }

  applyLang();
  initForm();
  boot();
})();
