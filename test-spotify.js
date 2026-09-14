const fs = require('fs');

async function run() {
  const token = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials'
  }).then(r => r.json());

  console.log('Token:', token.access_token ? 'Got token' : 'No token');

  const search = await fetch(`https://api.spotify.com/v1/search?q=Gr&type=track&limit=5`, {
    headers: { 'Authorization': `Bearer ${token.access_token}` }
  }).then(r => r.json());

  const trackIds = search.tracks.items.map(t => t.id).join(',');
  console.log('Track IDs:', trackIds);

  const features = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
    headers: { 'Authorization': `Bearer ${token.access_token}` }
  });
  
  console.log('Status:', features.status);
  console.log('Body:', await features.text());
}
run();
