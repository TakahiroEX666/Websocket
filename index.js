const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const upload = multer({ dest: '/tmp/' });
const PORT = process.env.PORT || 3000;

// -------- Message System (Polling) --------
app.use(bodyParser.json({ limit: '999mb' }));

const messages = {}; // ข้อความคิวของแต่ละอุปกรณ์

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
    const msg = deviceMessages.shift(); // ลบหลังส่ง
    res.send({ message: msg });
  } else {
    res.send({ message: null });
  }
});

// -------- File Upload System --------
const FILE_PATH = '/tmp/singlefile';
let lastUploadedName = null;

// อัปโหลดไฟล์ (แทนส่งข้อความ base64)
app.post('/upload', upload.single('file'), (req, res) => {
  if (fs.existsSync(FILE_PATH)) {
    fs.unlinkSync(FILE_PATH);
  }
  fs.renameSync(req.file.path, FILE_PATH);
  lastUploadedName = req.file.originalname;
  res.json({ status: 'ok', message: 'File uploaded successfully' });
});

// ดาวน์โหลดไฟล์ล่าสุด
app.get('/file', (req, res) => {
  if (fs.existsSync(FILE_PATH)) {
    res.download(FILE_PATH, lastUploadedName || 'download');
  } else {
    res.status(404).send('No file uploaded yet.');
  }
});

// เช็กลิงก์ดาวน์โหลด (Tasker ใช้ตรวจ polling ได้)
app.get('/link', (req, res) => {
  if (fs.existsSync(FILE_PATH)) {
    res.json({ available: true, url: `${req.protocol}://${req.get('host')}/file` });
  } else {
    res.json({ available: false });
  }
});

// -------- Start Server --------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
