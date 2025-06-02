const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());

// ======================= WebSocket =======================
let clients = []; // เก็บ { id, ws }

wss.on("connection", function (ws) {
  console.log("🔌 New WebSocket connection");

  // รอรับข้อความแรกเพื่อ register clientId
  ws.once("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "register" && data.clientId) {
        clients.push({ id: data.clientId, ws: ws });
        console.log(`📡 Registered client: ${data.clientId}`);

        // รับข้อความอื่น ๆ จาก client นี้
        ws.on("message", (msg) => {
          console.log(`Message from ${data.clientId}: ${msg}`);
          // คุณอาจจะประมวลผลข้อความนี้ หรือส่งต่อก็ได้
        });

        ws.on("close", () => {
          clients = clients.filter((client) => client.ws !== ws);
          console.log(`❌ Client disconnected: ${data.clientId}`);
        });
      } else {
        ws.close(1008, "Missing or invalid registration");
      }
    } catch (e) {
      ws.close(1008, "Invalid registration format");
    }
  });
});


// Broadcast or targeted send HTTP -> WebSocket
app.post("/send", (req, res) => {
  const message = req.body.message;
  const target = req.body.target; // clientId ที่จะส่งข้อความถึง (optional)
  if (!message) return res.status(400).send("Missing 'message'");

  if (target) {
    // ส่งแค่ client ที่ตรงกับ target
    const client = clients.find((c) => c.id === target);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      console.log(`📡 Sent to ${target}:`, message);
      return res.send(`✅ Message sent to ${target}`);
    } else {
      return res.status(404).send(`❌ Client ${target} not connected`);
    }
  } else {
    // ส่ง broadcast
    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
    console.log("📡 Broadcasting:", message);
    return res.send("✅ Message broadcasted");
  }
});






// ======================= File Upload/Download =======================
const upload = multer({ dest: "/tmp/" });
const FILE_PATH = "/tmp/singlefile";
let lastUploadedName = null;

// Upload endpoint (from Auto.js/Tasker)
app.post("/upload", upload.single("file"), (req, res) => {
  if (fs.existsSync(FILE_PATH)) fs.unlinkSync(FILE_PATH);
  fs.renameSync(req.file.path, FILE_PATH);
  lastUploadedName = req.file.originalname;
  res.json({ status: "ok", message: "✅ File uploaded" });
});

// Static download endpoint
app.get("/file", (req, res) => {
  if (fs.existsSync(FILE_PATH)) {
    res.download(FILE_PATH, lastUploadedName || "download");
  } else {
    res.status(404).send("❌ No file uploaded");
  }
});

// /link for pinging (e.g. to prevent Render sleeping)
app.get("/link", (req, res) => {
  if (fs.existsSync(FILE_PATH)) {
    res.json({ available: true, url: `${req.protocol}://${req.get("host")}/file` });
  } else {
    res.json({ available: false });
  }
});

// ======================= Home =======================
app.get("/", (req, res) => {
  res.send("✅ Server Running");
});

// ======================= Start =======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});

