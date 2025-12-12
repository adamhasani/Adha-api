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

        // Validasi Regex Link YouTube
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!youtubeRegex.test(url)) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Invalid YouTube URL."
            });
        }

        try {
            const encodedUrl = encodeURIComponent(url);
            const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`;
            
            const response = await axios.get(nekolabsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const data = response.data;

            // === PERBAIKAN DI SINI ===
            // Nekolabs pakai 'success', bukan 'status'. Dan isinya di 'result', bukan 'data'.
            if (!data || !data.success) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Gagal mengambil data dari server downloader.",
                    debug: data 
                });
            }

            res.status(200).json({
                status: true,
                creator: "Ada API",
                metadata: {
                    title: data.result.title,
                    originalUrl: url,
                    duration: data.result.duration,
                    cover: data.result.cover
                },
                // Link download ada di data.result.downloadUrl
                result: {
                    downloadUrl: data.result.downloadUrl,
                    quality: data.result.quality,
                    format: data.result.format
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                status: false, 
                error: error.message 
            });
        }
    });
};
