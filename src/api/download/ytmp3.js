// src/api/downloader/ytmp3.js
const axios = require('axios');

module.exports = function(app) {
  function setCorsHeaders(res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  app.options('/api/downloader/ytmp3', (req,res)=>{ setCorsHeaders(res); return res.sendStatus(204); });

  app.get('/api/downloader/ytmp3', async (req,res) => {
    setCorsHeaders(res);
    try {
      const url = req.query.url;
      const direct = req.query.direct === '1' || req.query.direct === 'true';
      if (!url) return res.status(400).json({ status:false, error:"Parameter 'url' required. Use encodeURIComponent." });

      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
      if (!youtubeRegex.test(url)) return res.status(400).json({ status:false, error:"Invalid YouTube URL." });

      const encodedUrl = encodeURIComponent(url);
      const upstream = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`;

      const response = await axios.get(upstream, {
        headers: { 'User-Agent': 'Mozilla/5.0 (AdaAPI/1.0)' },
        timeout: 20000,
        validateStatus: null
      });

      const ct = (response.headers && response.headers['content-type']) || '';
      const body = response.data;

      if (ct.includes('text/html') || typeof body === 'string') {
        return res.status(502).json({ status:false, error:"Upstream returned HTML (likely not found)", upstreamStatus: response.status, upstreamPreview: typeof body === 'string' ? body.slice(0,800) : null });
      }

      if (!body || body.success !== true || !body.result) {
        return res.status(502).json({ status:false, error:"Upstream did not return expected data", upstreamStatus: response.status, upstreamBody: body });
      }

      const result = body.result;
      const downloadUrl = result.downloadUrl || result.url || null;
      if (!downloadUrl) return res.status(502).json({ status:false, error:"No download URL from upstream", upstreamResult: result });

      if (direct) return res.redirect(302, downloadUrl);

      return res.status(200).json({
        status:true,
        metadata:{ title: result.title || null, duration: result.duration || null, cover: result.cover || null, originalUrl: url },
        result:{ downloadUrl, quality: result.quality || null, format: result.format || 'mp3' }
      });

    } catch (err) {
      console.error("ytmp3 error:", err && err.stack ? err.stack : err);
      if (err && err.response) return res.status(502).json({ status:false, error:"Upstream returned error", upstreamStatus: err.response.status, upstreamBody: err.response.data });
      return res.status(500).json({ status:false, error: err && err.message ? err.message : "Internal error" });
    }
  });
};
