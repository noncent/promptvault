(function () {
  "use strict";

  const DATA = Array.isArray(window.PROMPTS) ? window.PROMPTS : [];

  const els = {
    search: document.getElementById("search"),
    chips: document.getElementById("chips"),
    results: document.getElementById("results"),
    empty: document.getElementById("empty"),
    stats: document.getElementById("stats"),
    toast: document.getElementById("toast"),
    themeToggle: document.getElementById("theme-toggle"),
  };

  let activeCategory = "All";
  let openId = null;

  /* ---------------- fuzzy search ----------------
   * Subsequence matcher with light scoring:
   *  - all query chars must appear in order (case-insensitive)
   *  - consecutive matches and word-start matches score higher
   * Returns { score, indices } for the given field, or null if no match.
   */
  function fuzzy(query, text) {
    if (!query) return { score: 0, indices: [] };
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    let score = 0;
    let prevMatch = -2;
    const indices = [];

    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        indices.push(ti);
        let s = 1;
        if (ti === prevMatch + 1) s += 5; // consecutive run
        if (ti === 0 || /\s|[-_/]/.test(t[ti - 1])) s += 3; // word start
        score += s;
        prevMatch = ti;
        qi++;
      }
    }
    return qi === q.length ? { score, indices } : null;
  }

  // Score a whole prompt against the query across weighted fields.
  function scorePrompt(query, p) {
    if (!query) return { score: 1, titleIndices: [] };

    const title = fuzzy(query, p.title);
    const category = fuzzy(query, p.category);
    const tags = fuzzy(query, (p.tags || []).join(" "));
    const useCase = fuzzy(query, p.useCase || "");
    const body = fuzzy(query, p.prompt);

    if (!title && !category && !tags && !useCase && !body) return null;

    const score =
      (title ? title.score * 6 : 0) +
      (category ? category.score * 3 : 0) +
      (tags ? tags.score * 4 : 0) +
      (useCase ? useCase.score * 2 : 0) +
      (body ? body.score * 1 : 0);

    return { score, titleIndices: title ? title.indices : [] };
  }

  /* ---------------- rendering ---------------- */
  function highlight(text, indices) {
    if (!indices || !indices.length) return escapeHtml(text);
    const set = new Set(indices);
    let out = "";
    for (let i = 0; i < text.length; i++) {
      const ch = escapeHtml(text[i]);
      out += set.has(i) ? `<mark>${ch}</mark>` : ch;
    }
    return out;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getCategories() {
    const set = new Set(DATA.map((p) => p.category).filter(Boolean));
    return ["All", ...[...set].sort()];
  }

  function renderChips() {
    const cats = getCategories();
    els.chips.innerHTML = cats
      .map(
        (c) =>
          `<button class="chip${c === activeCategory ? " active" : ""}" role="tab" data-cat="${escapeHtml(
            c
          )}">${escapeHtml(c)}</button>`
      )
      .join("");
  }

  function render() {
    const query = els.search.value.trim();

    let list = DATA.map((p) => {
      const res = scorePrompt(query, p);
      return res ? { p, ...res } : null;
    }).filter(Boolean);

    if (activeCategory !== "All") {
      list = list.filter((x) => x.p.category === activeCategory);
    }

    // Sort by score desc, then alphabetically for stability.
    list.sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title));

    els.results.innerHTML = list.map((x, i) => cardHtml(x.p, x.titleIndices, i)).join("");

    const has = list.length > 0;
    els.empty.classList.toggle("hidden", has);
    els.results.classList.toggle("hidden", !has);

    els.stats.textContent = query
      ? `${list.length} match${list.length === 1 ? "" : "es"} for “${query}”`
      : `${DATA.length} prompt${DATA.length === 1 ? "" : "s"} ready to copy`;
  }

  function cardHtml(p, titleIndices, index) {
    const isOpen = p.id === openId;
    const lineCount = p.prompt.split("\n").length;
    return `
      <article class="card${isOpen ? " open" : ""}" role="listitem" data-id="${escapeHtml(p.id)}" style="--i:${index}">
        <button class="card-head" aria-expanded="${isOpen}">
          <h2 class="card-title">${highlight(p.title, titleIndices)}</h2>
          <span class="tag">${escapeHtml(p.category)}</span>
          <svg class="chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="card-body">
          <div class="card-body-inner">
            <div class="prompt-layout">
              <div class="prompt-box">
                <pre class="prompt-text">${escapeHtml(p.prompt)}</pre>
                <div class="prompt-actions">
                  <span class="prompt-meta">${lineCount} line${lineCount === 1 ? "" : "s"}</span>
                  <button class="copy-btn" data-copy="${escapeHtml(p.id)}">
                    <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
                    Copy prompt
                  </button>
                </div>
              </div>
              ${useCaseHtml(p.useCase)}
            </div>
          </div>
        </div>
      </article>`;
  }

  // Fancy side panel explaining when to use a prompt. Rendered only if present.
  function useCaseHtml(useCase) {
    if (!useCase) return "";
    return `
      <aside class="usecase-box">
        <div class="usecase-head">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.7 1 1.2 1 2.5h6c0-1.3.2-1.8 1-2.5A6 6 0 0012 3z"/></svg>
          When to use
        </div>
        <p class="usecase-text">${escapeHtml(useCase)}</p>
      </aside>`;
  }

  /* ---------------- interactions ---------------- */
  function toggleCard(id) {
    openId = openId === id ? null : id;
    render();
  }

  async function copyPrompt(id, btn) {
    const item = DATA.find((p) => p.id === id);
    if (!item) return;
    const ok = await copyText(item.prompt);

    if (ok) {
      btn.classList.add("copied");
      const original = btn.innerHTML;
      btn.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Copied!';
      showToast("Copied to clipboard ✨");
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.innerHTML = original;
      }, 1600);
    } else {
      showToast("Copy failed — select and copy manually");
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      /* fall through to legacy path */
    }
    // Legacy fallback (works on file:// and older browsers)
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  let toastTimer;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1900);
  }

  /* ---------------- theme ---------------- */
  const THEME_KEY = "promptvault-theme";
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) {
      /* storage may be unavailable (private mode / file://) */
    }
  }
  function toggleTheme() {
    setTheme(currentTheme() === "light" ? "dark" : "light");
  }
  if (els.themeToggle) els.themeToggle.addEventListener("click", toggleTheme);

  /* ---------------- events ---------------- */
  els.search.addEventListener("input", render);

  els.chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeCategory = chip.dataset.cat;
    renderChips();
    render();
  });

  els.results.addEventListener("click", (e) => {
    const copyBtn = e.target.closest(".copy-btn");
    if (copyBtn) {
      e.stopPropagation();
      copyPrompt(copyBtn.dataset.copy, copyBtn);
      return;
    }
    const head = e.target.closest(".card-head");
    if (head) {
      const card = head.closest(".card");
      toggleCard(card.dataset.id);
    }
  });

  // Keyboard: "/" focuses search, Esc clears it.
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== els.search) {
      e.preventDefault();
      els.search.focus();
    } else if (e.key === "Escape" && document.activeElement === els.search) {
      els.search.value = "";
      render();
    } else if ((e.key === "t" || e.key === "T") && document.activeElement !== els.search) {
      toggleTheme();
    }
  });

  /* ---------------- init ---------------- */
  renderChips();
  render();
  els.search.focus();
})();
