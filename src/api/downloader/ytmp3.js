// src/api/downloader/ytmp3.js
// Very defensive + verbose logging wrapper for Nekolabs ytmp3 proxy
const axios = require('axios');

function safeLog(...args) {
    try { console.log(...args); } catch(_) {}
}

function sanitizeYouTubeUrlSafe(raw) {
    if (!raw || typeof raw !== 'string') return null;
    raw = raw.trim();
    try {
        try { raw = decodeURIComponent(raw); } catch (_) {}
        if (!/^https?:\/\//i.test(raw)) {
            if (/^youtu\.be\//i.test(raw) || /^m\.youtube\.com\//i.test(raw) || /^www\.youtube\.com\//i.test(raw)) {
                raw = 'https://' + raw;
            }
        }
        const u = new URL(raw);
        const host = u.hostname.toLowerCase();
        if (host.includes('youtu.be')) {
            const id = u.pathname.replace(/^\/+/, '');
            if (id) return `https://m.youtube.com/watch?v=${encodeURIComponent(id)}`;
            return raw;
        }
        if (host.includes('youtube.com') || host.includes('m.youtube.com')) {
            const v = u.searchParams.get('v');
            if (v) return `https://m.youtube.com/watch?v=${encodeURIComponent(v)}`;
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts[0] === 'shorts' && parts[1]) return `https://m.youtube.com/shorts/${encodeURIComponent(parts[1])}`;
            if (parts[0] === 'embed' && parts[1]) return `https://m.youtube.com/watch?v=${encodeURIComponent(parts[1])}`;
            return `${u.origin}${u.pathname}`;
        }
    } catch (err) {
        safeLog('[ytmp3] sanitize failed:', err && err.message ? err.message : err);
        return raw;
    }
    return raw;
}

function buildNekoUrl(youtubeRaw) {
    const cleaned = sanitizeYouTubeUrlSafe(youtubeRaw);
    if (!cleaned) return null;
    const encoded = encodeURIComponent(cleaned);
    return `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encoded}&format=mp3`;
}

module.exports = function(app) {
    // protect against duplicate registration in hot-reload environments
    if (app._ytmp3_registered) return;
    app._ytmp3_registered = true;

    app.get('/api/download/ytmp3', async (req, res) => {
        const start = Date.now();
        let rawUrl = req.query && req.query.url;
        if (Array.isArray(rawUrl)) rawUrl = rawUrl[0];

        if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
            safeLog('[ytmp3] missing url param');
            return res.status(400).json({ status:false, error: "Missing 'url' query param. Example: /api/download/ytmp3?url=https://m.youtube.com/shorts/PcY3LMfDxmc" });
        }

        const nekoUrl = buildNekoUrl(rawUrl);
        if (!nekoUrl) {
            safeLog('[ytmp3] failed build neko url for:', rawUrl);
            return res.status(400).json({ status:false, error: "Failed to parse provided YouTube URL." });
        }

        safeLog(`[ytmp3] REQUEST start -> rawUrl=${rawUrl} nekoUrl=${nekoUrl}`);

        try {
            // request as arraybuffer first to avoid automatic JSON parse error on binary
            const upstream = await axios.get(nekoUrl, {
                timeout: 20000,
                responseType: 'arraybuffer', // get raw bytes then decide how to parse
                headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' },
                validateStatus: () => true
            });

            const duration = Date.now() - start;
            safeLog(`[ytmp3] upstream status=${upstream.status} time=${duration}ms headers=${JSON.stringify(upstream.headers || {}).slice(0,1000)}`);

            // Convert arraybuffer to string safely (try JSON, then text)
            let parsedBody = null;
            try {
                // Try decode as UTF-8 string first
                const text = Buffer.from(upstream.data).toString('utf8');
                // Try parse JSON
                try {
                    parsedBody = JSON.parse(text);
                    safeLog('[ytmp3] upstream JSON parsed');
                } catch (e) {
                    // not JSON, keep text
                    parsedBody = text;
                    safeLog('[ytmp3] upstream returned text (not JSON), length=', text.length);
                }
            } catch (err) {
                parsedBody = null;
                safeLog('[ytmp3] failed to decode upstream body:', err && err.message ? err.message : err);
            }

            // If status not OK, send debug preview
            if (upstream.status >= 400) {
                // prepare preview limited to 2000 chars
                let preview;
                try {
                    if (typeof parsedBody === 'object') preview = JSON.stringify(parsedBody).slice(0,2000);
                    else preview = String(parsedBody || '').slice(0,2000);
                } catch (e) {
                    preview = 'unable to prepare preview';
                }
                safeLog(`[ytmp3] upstream error -> status=${upstream.status} preview=${preview.slice(0,200)}`);
                return res.status(502).json({
                    status: false,
                    message: "Upstream returned error",
                    upstreamStatus: upstream.status,
                    triedUrl: nekoUrl,
                    upstreamPreview: preview,
                    headers: upstream.headers
                });
            }

            // upstream ok -> normalize
            let normalized = null;
            if (parsedBody === null) {
                // no parse - return base64 of data as raw (but keep small)
                const sizeBytes = upstream.data ? upstream.data.length : 0;
                safeLog(`[ytmp3] upstream non-text response size=${sizeBytes}`);
                // don't attempt to return big binary object; instead return metadata & hint
                return res.status(200).json({
                    status:true,
                    upstreamStatus: upstream.status,
                    triedUrl: nekoUrl,
                    note: "Upstream returned non-text binary data. If this is unexpected, inspect upstream service separately.",
                    headers: upstream.headers,
                    size: sizeBytes
                });
            } else if (typeof parsedBody === 'string') {
                // try to JSON.parse the string again just in case (previous step might have considered string)
                try { normalized = JSON.parse(parsedBody); } catch (e) { normalized = parsedBody; }
            } else {
                normalized = parsedBody;
            }

            // normalize common shapes
            let final = normalized;
            if (normalized && typeof normalized === 'object') {
                if (normalized.result) final = normalized.result;
                else if (normalized.data) final = normalized.data;
            }

            safeLog('[ytmp3] returning normalized result (type=' + typeof final + ')');

            return res.status(200).json({
                status: true,
                upstreamStatus: upstream.status,
                triedUrl: nekoUrl,
                data: final
            });

        } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            safeLog('[ytmp3] unexpected error:', msg, err && err.stack ? err.stack.split('\n').slice(0,5).join('\n') : '');
            return res.status(500).json({
                status:false,
                error: "Internal server error while contacting upstream",
                detail: msg,
                triedUrl: nekoUrl
            });
        }
    });
};
