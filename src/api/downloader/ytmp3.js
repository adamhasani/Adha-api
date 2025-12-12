// src/api/downloader/ytmp3.js
const axios = require('axios');

module.exports = function(app) {
    app.get('/api/download/ytmp3', async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Parameter 'url' is required."
            });
        }

        // Validasi Regex Link YouTube (sederhana)
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/i;
        if (!youtubeRegex.test(url)) {
            return res.status(400).json({
                status: false,
// src/api/downloader/ytmp3.js
// Proxy handler untuk NeKolabs YouTube -> MP3
// - sanitize YouTube URL (short, watch, shorts, embed)
// - build Nekolabs encoded URL
// - forward response (dengan debug jika upstream error)
// - gunakan axios dengan validateStatus agar kita bisa mengembalikan payload debug

const axios = require('axios');

/**
 * Sanitize dan canonicalize berbagai bentuk link YouTube menjadi bentuk yang rapi.
 * Contoh input yang ditangani:
 * - https://youtu.be/ID
 * - https://www.youtube.com/watch?v=ID&t=...
 * - https://m.youtube.com/shorts/ID
 * - https://www.youtube.com/embed/ID
 */
function sanitizeYouTubeUrl(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    try {
        const u = new URL(raw);
        const host = u.hostname.toLowerCase();

        // Short link: youtu.be/ID
        if (host.includes('youtu.be')) {
            const id = u.pathname.replace(/^\/+/, '');
            if (id) return `https://m.youtube.com/watch?v=${id}`;
            return `https://youtu.be/${u.pathname.replace(/^\/+/, '')}`;
        }

        // Standard youtube.com
        if (host.includes('youtube.com') || host.includes('m.youtube.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            // watch?v=ID
            const v = u.searchParams.get('v');
            if (v) return `https://m.youtube.com/watch?v=${v}`;

            // shorts/ID
            if (parts[0] === 'shorts' && parts[1]) {
                return `https://m.youtube.com/shorts/${parts[1]}`;
            }

            // embed/ID
            if (parts[0] === 'embed' && parts[1]) {
                return `https://m.youtube.com/watch?v=${parts[1]}`;
            }

            // fallback: use origin + path (without extra query params)
            return `${u.origin}${u.pathname}`;
        }
    } catch (e) {
        // not a valid absolute URL; try to salvage by returning raw
    }
    return raw;
}

/**
 * Build full Nekolabs URL with encodeURIComponent
 */
function buildNekoUrl(youtubeRaw) {
    const cleaned = sanitizeYouTubeUrl(youtubeRaw);
    const encoded = encodeURIComponent(cleaned);
    return `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encoded}&format=mp3`;
}

module.exports = function(app) {
    // Route: /api/download/ytmp3?url=<raw-youtube-url>
    app.get('/api/download/ytmp3', async (req, res) => {
        const rawUrl = req.query.url;
        if (!rawUrl) {
            return res.status(400).json({ status: false, error: "Missing required query parameter: url" });
        }

        const nekoUrl = buildNekoUrl(rawUrl);

        try {
            const upstream = await axios.get(nekoUrl, {
                timeout: 15000,
                headers: {
                    // Set UA to mimic browser (some services require it)
                    'User-Agent': 'Mozilla/5.0 (Node.js)'
                },
                validateStatus: () => true // handle all statuses manually for better debug
            });

            // If upstream returns non-2xx, forward helpful debug info
            if (upstream.status >= 400) {
                // upstream.data might be object or plain text
                let preview = upstream.data;
                try {
                    if (typeof preview === 'object') preview = preview;
                    else preview = String(preview).slice(0, 2000);
                } catch (e) {
                    preview = String(upstream.data).slice(0, 2000);
                }

                return res.status(upstream.status).json({
                    status: false,
                    message: "Upstream responded with error",
                    upstreamStatus: upstream.status,
                    triedUrl: nekoUrl,
                    upstreamPreview: preview
                });
            }

            // success path: try to normalize result if possible
            const body = upstream.data || {};
            // Nekolabs often returns { success: true, result: { ... } } or similar
            let normalized = body;
            if (body.result) normalized = body.result;
            else if (body.data) normalized = body.data;

            // If the normalized object already has expected fields, forward as-is
            // Otherwise wrap and include original upstream body
            return res.status(200).json({
                status: true,
                upstreamStatus: upstream.status,
                triedUrl: nekoUrl,
                data: normalized
            });

        } catch (err) {
            // Network / timeout / other axios error
            const message = err && err.message ? err.message : String(err);
            return res.status(500).json({
                status: false,
                error: "Failed to call upstream service",
                detail: message,
                triedUrl: nekoUrl
            });
        }
    });
};
