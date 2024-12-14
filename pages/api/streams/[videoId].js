import Cors from 'cors';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://raagheaven.netlify.app',
  'https://ytifyfkd.vercel.app',
  'https://shcloud.netlify.app',
  'https://ytify.us.kg',
  'http://localhost:5173'
];

// RapidAPI Keys Configuration
const RAPID_API_KEYS = [
  '74fb0281e2msh9e94a0c8067c4ecp16f3aejsn2865f62a9782',
  '73cfd1a64amshad381c27729fd25p1ee6a0jsna7d6ef38ea23',
  '4f0a13a1ddmsh6d11828c53238ccp1baec0jsn7741b4066318',
  '83dc1f5a32mshaaf1e9971cdc09dp166512jsnc7362a507e28',
  'c05439ea12msh28cd28d2ca6082dp1f33b8jsn297b1b5195b7',
  '44e40be7e0msha9d343b64467a26p100122jsn18c917cdd969',
  '6e99c7303fmshe58df9173f6004dp13ae5ejsn692c0c89c75f',
  'eee55a9833msh8f2dbd8e2b7970bp194fefjsne09ddc646e78',
  '02c0aa3290msh2a0a42c5b01834ep15ec7cjsn11ee98e4e7b6'
];

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Unauthorized origin'));
    }
  }
});

// Middleware runner
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Robust API Key Manager for RapidAPI
class RapidAPIKeyManager {
  constructor(apiKeys) {
    this.apiKeys = apiKeys;
    this.currentIndex = 0;
    this.keyUsageCount = new Array(apiKeys.length).fill(0);
  }

  getCurrentKey() {
    return this.apiKeys[this.currentIndex];
  }

  rotateKey() {
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    return this.getCurrentKey();
  }

  markKeyUsed() {
    this.keyUsageCount[this.currentIndex]++;
  }

  resetKeyUsageCount() {
    this.keyUsageCount = new Array(this.apiKeys.length).fill(0);
  }
}

// Fetch with robust error handling and key rotation for RapidAPI
async function fetchWithRapidAPIRetry(url, options, keyManager) {
  const maxRetries = RAPID_API_KEYS.length;
  let retries = 0;

  while (retries < maxRetries) {
    const currentApiKey = keyManager.getCurrentKey();

    try {
      // Prepare request headers
      const modifiedOptions = {
        ...options,
        headers: {
          ...options.headers,
          'X-RapidAPI-Key': currentApiKey,
          'X-RapidAPI-Host': 'ytstream-download-youtube-videos.p.rapidapi.com'
        }
      };

      const response = await fetch(url, modifiedOptions);

      // If response is not OK, check for specific error conditions
      if (!response.ok) {
        const errorText = await response.text();
        
        // Check for daily quota exceeded error
        if (errorText.includes("You have exceeded the DAILY quota for Requests on your current plan")) {
          console.log(`Key ${currentApiKey} has exceeded daily quota. Rotating...`);
          keyManager.rotateKey();
          retries++;
          continue;
        }

        // Check for rate limit errors
        if (response.status === 429 || response.status === 403) {
          console.log(`Rate limit hit for key ${currentApiKey}. Rotating...`);
          keyManager.rotateKey();
          retries++;
          continue;
        }

        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // Check response headers for remaining requests
      const remainingRequests = parseInt(response.headers.get('x-ratelimit-requests-remaining'), 10);
      if (!isNaN(remainingRequests) && remainingRequests <= 10) {
        console.log(`Low remaining requests for key ${currentApiKey}. Rotating...`);
        keyManager.rotateKey();
      }

      // Mark the key as used
      keyManager.markKeyUsed();

      return response;
    } catch (error) {
      console.error(`Error with API key ${currentApiKey}:`, error.message);
      keyManager.rotateKey();
      retries++;
      
      // If all keys have been tried, reset the usage count and try again
      if (retries === maxRetries) {
        keyManager.resetKeyUsageCount();
      }
    }
  }

  throw new Error('All RapidAPI keys failed');
}

// Function to extract all audio streams (remains the same as in the original code)
function extractAudioStreams(adaptiveFormats) {
  if (!adaptiveFormats || adaptiveFormats.length === 0) {
    return [];
  }

  // Process the audio streams
  const streams = adaptiveFormats
    .filter((f) => f.mimeType.startsWith('audio'))
    .map((f) => ({
      url: f.url,
      quality: `${Math.floor(f.bitrate / 1000)} kbps`,
      mimeType: f.mimeType,
      codec: f.mimeType.split('codecs="')[1]?.split('"')[0],
      bitrate: f.bitrate,
      contentLength: f.contentLength ? parseInt(f.contentLength, 10) : null,
      audioQuality: f.audioQuality || 'Unknown',
    }))
    .sort((a, b) => b.bitrate - a.bitrate); // Sort by bitrate in descending order

  // Adjust the highest bitrate stream
  if (streams.length > 0) {
    const highestBitrateStream = streams[0];
    highestBitrateStream.quality = "320 kbps";
    if (highestBitrateStream.contentLength !== null) {
      highestBitrateStream.contentLength += 2 * 1024 * 1024; // Add 2 MB
    }
  }

  return streams;
}

// Create API key manager for RapidAPI
const rapidAPIKeyManager = new RapidAPIKeyManager(RAPID_API_KEYS);

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    const ytStreamApiUrl = `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${videoId}`;
    const ytStreamResponse = await fetchWithRapidAPIRetry(ytStreamApiUrl, {}, rapidAPIKeyManager);
    const streamData = await ytStreamResponse.json();

    if (!streamData || !streamData.adaptiveFormats) {
      throw new Error('No streaming data available');
    }

    const audioStreams = extractAudioStreams(streamData.adaptiveFormats);

    const pipedResponse = {
      title: streamData.title || 'Unknown Title',
      uploader: streamData.channelTitle || 'Unknown Channel',
      uploaderUrl: `/channel/${streamData.channelId || 'unknown'}`,
      duration: parseInt(streamData.lengthSeconds, 10) || 0,
      About: 'Provided to ytify by shashwat with contribtion of Rudraksh Prakash awasthi',
      audioStreams: audioStreams,
      videoStreams: [],
      relatedStreams: [],
      subtitles: [],
      livestream: false,
    };

    res.status(200).json(pipedResponse);
  } catch (error) {
    console.error('Error fetching video data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video data', 
      details: error.message 
    });
  }
}