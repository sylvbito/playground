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
    { el: hero, cls: "focus-hero" },
    { el: document.getElementById("ref1"), cls: "focus-ref1" },
    { el: document.getElementById("ref2"), cls: "focus-ref2" },
    { el: document.getElementById("gen"), cls: "focus-gen" },
  ];

  focusables.forEach(({ el, cls }) => {
    el.addEventListener("click", () => {
      canvas.classList.remove("focus-hero", "focus-ref1", "focus-ref2", "focus-gen");
      canvas.classList.add(cls);
      overview.hidden = false;
    });
  });

  overview.addEventListener("click", () => {
    canvas.classList.remove("focus-hero", "focus-ref1", "focus-ref2", "focus-gen");
    canvas.classList.add("focus-hero");
    overview.hidden = true;
  });

  /* ---------- connectors: hero → references + proposal ---------- */
  function bezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
      y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
    };
  }

  function drawConnectors() {
    const targets = ["ref2", "gen"].map((id) =>
      document.getElementById(id)
    );
    const parts = [];
    targets.forEach((t) => {
      const r1 = hero.getBoundingClientRect();
      const r2 = t.getBoundingClientRect();

      // hero anchor: bottom edge for below-targets (clears intermediate cards),
      // right-mid for everything else
      const targetBelow = r2.top > r1.bottom;
      const targetRight = r2.left > r1.right;
      let x1, y1;
      if (targetBelow) { x1 = r1.left + r1.width * 0.7; y1 = r1.bottom; }
      else if (targetRight) { x1 = r1.right; y1 = r1.top + r1.height / 2; }
      else { x1 = r1.right; y1 = r1.top + r1.height / 2; }

      // target anchor: left-mid when hero is left of target, top-mid when above
      let x2, y2;
      if (r1.right < r2.left) { x2 = r2.left; y2 = r2.top + r2.height / 2; }
      else if (r1.bottom < r2.top) { x2 = r2.left + r2.width / 2; y2 = r2.top; }
      else { x2 = r2.left; y2 = r2.top + r2.height / 2; }

      // nudge endpoints just outside the panel borders
      const pad = 6;
      const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
      x1 += dx * pad; y1 += dy * pad;
      x2 -= dx * pad; y2 -= dy * pad;

      const c1x = x1 + (x2 - x1) * 0.5;
      const c2x = x1 + (x2 - x1) * 0.5;

      // inspiration-path language: hero → inspo is a dotted path with nodes
      const dotted = t.id === "ref2";
      parts.push(
        `<path class="halo" d="M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}"/>`,
        `<path class="${dotted ? "dotted" : ""}" d="M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}"/>`,
        `<circle cx="${x1}" cy="${y1}" r="3" fill="#ffffff" stroke="rgba(26,26,25,0.4)" stroke-width="1.5"/>`,
        `<circle cx="${x2}" cy="${y2}" r="3" fill="#ffffff" stroke="rgba(26,26,25,0.4)" stroke-width="1.5"/>`
      );
      if (dotted) {
        const p0 = { x: x1, y: y1 }, p1 = { x: c1x, y: y1 },
              p2 = { x: c2x, y: y2 }, p3 = { x: x2, y: y2 };
        for (const tt of [0.28, 0.5, 0.72]) {
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
