const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const allowedOrigins = [
  'http://localhost:3000',
  'https://chat.xmultimidia.com.br'
];

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../../build')));

// Rota catch-all para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build', 'index.html'));
});

let clientReady = false;

// Inicializa o cliente do WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  }
});

// Eventos do WhatsApp
client.on('qr', (qr) => {
  console.log('QR Code recebido');
  io.emit('qr', qr);
});

client.on('ready', () => {
  console.log('Cliente WhatsApp está pronto!');
  clientReady = true;
  io.emit('ready');
  updateChats();
});

client.on('message', async (message) => {
  console.log('Mensagem recebida:', message.body);
  
  try {
    const chat = await message.getChat();
    const contact = await message.getContact();
    
    const formattedMessage = {
      id: message.id._serialized,
      body: message.body,
      timestamp: message.timestamp,
      from: message.from,
      fromMe: message.fromMe,
      chatId: chat.id._serialized,
      senderName: contact.pushname || contact.number
    };

    io.emit('message', formattedMessage);
    updateChats();
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
});

client.on('disconnected', (reason) => {
  console.log('Cliente WhatsApp desconectado:', reason);
  clientReady = false;
  io.emit('disconnected', reason);
  client.initialize();
});

// Função para atualizar a lista de chats
async function updateChats() {
  if (!clientReady) return;

  try {
    const chats = await client.getChats();
    const formattedChats = await Promise.all(chats.map(async (chat) => {
      try {
        const contact = await chat.getContact();
        const lastMsg = chat.lastMessage;
        
        return {
          id: chat.id._serialized,
          name: chat.name || contact.pushname || contact.number || 'Desconhecido',
          lastMessage: lastMsg ? {
            body: lastMsg.body,
            timestamp: lastMsg.timestamp,
          } : null,
          unreadCount: chat.unreadCount || 0,
          isGroup: chat.isGroup,
          number: contact.number || chat.id._serialized.replace('@c.us', '')
        };
      } catch (error) {
        console.error('Erro ao formatar chat:', error);
        return null;
      }
    }));

    const validChats = formattedChats.filter(chat => chat !== null);
    io.emit('chats', validChats);
  } catch (error) {
    console.error('Erro ao atualizar chats:', error);
  }
}

// Rotas da API
app.get('/status', (req, res) => {
  res.json({ status: clientReady ? 'CONNECTED' : 'DISCONNECTED' });
});

// Rota para obter mensagens de um chat específico
app.get('/messages/:chatId', async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    const formattedMessages = await Promise.all(messages.map(async (msg) => {
      const contact = await msg.getContact();
      return {
        id: msg.id._serialized,
        body: msg.body,
        timestamp: msg.timestamp,
        from: msg.from,
        fromMe: msg.fromMe,
        senderName: contact.pushname || contact.number
      };
    }));
    
    res.json(formattedMessages.reverse());
  } catch (error) {
    console.error('Erro ao obter mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para enviar mensagem
app.post('/send-message', async (req, res) => {
  if (!clientReady) {
    return res.status(503).json({ error: 'Cliente WhatsApp não está pronto' });
  }

  try {
    const { number, message } = req.body;
    const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
    
    const msg = await client.sendMessage(formattedNumber, message);
    const chat = await msg.getChat();
    
    const response = {
      id: msg.id._serialized,
      body: message,
      timestamp: Math.floor(Date.now() / 1000),
      from: msg.from,
      fromMe: true,
      chatId: chat.id._serialized
    };

    io.emit('message', response);
    setTimeout(updateChats, 1000);
    
    res.json({ success: true, message: 'Mensagem enviada', response });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eventos do Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado ao Socket.IO');

  socket.on('request_chats', () => {
    if (clientReady) {
      updateChats();
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado do Socket.IO');
  });
});

// Inicia o cliente do WhatsApp
client.initialize().catch(err => {
  console.error('Erro ao inicializar cliente WhatsApp:', err);
});

// Inicia o servidor
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em ${HOST}:${PORT}`);
}); 