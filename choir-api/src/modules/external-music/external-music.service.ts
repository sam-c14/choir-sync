import { logger } from '../../lib/logger';

let spotifyToken: string | null = null;
let tokenExpiresAt: number = 0;

const PITCH_CLASS_MAP = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < tokenExpiresAt) {
    return spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Failed to get Spotify token', { errorText });
    throw new Error('Failed to authenticate with Spotify');
  }

  const data = await response.json();
  spotifyToken = data.access_token;
  // Expire 1 minute early to be safe
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return spotifyToken as string;
}

export async function searchSpotifyTracks(query: string) {
  const token = await getSpotifyToken();

  const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!searchResponse.ok) {
    throw new Error('Failed to search tracks on Spotify');
  }

  const searchData = await searchResponse.json();
  const tracks = searchData.tracks?.items || [];

  if (tracks.length === 0) {
    return [];
  }

  const trackIds = tracks.map((t: any) => t.id).join(',');

  const audioFeaturesResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!audioFeaturesResponse.ok) {
    throw new Error('Failed to fetch audio features');
  }

  const audioFeaturesData = await audioFeaturesResponse.json();
  const featuresMap = new Map();
  if (audioFeaturesData.audio_features) {
    for (const feature of audioFeaturesData.audio_features) {
      if (feature) {
        featuresMap.set(feature.id, feature);
      }
    }
  }

  return tracks.map((track: any) => {
    const feature = featuresMap.get(track.id);
    let originalKey = null;
    let tempoBpm = null;

    if (feature) {
      if (feature.key >= 0 && feature.key <= 11) {
        const keyName = PITCH_CLASS_MAP[feature.key];
        const modeName = feature.mode === 1 ? 'Major' : 'Minor';
        originalKey = `${keyName} ${modeName}`;
      }
      if (feature.tempo) {
        tempoBpm = Math.round(feature.tempo);
      }
    }

    return {
      title: track.name,
      composer: track.artists.map((a: any) => a.name).join(', '),
      originalKey,
      tempoBpm,
      spotifyId: track.id,
      spotifyUrl: track.external_urls?.spotify
    };
  });
}
