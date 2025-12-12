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
                creator: "Ada API",
                error: "Invalid YouTube URL."
            });
        }

        try {
            const encodedUrl = encodeURIComponent(url);
            // Endpoint pihak ketiga (sesuaikan kalau kamu pakai yang lain)
            const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`;

            const response = await axios.get(nekolabsUrl, {
                timeout: 15_000,
                headers: {
                    // neko labs kadang perlu user-agent; tambahkan header lain bila perlu
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
                },
                validateStatus: status => true // kita tangani status sendiri supaya bisa debug
            });

            // untuk debug (hapus/komentari di production bila tidak ingin expose)
            // console.log('nekolabs status', response.status);
            // console.log('nekolabs body', JSON.stringify(response.data).slice(0,1000));

            const body = response.data;

            // Nekolabs/servis serupa kadang punya bentuk respons berbeda.
            // Cek beberapa kemungkinan lokasi hasil:
            // - { success: true, result: { ... } }
            // - { status: true, data: { ... } }
            // - { ok: true, download: "..." }
            let success = false;
            let result = null;

            if (body && typeof body === 'object') {
                if (body.success && body.result) {
                    success = true;
                    result = body.result;
                } else if (body.status && body.data) {
                    success = true;
                    result = body.data;
                } else if (body.ok && (body.download || body.url)) {
                    success = true;
                    result = { downloadUrl: body.download || body.url, title: body.title || null };
                } else {
                    // Kadang data langsung ada di root
                    if (body.downloadUrl || body.url || body.result) {
                        success = true;
                        result = body;
                    }
                }
            }

            if (!success || !result) {
                // Kembalikan debug supaya mudah diperbaiki — server eksternal mungkin merubah format
                return res.status(502).json({
                    status: false,
                    creator: "Ada API",
                    error: "Gagal mendapatkan data download dari server eksternal.",
                    debug: {
                        httpStatus: response.status,
                        bodyPreview: body && typeof body === 'object' ? body : String(body)
                    }
                });
            }

            // normalisasi fields yang umum: downloadUrl, size, quality, format, title
            const downloadUrl =
                result.downloadUrl ||
                result.url ||
                result.link ||
                result.download ||
                result.src ||
                null;

            const title = result.title || result.name || null;
            const size = result.size || result.filesize || result.fileSize || null;
            const quality = result.quality || null;
            const format = result.format || result.type || 'mp3';

            if (!downloadUrl) {
                return res.status(502).json({
                    status: false,
                    creator: "Ada API",
                    error: "Server eksternal merespons tanpa URL unduhan.",
                    debug: { httpStatus: response.status, body: result }
                });
            }

            return res.status(200).json({
                status: true,
                creator: "Ada API",
                result: {
                    title,
                    downloadUrl,
                    size,
                    quality,
                    format
                }
            });

        } catch (error) {
            console.error('[ytmp3] error:', error && error.stack ? error.stack : error);
            return res.status(500).json({
                status: false,
                creator: "Ada API",
                error: "Internal server error saat memanggil downloader.",
                detail: error && error.message ? error.message : String(error)
            });
        }
    });
};
