const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
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

let client;
let clientReady = false;

// Rota de status
app.get('/status', (req, res) => {
  console.log('Status requisitado. Cliente pronto:', clientReady);
  res.json({ 
    status: 'online',
    connected: clientReady,
    timestamp: new Date().toISOString()
  });
});

// Rota de reconexão
app.post('/reconnect', async (req, res) => {
  console.log('Reconexão solicitada');
  try {
    if (client) {
      await client.destroy();
    }
    initializeWhatsApp();
    res.json({ status: 'reconnecting' });
  } catch (error) {
    console.error('Erro na reconexão:', error);
    res.status(500).json({ error: error.message });
  }
});

function initializeWhatsApp() {
  console.log('Iniciando cliente WhatsApp...');
  
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('QR Code gerado');
    io.emit('qr', qr);
  });

  client.on('ready', () => {
    console.log('Cliente WhatsApp pronto!');
    clientReady = true;
    io.emit('ready');
  });

  client.on('authenticated', () => {
    console.log('Cliente autenticado');
    io.emit('authenticated');
  });

  client.on('auth_failure', (error) => {
    console.error('Falha na autenticação:', error);
    clientReady = false;
    io.emit('auth_failure', error.message);
  });

  client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    clientReady = false;
    io.emit('disconnected', reason);
  });

  client.initialize().catch(error => {
    console.error('Erro ao inicializar cliente:', error);
    io.emit('error', error.message);
  });
}

io.on('connection', (socket) => {
  console.log('Nova conexão socket estabelecida');
  
  if (!client) {
    console.log('Iniciando WhatsApp pela primeira vez...');
    initializeWhatsApp();
  } else if (!clientReady) {
    console.log('Cliente não está pronto, reiniciando...');
    initializeWhatsApp();
  } else {
    console.log('Cliente já está pronto');
    socket.emit('ready');
  }

  socket.on('disconnect', () => {
    console.log('Cliente socket desconectado');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
