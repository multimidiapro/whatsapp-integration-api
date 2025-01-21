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

// Rota básica para verificar se o servidor está online
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

let isReady = false;

client.on('qr', (qr) => {
  console.log('QR Code gerado:', qr);
  qrcode.generate(qr, {small: true});
  io.emit('qr', qr);
});

client.on('ready', () => {
  console.log('Cliente WhatsApp está pronto!');
  isReady = true;
  io.emit('ready');
});

client.on('message', async (message) => {
  console.log('Mensagem recebida:', message);
  io.emit('message', message);
});

client.on('disconnected', (reason) => {
  console.log('Cliente WhatsApp desconectado:', reason);
  isReady = false;
  io.emit('disconnected', reason);
  // Tentar reconectar
  client.initialize();
});

// Rota para verificar status
app.get('/status', (req, res) => {
  res.json({ 
    status: isReady ? 'CONNECTED' : 'DISCONNECTED',
    serverTime: new Date().toISOString()
  });
});

// Rota para forçar reconexão
app.post('/reconnect', (req, res) => {
  console.log('Tentando reconectar...');
  client.initialize().catch(err => {
    console.error('Erro ao reconectar:', err);
  });
  res.json({ status: 'Reconnecting' });
});

const PORT = process.env.PORT || 3000;

// Tratamento de erros global
process.on('uncaughtException', (err) => {
  console.error('Erro não tratado:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Promise rejeitada não tratada:', err);
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Iniciando cliente WhatsApp...');
  client.initialize().catch(err => {
    console.error('Erro ao inicializar cliente WhatsApp:', err);
  });
}); 
