// APIDocs.js
import React from 'react';
import './css.css';

const APIDocs = () => {
  return (
    <div className="api-docs">
      <nav className="nav">
        <div className="nav-container">
          <div className="nav-content">
            <div className="nav-logo">YouTube Audio API</div>
            <div className="nav-links">
              <a href="#overview">Overview</a>
              <a href="#endpoints">Endpoints</a>
              <a href="#examples">Examples</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="hero">
          <h1>YouTube Audio API Documentation</h1>
          <p>Extract audio streams from YouTube videos with ease</p>
        </div>

        <div className="base-url">
          <h2>Base URL</h2>
          <code>https://video-api-transform.vercel.app/api/streams/video_id</code>
        </div>

        <section id="overview" className="section">
          <div className="card">
            <h2>Overview</h2>
            <p className="overview-text">
              This API allows you to extract audio streams from YouTube videos with support for multiple formats and qualities.
            </p>
            <div className="features-grid">
              <div className="feature">
                <h3>Multiple Formats</h3>
                <p>Support for M4A, and WebM audio formats</p>
              </div>
              <div className="feature">
                <h3>Quality Options</h3>
                <p>Various bitrates and quality settings available</p>
              </div>
              <div className="feature">
                <h3>Metadata</h3>
                <p>Complete video and audio stream metadata</p>
              </div>
            </div>
          </div>
        </section>

        <section id="endpoints" className="section">
          <div className="card">
            <h2>Endpoints</h2>
            <div className="endpoint">
              <h3>GET /api/streams/video_id</h3>
              <p>Retrieve audio streams for a YouTube video</p>
              
              <div className="params">
                <h4>Query Parameters</h4>
                <code>videoId: string (required) - YouTube video ID</code>
              </div>

              <div className="response">
                <h4>Response</h4>
                <pre><code>{`{
  "title": "Video Title",
  "uploader": "Channel Name",
  "duration": 360,
  "audioStreams": [
    {
      "url": "https://...",
      "format": "M4A",
      "quality": "128 kbps",
      "size": 15728640
    }
  ]
}`}</code></pre>
              </div>
            </div>
          </div>
        </section>

        <section id="examples" className="section">
          <div className="card">
            <h2>Example Usage</h2>
            
            <div className="example">
              <h3>JavaScript</h3>
              <pre><code>{`const videoId = 'dQw4w9WgXcQ';
const response = await fetch(\`/api/streams/\${videoId}\`);
const data = await response.json();

// Get highest quality audio
const bestQuality = data.audioStreams.reduce((prev, current) => 
  (current.bitrate > prev.bitrate) ? current : prev
);`}</code></pre>
            </div>

            <div className="example">
              <h3>Python</h3>
              <pre><code>{`import requests

video_id = 'dQw4w9WgXcQ'
response = requests.get(f'/api/streams/{video_id}')
data = response.json()

# Get highest quality audio
best_quality = max(data['audioStreams'], key=lambda x: x['bitrate'])`}</code></pre>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="card">
            <h2>Error Handling</h2>
            <div className="errors-grid">
              <div className="error">
                <h3>400 Bad Request</h3>
                <pre><code>{`{
  "error": "Video ID is required"
}`}</code></pre>
              </div>
              <div className="error">
                <h3>500 Server Error</h3>
                <pre><code>{`{
  "error": "Failed to fetch video"
}`}</code></pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Need help? Check out our GitHub repository or contact support.</p>
      </footer>
    </div>
  );
};

export default APIDocs;