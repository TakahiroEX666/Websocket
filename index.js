const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

let youtube = null;

app.get('/', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube'],
  });
  res.send(`<a href="${authUrl}">Authorize with Google</a>`);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  res.send('✅ Authorized! Now you can use /list, /add, /delete');
});

app.get('/list', async (req, res) => {
  const playlistId = req.query.playlistId;
  try {
    const response = await youtube.playlistItems.list({
      playlistId,
      part: 'snippet',
      maxResults: 50,
    });
    res.json(response.data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      videoId: item.snippet.resourceId.videoId,
    })));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/add', async (req, res) => {
  const { playlistId, videoId } = req.body;
  try {
    const response = await youtube.playlistItems.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
    });
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/delete', async (req, res) => {
  const { itemId } = req.body;
  try {
    await youtube.playlistItems.delete({ id: itemId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});

