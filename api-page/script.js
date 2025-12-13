// Ada API Console – script utama (nyambung ke index.html + src/settings.json)
// Versi FULL: Original Structure + Smart Upload & Image Support

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

    modalEl: document.getElementById("apiResponseModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    endpointText: document.getElementById("endpointText"),
    modalStatusLine: document.getElementById("modalStatusLine"),
    modalLoading: document.getElementById("modalLoading"),
    apiResponseContent: document.getElementById("apiResponseContent"),
    copyEndpointBtn: document.getElementById("copyEndpointBtn"),
    copyCurlBtn: document.getElementById("copyCurlBtn"),
  };

  const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl) : null;

  // ================================
  // STATE
  // ================================
  let settings = null;
  let currentApiItem = null;
  let favorites = loadJSON("ada-api-fav", []); // array path
  let historyItems = loadJSON("ada-api-history", []); // {name,path,ts}
  let themeMode = null; // "light" / "dark"
  let themePresetInternal = null; // "emerald-gold" / "noir" / ...

  // fallback kalau settings.json gagal
  const fallbackCategories = [
    {
      name: "Contoh",
      items: [
        {
          name: "Status API (contoh)",
          desc: "Contoh endpoint kalau settings.json belum terbaca.",
          method: "GET",
          path: "https://httpbin.org/status/200",
          status: "online",
        },
      ],
    },
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

  // SELALU set data-theme (buat mode terang & gelap)
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
  // THEME PRESET
  // ================================
  const presetMap = {
    emerald: "emerald-gold",
    noir: "noir",
    ivory: "royal-amber",
    cyber: "cyber-glow",
    olive: "emerald-gold",
  };

  const reversePresetMap = {
    "emerald-gold": "emerald",
    noir: "noir",
    "royal-amber": "ivory",
    "cyber-glow": "cyber",
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

    DOM.sideNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 992) closeSidebarMobile();
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992 && DOM.sidebarBackdrop) {
        DOM.sidebarBackdrop.classList.remove("show");
        DOM.body.classList.remove("sidebar-open");
      }
    });

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
      ts: new Date().toISOString(),
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
  // VISIBILITY HELPER
  // ================================
  function applyCombinedVisibility(itemEl) {
    const catMatch = itemEl.dataset.catMatch !== "0";
    const favMatch = itemEl.dataset.favMatch !== "0";
    const searchMatch = itemEl.dataset.searchMatch !== "0";

    const visible = catMatch && favMatch && searchMatch;
    itemEl.style.display = visible ? "" : "none";
  }

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
  // RENDER API CARD & FILTER
  // ================================
  function buildApiCard(categoryName, item) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4 api-item";
    col.dataset.category = categoryName;

    const isFavoriteItem = isFav(item.path);
    col.dataset.fav = isFavoriteItem ? "1" : "0";
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

    const initialStatus = (item.status || "unknown").toLowerCase();
    setStatusPill(statusBadge, initialStatus);

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

    const tryBtn = document.createElement("button");
    tryBtn.type = "button";
    tryBtn.className = "api-open-btn";
    tryBtn.innerHTML = '<i class="fas fa-play me-1"></i>Try';

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-toggle-btn";
    favBtn.dataset.path = item.path;
    favBtn.innerHTML = '<i class="fas fa-star"></i>';

    if (isFavoriteItem) {
      favBtn.classList.add("favorited");
    }

    actions.appendChild(tryBtn);
    actions.appendChild(favBtn);

    footer.appendChild(pathEl);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(footer);
    col.appendChild(card);

    favBtn.addEventListener("click", () => toggleFav(item.path, favBtn));
    tryBtn.addEventListener("click", () => openApiModal(item));

    return col;
  }

  function renderFilters(categories) {
    if (!DOM.apiFilters) return;
    DOM.apiFilters.innerHTML = "";

    const makeChip = (label, value, isActive = false) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-chip";
      if (isActive) btn.classList.add("active");
      btn.textContent = label;
      btn.dataset.filter = value;
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
      const filter = btn.dataset.filter;

      DOM.apiFilters
        .querySelectorAll(".filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (filter === "search-tools") {
        applyFilters("all");
      } else {
        applyFilters(filter);
      }
    };
  }

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
  // STATUS PILL
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

      // Skip check for POST endpoints to prevent accidental execution
      if (method === "POST") {
        setStatusPill(statusEl, "online");
        return;
      }

      const fetchMethod = method === "GET" ? "GET" : "GET";

      setStatusPill(statusEl, "checking");

      fetch(url, { method: fetchMethod })
        .then((res) => {
          if (res.ok) {
            setStatusPill(statusEl, "online");
          } else {
            setStatusPill(statusEl, "error");
          }
        })
        .catch(() => {
          setStatusPill(statusEl, "error");
        });
    });
  }

  // ================================
  // MODAL & REQUEST (SMART UPLOAD & IMAGE SUPPORT)
  // ================================
  
  function openApiModal(item) {
    currentApiItem = item;
    if (!DOM.modalEl) return;
    const method = (item.method || "GET").toUpperCase();

    const url = item.path || "";

    if (DOM.modalTitle) DOM.modalTitle.textContent = item.name || "Endpoint";
    if (DOM.modalSubtitle)
      DOM.modalSubtitle.textContent = item.desc || url || "";
    if (DOM.endpointText) DOM.endpointText.textContent = url;
    if (DOM.modalStatusLine) DOM.modalStatusLine.textContent = "";
    if (DOM.apiResponseContent) DOM.apiResponseContent.innerHTML = ""; 
    if (DOM.modalLoading) DOM.modalLoading.classList.add("d-none");

    addHistory({ name: item.name || "Endpoint", path: url });
    appendLog(`Open modal for ${item.name} -> ${url}`);

    if (modalInstance) modalInstance.show();

    // === LOGIKA BARU: DETEKSI UPLOAD VS GET ===
    if (method === "POST") {
        // Tampilkan Form Upload manual
        DOM.apiResponseContent.innerHTML = `
        <div style="text-align: center; padding: 2rem; border: 2px dashed var(--border-color); border-radius: 12px; background: rgba(0,0,0,0.02);">
            <i class="fas fa-file-upload fa-3x mb-3" style="color: var(--primary-color);"></i>
            <h5 class="mb-2">Upload File Required</h5>
            <p class="text-muted small mb-4">Endpoint ini membutuhkan file untuk diproses.</p>
            
            <input type="file" id="manualFileInput" class="form-control mb-3">
            
            <button id="manualExecBtn" class="btn btn-primary w-100">
                <i class="fas fa-paper-plane me-2"></i> Kirim Request
            </button>
        </div>
        <div id="realResultArea" class="mt-3"></div>
        `;

        // Bind event ke tombol manual
        const btn = document.getElementById("manualExecBtn");
        const input = document.getElementById("manualFileInput");

        if(btn && input) {
            btn.onclick = () => {
                if(input.files.length === 0) {
                    alert("Harap pilih file terlebih dahulu!");
                    return;
                }
                // Jalankan request dengan membawa file
                sendApiRequest(input.files[0]);
            };
        }
    } else {
        // Jika GET biasa, langsung eksekusi otomatis
        sendApiRequest();
    }
  }

  async function sendApiRequest(fileData = null) {
    if (!currentApiItem) return;
    const method = (currentApiItem.method || "GET").toUpperCase();
    const url = currentApiItem.path || "";
    
    // Tentukan area output (timpa form upload atau div hasil)
    const outputArea = document.getElementById("realResultArea") || DOM.apiResponseContent;

    if (!url) return;

    if (DOM.modalStatusLine) {
      DOM.modalStatusLine.textContent = "Mengirim permintaan…";
    }
    if (DOM.modalLoading) DOM.modalLoading.classList.remove("d-none");
    if (!fileData) {
        // Bersihkan area output jika bukan mode upload append
        // (Kalau mode upload, kita biarkan form di atasnya tetap ada)
        // outputArea.innerHTML = ""; 
    }

    appendLog(`Request ${method} ${url}`);

    try {
      let options = { method };

      // --- LOGIKA FORM DATA (UPLOAD) ---
      if (method === "POST" && fileData) {
        const formData = new FormData();
        formData.append("file", fileData);
        options.body = formData;
      }

      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type");

      let contentHtml = "";

      // --- LOGIKA DETEKSI GAMBAR ---
      if (contentType && contentType.startsWith("image/")) {
        const blob = await res.blob();
        const imageUrl = URL.createObjectURL(blob);
        contentHtml = `
            <div style="text-align: center;">
                <img src="${imageUrl}" alt="Result Image" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="margin-top: 8px; font-size: 0.8rem; opacity: 0.7;">Image Blob Result</div>
            </div>`;
      } 
      // --- LOGIKA TEXT/JSON ---
      else {
        const text = await res.text();
        const pretty = beautifyJSON(text);
        
        // Cek Link URL hasil Tourl
        try {
            const json = JSON.parse(text);
            if(json.status && json.result && json.result.url) {
                contentHtml += `
                <div class="alert alert-success mt-2">
                    <strong>Upload Berhasil!</strong><br>
                    URL: <a href="${json.result.url}" target="_blank">${json.result.url}</a>
                </div>
                <div style="text-align: center; margin-bottom: 1rem;">
                    <img src="${json.result.url}" style="max-height: 150px; border-radius: 6px;">
                </div>`;
            }
        } catch {}

        contentHtml += `<pre style="background: var(--bg-card); padding: 1rem; border-radius: 8px; overflow-x: auto;">${pretty}</pre>`;
      }

      outputArea.innerHTML = contentHtml;

      if (DOM.modalStatusLine) {
        DOM.modalStatusLine.textContent = `Status: ${res.status} ${
          res.ok ? "(OK)" : "(Error)"
        }`;
      }
      appendLog(`Response ${res.status} untuk ${url} (${contentType || 'unknown'})`);
    } catch (err) {
      if (outputArea) {
        outputArea.textContent = String(err);
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
    if (DOM.copyEndpointBtn && DOM.endpointText) {
      DOM.copyEndpointBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(DOM.endpointText.textContent);
        } catch {
          // ignore
        }
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
        } catch {
          // ignore
        }
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
  // FX: CURSOR GLOW & BANNER
  // ================================
  function initCursorGlow() {
    if (!DOM.cursorGlow) return;
    window.addEventListener("pointermove", (e) => {
      const x = e.clientX;
      const y = e.clientY;
      DOM.cursorGlow.style.transform = `translate(${x}px, ${y}px)`;
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