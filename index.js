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
const onlineStatus = {};

// ส่งข้อความ
app.post('/send', (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).send('Missing "to" or "message"');

  if (!messages[to]) messages[to] = [];
  messages[to].push(message);

  res.send({ status: 'Message queued' });
});

// รับข้อความ (polling)
/*app.get('/poll/:device', (req, res) => {
  const device = req.params.device;
  const deviceMessages = messages[device] || [];

  if (deviceMessages.length > 0) {
    const msg = deviceMessages.shift(); // ลบหลังส่ง
    res.send({ message: msg });
  } else {
    res.send({ message: null });
  }
});
*/





// เก็บข้อความ และสถานะออนไลน์
const messages = {};
const onlineStatus = {};

// Polling พร้อมอัปเดตสถานะออนไลน์
app.get('/poll/:device', (req, res) => {
  const device = req.params.device;

  // อัปเดตสถานะออนไลน์ด้วย timestamp ปัจจุบัน
  onlineStatus[device] = Date.now();

  const deviceMessages = messages[device] || [];

  if (deviceMessages.length > 0) {
    const msg = deviceMessages.shift();
    res.send({ message: msg, online: true });
  } else {
    // ไม่มีข้อความส่งกลับ แต่บอกว่า online
    res.send({ message: null, online: true });
  }
});

// Endpoint ดู Device ที่ online (ใน 10 วินาทีล่าสุด)
app.get('/online', (req, res) => {
  const now = Date.now();
  const threshold = 10000; // 10 วินาที

  const onlineDevices = Object.entries(onlineStatus)
    .filter(([_, timestamp]) => now - timestamp < threshold)
    .map(([device, _]) => device);

  res.send({ online: onlineDevices });
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
