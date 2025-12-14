// Ada API Console – script.js (FIXED: Visible Content & Animation)

document.addEventListener("DOMContentLoaded", () => {
  // ================================
  // 1. DOM CACHE
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
    logsConsole: document.getElementById("liveLogs"),
    requestHistoryList: document.getElementById("requestHistoryList"),
    versionBadge: document.getElementById("versionBadge"),

    // Modal Elements
    modalEl: document.getElementById("apiResponseModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    endpointText: document.getElementById("endpointText"),
    modalStatusLine: document.getElementById("modalStatusLine"),
    modalLoading: document.getElementById("modalLoading"),
    apiResponseContent: document.getElementById("apiResponseContent"),
    copyEndpointBtn: document.getElementById("copyEndpointBtn"),
  };

  const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl) : null;

  // FIX: Anti-Stuck Scroll
  if (DOM.modalEl) {
    DOM.modalEl.addEventListener('hidden.bs.modal', () => {
        DOM.body.style.overflow = ''; 
        DOM.body.style.paddingRight = '';
        document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
    });
  }

  // ================================
  // 2. STATE
  // ================================
  let settings = null;
  let currentApiItem = null;
  let historyItems = loadJSON("ada-api-history", []);
  let dynamicParams = {}; 

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } 
    catch { return fallback; }
  }
  function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function appendLog(msg) { 
      if(DOM.logsConsole) DOM.logsConsole.textContent += `> ${msg}\n`; 
  }

  // ================================
  // 3. LOGIC UTAMA (SMART URL & MODAL)
  // ================================

  function parseUrlParams(fullPath) {
    try {
        const urlObj = new URL(fullPath, window.location.origin);
        const params = {};
        urlObj.searchParams.forEach((value, key) => { params[key] = value; });
        return { pathname: urlObj.pathname, searchParams: params };
    } catch (e) {
        return { pathname: fullPath, searchParams: {} };
    }
  }

  function getDeveloperTemplateUrl(item) {
    if (!item.path) return "";
    const { pathname, searchParams } = parseUrlParams(item.path);
    const definedParams = item.params || {};
    
    const newQueryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (definedParams[key]) {
        newQueryParams.set(key, `{${key}}`);
      } else {
        newQueryParams.set(key, value);
      }
    }
    const queryString = newQueryParams.toString();
    return decodeURIComponent(window.location.origin + pathname + (queryString ? `?${queryString}` : ""));
  }

  window.openApiModal = function(item) {
    currentApiItem = item;
    dynamicParams = {}; 

    if (!DOM.modalEl) return;
    
    // Header
    if (DOM.modalTitle) DOM.modalTitle.textContent = item.name || "Endpoint";
    if (DOM.modalSubtitle) DOM.modalSubtitle.textContent = item.desc || "";
    
    // Smart Copy Link
    if(DOM.endpointText) {
        DOM.endpointText.textContent = getDeveloperTemplateUrl(item);
    }

    // Reset UI
    if (DOM.modalStatusLine) DOM.modalStatusLine.textContent = "";
    if (DOM.apiResponseContent) DOM.apiResponseContent.innerHTML = "";
    if (DOM.modalLoading) DOM.modalLoading.classList.add("d-none");

    // Auto-Fill Form
    const { searchParams: defaultValues } = parseUrlParams(item.path || "");
    const paramsConfig = item.params || {};
    let formHtml = '';
    const hasParams = Object.keys(paramsConfig).length > 0;

    addHistory({ name: item.name, path: item.path });

    if (hasParams) {
      formHtml += `<div class="params-form mb-3 p-3" style="background: rgba(0,0,0,0.02); border-radius: 12px; border: 1px dashed var(--border-strong);">`;
      formHtml += `<div class="d-flex justify-content-between mb-2"><h6 class="small fw-bold text-muted m-0">PARAMETER</h6> <span class="badge bg-secondary" style="font-size:0.6rem">Auto-filled</span></div>`;
      
      for (const [key, desc] of Object.entries(paramsConfig)) {
        const val = defaultValues[key] || ""; 
        dynamicParams[key] = val;

        formHtml += `
          <div class="mb-2">
            <label class="form-label small mb-1 fw-bold text-muted">${key}</label>
            <input type="text" class="form-control form-control-sm param-input" 
                   data-key="${key}" value="${val}" placeholder="${desc}">
          </div>
        `;
      }
      formHtml += `</div>`;
    }
    
    formHtml += `
      <button id="executeBtn" class="btn btn-dark w-100 mb-3" style="border-radius: 50px;">
        <i class="fas fa-play me-2"></i> ${hasParams ? "Jalankan Request" : "Test Endpoint"}
      </button>
    `;

    // Inject Form
    const modalBody = DOM.modalEl.querySelector('.modal-body');
    const oldForm = modalBody.querySelector('.params-form-container');
    if(oldForm) oldForm.remove();

    const formContainer = document.createElement('div');
    formContainer.className = 'params-form-container';
    formContainer.innerHTML = formHtml;
    modalBody.insertBefore(formContainer, DOM.apiResponseContent);

    // Bind Event
    const inputs = formContainer.querySelectorAll('.param-input');
    inputs.forEach(inp => {
      inp.addEventListener('input', (e) => { dynamicParams[e.target.dataset.key] = e.target.value; });
    });

    const execBtn = document.getElementById('executeBtn');
    if(execBtn) {
      execBtn.onclick = () => {
        inputs.forEach(inp => { dynamicParams[inp.dataset.key] = inp.value; });
        sendApiRequest();
      };
    }

    if (modalInstance) modalInstance.show();
  };

  // ================================
  // 4. REQUEST & DOWNLOADER
  // ================================

  async function sendApiRequest() {
    if (!currentApiItem) return;
    
    const { pathname } = parseUrlParams(currentApiItem.path);
    let fetchUrl = window.location.origin + pathname;
    
    const queryParams = new URLSearchParams();
    for (const [key, val] of Object.entries(dynamicParams)) {
        if(val !== undefined && val !== null) queryParams.append(key, val);
    }
    const qs = queryParams.toString();
    if(qs) fetchUrl += '?' + qs;

    if (DOM.modalLoading) DOM.modalLoading.classList.remove("d-none");
    if (DOM.apiResponseContent) DOM.apiResponseContent.innerHTML = "";
    if (DOM.modalStatusLine) DOM.modalStatusLine.textContent = "Mengirim...";

    try {
      const res = await fetch(fetchUrl);
      const contentType = res.headers.get("content-type");
      let htmlOutput = "";

      // Media UI
      if (contentType && (contentType.includes("audio") || contentType.includes("video") || contentType.includes("image"))) {
         const blob = await res.blob();
         const mediaUrl = URL.createObjectURL(blob);
         
         if(contentType.includes("image")) {
             htmlOutput = `<div class="text-center"><img src="${mediaUrl}" style="max-width:100%; border-radius:8px;"></div>`;
         } else {
             const tag = contentType.includes("audio") ? "audio" : "video";
             htmlOutput = `
              <div class="text-center p-3" style="background:var(--bg-panel); border-radius:12px; border:1px solid var(--border-soft);">
                <h6 class="mb-3">Media Preview</h6>
                <${tag} controls src="${mediaUrl}" style="width: 100%; border-radius:8px;"></${tag}>
                <a href="${mediaUrl}" download="media_result" class="btn btn-success mt-3 rounded-pill btn-sm">
                    <i class="fas fa-download me-1"></i> Download
                </a>
              </div>`;
         }
      } 
      else {
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch {}
        
        const pretty = json ? JSON.stringify(json, null, 2) : text;
        htmlOutput = `<pre style="font-size:0.75rem; background:#1e1e1e; color:#a6e22e; padding:15px; border-radius:8px; overflow:auto;">${pretty}</pre>`;

        // Deteksi Link
        let downloadLink = null;
        if(json) {
            const target = json.result || json.data || json;
            if (target && (target.url || target.link || target.download)) {
                downloadLink = target.url || target.link || target.download;
            }
        }

        if (downloadLink && typeof downloadLink === 'string' && downloadLink.startsWith('http')) {
             htmlOutput += `
            <div class="mt-3 p-3 text-center" style="border: 1px solid var(--accent-color); border-radius: 12px; background: rgba(79, 156, 107, 0.1);">
                <h6 class="mb-2 text-success fw-bold">Link Output</h6>
                <p class="small text-muted text-truncate" style="max-width:280px; margin:0 auto;">${downloadLink}</p>
                <div class="d-flex gap-2 justify-content-center mt-3">
                    <a href="${downloadLink}" target="_blank" class="btn btn-outline-dark btn-sm rounded-pill">Buka</a>
                    <a href="${downloadLink}" download class="btn btn-success btn-sm rounded-pill">Download</a>
                </div>
            </div>`;
        }
      }

      DOM.apiResponseContent.innerHTML = htmlOutput;
      if (DOM.modalStatusLine) DOM.modalStatusLine.textContent = `Status: ${res.status}`;

    } catch (err) {
      DOM.apiResponseContent.textContent = "Error: " + err.message;
    } finally {
      if (DOM.modalLoading) DOM.modalLoading.classList.add("d-none");
    }
  }

  // ================================
  // 5. RENDER SYSTEM
  // ================================

  async function loadSettings() {
    try {
      const res = await fetch("/src/settings.json");
      if(!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      settings = await res.json();
      renderApiCategories(settings.categories);
      
      if(DOM.versionBadge && settings.version) DOM.versionBadge.textContent = settings.version;
      
      // CRITICAL FIX: Panggil animasi setelah render
      setTimeout(initScrollReveal, 100); 

    } catch (e) {
      console.error(e);
      // Tampilkan error di layar biar user tau kenapa kosong
      if(DOM.apiContent) {
          DOM.apiContent.innerHTML = `
          <div style="text-align:center; padding:2rem; color: #d05555;">
            <h4><i class="fas fa-exclamation-triangle"></i> Gagal Memuat Data</h4>
            <p>File <code>settings.json</code> tidak ditemukan atau format salah.</p>
            <pre style="background:rgba(0,0,0,0.1); padding:0.5rem; display:inline-block; border-radius:5px;">${e.message}</pre>
          </div>`;
      }
    }
  }

  function renderApiCategories(categories) {
    if (!DOM.apiContent || !categories) return;
    DOM.apiContent.innerHTML = "";
    
    // Filter Buttons
    if(DOM.apiFilters) {
        DOM.apiFilters.innerHTML = "";
        const allBtn = document.createElement("button");
        allBtn.className = "filter-chip active";
        allBtn.textContent = "Semua";
        allBtn.onclick = () => {
            document.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
            allBtn.classList.add("active");
            document.querySelectorAll(".api-item").forEach(it => it.style.display = "");
        };
        DOM.apiFilters.appendChild(allBtn);

        categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.className = "filter-chip";
            btn.textContent = cat.name;
            btn.onclick = () => {
                 document.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
                 btn.classList.add("active");
                 document.querySelectorAll(".api-item").forEach(it => {
                     it.style.display = (it.dataset.category === cat.name) ? "" : "none";
                 });
            };
            DOM.apiFilters.appendChild(btn);
        });
    }

    const row = document.createElement("div");
    row.className = "row";
    
    categories.forEach(cat => {
        (cat.items || []).forEach(item => {
            const col = document.createElement("div");
            col.className = "col-12 col-md-6 col-lg-4 api-item";
            col.dataset.category = cat.name;
            
            col.innerHTML = `
             <article class="api-card">
               <div class="api-card-header">
                 <h4 class="api-card-title">${item.name}</h4>
                 <div class="card-meta-row">
                    <span class="http-badge http-${(item.method||'GET').toLowerCase()}">${item.method||'GET'}</span>
                    <span class="endpoint-status-pill status-ok">Ready</span>
                 </div>
               </div>
               <p class="api-card-desc">${item.desc || ""}</p>
               <div class="api-card-footer">
                  <div class="api-path">${item.path}</div>
                  <div class="api-card-actions">
                     <button class="api-open-btn"><i class="fas fa-play me-1"></i>Try</button>
                  </div>
               </div>
             </article>
            `;
            col.querySelector(".api-open-btn").addEventListener("click", () => openApiModal(item));
            row.appendChild(col);
        });
    });
    DOM.apiContent.appendChild(row);
  }

  // ================================
  // 6. UI HELPERS (Animation, Sidebar, History)
  // ================================

  function addHistory(item) {
     historyItems.unshift({ name: item.name, path: item.path, ts: new Date().toISOString() });
     historyItems = historyItems.slice(0, 10);
     saveJSON("ada-api-history", historyItems);
     renderHistory();
  }

  function renderHistory() {
      if(!DOM.requestHistoryList) return;
      DOM.requestHistoryList.innerHTML = "";
      historyItems.forEach(h => {
          const li = document.createElement("li");
          li.className = "history-item";
          li.innerHTML = `<span class="history-name">${h.name}</span><span class="history-path">${h.path}</span>`;
          DOM.requestHistoryList.appendChild(li);
      });
  }

  function initCopyEvents() {
    if (DOM.copyEndpointBtn) {
      DOM.copyEndpointBtn.addEventListener("click", () => {
         if(!DOM.endpointText) return;
         const text = DOM.endpointText.textContent;
         navigator.clipboard.writeText(text).then(() => {
             const ori = DOM.copyEndpointBtn.innerHTML;
             DOM.copyEndpointBtn.innerHTML = '<i class="fas fa-check"></i>';
             setTimeout(() => DOM.copyEndpointBtn.innerHTML = ori, 1500);
         });
      });
    }
  }

  // IMPORTANT: Fungsi ini yang bikin konten muncul (opacity 0 -> 1)
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
      { threshold: 0.05 }
    );
    revealEls.forEach((el) => observer.observe(el));
    
    // Fallback: Paksa muncul jika observer gagal/lambat
    setTimeout(() => {
        revealEls.forEach(el => el.classList.add("reveal-visible"));
    }, 500);
  }

  // Sidebar Init
  if (DOM.menuToggle) {
      DOM.menuToggle.addEventListener("click", () => {
         DOM.sideNav.classList.add("open");
         DOM.body.classList.add("sidebar-open");
         if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add("show");
      });
  }
  if (DOM.sidebarBackdrop) {
      DOM.sidebarBackdrop.addEventListener("click", () => {
         DOM.sideNav.classList.remove("open");
         DOM.body.classList.remove("sidebar-open");
         if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
      });
  }
  if (DOM.searchInput) {
      DOM.searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll(".api-item").forEach(el => {
            el.style.display = el.innerText.toLowerCase().includes(query) ? "" : "none";
        });
      });
  }

  // START
  initCopyEvents();
  renderHistory();
  loadSettings(); 
});
