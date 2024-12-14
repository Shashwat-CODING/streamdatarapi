const express = require('express');
const { getInfo } = require('yt-dlp-wrap');
const path = require('path');

const app = express();
const port = 3000;

// Serve the static files (for the HTML front-end)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch the video and audio streams
app.get('/api/streams', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    const info = await getInfo(url);
    const audioFormat = info.formats.find((format) => format.mime_type.includes('audio'));
    const videoFormat = info.formats.find((format) => format.mime_type.includes('video'));

    if (!audioFormat || !videoFormat) {
      return res.status(404).json({ error: 'Audio or video format not found' });
    }

    // Return the audio and video URLs
    res.json({
      audioUrl: audioFormat.url,
      videoUrl: videoFormat.url
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
