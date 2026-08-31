require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve the frontend as a static app so the whole thing runs from one server
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// --- Helper: basic URL validation wrapper ---
function isValidYouTubeUrl(url) {
  return typeof url === 'string' && ytdl.validateURL(url);
}

// --- Get video info + available formats ---
app.get('/api/info', async (req, res) => {
  const { url } = req.query;

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL.' });
  }

  try {
    const info = await ytdl.getInfo(url);

    const formats = ytdl
      .filterFormats(info.formats, 'videoandaudio')
      .filter((f) => f.qualityLabel)
      .map((f) => ({
        itag: f.itag,
        qualityLabel: f.qualityLabel,
        container: f.container,
        contentLength: f.contentLength || null
      }))
      // dedupe by quality label, keep smallest itag for each
      .filter((f, idx, arr) => arr.findIndex((x) => x.qualityLabel === f.qualityLabel) === idx);

    res.json({
      title: info.videoDetails.title,
      author: info.videoDetails.author?.name || 'Unknown',
      thumbnail: info.videoDetails.thumbnails?.at(-1)?.url || '',
      lengthSeconds: Number(info.videoDetails.lengthSeconds || 0),
      formats
    });
  } catch (err) {
    console.error('[/api/info]', err.message);
    res.status(500).json({
      error: 'Could not fetch video info. The video may be private, age-restricted, region-locked, or unavailable.'
    });
  }
});

// --- Stream the actual download ---
app.get('/api/download', async (req, res) => {
  const { url, itag } = req.query;

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL.' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const safeTitle = info.videoDetails.title
      .replace(/[^\w\s-]/g, '')
      .trim()
      .slice(0, 60) || 'video';

    res.header('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

    const options = itag ? { quality: itag } : { quality: 'highest' };
    const stream = ytdl(url, options);

    stream.on('error', (err) => {
      console.error('[/api/download stream]', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Download stream failed.' });
    });

    stream.pipe(res);
  } catch (err) {
    console.error('[/api/download]', err.message);
    res.status(500).json({ error: 'Download failed. Please try a different link or format.' });
  }
});

app.listen(PORT, () => {
  console.log(`ZXH OFFICIAL YOUTUBE VIDEO DOWNLOADER running at http://localhost:${PORT}`);
});