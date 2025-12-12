// Ada API Console – script utama (nyambung ke index.html + src/settings.json)

document.addEventListener("DOMContentLoaded", () => {
  // ================================
  // DOM CACHE
  // ================================
  const DOM = {
    body: document.body,

    sideNav: document.querySelector(".side-nav"),
    sideNavLinks: document.querySelectorAll(".side-nav-link"),
    menuToggle: document.getElementById("menuToggle"),
    navCollapseBtn: document.getElementById("collapseBtn"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),

    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),

    themeToggle: document.getElementById("themeToggle"),
    themePreset: document.getElementById("themePreset"),

    apiFilters: document.getElementById("apiFilters"),
    apiContent: document.getElementById("apiContent"),
    apiRequestInput: document.getElementById("apiRequestInput"),
    sendApiRequest: document.getElementById("sendApiRequest"),
    requestHistoryList: document.getElementById("requestHistoryList"),
    logsConsole: document.getElementById("liveLogs"),

    versionBadge: document.getElementById("versionBadge"),

    bannerParallax: document.getElementById("bannerParallax"),
    cursorGlow: document.getElementById("cursorGlow"),

    // modal respons
    modalEl: document.getElementById("apiResponseModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    endpointText: document.getElementById("endpointText"),
    modalStatusLine: document.getElementById("modalStatusLine"),
    modalLoading: document.getElementById("modalLoading"),
    apiResponseContent: document.getElementById("apiResponseContent"),
    copyEndpointBtn: document.getElementById("copyEndpointBtn"),
    copyCurlBtn: document.getElementById("copyCurlBtn")
  };

  // bootstrap modal (kalau ada)
  let modalInstance = null;
  if (DOM.modalEl && window.bootstrap && bootstrap.Modal) {
    modalInstance = bootstrap.Modal.getOrCreateInstance(DOM.modalEl);
  }

  // ================================
  // STATE
  // ================================
  let settings = null;
  let currentApiItem = null;
  let favorites = loadJSON("ada-api-fav", []);   // array path
  let historyItems = loadJSON("ada-api-history", []); // {name,path,ts}
  let themeMode = null;                          // 'light' | 'dark'
  let themePresetInternal = null;               // 'emerald-gold', 'noir', ...

  const fallbackCategories = [
    {
      name: "Contoh",
      items: [
        {
          name: "Status API (contoh)",
          desc: "Contoh endpoint kalau settings.json belum terbaca.",
          method: "GET",
          path: "https://httpbin.org/status/200",
          status: "online"
        }
      ]
    }
  ];

  // ================================
  // UTIL
  // ================================
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  function appendLog(line) {
    if (!DOM.logsConsole) return;
    const ts = new Date().toISOString().slice(11, 19);
    DOM.logsConsole.textContent += `[${ts}] ${line}\n`;
    DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
  }

  function beautifyJSON(text) {
    try {
      const obj = JSON.parse(text);
      return JSON.stringify(obj, null, 2);
    } catch {
      return text;
    }
  }

  // ✅ FIX KERAS: pastikan scroll nggak ngestuck
  function forceUnlockScroll() {
    DOM.body.classList.remove("modal-open");
    DOM.body.style.overflow = "";
    DOM.body.style.paddingRight = "";

    document
      .querySelectorAll(".modal-backdrop")
      .forEach((b) => b.parentNode && b.parentNode.removeChild(b));
  }

  // hard close modal (baik lewat bootstrap maupun manual)
  function hardCloseModal() {
    if (modalInstance) {
      try {
        modalInstance.hide();
      } catch (e) {
        // ignore
      }
    }
    if (DOM.modalEl) {
      DOM.modalEl.classList.remove("show");
      DOM.modalEl.style.display = "none";
      DOM.modalEl.setAttribute("aria-hidden", "true");
    }
    forceUnlockScroll();
  }

  // panggil di awal untuk jaga-jaga
  forceUnlockScroll();

  // ================================
  // DETEKSI MEDIA (foto / video / audio)
  // ================================
  function getMediaTypeFromUrl(url) {
    const clean = (url || "").split("?")[0].toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|avif)$/.test(clean)) return "image";
    if (/\.(mp4|webm|ogg|mkv)$/.test(clean)) return "video";
    if (/\.(mp3|wav|ogg|m4a|flac)$/.test(clean)) return "audio";
    return null;
  }

  function showMediaPreview(url) {
    if (!DOM.apiResponseContent) return;

    const type = getMediaTypeFromUrl(url);
    if (!type) return;

    DOM.apiResponseContent.innerHTML = "";

    let el;
    if (type === "image") {
      el = document.createElement("img");
      el.src = url;
      el.alt = "Image preview";
      el.style.maxWidth = "100%";
      el.style.borderRadius = "12px";
    } else if (type === "video") {
      el = document.createElement("video");
      el.src = url;
      el.controls = true;
      el.style.maxWidth = "100%";
      el.style.borderRadius = "12px";
    } else if (type === "audio") {
      el = document.createElement("audio");
      el.src = url;
      el.controls = true;
      el.style.width = "100%";
    }

    if (el) {
      DOM.apiResponseContent.appendChild(el);
      if (DOM.modalStatusLine) {
        DOM.modalStatusLine.textContent = "Preview media (langsung dari endpoint).";
      }
    }
  }

  // ================================
  // THEME MODE (LIGHT / DARK)
  // ================================
  function detectSystemMode() {
    try {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }
      return "light";
    } catch {
      return "light";
    }
  }

  function syncBodyThemeAttr() {
    const internal = themePresetInternal || "emerald-gold";
    DOM.body.setAttribute("data-theme", internal);
  }

  function applyMode(mode) {
    const isDark = mode === "dark";
    themeMode = mode;
    DOM.body.classList.toggle("dark-mode", isDark);
    if (DOM.themeToggle) DOM.themeToggle.checked = isDark;
    saveJSON("ada-ui-mode", mode);
    syncBodyThemeAttr();
  }

  function initMode() {
    const stored = loadJSON("ada-ui-mode", null);
    if (stored === "dark" || stored === "light") {
      applyMode(stored);
    } else {
      applyMode(detectSystemMode());
      if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e) => applyMode(e.matches ? "dark" : "light");
        if (mq.addEventListener) mq.addEventListener("change", handler);
        else mq.addListener(handler);
      }
    }

    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener("change", () => {
        applyMode(DOM.themeToggle.checked ? "dark" : "light");
      });
    }
  }

  // ================================
  // THEME PRESET (Emerald, Noir, dll)
  // ================================
  const presetMap = {
    emerald: "emerald-gold",
    noir: "noir",
    ivory: "royal-amber",
    cyber: "cyber-glow",
    olive: "emerald-gold"
  };

  const reversePresetMap = {
    "emerald-gold": "emerald",
    noir: "noir",
    "royal-amber": "ivory",
    "cyber-glow": "cyber"
  };

  function applyPreset(internalKey) {
    const allowed = ["emerald-gold", "noir", "royal-amber", "cyber-glow"];
    if (!allowed.includes(internalKey)) internalKey = "emerald-gold";

    themePresetInternal = internalKey;
    saveJSON("ada-ui-theme", internalKey);

    if (DOM.themePreset) {
      const selectValue = reversePresetMap[internalKey] || "emerald";
      DOM.themePreset.value = selectValue;
    }

    syncBodyThemeAttr();
  }

  function initPreset() {
    let stored = loadJSON("ada-ui-theme", null);
    if (!stored) stored = "emerald-gold";
    applyPreset(stored);

    if (DOM.themePreset) {
      DOM.themePreset.addEventListener("change", () => {
        const userValue = DOM.themePreset.value;
        const internalKey = presetMap[userValue] || "emerald-gold";
        applyPreset(internalKey);
      });
    }
  }

  // ================================
  // SIDEBAR
  // ================================
  function openSidebarMobile() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.add("open");
    DOM.body.classList.add("sidebar-open");
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add("show");
  }

  function closeSidebarMobile() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.remove("open");
    DOM.body.classList.remove("sidebar-open");
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
  }

  function toggleSidebarCollapsedDesktop() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.toggle("collapsed");
  }

  function initSidebar() {
    if (DOM.menuToggle) {
      DOM.menuToggle.addEventListener("click", () => {
        if (window.innerWidth < 992) {
          if (DOM.sideNav.classList.contains("open")) {
            closeSidebarMobile();
          } else {
            openSidebarMobile();
          }
        } else {
          toggleSidebarCollapsedDesktop();
        }
      });
    }

    if (DOM.navCollapseBtn) {
      DOM.navCollapseBtn.addEventListener("click", () => {
        toggleSidebarCollapsedDesktop();
      });
    }

    if (DOM.sidebarBackdrop) {
      DOM.sidebarBackdrop.addEventListener("click", () => {
        closeSidebarMobile();
      });
    }

    // klik link di sidebar
    DOM.sideNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const href = link.getAttribute("href") || "";
        if (window.innerWidth < 992) {
          closeSidebarMobile();
        } else if (href === "#hero" || href === "#home") {
          // klik Beranda di desktop → sidebar dibuka, modal ditutup, scroll di-unlock
          if (DOM.sideNav) DOM.sideNav.classList.remove("collapsed");
          hardCloseModal();
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992 && DOM.sidebarBackdrop) {
        DOM.sidebarBackdrop.classList.remove("show");
        DOM.body.classList.remove("sidebar-open");
      }
    });

    // highlight menu aktif saat scroll
    window.addEventListener("scroll", () => {
      const headerOffset = 72;
      const scrollY = window.scrollY + headerOffset;

      document.querySelectorAll("main section[id]").forEach((section) => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute("id");
        const link = document.querySelector(`.side-nav-link[href="#${id}"]`);
        if (!link) return;
        if (scrollY >= top && scrollY < bottom) {
          DOM.sideNavLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    });
  }

  // ================================
  // SEARCH
  // ================================
  function applyCombinedVisibility(itemEl) {
    const catMatch = itemEl.dataset.catMatch !== "0";
    const favMatch = itemEl.dataset.favMatch !== "0";
    const searchMatch = itemEl.dataset.searchMatch !== "0";
    const visible = catMatch && favMatch && searchMatch;
    itemEl.style.display = visible ? "" : "none";
  }

  function filterApis(query) {
    query = query.trim().toLowerCase();
    const itemEls = DOM.apiContent
      ? DOM.apiContent.querySelectorAll(".api-item")
      : [];

    itemEls.forEach((el) => {
      const name =
        el.querySelector(".api-card-title")?.textContent.toLowerCase() || "";
      const desc =
        el.querySelector(".api-card-desc")?.textContent.toLowerCase() || "";
      const path =
        el.querySelector(".api-path")?.textContent.toLowerCase() || "";

      const match =
        !query ||
        name.includes(query) ||
        desc.includes(query) ||
        path.includes(query);

      el.dataset.searchMatch = match ? "1" : "0";
      applyCombinedVisibility(el);
    });
  }

  function initSearch() {
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener("input", () => {
        filterApis(DOM.searchInput.value);
      });
    }
    if (DOM.clearSearch) {
      DOM.clearSearch.addEventListener("click", () => {
        DOM.searchInput.value = "";
        filterApis("");
      });
    }
  }

  // ================================
  // FAVORIT & HISTORY
  // ================================
  function isFav(path) {
    return favorites.includes(path);
  }

  function toggleFav(path, btn) {
    const idx = favorites.indexOf(path);
    const itemEl = btn.closest(".api-item");

    if (idx >= 0) {
      favorites.splice(idx, 1);
      btn.classList.remove("favorited");
      if (itemEl) itemEl.dataset.fav = "0";
    } else {
      favorites.push(path);
      btn.classList.add("favorited");
      if (itemEl) itemEl.dataset.fav = "1";
    }
    saveJSON("ada-api-fav", favorites);

    if (DOM.apiFilters) {
      const active = DOM.apiFilters.querySelector(".filter-chip.active");
      if (active && active.dataset.filter === "favorites") {
        applyFilters("favorites");
      }
    }
  }

  function addHistory(item) {
    historyItems.unshift({
      name: item.name,
      path: item.path,
      ts: new Date().toISOString()
    });
    historyItems = historyItems.slice(0, 20);
    saveJSON("ada-api-history", historyItems);
    renderHistory();
  }

  function renderHistory() {
    if (!DOM.requestHistoryList) return;
    DOM.requestHistoryList.innerHTML = "";
    historyItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "history-name";
      nameSpan.textContent = item.name;

      const pathSpan = document.createElement("span");
      pathSpan.className = "history-path";
      pathSpan.textContent = item.path;

      li.appendChild(nameSpan);
      li.appendChild(pathSpan);
      DOM.requestHistoryList.appendChild(li);
    });
  }

  // ================================
  // FILTER VISIBILITY (category/favorites)
  // ================================
  function applyFilters(activeFilter) {
    const items = DOM.apiContent
      ? DOM.apiContent.querySelectorAll(".api-item")
      : [];

    items.forEach((itemEl) => {
      const catName = itemEl.dataset.category;
      const isFavItem = itemEl.dataset.fav === "1";

      if (activeFilter === "all" || activeFilter === "favorites") {
        itemEl.dataset.catMatch = "1";
      } else {
        itemEl.dataset.catMatch = catName === activeFilter ? "1" : "0";
      }

      if (activeFilter === "favorites") {
        itemEl.dataset.favMatch = isFavItem ? "1" : "0";
      } else {
        itemEl.dataset.favMatch = "1";
      }

      if (!itemEl.dataset.searchMatch) itemEl.dataset.searchMatch = "1";

      applyCombinedVisibility(itemEl);
    });
  }

  // ================================
  // BUILD API CARD (Get API + Download)
  // ================================
  function buildApiCard(categoryName, item) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4 api-item";
    col.dataset.category = categoryName;

    const fav = isFav(item.path);
    col.dataset.fav = fav ? "1" : "0";
    col.dataset.catMatch = "1";
    col.dataset.favMatch = "1";
    col.dataset.searchMatch = "1";

    const card = document.createElement("article");
    card.className = "api-card";

    const header = document.createElement("div");
    header.className = "api-card-header";

    const title = document.createElement("h4");
    title.className = "api-card-title";
    title.textContent = item.name;

    const metaRow = document.createElement("div");
    metaRow.className = "card-meta-row";

    const methodBadge = document.createElement("span");
    methodBadge.className = "http-badge";
    const method = (item.method || "GET").toUpperCase();
    methodBadge.textContent = method;
    if (method === "POST") methodBadge.classList.add("http-post");
    else if (method === "PUT") methodBadge.classList.add("http-put");
    else if (method === "DELETE") methodBadge.classList.add("http-delete");
    else methodBadge.classList.add("http-get");

    const statusBadge = document.createElement("span");
    statusBadge.className = "endpoint-status-pill";
    statusBadge.dataset.path = item.path || "";
    setStatusPill(statusBadge, item.status || "unknown");

    metaRow.appendChild(methodBadge);
    metaRow.appendChild(statusBadge);

    header.appendChild(title);
    header.appendChild(metaRow);

    const desc = document.createElement("p");
    desc.className = "api-card-desc";
    desc.textContent = item.desc || "";

    const footer = document.createElement("div");
    footer.className = "api-card-footer";

    const pathEl = document.createElement("div");
    pathEl.className = "api-path";
    pathEl.textContent = item.path;

    const actions = document.createElement("div");
    actions.className = "api-card-actions";

    // ==== GET API (cek endpoint, buka modal) ====
    const getBtn = document.createElement("button");
    getBtn.type = "button";
    getBtn.className = "api-open-btn";
    getBtn.innerHTML = '<i class="fas fa-bolt me-1"></i>Get API';

    // ==== DOWNLOAD (link manual dari settings.json) ====
    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "api-download-btn";
    downloadBtn.innerHTML = '<i class="fas fa-download me-1"></i>Download';

    const downloadBase = item.download || item.downloadUrl || "";
    if (!downloadBase) {
      downloadBtn.style.display = "none";
    } else {
      downloadBtn.addEventListener("click", () => {
        // kalau di settings.json kamu isi:
        // "download": "/yt/mp3?url="
        // maka di sini kita minta user isi URL YouTube dulu.
        let finalUrl = downloadBase;
        let needsQuery =
          finalUrl.endsWith("=") || finalUrl.includes("{query}");

        if (needsQuery) {
          const userInput = prompt("Masukkan link / URL untuk di-download:");
          if (!userInput) return;
          const trimmed = userInput.trim();
          if (!trimmed) return;

          if (finalUrl.includes("{query}")) {
            finalUrl = finalUrl.replace("{query}", encodeURIComponent(trimmed));
          } else {
            finalUrl = finalUrl + encodeURIComponent(trimmed);
          }
        }

        appendLog(`Download: ${finalUrl}`);
        window.open(finalUrl, "_blank");
      });
    }

    // ==== FAVORITE ====
    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-toggle-btn";
    favBtn.dataset.path = item.path;
    favBtn.innerHTML = '<i class="fas fa-star"></i>';
    if (fav) favBtn.classList.add("favorited");

    // events
    getBtn.addEventListener("click", () => openApiModal(item));
    favBtn.addEventListener("click", () => toggleFav(item.path, favBtn));

    actions.appendChild(getBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(favBtn);

    footer.appendChild(pathEl);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(footer);
    col.appendChild(card);

    return col;
  }

  // ================================
  // FILTER CHIPS
  // ================================
  function renderFilters(categories) {
    if (!DOM.apiFilters) return;
    DOM.apiFilters.innerHTML = "";

    const makeChip = (label, value, active = false) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-chip";
      btn.dataset.filter = value;
      btn.textContent = label;
      if (active) btn.classList.add("active");
      DOM.apiFilters.appendChild(btn);
      return btn;
    };

    makeChip("Semua", "all", true);

    categories.forEach((cat) => {
      makeChip(cat.name, cat.name);
    });

    makeChip("Search Tools", "search-tools");
    makeChip("Favorites", "favorites");

    DOM.apiFilters.onclick = (e) => {
      const btn = e.target.closest(".filter-chip");
      if (!btn) return;
      DOM.apiFilters
        .querySelectorAll(".filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;
      if (filter === "search-tools") {
        applyFilters("all");
      } else {
        applyFilters(filter);
      }
    };
  }

  // ================================
  // RENDER API CATEGORIES
  // ================================
  function renderApiCategories() {
    if (!DOM.apiContent) return;
    DOM.apiContent.innerHTML = "";

    const categories =
      settings &&
      Array.isArray(settings.categories) &&
      settings.categories.length
        ? settings.categories
        : fallbackCategories;

    renderFilters(categories);

    const row = document.createElement("div");
    row.className = "row";

    categories.forEach((cat) => {
      const catName = cat.name || "Tanpa Kategori";
      const items = Array.isArray(cat.items) ? cat.items : [];
      items.forEach((item) => {
        const col = buildApiCard(catName, item);
        row.appendChild(col);
      });
    });

    DOM.apiContent.appendChild(row);
    applyFilters("all");
    checkEndpointStatusForAll();
  }

  // ================================
  // STATUS PILL + PING ENDPOINT
  // ================================
  function setStatusPill(el, status) {
    el.classList.remove("status-ok", "status-error", "status-unknown");
    const s = (status || "").toLowerCase();

    if (s === "ok" || s === "online" || s === "ready") {
      el.classList.add("status-ok");
      el.textContent = "Online";
    } else if (s === "error" || s === "down" || s === "failed") {
      el.classList.add("status-error");
      el.textContent = "Error";
    } else if (s === "checking") {
      el.classList.add("status-unknown");
      el.textContent = "Checking…";
    } else {
      el.classList.add("status-unknown");
      el.textContent = "Unknown";
    }
  }

  function checkEndpointStatusForAll() {
    const items = DOM.apiContent
      ? DOM.apiContent.querySelectorAll(".api-item")
      : [];
    if (!items.length) return;

    items.forEach((itemEl) => {
      const pathEl = itemEl.querySelector(".api-path");
      const statusEl = itemEl.querySelector(".endpoint-status-pill");
      const methodBadge = itemEl.querySelector(".http-badge");
      if (!pathEl || !statusEl) return;

      const url = (pathEl.textContent || "").trim();
      if (!url) return;
      const method = (methodBadge?.textContent || "GET")
        .toString()
        .trim()
        .toUpperCase();

      const fetchMethod = method === "GET" ? "GET" : "GET";

      setStatusPill(statusEl, "checking");
      fetch(url, { method: fetchMethod })
        .then((res) => {
          if (res.ok) setStatusPill(statusEl, "online");
          else setStatusPill(statusEl, "error");
        })
        .catch(() => setStatusPill(statusEl, "error"));
    });
  }

  // ================================
  // MODAL TRY API (+ MEDIA FIX)
  // ================================
  function openApiModal(item) {
    currentApiItem = item;
    if (!DOM.modalEl) return;

    // sebelum buka modal, pastikan state modal bersih
    forceUnlockScroll();

    const url = item.path || "";

    if (DOM.modalTitle) DOM.modalTitle.textContent = item.name || "Endpoint";
    if (DOM.modalSubtitle)
      DOM.modalSubtitle.textContent = item.desc || url || "";
    if (DOM.endpointText) DOM.endpointText.textContent = url;
    if (DOM.modalStatusLine) DOM.modalStatusLine.textContent = "";
    if (DOM.apiResponseContent) DOM.apiResponseContent.textContent = "";
    if (DOM.modalLoading) DOM.modalLoading.classList.add("d-none");

    addHistory({ name: item.name || "Endpoint", path: url });
    appendLog(`Open modal for ${item.name} -> ${url}`);

    // buka modal (bootstrap kalau ada, kalau nggak manual)
    if (modalInstance) {
      modalInstance.show();
    } else {
      DOM.modalEl.style.display = "block";
      DOM.modalEl.classList.add("show");
      DOM.modalEl.removeAttribute("aria-hidden");
      DOM.body.classList.add("modal-open");
      DOM.body.style.overflow = "hidden";
    }

    // cek apakah endpoint adalah media
    const mediaType = getMediaTypeFromUrl(url);
    if (mediaType) {
      if (DOM.modalStatusLine) {
        DOM.modalStatusLine.textContent = "Memuat media langsung dari endpoint…";
      }
      showMediaPreview(url);
      return;
    }

    // non-media → request seperti biasa
    sendApiRequest();
  }

  async function sendApiRequest() {
    if (!currentApiItem) return;
    const method = (currentApiItem.method || "GET").toUpperCase();
    const url = currentApiItem.path || "";
    if (!url) return;

    if (DOM.modalStatusLine) {
      DOM.modalStatusLine.textContent = "Mengirim permintaan…";
    }
    if (DOM.modalLoading) DOM.modalLoading.classList.remove("d-none");
    if (DOM.apiResponseContent) DOM.apiResponseContent.textContent = "";

    appendLog(`Request ${method} ${url}`);

    try {
      const res = await fetch(url, { method });
      const text = await res.text();
      const pretty = beautifyJSON(text);

      if (DOM.apiResponseContent) {
        DOM.apiResponseContent.textContent = pretty;
      }
      if (DOM.modalStatusLine) {
        DOM.modalStatusLine.textContent = `Status: ${res.status} ${
          res.ok ? "(OK)" : "(Error)"
        }`;
      }
      appendLog(`Response ${res.status} untuk ${url}`);
    } catch (err) {
      if (DOM.apiResponseContent) {
        DOM.apiResponseContent.textContent = String(err);
      }
      if (DOM.modalStatusLine) {
        DOM.modalStatusLine.textContent = "Gagal melakukan request.";
      }
      appendLog(`Error: ${err.message}`);
    } finally {
      if (DOM.modalLoading) DOM.modalLoading.classList.add("d-none");
    }
  }

  function initModalEvents() {
    // kalau Bootstrap benar-benar dipakai, dengarkan hidden.bs.modal
    if (DOM.modalEl && window.bootstrap && bootstrap.Modal) {
      DOM.modalEl.addEventListener("hidden.bs.modal", () => {
        forceUnlockScroll();
      });
    }

    // JAGA-JAGA: kalau ada tombol dengan data-bs-dismiss="modal" / .btn-close
    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest(
        "[data-bs-dismiss='modal'], .btn-close, .modal-close"
      );
      if (!closeBtn) return;

      // kasih delay dikit buat Bootstrap beresin, baru kita paksa unlock
      setTimeout(() => {
        hardCloseModal();
      }, 150);
    });

    if (DOM.copyEndpointBtn && DOM.endpointText) {
      DOM.copyEndpointBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(DOM.endpointText.textContent);
        } catch {}
      });
    }

    if (DOM.copyCurlBtn) {
      DOM.copyCurlBtn.addEventListener("click", async () => {
        if (!currentApiItem) return;
        const method = (currentApiItem.method || "GET").toUpperCase();
        const url = currentApiItem.path || "";
        const curl = `curl -X ${method} "${url}"`;
        try {
          await navigator.clipboard.writeText(curl);
        } catch {}
      });
    }
  }

  // ================================
  // REQUEST BOX → WHATSAPP
  // ================================
  function initRequestBox() {
    if (!DOM.apiRequestInput || !DOM.sendApiRequest) return;
    DOM.sendApiRequest.addEventListener("click", () => {
      const text = DOM.apiRequestInput.value.trim();
      if (!text) return;
      const waNumber = "6287751121269";
      const url =
        "https://wa.me/" +
        waNumber +
        "?text=" +
        encodeURIComponent("[Request Endpoint Ada API]\n\n" + text);
      window.open(url, "_blank");
      appendLog("Request endpoint dikirim ke WhatsApp.");
      DOM.apiRequestInput.value = "";
    });
  }

  // ================================
  // FX: CURSOR & BANNER
  // ================================
  function initCursorGlow() {
    if (!DOM.cursorGlow) return;
    window.addEventListener("pointermove", (e) => {
      DOM.cursorGlow.style.transform = `translate(${e.clientX - 180}px, ${
        e.clientY - 180
      }px)`;
    });
  }

  function initBannerParallax() {
    if (!DOM.bannerParallax) return;
    DOM.bannerParallax.addEventListener("mousemove", (e) => {
      const rect = DOM.bannerParallax.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const img = DOM.bannerParallax.querySelector(".banner-oldmoney");
      if (!img) return;
      img.style.transform = `translate(${x * 12}px, ${y * 8}px) scale(1.02)`;
    });
    DOM.bannerParallax.addEventListener("mouseleave", () => {
      const img = DOM.bannerParallax.querySelector(".banner-oldmoney");
      if (!img) return;
      img.style.transform = "translate(0,0) scale(1)";
    });
  }

  function initScrollReveal() {
    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.08 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  // ================================
  // SETTINGS.JSON → HERO & API
  // ================================
  function applySettingsToHero() {
    if (!settings) return;
    if (DOM.versionBadge && settings.version) {
      DOM.versionBadge.textContent = settings.version;
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/src/settings.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      settings = await res.json();
      appendLog("settings.json loaded.");
      applySettingsToHero();
      renderApiCategories();
    } catch (err) {
      appendLog(`Gagal memuat settings.json: ${err.message}`);
      settings = null;
      renderApiCategories();
    }
  }

  // ================================
  // INIT
  // ================================
  async function init() {
    if (DOM.logsConsole) DOM.logsConsole.textContent = "";

    initMode();
    initPreset();
    initSidebar();
    initSearch();
    initModalEvents();
    initRequestBox();
    initCursorGlow();
    initBannerParallax();
    initScrollReveal();
    renderHistory();

    appendLog("Menyiapkan konsol Ada API…");
    await loadSettings();
    appendLog("Ada API Console siap.");
  }

  init();
});