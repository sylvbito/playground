/* Orbit · spatial canvas concept — interaction layer */
(() => {
  const app = document.getElementById("app");
  const canvas = document.getElementById("canvas");
  const entry = document.getElementById("entry");
  const room = document.getElementById("room");
  const composer = document.getElementById("composer");
  const composerInput = document.getElementById("composerInput");
  const hero = document.getElementById("hero");
  const overview = document.getElementById("overview");
  const connectors = document.getElementById("connectors");

  /* ---------- rail toggle ---------- */
  const rail = document.getElementById("rail");
  const railToggle = document.getElementById("railToggle");
  railToggle.addEventListener("click", () => {
    rail.classList.toggle("collapsed");
    app.classList.toggle("rail-closed", rail.classList.contains("collapsed"));
  });

  /* ---------- narrow → expand reveal ---------- */
  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = composerInput.value.trim();
    if (!text) return;

    // put the submitted prompt into the hero panel as the user message
    const firstMsg = hero.querySelector(".msg--user");
    firstMsg.textContent = text;

    const rect = composer.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();

    // translate the composer toward the hero panel's origin, then hand off
    const dx = heroRect.left - rect.left;
    const dy = heroRect.top - rect.top;

    composer.style.transition =
      "transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease";
    composer.style.transform = `translate(${dx}px, ${dy}px) scale(0.92)`;
    composer.style.opacity = "0";

    entry.style.opacity = "0";

    setTimeout(() => {
      entry.hidden = true;
      room.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        room.classList.add("open");
        drawConnectors();
      }));
      setTimeout(() => {
        composer.style.transition = "";
        composer.style.transform = "";
        composer.style.opacity = "";
      }, 700);
    }, 420);
  });

  /* ---------- semantic depth: focus a card ---------- */
  const focusables = [
    "hero", "ref1", "inspo", "moodboard", "gen", "ref3"
  ];

  focusables.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("click", () => {
      canvas.classList.add("focus");
      document.querySelectorAll(".panel.focused").forEach((p) => p.classList.remove("focused"));
      el.classList.add("focused");
      overview.hidden = false;
    });
  });

  overview.addEventListener("click", () => {
    canvas.classList.remove("focus");
    document.querySelectorAll(".panel.focused").forEach((p) => p.classList.remove("focused"));
    overview.hidden = true;
  });

  /* ---------- connectors: explicit routes, corridor-clean ---------- */
  function bezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
      y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
    };
  }

  function edgeAnchors(fromEl, toEl) {
    const r1 = fromEl.getBoundingClientRect();
    const r2 = toEl.getBoundingClientRect();
    const below = r2.top > r1.bottom;
    const right = r2.left > r1.right;
    const left = r2.right < r1.left;

    // source anchor
    let x1, y1;
    if (below) { x1 = r1.left + r1.width / 2; y1 = r1.bottom; }
    else if (right) { x1 = r1.right; y1 = r1.top + r1.height * 0.45; }
    else if (left) { x1 = r1.left; y1 = r1.top + r1.height * 0.45; }
    else { x1 = r1.left + r1.width / 2; y1 = r1.top + r1.height * 0.45; }

    // target anchor (mirror)
    let x2, y2;
    if (below) { x2 = r2.left + r2.width / 2; y2 = r2.top; }
    else if (right) { x2 = r2.left; y2 = r2.top + r2.height * 0.45; }
    else if (left) { x2 = r2.right; y2 = r2.top + r2.height * 0.45; }
    else { x2 = r2.left + r2.width / 2; y2 = r2.top + r2.height * 0.45; }

    // nudge endpoints just outside the panel borders
    const pad = 6;
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    x1 += dx * pad; y1 += dy * pad;
    x2 -= dx * pad; y2 -= dy * pad;
    return { x1, y1, x2, y2 };
  }

  function drawConnectors() {
    const routes = [
      { from: "hero", to: "gen", dotted: false },
      { from: "hero", to: "inspo", dotted: true },
    ];
    const parts = [];
    routes.forEach((route) => {
      const fromEl = document.getElementById(route.from);
      const toEl = document.getElementById(route.to);
      const { x1, y1, x2, y2 } = edgeAnchors(fromEl, toEl);

      const c1x = x1 + (x2 - x1) * 0.5;
      const c2x = x1 + (x2 - x1) * 0.5;

      parts.push(
        `<path class="halo" d="M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}"/>`,
        `<path class="${route.dotted ? "dotted" : ""}" d="M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}"/>`,
        `<circle cx="${x1}" cy="${y1}" r="3" fill="#ffffff" stroke="rgba(26,26,25,0.4)" stroke-width="1.5"/>`,
        `<circle cx="${x2}" cy="${y2}" r="3" fill="#ffffff" stroke="rgba(26,26,25,0.4)" stroke-width="1.5"/>`
      );
      if (route.dotted) {
        const p0 = { x: x1, y: y1 }, p1 = { x: c1x, y: y1 },
              p2 = { x: c2x, y: y2 }, p3 = { x: x2, y: y2 };
        const ts = route.from === "hero" ? [0.3, 0.55, 0.8] : [0.5];
        for (const tt of ts) {
          const pt = bezierPoint(p0, p1, p2, p3, tt);
          parts.push(
            `<circle class="node" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3.5"/>`
          );
        }
      }
    });
    connectors.innerHTML = parts.join("");
  }

  window.addEventListener("resize", () => {
    if (room.classList.contains("open")) drawConnectors();
  });

  /* keyboard: Enter submits, Esc clears focus state */
  composerInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") composerInput.blur();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && room.classList.contains("open")) {
      overview.click();
    }
  });
})();
