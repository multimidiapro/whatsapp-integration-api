const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const client = new Client();
let isReady = false;

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  qrcode.generate(qr, {small: true});
  io.emit('qr', qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
  isReady = true;
  io.emit('ready');
});

client.on('message', async (message) => {
  console.log('Message received:', message);
  io.emit('message', message);
});

app.get('/status', (req, res) => {
  res.json({ status: isReady ? 'CONNECTED' : 'DISCONNECTED' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  client.initialize();
});
