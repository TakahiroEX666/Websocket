const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '999mb' }));

// ข้อมูลข้อความของแต่ละอุปกรณ์
const messages = {};

// ส่งข้อความ
app.post('/send', (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).send('Missing "to" or "message"');

  if (!messages[to]) messages[to] = [];
  messages[to].push(message);

  res.send({ status: 'Message queued' });
});

// รับข้อความ (polling)
app.get('/poll/:device', (req, res) => {
  const device = req.params.device;
  const deviceMessages = messages[device] || [];

  if (deviceMessages.length > 0) {
    // ส่งข้อความแรก และลบออก
    const msg = deviceMessages.shift();
    res.send({ message: msg });
  } else {
    res.send({ message: null });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
