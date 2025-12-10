/**
 * ADA API CONSOLE - MAIN SCRIPT (FULL EXTENDED EDITION)
 * -----------------------------------------------------
 * Version: 2.5.0 (Ultimate)
 * Features:
 * - Dynamic Sidebar & Theme Engine
 * - Smart Search & Filtering
 * - LocalStorage Favorites & History
 * - Smart API Request Handling (GET/POST/PUT/DELETE)
 * - Auto File Upload Detection
 * - Multi-MIME Type Rendering (Image, Audio, Video, JSON)
 * - Auto Domain Prefixing for Copy
 * - Custom Toast Notifications
 * - Parallax & Visual Effects
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ================================================================
    // 1. DOM ELEMENTS CACHE
    // ================================================================
    const DOM = {
        // Layout
        body: document.body,
        mainContent: document.querySelector("main"),
        
        // Sidebar & Nav
        sideNav: document.querySelector(".side-nav"),
        sideNavLinks: document.querySelectorAll(".side-nav-link"),
        menuToggle: document.getElementById("menuToggle"),
        navCollapseBtn: document.getElementById("collapseBtn"),
        sidebarBackdrop: document.getElementById("sidebarBackdrop"),
        
        // Search & Filter
        searchInput: document.getElementById("searchInput"),
        clearSearch: document.getElementById("clearSearch"),
        apiFilters: document.getElementById("apiFilters"),
        
        // Theme Controls
        themeToggle: document.getElementById("themeToggle"),
        themePreset: document.getElementById("themePreset"),
        
        // Content Area
        apiContent: document.getElementById("apiContent"),
        versionBadge: document.getElementById("versionBadge"),
        
        // Request Box (WhatsApp)
        apiRequestInput: document.getElementById("apiRequestInput"),
        sendApiRequest: document.getElementById("sendApiRequest"),
        
        // Logs & History
        logsConsole: document.getElementById("liveLogs"),
        requestHistoryList: document.getElementById("requestHistoryList"),
        
        // Visual Effects
        bannerParallax: document.getElementById("bannerParallax"),
        cursorGlow: document.getElementById("cursorGlow"),
        
        // MODAL ELEMENTS (Detailed)
        modalEl: document.getElementById("apiResponseModal"),
        modalTitle: document.getElementById("modalTitle"),
        modalSubtitle: document.getElementById("modalSubtitle"),
        endpointText: document.getElementById("endpointText"),
        modalStatusLine: document.getElementById("modalStatusLine"),
        modalLoading: document.getElementById("modalLoading"),
        apiResponseContent: document.getElementById("apiResponseContent"),
        
        // Action Buttons inside Modal
        copyEndpointBtn: document.getElementById("copyEndpointBtn"),
        copyCurlBtn: document.getElementById("copyCurlBtn"),
        openNewTabBtn: document.getElementById("openNewTabBtn"), // Kalau ada
    };

    // Initialize Bootstrap Modal Wrapper
    const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl, { keyboard: true }) : null;

    // ================================================================
    // 2. STATE MANAGEMENT & STORAGE
    // ================================================================
    let appSettings = null;
    let currentApiItem = null;
    
    // Load data from LocalStorage with Default Values
    let userFavorites = loadLocalStorage("ada-api-fav", []);
    let userHistory = loadLocalStorage("ada-api-history", []);
    let currentThemeMode = loadLocalStorage("ada-ui-mode", "light");
    let currentThemePreset = loadLocalStorage("ada-ui-theme", "emerald-gold");

    // Fallback Data if fetch fails
    const fallbackCategories = [
        {
            name: "System",
            items: [
                { 
                    name: "System Status", 
                    desc: "Check if the API server is reachable.", 
                    path: "/status", 
                    method: "GET",
                    status: "unknown" 
                }
            ]
        }
    ];

    // ================================================================
    // 3. UTILITY HELPER FUNCTIONS
    // ================================================================
    
    function loadLocalStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error("LocalStorage Error:", error);
            return defaultValue;
        }
    }

    function saveLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("LocalStorage Save Error:", error);
        }
    }

    function getTimestamp() {
        return new Date().toLocaleTimeString('en-US', { hour12: false });
    }

    function appendLog(message, type = "info") {
        if (!DOM.logsConsole) return;
        
        const logLine = document.createElement("div");
        logLine.className = `log-line log-${type}`;
        logLine.innerHTML = `<span class="log-time">[${getTimestamp()}]</span> <span class="log-msg">${message}</span>`;
        
        DOM.logsConsole.appendChild(logLine);
        DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
    }

    function beautifyJSON(jsonString) {
        try {
            const jsonObj = JSON.parse(jsonString);
            return JSON.stringify(jsonObj, null, 2);
        } catch (e) {
            return jsonString; // Return as text if not valid JSON
        }
    }

    // --- CUSTOM TOAST NOTIFICATION SYSTEM ---
    function showToast(message, type = "success") {
        // Create toast container if not exists
        let toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999;";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0 show`;
        toast.style.marginBottom = "10px";
        toast.style.padding = "10px 20px";
        toast.style.borderRadius = "8px";
        toast.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div></div>`;

        toastContainer.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // ================================================================
    // 4. THEME & VISUAL ENGINE
    // ================================================================

    function initThemeEngine() {
        // Apply Mode (Light/Dark)
        applyThemeMode(currentThemeMode);
        
        // Apply Preset (Color Scheme)
        applyThemePreset(currentThemePreset);

        // Listener: Mode Toggle
        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener("change", (e) => {
                const newMode = e.target.checked ? "dark" : "light";
                applyThemeMode(newMode);
            });
        }

        // Listener: Preset Select
        if (DOM.themePreset) {
            DOM.themePreset.addEventListener("change", (e) => {
                const selectedValue = e.target.value;
                // Map select value to internal theme keys
                const map = {
                    "emerald": "emerald-gold",
                    "noir": "noir",
                    "ivory": "royal-amber",
                    "cyber": "cyber-glow"
                };
                const newPreset = map[selectedValue] || "emerald-gold";
                applyThemePreset(newPreset);
            });
        }
    }

    function applyThemeMode(mode) {
        currentThemeMode = mode;
        saveLocalStorage("ada-ui-mode", mode);
        
        if (mode === "dark") {
            DOM.body.classList.add("dark-mode");
            if (DOM.themeToggle) DOM.themeToggle.checked = true;
        } else {
            DOM.body.classList.remove("dark-mode");
            if (DOM.themeToggle) DOM.themeToggle.checked = false;
        }
        appendLog(`Theme mode changed to: ${mode}`);
    }

    function applyThemePreset(presetKey) {
        currentThemePreset = presetKey;
        saveLocalStorage("ada-ui-theme", presetKey);
        
        DOM.body.setAttribute("data-theme", presetKey);
        
        // Sync Select Box
        if (DOM.themePreset) {
            const reverseMap = {
                "emerald-gold": "emerald",
                "noir": "noir",
                "royal-amber": "ivory",
                "cyber-glow": "cyber"
            };
            DOM.themePreset.value = reverseMap[presetKey] || "emerald";
        }
    }

    // ================================================================
    // 5. SIDEBAR & NAVIGATION LOGIC
    // ================================================================

    function initSidebarLogic() {
        // Toggle Desktop
        const toggleSidebar = () => DOM.sideNav.classList.toggle("collapsed");
        
        // Toggle Mobile
        const toggleMobileSidebar = () => {
            const isOpen = DOM.sideNav.classList.contains("open");
            if (isOpen) {
                DOM.sideNav.classList.remove("open");
                DOM.body.classList.remove("sidebar-open");
                if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
            } else {
                DOM.sideNav.classList.add("open");
                DOM.body.classList.add("sidebar-open");
                if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add("show");
            }
        };

        // Event Listeners
        if (DOM.menuToggle) DOM.menuToggle.onclick = () => {
            if (window.innerWidth < 992) toggleMobileSidebar();
            else toggleSidebar();
        };

        if (DOM.navCollapseBtn) DOM.navCollapseBtn.onclick = toggleSidebar;
        
        if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.onclick = toggleMobileSidebar;

        // Auto close on link click (Mobile)
        DOM.sideNavLinks.forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth < 992) {
                    DOM.sideNav.classList.remove("open");
                    DOM.body.classList.remove("sidebar-open");
                    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
                }
            });
        });
    }

    // ================================================================
    // 6. FAVORITES & HISTORY SYSTEM
    // ================================================================

    function toggleFavorite(path, buttonElement) {
        const index = userFavorites.indexOf(path);
        
        if (index === -1) {
            // Add to favorites
            userFavorites.push(path);
            buttonElement.classList.add("favorited");
            // Update UI card attribute
            const card = buttonElement.closest(".api-item");
            if (card) card.dataset.fav = "1";
            showToast("Ditambahkan ke Favorit");
        } else {
            // Remove from favorites
            userFavorites.splice(index, 1);
            buttonElement.classList.remove("favorited");
            const card = buttonElement.closest(".api-item");
            if (card) card.dataset.fav = "0";
            showToast("Dihapus dari Favorit", "danger");
        }
        
        saveLocalStorage("ada-api-fav", userFavorites);
    }

    function addToHistory(apiItem) {
        // Add new item to start of array
        userHistory.unshift({
            name: apiItem.name,
            path: apiItem.path,
            time: new Date().toISOString()
        });
        
        // Limit history to 20 items
        if (userHistory.length > 20) {
            userHistory = userHistory.slice(0, 20);
        }
        
        saveLocalStorage("ada-api-history", userHistory);
        renderHistoryList();
    }

    function renderHistoryList() {
        if (!DOM.requestHistoryList) return;
        DOM.requestHistoryList.innerHTML = "";
        
        if (userHistory.length === 0) {
            DOM.requestHistoryList.innerHTML = "<li class='text-muted small p-2'>Belum ada riwayat request.</li>";
            return;
        }

        userHistory.forEach(h => {
            const li = document.createElement("li");
            li.className = "history-item";
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center w-100">
                    <span class="history-name text-truncate" style="max-width: 150px;">${h.name}</span>
                    <span class="badge bg-secondary rounded-pill" style="font-size: 0.6rem">GET</span>
                </div>
                <div class="history-path text-muted small text-truncate">${h.path}</div>
            `;
            DOM.requestHistoryList.appendChild(li);
        });
    }

    // ================================================================
    // 7. RENDER API CONTENT & CARDS
    // ================================================================

    function renderApiContent() {
        if (!DOM.apiContent) return;
        
        // Use settings or fallback
        const categories = (appSettings && appSettings.categories) ? appSettings.categories : fallbackCategories;
        
        // 1. Render Filters
        renderCategoryFilters(categories);
        
        // 2. Render Cards
        DOM.apiContent.innerHTML = "";
        const row = document.createElement("div");
        row.className = "row g-4"; // Bootstrap Grid Gap

        categories.forEach(category => {
            if (!category.items) return;
            
            category.items.forEach(item => {
                const col = document.createElement("div");
                col.className = "col-12 col-md-6 col-lg-4 api-item"; // Grid Responsive
                
                // Metadata for filtering
                col.dataset.category = category.name;
                col.dataset.fav = userFavorites.includes(item.path) ? "1" : "0";
                
                // HTML Structure Card
                col.innerHTML = `
                    <article class="api-card h-100">
                        <div class="api-card-header d-flex justify-content-between align-items-start mb-2">
                            <h4 class="api-card-title h6 fw-bold mb-0 text-truncate" title="${item.name}">${item.name}</h4>
                            <div class="d-flex align-items-center gap-2">
                                <span class="http-badge http-${(item.method||'GET').toLowerCase()} badge">${item.method||'GET'}</span>
                                <span class="endpoint-status-pill badge bg-secondary" data-path="${item.path}">...</span>
                            </div>
                        </div>
                        <p class="api-card-desc text-muted small mb-3">${item.desc || 'No description available.'}</p>
                        <div class="api-card-footer mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                            <code class="api-path small text-truncate me-2 bg-light px-2 py-1 rounded" style="max-width: 60%;">${item.path}</code>
                            <div class="api-card-actions">
                                <button type="button" class="btn btn-sm btn-primary api-open-btn"><i class="fas fa-play me-1"></i> Try</button>
                                <button type="button" class="btn btn-sm btn-outline-warning fav-toggle-btn ${userFavorites.includes(item.path) ? 'favorited' : ''}">
                                    <i class="fas fa-star"></i>
                                </button>
                            </div>
                        </div>
                    </article>
                `;

                // Bind Events
                const tryBtn = col.querySelector(".api-open-btn");
                const favBtn = col.querySelector(".fav-toggle-btn");

                tryBtn.addEventListener("click", () => openApiModal(item));
                favBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    toggleFavorite(item.path, favBtn);
                });

                row.appendChild(col);
            });
        });

        DOM.apiContent.appendChild(row);
        
        // Trigger Status Check (Async)
        checkAllEndpointStatuses();
    }

    function renderCategoryFilters(categories) {
        if (!DOM.apiFilters) return;
        DOM.apiFilters.innerHTML = "";

        // 'All' Button
        const allBtn = document.createElement("button");
        allBtn.className = "filter-chip active";
        allBtn.textContent = "Semua";
        allBtn.dataset.filter = "all";
        DOM.apiFilters.appendChild(allBtn);

        // Category Buttons
        categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.className = "filter-chip";
            btn.textContent = cat.name;
            btn.dataset.filter = cat.name;
            DOM.apiFilters.appendChild(btn);
        });

        // 'Favorites' Button
        const favBtn = document.createElement("button");
        favBtn.className = "filter-chip";
        favBtn.textContent = "Favorit Saya";
        favBtn.dataset.filter = "favorites";
        DOM.apiFilters.appendChild(favBtn);

        // Filter Logic
        DOM.apiFilters.addEventListener("click", (e) => {
            if (!e.target.classList.contains("filter-chip")) return;
            
            // Toggle Active Class
            DOM.apiFilters.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");

            const filterValue = e.target.dataset.filter;
            filterApiItems(filterValue);
        });
    }

    function filterApiItems(filterValue) {
        const items = document.querySelectorAll(".api-item");
        const searchQuery = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : "";

        items.forEach(item => {
            const itemCategory = item.dataset.category;
            const isFav = item.dataset.fav === "1";
            const textContent = item.textContent.toLowerCase();

            // Logic: Category Match && Search Match
            let categoryMatch = false;
            if (filterValue === "all") categoryMatch = true;
            else if (filterValue === "favorites") categoryMatch = isFav;
            else categoryMatch = (itemCategory === filterValue);

            const searchMatch = textContent.includes(searchQuery);

            if (categoryMatch && searchMatch) {
                item.style.display = ""; // Show
            } else {
                item.style.display = "none"; // Hide
            }
        });
    }

    // ================================================================
    // 8. STATUS CHECKER (Background Task)
    // ================================================================

    function checkAllEndpointStatuses() {
        const statusPills = document.querySelectorAll(".endpoint-status-pill");
        
        statusPills.forEach(pill => {
            const path = pill.dataset.path;
            const methodBadge = pill.closest(".api-card").querySelector(".http-badge");
            const method = methodBadge ? methodBadge.textContent : "GET";

            // Skip checking for POST/PUT/DELETE (Need body)
            if (method !== "GET") {
                pill.className = "endpoint-status-pill badge bg-success";
                pill.textContent = "Ready";
                return;
            }

            // Simple GET Check
            // Using HEAD or GET to check if endpoint is alive
            fetch(path, { method: "HEAD" }) // HEAD is lighter than GET
                .then(res => {
                    if (res.ok || res.status === 405 || res.status === 400) { 
                        // 405/400 means server is there, just needs params
                        pill.className = "endpoint-status-pill badge bg-success";
                        pill.textContent = "Online";
                    } else {
                        pill.className = "endpoint-status-pill badge bg-danger";
                        pill.textContent = "Error";
                    }
                })
                .catch(() => {
                    pill.className = "endpoint-status-pill badge bg-danger";
                    pill.textContent = "Offline";
                });
        });
    }

    // ================================================================
    // 9. MODAL & REQUEST EXECUTION (THE CORE)
    // ================================================================

    function openApiModal(item) {
        currentApiItem = item;
        const method = (item.method || "GET").toUpperCase();

        // 1. Reset Modal UI
        DOM.modalTitle.textContent = item.name;
        DOM.modalSubtitle.textContent = item.desc;
        DOM.endpointText.textContent = item.path;
        
        DOM.modalStatusLine.textContent = "Waiting to send...";
        DOM.modalStatusLine.className = "text-muted";
        
        DOM.apiResponseContent.innerHTML = ""; // Clear previous results
        DOM.modalLoading.classList.add("d-none"); // Hide loader

        // 2. Add to History
        addToHistory(item);

        // 3. Show Modal
        if (modalInstance) modalInstance.show();

        // 4. SMART LOGIC: Check Method
        if (method === "POST" || method === "PUT") {
            // SHOW UPLOAD FORM
            renderUploadForm();
        } else {
            // AUTO EXECUTE GET REQUEST
            executeApiRequest();
        }
    }

    function renderUploadForm() {
        DOM.apiResponseContent.innerHTML = `
            <div class="upload-zone text-center p-5 border rounded bg-light" style="border: 2px dashed #ccc;">
                <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                <h5>File Upload Required</h5>
                <p class="text-muted">This endpoint requires a file (Multipart/Form-Data).</p>
                
                <div class="mb-3">
                    <input class="form-control" type="file" id="modalFileInput">
                </div>
                
                <button id="triggerUploadBtn" class="btn btn-primary w-100">
                    <i class="fas fa-paper-plane me-2"></i> Send Request
                </button>
            </div>
            <div id="uploadResultContainer" class="mt-3"></div>
        `;

        // Bind Event
        document.getElementById("triggerUploadBtn").addEventListener("click", () => {
            const fileInput = document.getElementById("modalFileInput");
            if (fileInput.files.length === 0) {
                showToast("Please select a file first!", "warning");
                return;
            }
            // Execute with file
            executeApiRequest(fileInput.files[0]);
        });
    }

    async function executeApiRequest(fileData = null) {
        if (!currentApiItem) return;

        const method = (currentApiItem.method || "GET").toUpperCase();
        const url = currentApiItem.path;
        
        // Where to show result?
        const resultContainer = document.getElementById("uploadResultContainer") || DOM.apiResponseContent;
        
        // UI Updates
        DOM.modalLoading.classList.remove("d-none");
        DOM.modalStatusLine.textContent = "Sending Request...";
        
        appendLog(`[REQ] ${method} ${url}`);

        try {
            // Prepare Options
            let fetchOptions = {
                method: method,
                headers: {}
            };

            // Handle Body (For Uploads)
            if ((method === "POST" || method === "PUT") && fileData) {
                const formData = new FormData();
                formData.append("file", fileData); // Standard key 'file'
                fetchOptions.body = formData;
                // Note: Do NOT set Content-Type header manually for FormData, browser does it with boundary.
            }

            const startTime = performance.now();
            const response = await fetch(url, fetchOptions);
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(0);

            // Update Status Line
            const statusClass = response.ok ? "text-success" : "text-danger";
            DOM.modalStatusLine.innerHTML = `<span class="${statusClass} fw-bold">Status: ${response.status} ${response.statusText}</span> <span class="text-muted ms-2">(${duration}ms)</span>`;

            // Check Content Type to render correctly
            const contentType = response.headers.get("content-type");
            let renderHtml = "";

            // Handle Redirects (Manual catch if browser exposes it)
            if (response.redirected) {
                renderHtml += `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i> 
                        <strong>Redirect Detected:</strong><br>
                        Page redirected to: <a href="${response.url}" target="_blank">${response.url}</a>
                    </div>
                `;
            }

            // === RENDER LOGIC ===
            
            // 1. IMAGE
            if (contentType && contentType.includes("image")) {
                const blob = await response.blob();
                const imgUrl = URL.createObjectURL(blob);
                renderHtml += `
                    <div class="text-center bg-dark p-3 rounded">
                        <img src="${imgUrl}" class="img-fluid" style="max-height: 400px;" alt="Response Image">
                    </div>
                    <div class="text-center mt-2 text-muted small">Image Blob Rendered</div>
                `;
            } 
            // 2. AUDIO
            else if (contentType && contentType.includes("audio")) {
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                renderHtml += `
                    <div class="text-center p-4 bg-light rounded">
                        <i class="fas fa-music fa-3x mb-3 text-secondary"></i><br>
                        <audio controls class="w-100">
                            <source src="${audioUrl}" type="${contentType}">
                            Your browser does not support audio element.
                        </audio>
                    </div>
                `;
            }
            // 3. VIDEO
            else if (contentType && contentType.includes("video")) {
                const blob = await response.blob();
                const videoUrl = URL.createObjectURL(blob);
                renderHtml += `
                    <div class="ratio ratio-16x9">
                        <video controls>
                            <source src="${videoUrl}" type="${contentType}">
                        </video>
                    </div>
                `;
            }
            // 4. JSON / TEXT
            else {
                const textData = await response.text();
                
                // Try Parse JSON
                try {
                    const jsonObj = JSON.parse(textData);
                    
                    // Special Handling for 'Tourl' / Upload Response (Detect URL)
                    if (jsonObj.result && jsonObj.result.url) {
                        renderHtml += `
                            <div class="card border-success mb-3">
                                <div class="card-header bg-success text-white">Upload Success!</div>
                                <div class="card-body">
                                    <p>URL: <a href="${jsonObj.result.url}" target="_blank" class="fw-bold text-decoration-underline">${jsonObj.result.url}</a></p>
                                    ${jsonObj.result.mime && jsonObj.result.mime.includes('image') ? `<img src="${jsonObj.result.url}" style="height: 100px;" class="rounded border">` : ''}
                                </div>
                            </div>
                        `;
                    }

                    // Standard Beautified JSON
                    const prettyJson = JSON.stringify(jsonObj, null, 2);
                    renderHtml += `<pre class="json-response p-3 rounded" style="background: #1e1e1e; color: #d4d4d4; overflow: auto; max-height: 400px;"><code>${prettyJson}</code></pre>`;
                
                } catch (e) {
                    // Plain Text
                    renderHtml += `<pre class="p-3 bg-light border rounded">${textData}</pre>`;
                }
            }

            resultContainer.innerHTML = renderHtml;
            appendLog(`[RES] ${response.status} OK`);

        } catch (error) {
            console.error(error);
            const errorHtml = `
                <div class="alert alert-danger">
                    <strong>Request Failed:</strong> ${error.message}
                </div>
            `;
            if (resultContainer) resultContainer.innerHTML = errorHtml;
            DOM.modalStatusLine.textContent = "Error";
            appendLog(`[ERR] ${error.message}`, "error");
        } finally {
            DOM.modalLoading.classList.add("d-none");
        }
    }

    // ================================================================
    // 10. MODAL EVENTS (COPY, CURL, ETC)
    // ================================================================

    function initModalActions() {
        // A. COPY ENDPOINT (Auto Domain Prefix)
        if (DOM.copyEndpointBtn) {
            DOM.copyEndpointBtn.addEventListener("click", async () => {
                const path = DOM.endpointText.textContent.trim();
                // Get Current Origin (e.g., https://my-app.vercel.app)
                const origin = window.location.origin;
                const fullUrl = origin + path;

                try {
                    await navigator.clipboard.writeText(fullUrl);
                    showToast("Link Endpoint Tersalin!");
                    
                    // Button Feedback
                    const originalIcon = DOM.copyEndpointBtn.innerHTML;
                    DOM.copyEndpointBtn.innerHTML = `<i class="fas fa-check"></i> Copied`;
                    setTimeout(() => DOM.copyEndpointBtn.innerHTML = originalIcon, 2000);
                } catch (err) {
                    showToast("Gagal menyalin link", "danger");
                }
            });
        }

        // B. COPY CURL
        if (DOM.copyCurlBtn) {
            DOM.copyCurlBtn.addEventListener("click", async () => {
                if (!currentApiItem) return;
                
                const method = (currentApiItem.method || "GET").toUpperCase();
                const origin = window.location.origin;
                const fullUrl = origin + currentApiItem.path;
                
                const curlCommand = `curl -X ${method} "${fullUrl}"`;

                try {
                    await navigator.clipboard.writeText(curlCommand);
                    showToast("Perintah cURL Tersalin!");
                } catch (err) {
                    showToast("Gagal menyalin cURL", "danger");
                }
            });
        }
    }

    // ================================================================
    // 11. VISUAL EFFECTS (PARALLAX & CURSOR)
    // ================================================================

    function initVisualEffects() {
        // Banner Parallax
        if (DOM.bannerParallax) {
            DOM.bannerParallax.addEventListener("mousemove", (e) => {
                const rect = DOM.bannerParallax.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Calculate percentage
                const xPercent = (x / rect.width - 0.5) * 2; // -1 to 1
                const yPercent = (y / rect.height - 0.5) * 2;

                const img = DOM.bannerParallax.querySelector("img");
                if (img) {
                    img.style.transform = `scale(1.1) translate(${xPercent * 10}px, ${yPercent * 10}px)`;
                }
            });

            DOM.bannerParallax.addEventListener("mouseleave", () => {
                const img = DOM.bannerParallax.querySelector("img");
                if (img) img.style.transform = `scale(1) translate(0,0)`;
            });
        }

        // Cursor Glow
        if (DOM.cursorGlow) {
            document.addEventListener("mousemove", (e) => {
                DOM.cursorGlow.style.left = e.clientX + "px";
                DOM.cursorGlow.style.top = e.clientY + "px";
            });
        }

        // Scroll Reveal
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("reveal-visible");
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    // ================================================================
    // 12. WHATSAPP REQUEST BOX
    // ================================================================
    
    function initRequestBox() {
        if (DOM.sendApiRequest) {
            DOM.sendApiRequest.addEventListener("click", () => {
                const msg = DOM.apiRequestInput.value.trim();
                if (!msg) {
                    showToast("Ketik permintaan dulu!", "warning");
                    return;
                }
                const phone = "6287751121269";
                const text = encodeURIComponent(`Halo min, request API dong:\n\n${msg}`);
                window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                DOM.apiRequestInput.value = "";
            });
        }
    }

    // ================================================================
    // 13. APP INITIALIZATION (BOOT SEQUENCE)
    // ================================================================

    async function initApp() {
        appendLog("Initializing Application...");
        
        // 1. Setup UI
        initSidebarLogic();
        initThemeEngine();
        initVisualEffects();
        initModalActions();
        initRequestBox();
        renderHistoryList();

        // 2. Load Settings
        try {
            const response = await fetch("/src/settings.json");
            if (!response.ok) throw new Error("Settings not found");
            appSettings = await response.json();
            
            // Set Version
            if (DOM.versionBadge && appSettings.version) {
                DOM.versionBadge.textContent = appSettings.version;
            }

            appendLog("Settings loaded successfully.");
        } catch (error) {
            console.error("Failed to load settings", error);
            appSettings = { categories: fallbackCategories };
            showToast("Failed loading config, using fallback.", "danger");
            appendLog("Failed loading settings.json", "error");
        }

        // 3. Render Content
        renderApiContent();
        
        // 4. Setup Search Listener
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener("input", () => {
                // Determine active filter
                const activeFilterBtn = DOM.apiFilters.querySelector(".active");
                const filterVal = activeFilterBtn ? activeFilterBtn.dataset.filter : "all";
                filterApiItems(filterVal);
            });
        }
        
        if (DOM.clearSearch) {
            DOM.clearSearch.addEventListener("click", () => {
                DOM.searchInput.value = "";
                const activeFilterBtn = DOM.apiFilters.querySelector(".active");
                const filterVal = activeFilterBtn ? activeFilterBtn.dataset.filter : "all";
                filterApiItems(filterVal);
            });
        }

        appendLog("System Ready.");
    }

    // Start!
    initApp();
});