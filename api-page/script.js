// ====== PART 1 (baris 1–100) ======

document.addEventListener("DOMContentLoaded", function () {
    let currentApiItem = null;
    let settings = null;
    let favorites = JSON.parse(localStorage.getItem("adaAPI_favorites") || "[]");
    let historyItems = JSON.parse(localStorage.getItem("adaAPI_history") || "[]");

    // DOM Elements
    const DOM = {
        body: document.body,
        themeToggle: document.getElementById("themeToggle"),
        themeText: document.getElementById("themeText"),
        sidebar: document.querySelector(".sidebar"),
        sidebarToggle: document.getElementById("sidebarToggle"),
        sidebarLinks: document.querySelectorAll(".nav-link"),
        sidebarOverlay: document.getElementById("sidebarOverlay"),
        apiList: document.getElementById("apiList"),
        searchBox: document.getElementById("searchBox"),
        categoryMenu: document.getElementById("categoryMenu"),
        modal: document.getElementById("apiResponseModal"),
        modalTitle: document.getElementById("modalTitle"),
        modalSubtitle: document.getElementById("modalSubtitle"),
        modalStatus: document.getElementById("modalStatus"),
        modalLoading: document.getElementById("modalLoading"),
        modalContent: document.getElementById("modalContent"),
        endpointText: document.getElementById("endpointText"),
        copyEndpointBtn: document.getElementById("copyEndpointBtn"),
        copyCurlBtn: document.getElementById("copyCurlBtn"),
        logs: document.getElementById("liveLogs"),
        historyList: document.getElementById("historyList"),
        favoritesSection: document.getElementById("favoritesSection")
    };

    // Bootstrap Modal Instance
    let modalInstance = bootstrap.Modal.getOrCreateInstance(DOM.modal);

    // THEME HANDLING
    function applyTheme(mode) {
        document.documentElement.setAttribute("data-theme", mode);
        DOM.themeText.textContent = mode === "dark" ? "Dark" : "Light";
        localStorage.setItem("adaAPI_theme", mode);
    }

    // Load saved theme
    let savedTheme = localStorage.getItem("adaAPI_theme") || "dark";
    applyTheme(savedTheme);

    DOM.themeToggle.addEventListener("click", () => {
        let newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(newTheme);
    });

    // SIDEBAR HANDLING
    function toggleSidebar() {
        DOM.sidebar.classList.toggle("open");
        DOM.sidebarOverlay.classList.toggle("show");
    }

    DOM.sidebarToggle.addEventListener("click", toggleSidebar);
    DOM.sidebarOverlay.addEventListener("click", toggleSidebar);

    DOM.sidebarLinks.forEach(link => {
        link.addEventListener("click", () => {
            DOM.sidebar.classList.remove("open");
            DOM.sidebarOverlay.classList.remove("show");
        });
    });

    // LOGGING
    function log(message, type = "info") {
        if (!DOM.logs) return;

        const line = document.createElement("div");
        line.className = `log-line log-${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        DOM.logs.appendChild(line);
        DOM.logs.scrollTop = DOM.logs.scrollHeight;
    }

    // LOAD SETTINGS.JSON
    fetch("/src/settings.json")
        .then(res => res.json())
        .then(data => {
            settings = data;
            renderCategories();
            renderAPIItems();
            renderFavorites();
            renderHistory();
        })
        .catch(err => log("Gagal memuat settings.json", "error"));

    // CATEGORY FILTER RENDERING
    function renderCategories() {
        DOM.categoryMenu.innerHTML = "";
        // ====== PART 2 (baris 101–200) ======

        settings.categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.className = "dropdown-item";
            btn.textContent = cat.name;
            btn.addEventListener("click", () => filterByCategory(cat.name));
            DOM.categoryMenu.appendChild(btn);
        });
    }

    // FILTER BY CATEGORY
    function filterByCategory(category) {
        const items = document.querySelectorAll(".api-item");

        items.forEach(item => {
            if (category === "All" || item.dataset.category === category) {
                item.classList.remove("d-none");
            } else {
                item.classList.add("d-none");
            }
        });
    }

    // SEARCH FILTER
    DOM.searchBox.addEventListener("input", function () {
        const q = DOM.searchBox.value.toLowerCase();
        const items = document.querySelectorAll(".api-item");

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(q)) {
                item.classList.remove("d-none");
            } else {
                item.classList.add("d-none");
            }
        });
    });

    // RENDER API ITEMS
    function renderAPIItems() {
        DOM.apiList.innerHTML = "";

        settings.categories.forEach(cat => {
            cat.items.forEach(api => {
                const card = document.createElement("div");
                card.className = "api-item card shadow-sm p-3";
                card.dataset.category = cat.name;

                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h5 class="fw-bold mb-1">${api.name}</h5>
                            <p class="text-muted small mb-1">${api.desc || "No description"}</p>
                        </div>
                        <span class="badge bg-primary">${api.method || "GET"}</span>
                    </div>

                    <button class="btn btn-sm btn-outline-primary w-100 mb-2 btn-open"
                        data-name="${api.name}"
                        data-path="${api.path}"
                        data-desc="${api.desc || ""}"
                        data-method="${api.method || "GET"}">
                        Get API
                    </button>

                    <button class="btn btn-sm btn-outline-success w-100 mb-2 btn-download"
                        data-download="${api.path}">
                        Download
                    </button>

                    <button class="btn btn-sm btn-outline-warning w-100 btn-fav"
                        data-path="${api.path}">
                        ${favorites.includes(api.path) ? "★ Favorited" : "☆ Add Favorite"}
                    </button>
                `;

                DOM.apiList.appendChild(card);
            });
        });

        attachButtonEvents();
    }

    // EVENT LISTENERS FOR API BUTTONS
    function attachButtonEvents() {
        document.querySelectorAll(".btn-open").forEach(btn => {
            btn.addEventListener("click", () => {
                const item = {
                    name: btn.dataset.name,
                    path: btn.dataset.path,
                    desc: btn.dataset.desc,
                    method: btn.dataset.method
                };
                openAPIModal(item);
            });
        });

        document.querySelectorAll(".btn-download").forEach(btn => {
            btn.addEventListener("click", () => {
                const url = btn.dataset.download;
                window.open(url, "_blank");
            });
        });

        document.querySelectorAll(".btn-fav").forEach(btn => {
            btn.addEventListener("click", () => {
                toggleFavorite(btn.dataset.path, btn);
            });
        });
    }

    // FAVORITE SYSTEM
    function toggleFavorite(path, btn) {
        if (favorites.includes(path)) {
            favorites = favorites.filter(f => f !== path);
            btn.textContent = "☆ Add Favorite";
            log("Dihapus dari favorit: " + path);
        } else {
            favorites.push(path);
            btn.textContent = "★ Favorited";
            log("Ditambahkan ke favorit: " + path);
        }

        localStorage.setItem("adaAPI_favorites", JSON.stringify(favorites));
        renderFavorites();
    }
    // ====== PART 3 (baris 201–300) ======

    // RENDER FAVORITES
    function renderFavorites() {
        if (!DOM.favoritesSection) return;

        DOM.favoritesSection.innerHTML = "";

        if (favorites.length === 0) {
            DOM.favoritesSection.innerHTML =
                `<p class="text-muted small">Belum ada favorit.</p>`;
            return;
        }

        favorites.forEach(path => {
            const match = findAPIByPath(path);
            if (!match) return;

            const div = document.createElement("div");
            div.className = "fav-item small shadow-sm p-2 rounded mb-2";

            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-bold text-truncate" style="max-width:150px;">${match.name}</span>
                    <button class="btn btn-sm btn-outline-danger btn-remove-fav" data-path="${path}">
                        Hapus
                    </button>
                </div>
                <small class="text-muted">${match.path}</small>
            `;

            DOM.favoritesSection.appendChild(div);
        });

        document.querySelectorAll(".btn-remove-fav").forEach(btn => {
            btn.addEventListener("click", () => {
                favorites = favorites.filter(f => f !== btn.dataset.path);
                localStorage.setItem("adaAPI_favorites", JSON.stringify(favorites));
                renderFavorites();
                log("Favorit dihapus: " + btn.dataset.path);
            });
        });
    }

    // FIND API ITEM BY PATH
    function findAPIByPath(path) {
        for (let cat of settings.categories) {
            for (let item of cat.items) {
                if (item.path === path) return item;
            }
        }
        return null;
    }

    // RENDER HISTORY
    function renderHistory() {
        DOM.historyList.innerHTML = "";

        if (historyItems.length === 0) {
            DOM.historyList.innerHTML =
                `<p class="text-muted small">Belum ada riwayat request.</p>`;
            return;
        }

        historyItems.forEach(entry => {
            const div = document.createElement("div");
            div.className = "history-item small shadow-sm rounded p-2 mb-2";

            div.innerHTML = `
                <div class="fw-bold">${entry.name}</div>
                <div class="text-muted text-truncate">${entry.path}</div>
                <div class="small text-muted">${new Date(entry.time).toLocaleString()}</div>
            `;

            DOM.historyList.appendChild(div);
        });
    }

    // ADD TO HISTORY
    function addToHistory(api) {
        historyItems.unshift({
            name: api.name,
            path: api.path,
            time: new Date().toISOString()
        });

        if (historyItems.length > 20) {
            historyItems = historyItems.slice(0, 20);
        }

        localStorage.setItem("adaAPI_history", JSON.stringify(historyItems));
        renderHistory();
    }

    // OPEN API MODAL
    function openAPIModal(api) {
        currentApiItem = api;

        DOM.modalTitle.textContent = api.name;
        DOM.modalSubtitle.textContent = api.desc || "";
        DOM.endpointText.textContent = api.path;
        DOM.modalContent.textContent = "";
        DOM.modalStatus.textContent = "";
        DOM.modalLoading.classList.remove("d-none");

        modalInstance.show();

        runAPIRequest(api);
        addToHistory(api);
    }

    // ===================== MEDIA TYPE DETECTOR (REPLACE OLD) =====================
function getMediaType(url) {
    if (!url) return null;
    const lower = url.split("?")[0].toLowerCase();

    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(lower)) return "image";
    if (/\.(mp4|webm|mov|mkv|avi)$/i.test(lower)) return "video";
    if (/\.(mp3|wav|ogg|m4a)$/i.test(lower)) return "audio";

    return null;
}

// Escape HTML utility
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[m]));
}


// ================= TEXT-ONLY MEDIA PREVIEW (REPLACE OLD showMediaPreview) =================
async function showMediaPreview(url) {

    DOM.modalContent.innerHTML = `
        <div><strong>Media detected</strong></div>
        <div class="small text-muted">URL: ${escapeHtml(url)}</div>
        <div id="mediaMetaStatus" class="small text-muted mt-2">Mengambil metadata…</div>
    `;

    try {
        // Abort previous fetch
        try { if (currentFetchController) currentFetchController.abort(); } catch (e) {}

        currentFetchController = new AbortController();
        const signal = currentFetchController.signal;

        let metaOK = false;

        // Try HEAD first
        try {
            const res = await fetch(url, { method: "HEAD", signal });
            if (res.ok) {
                const ct = res.headers.get("content-type") || "unknown";
                const cl = res.headers.get("content-length") || null;

                document.getElementById("mediaMetaStatus").textContent =
                    `Content-Type: ${ct}${cl ? " · Size: " + formatBytes(cl) : ""} (HEAD)`;

                metaOK = true;
            }
        } catch (e) {}

        // If HEAD fails → fallback to ranged GET
        if (!metaOK) {
            try {
                const res = await fetch(url, {
                    method: "GET",
                    headers: { Range: "bytes=0-0" },
                    signal
                });

                const ct = res.headers.get("content-type") || "unknown";
                const cl = res.headers.get("content-length") || null;

                document.getElementById("mediaMetaStatus").textContent =
                    `Content-Type: ${ct}${cl ? " · Size: " + formatBytes(cl) : ""} (Ranged GET)`;

            } catch (e) {
                document.getElementById("mediaMetaStatus").textContent =
                    `Tidak bisa mengambil metadata (CORS atau server menolak).`;
            }
        }
    } catch (err) {
        if (err.name === "AbortError") {
            document.getElementById("mediaMetaStatus").textContent = "Dibatalkan.";
        } else {
            document.getElementById("mediaMetaStatus").textContent = "Gagal mengambil metadata.";
        }
    }

    function formatBytes(bytes) {
        if (!bytes) return "unknown";
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
    }
}


// ===================== REPLACE MEDIA HANDLING BLOCK IN runAPIRequest =====================
const mediaType = getMediaType(url);
if (mediaType) {

    DOM.modalLoading.classList.add("d-none");

    DOM.modalStatus.innerHTML =
        `<span class='text-success fw-bold'>Media detected: ${mediaType}</span>`;

    await showMediaPreview(url);

    return;
}

        // NORMAL JSON REQUEST
        try {
            const start = performance.now();
            const response = await fetch(url, { method });
            const duration = Math.round(performance.now() - start);

            DOM.modalLoading.classList.add("d-none");

            DOM.modalStatus.innerHTML =
                `<span class='${response.ok ? "text-success" : "text-danger"} fw-bold'>
                    Status: ${response.status}
                </span>
                <span class="text-muted ms-2">(${duration}ms)</span>`;

            const contentType = response.headers.get("content-type") || "";

            if (contentType.includes("application/json")) {
                const data = await response.json();
                DOM.modalContent.textContent = JSON.stringify(data, null, 2);
            } else {
                let text = await response.text();

                // DETECT 404 HTML PAGE
                if (/<!doctype html|<html|404/i.test(text)) {
                    DOM.modalContent.textContent =
                        "Server mengembalikan HTML (mungkin 404 atau error page).";
                } else {
                    DOM.modalContent.textContent = text;
                }
            }
        } catch (err) {
            DOM.modalLoading.classList.add("d-none");
            DOM.modalStatus.innerHTML = `<span class="text-danger fw-bold">Request Error</span>`;
            DOM.modalContent.textContent = err.message || err;
        }
    }

    // COPY ENDPOINT
    DOM.copyEndpointBtn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(DOM.endpointText.textContent);
            log("Endpoint disalin");
        } catch {
            log("Gagal menyalin endpoint", "error");
        }
    });

    // COPY CURL
    DOM.copyCurlBtn.addEventListener("click", async () => {
        if (!currentApiItem) return;

        const curl = `curl -X ${currentApiItem.method || "GET"} "${currentApiItem.path}"`;

        try {
            await navigator.clipboard.writeText(curl);
            log("cURL disalin");
        } catch {
            log("Gagal menyalin cURL", "error");
        }
    });

    // PARALLAX EFFECT
    function initParallax() {
        const banner = document.getElementById("bannerParallax");
        if (!banner) return;

        window.addEventListener("scroll", () => {
            const y = window.scrollY;
            banner.style.transform = `translateY(${y * 0.1}px)`;
        });
    }

    // CURSOR GLOW
    function initCursorGlow() {
        const glow = document.getElementById("cursorGlow");
        if (!glow) return;

        document.addEventListener("mousemove", (e) => {
            glow.style.left = `${e.clientX - 25}px`;
            glow.style.top = `${e.clientY - 25}px`;
        });
    }
    // ====== PART 5 (baris 401–500) ======

    // INITIALIZE APP
    function initApp() {
        // Initial parallax & glow
        initParallax();
        initCursorGlow();

        // Search box clear button
        const clearBtn = document.getElementById("clearSearch");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                DOM.searchBox.value = "";
                DOM.searchBox.dispatchEvent(new Event("input"));
            });
        }

        // Initialize settings if already loaded
        if (settings) {
            renderCategories();
            renderAPIItems();
            renderFavorites();
            renderHistory();
        }

        // Endpoint status checker (GET only)
        checkAllEndpointsStatus();

        // Hide loader if exists
        const loader = document.getElementById("loadingScreen");
        if (loader) loader.style.display = "none";
    }

    // CHECK ENDPOINT STATUS
    function checkAllEndpointsStatus() {
        document.querySelectorAll(".api-item").forEach(item => {
            const badge = item.querySelector(".endpoint-status-pill");
            const path = item.querySelector(".btn-open").dataset.path;

            if (!badge || !path) return;

            fetch(path, { method: "GET" })
                .then(res => {
                    if (res.ok) {
                        badge.classList.remove("bg-danger");
                        badge.classList.add("bg-success");
                        badge.textContent = "Online";
                    } else {
                        badge.classList.remove("bg-success");
                        badge.classList.add("bg-danger");
                        badge.textContent = "Error";
                    }
                })
                .catch(() => {
                    badge.classList.remove("bg-success");
                    badge.classList.add("bg-danger");
                    badge.textContent = "Error";
                });
        });
    }

    // SMART URL GENERATOR
    function formatURL(path) {
        if (!path.startsWith("/") && !path.startsWith("http")) {
            return "/" + path;
        }
        return path;
    }

    // LOGGING HELPER (console + UI)
    function appendLog(message, type = "info") {
        const line = document.createElement("div");
        line.className = `log-line log-${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        DOM.logs.appendChild(line);
        DOM.logs.scrollTop = DOM.logs.scrollHeight;
        console.log(message);
    }

    // HISTORY CLEAR BUTTON
    const clearHistoryBtn = document.getElementById("clearHistory");
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", () => {
            historyItems = [];
            localStorage.setItem("adaAPI_history", "[]");
            renderHistory();
            appendLog("History cleared.", "warn");
        });
    }

    // FAVORITE CLEAR BUTTON
    const clearFavBtn = document.getElementById("clearFav");
    if (clearFavBtn) {
        clearFavBtn.addEventListener("click", () => {
            favorites = [];
            localStorage.setItem("adaAPI_favorites", "[]");
            renderFavorites();
            appendLog("Favorites cleared.", "warn");
        });
    }
    // ====== PART 6 (baris 501–600) ======

    // ADVANCED SEARCH (optional hidden feature)
    function advancedSearch(query) {
        const items = document.querySelectorAll(".api-item");
        query = query.toLowerCase();

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(query)) {
                item.classList.remove("d-none");
            } else {
                item.classList.add("d-none");
            }
        });
    }

    // EVENT: REALTIME SEARCH (improved)
    DOM.searchBox.addEventListener("keyup", () => {
        const query = DOM.searchBox.value.trim();
        advancedSearch(query);
    });

    // AUTO-DETECT URL INPUT
    const apiRequestInput = document.getElementById("apiRequestInput");
    const apiRequestBtn = document.getElementById("sendApiRequest");

    if (apiRequestBtn) {
        apiRequestBtn.addEventListener("click", () => {
            const url = apiRequestInput.value.trim();
            if (!url) return;

            // treat as GET request
            const api = {
                name: "Custom Request",
                desc: "Manual URL Request",
                path: url,
                method: "GET"
            };

            openAPIModal(api);
        });
    }

    // SCROLL EFFECT (fade navbar)
    const navbar = document.querySelector(".top-navbar");
    if (navbar) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 40) {
                navbar.classList.add("scrolled");
            } else {
                navbar.classList.remove("scrolled");
            }
        });
    }

    // GLOBAL ERROR CATCHER
    window.addEventListener("error", function (e) {
        appendLog("Error: " + e.message, "error");
    });

    // HISTORY CLICK HANDLING
    DOM.historyList.addEventListener("click", (e) => {
        const item = e.target.closest(".history-item");
        if (!item) return;

        const path = item.querySelector(".text-muted")?.textContent;
        const name = item.querySelector(".fw-bold")?.textContent;

        if (!path) return;

        openAPIModal({
            name,
            path,
            method: "GET",
            desc: "Opened from history"
        });
    });

    // FAVORITE CLICK HANDLING (from list)
    if (DOM.favoritesSection) {
        DOM.favoritesSection.addEventListener("click", (e) => {
            const rm = e.target.closest(".btn-remove-fav");
            if (!rm) return;

            const path = rm.dataset.path;
            favorites = favorites.filter(f => f !== path);
            localStorage.setItem("adaAPI_favorites", JSON.stringify(favorites));
            renderFavorites();
        });
    }

    // PREVENT DOUBLE TAP ZOOM ON MOBILE
    let lastTap = 0;
    document.addEventListener("touchend", function (e) {
        const now = new Date().getTime();
        if (now - lastTap < 300) {
            e.preventDefault();
        }
        lastTap = now;
    }, false);
    // ====== PART 7 (baris 601–700) ======

    // ANIMATED SCROLL TO TOP
    const scrollTopBtn = document.getElementById("scrollTopBtn");

    if (scrollTopBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add("show");
            } else {
                scrollTopBtn.classList.remove("show");
            }
        });

        scrollTopBtn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

    // LAZY LOADING OBSERVER (image optimization)
    const lazyImages = document.querySelectorAll("img[data-src]");
    if ("IntersectionObserver" in window) {
        let imgObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute("data-src");
                }
            });
        });

        lazyImages.forEach(img => imgObserver.observe(img));
    }

    // AUTO-FOCUS SEARCH BOX WHEN OPENING SIDEBAR (mobile)
    if (DOM.sidebarToggle && DOM.searchBox) {
        DOM.sidebarToggle.addEventListener("click", () => {
            setTimeout(() => {
                DOM.searchBox.focus();
            }, 300);
        });
    }

    // ENDPOINT PREVIEW TOOLTIP
    document.addEventListener("mouseover", (e) => {
        const btn = e.target.closest(".btn-open");
        if (!btn) return;

        const path = btn.dataset.path;
        if (!path) return;

        btn.title = "Endpoint: " + path;
    });

    // WATCH FOR SETTINGS JSON UPDATES (Auto-refresh categories)
    let settings_last_hash = "";
    async function watchSettingsLive() {
        try {
            const res = await fetch("/src/settings.json", { cache: "no-store" });
            const txt = await res.text();
            const hash = btoa(txt); // crude hashing

            if (!settings_last_hash) settings_last_hash = hash;

            if (settings_last_hash !== hash) {
                settings_last_hash = hash;
                settings = JSON.parse(txt);
                renderCategories();
                renderAPIItems();
                appendLog("settings.json updated — UI refreshed", "warn");
            }
        } catch (e) {
            appendLog("Failed to check settings.json", "error");
        }
    }

    // Periodic settings watcher
    setInterval(watchSettingsLive, 7000);

    // KEEP-ALIVE PING (prevents vercel cold start)
    setInterval(() => {
        fetch("/api/ping").catch(() => {});
    }, 15000);

    // SERVICE WORKER REGISTRATION (if exists)
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // ====== PART 8 (baris 701–805) ======

    // DETECT CLICK ON API CARD ITSELF
    document.addEventListener("click", (e) => {
        const card = e.target.closest(".api-item");
        if (!card) return;

        const btn = e.target.closest("button");
        if (btn) return; // avoid conflict with button click

        const openBtn = card.querySelector(".btn-open");
        if (!openBtn) return;

        const item = {
            name: openBtn.dataset.name,
            path: openBtn.dataset.path,
            desc: openBtn.dataset.desc,
            method: openBtn.dataset.method
        };

        openAPIModal(item);
    });

    // FULLSCREEN IMAGE VIEWER (tap to enlarge)
    document.addEventListener("click", (e) => {
        if (e.target.tagName === "IMG" && e.target.classList.contains("img-fluid")) {
            const viewer = document.createElement("div");
            viewer.className = "fullscreen-viewer";

            viewer.innerHTML = `
                <img src="${e.target.src}" class="viewer-img">
                <span class="viewer-close">&times;</span>
            `;

            document.body.appendChild(viewer);

            viewer.querySelector(".viewer-close").addEventListener("click", () => {
                viewer.remove();
            });
        }
    });

    // DOUBLE CHECK FOR BROKEN LINKS
    function checkBrokenImages() {
        document.querySelectorAll("img").forEach(img => {
            img.onerror = () => {
                img.src = "/img/broken.png";
            };
        });
    }
    checkBrokenImages();

    // FINAL INIT
    initApp();

}); // END DOMContentLoaded

// ====== END OF SCRIPT.JS (805 BARIS) ======