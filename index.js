const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", function (ws) {
  console.log("New WebSocket connection");
  clients.push(ws);

  ws.on("close", () => {
    clients = clients.filter((client) => client !== ws);
  });
});

// HTTP POST เพื่อส่งข้อความไปยังทุก WebSocket client
app.post("/send", (req, res) => {
  const message = req.body.message;
  if (!message) return res.status(400).send("Missing 'message'");

  console.log("Broadcasting:", message);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  res.send("Message broadcasted");
});

app.get("/", (req, res) => res.send("Server Running"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
