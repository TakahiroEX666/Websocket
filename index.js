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
let clients = [];

wss.on("connection", function (ws) {
  console.log("🔌 New WebSocket connection");
  clients.push(ws);

  ws.on("close", () => {
    clients = clients.filter((client) => client !== ws);
  });
});

// Broadcast HTTP -> WebSocket
app.post("/send", (req, res) => {
  const message = req.body.message;
  if (!message) return res.status(400).send("Missing 'message'");
  console.log("📡 Broadcasting:", message);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  res.send("✅ Message broadcasted");
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
