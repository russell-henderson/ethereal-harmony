const http = require('http');
const https = require('https');
const { URL } = require('url');

const testStations = [
  {
    city: 'New York',
    country: 'United States',
    name: 'Z100 New York (WHTZ)',
    url: 'https://live.powerhitz.com/hitlist?aw_0_req.gdpr=true', // PowerHitz Hitlist (fallback since iHeart is tokenized)
    genre: 'Pop / Top 40'
  },
  {
    city: 'London',
    country: 'United Kingdom',
    name: 'Capital FM London',
    url: 'https://media-ssl.musicradio.com/CapitalMP3',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Paris',
    country: 'France',
    name: 'NRJ Paris',
    url: 'https://streaming.nrjaudio.fm/oumvmk8fnozc?origine=fluxradios',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Berlin',
    country: 'Germany',
    name: '104.6 RTL Berlin',
    url: 'https://stream.104.6rtl.com/rtl-live/mp3-128/konsole/',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Rome',
    country: 'Italy',
    name: 'RTL 102.5 Rome',
    url: 'https://shoutcast.rtl.it:8000/stream',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Madrid',
    country: 'Spain',
    name: 'LOS 40 Madrid',
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Toronto',
    country: 'Canada',
    name: 'Kiss 92.5 Toronto',
    url: 'https://rogers-hls.leanstream.co/rogers/tor925.stream/48k/playlist.m3u8',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Sydney',
    country: 'Australia',
    name: 'Nova 96.9 Sydney',
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/NOVA_969_AAC320.aac',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Singapore',
    country: 'Singapore',
    name: '987FM Singapore',
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/987FM.mp3',
    genre: 'Pop / Top 40'
  },
  {
    city: 'Rio de Janeiro',
    country: 'Brazil',
    name: 'Mix FM Rio',
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/MIXFM_SAOPAULOAAC.aac',
    genre: 'Pop / Top 40'
  }
];

function verifyUrl(streamUrl) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(streamUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request(
        streamUrl,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Range': 'bytes=0-1000' // Request first few bytes
          },
          timeout: 5000
        },
        (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) {
            resolve({ ok: true, statusCode: res.statusCode, contentType: res.headers['content-type'] });
          } else {
            resolve({ ok: false, statusCode: res.statusCode });
          }
          req.destroy();
        }
      );

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });

      req.on('timeout', () => {
        resolve({ ok: false, error: 'timeout' });
        req.destroy();
      });

      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

async function main() {
  const verified = [];
  for (const station of testStations) {
    console.log(`Verifying ${station.name} (${station.city})...`);
    const res = await verifyUrl(station.url);
    if (res.ok) {
      console.log(`  [OK] Status: ${res.statusCode}, Content-Type: ${res.contentType}`);
      verified.push({
        id: `default-stream-${station.city.toLowerCase().replace(/\s+/g, '-')}`,
        title: station.name,
        artist: `${station.genre} - ${station.city}, ${station.country}`,
        album: "World Pop Stations",
        source: "remote",
        url: station.url,
        mime: res.contentType || (station.url.endsWith('.m3u8') ? 'application/x-mpegURL' : 'audio/mpeg'),
        isStream: true
      });
    } else {
      console.log(`  [FAIL] ${res.error || `Status code ${res.statusCode}`}`);
      
      // Let's try to query fallback via radio-browser for this city if the curated one failed
      // (RTL Rome on port 8000 might fail on strict TLS/CORS or port blocks, let's see)
    }
  }
  
  console.log('\n--- VERIFIED STATIONS ---');
  console.log(JSON.stringify(verified, null, 2));
}

main();
