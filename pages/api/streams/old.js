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
  '4f0a13a1ddmsh6d11828c53238ccp1baec0jsn7741b4066318',
  '83dc1f5a32mshaaf1e9971cdc09dp166512jsnc7362a507e28',
  'c05439ea12msh28cd28d2ca6082dp1f33b8jsn297b1b5195b7',
  '44e40be7e0msha9d343b64467a26p100122jsn18c917cdd969',
  '6e99c7303fmshe58df9173f6004dp13ae5ejsn692c0c89c75f',
  'eee55a9833msh8f2dbd8e2b7970bp194fefjsne09ddc646e78',
  '02c0aa3290msh2a0a42c5b01834ep15ec7cjsn11ee98e4e7b6'
];

// Maximum requests per key before rotation
const MAX_REQUESTS_PER_KEY = 450;

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
  constructor(apiKeys, maxRequestsPerKey = 450) {
    this.apiKeys = apiKeys;
    this.currentIndex = 0;
    this.keyRequestCounts = new Map(apiKeys.map(key => [key, 0]));
    this.maxRequestsPerKey = maxRequestsPerKey;
  }

  getCurrentKey() {
    return this.apiKeys[this.currentIndex];
  }

  shouldRotateKey(key) {
    const currentRequests = this.keyRequestCounts.get(key) || 0;
    return currentRequests >= this.maxRequestsPerKey;
  }

  rotateKey() {
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    return this.getCurrentKey();
  }

  incrementRequestCount(key) {
    const currentRequests = this.keyRequestCounts.get(key) || 0;
    this.keyRequestCounts.set(key, currentRequests + 1);
  }
}

// Fetch with robust error handling and key rotation for RapidAPI
async function fetchWithRapidAPIRetry(url, options, keyManager) {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    const currentApiKey = keyManager.getCurrentKey();

    // Check if current key needs rotation
    if (keyManager.shouldRotateKey(currentApiKey)) {
      keyManager.rotateKey();
    }

    try {
      // Prepare request headers
      const modifiedOptions = {
        ...options,
        headers: {
          ...options.headers,
          'X-RapidAPI-Key': currentApiKey,
          'X-RapidAPI-Host': 'yt-api.p.rapidapi.com'
        }
      };

      const response = await fetch(url, modifiedOptions);

      // Check response status
      if (!response.ok) {
        // For specific error codes, throw an error to trigger key rotation
        if (response.status === 429 || response.status === 403) {
          // Rotate to next key
          keyManager.rotateKey();
          
          retries++;
          continue;
        }
        
        // For other error statuses, throw a generic error
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Increment request count for the successful key
      keyManager.incrementRequestCount(currentApiKey);

      return response;
    } catch (error) {
      // Rotate to next key
      keyManager.rotateKey();
      
      retries++;
      
      // If it's the last retry, rethrow the error
      if (retries === maxRetries) {
        throw error;
      }
    }
  }

  throw new Error('All RapidAPI keys failed');
}

// Function to extract all audio streams
function extractAudioStreams(adaptiveFormats) {
  if (!adaptiveFormats || adaptiveFormats.length === 0) {
    return [];
  }

  // Filter and map audio-only streams
  return adaptiveFormats
    .filter((f) => f.mimeType.startsWith('audio'))
    .map((f) => ({
      url: f.url,
      quality: `${Math.floor(f.bitrate / 1000)} kbps`,
      mimeType: f.mimeType,
      codec: f.mimeType.split('codecs="')[1]?.split('"')[0],
      bitrate: f.bitrate,
      contentLength: f.contentLength,
      // Add any additional useful information
      audioQuality: f.audioQuality || 'Unknown'
    }))
    .sort((a, b) => b.bitrate - a.bitrate); // Sort by bitrate in descending order
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
    // Fetch stream data using RapidAPI with key rotation
    const ytStreamApiUrl = `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${videoId}`;
    const ytStreamResponse = await fetchWithRapidAPIRetry(ytStreamApiUrl, {}, rapidAPIKeyManager);
    const streamData = await ytStreamResponse.json();

    // Validate stream data
    if (!streamData || !streamData.adaptiveFormats) {
      throw new Error('No streaming data available');
    }

    // Extract all audio streams
    const audioStreams = extractAudioStreams(streamData.adaptiveFormats);

    // Piped API-style response
    const pipedResponse = {
      title: streamData.title || 'Unknown Title',
      uploader: streamData.channelTitle || 'Unknown Channel',
      uploaderUrl: `/channel/${streamData.channelId || 'unknown'}`,
      duration: parseInt(streamData.lengthSeconds, 10) || 0,
      About: 'Provided to ytify by Shashwat',

      audioStreams: audioStreams,
      videoStreams: [], // Intentionally left empty as requested
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