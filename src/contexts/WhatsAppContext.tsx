import React, { createContext, useContext, useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { config } from '../config';

interface WhatsAppContextType {
  isConnected: boolean;
  qrCode: string | null;
  connectionStatus: string;
  error: string;
  socket: Socket | null;
}

const WhatsAppContext = createContext<WhatsAppContextType>({
  isConnected: false,
  qrCode: null,
  connectionStatus: 'Iniciando conexão...',
  error: '',
  socket: null
});

export const WhatsAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Iniciando conexão...');
  const [error, setError] = useState('');

  useEffect(() => {
    const newSocket = io(config.SOCKET_URL, {
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling']
    });

    console.log('Iniciando conexão com:', config.SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('Socket conectado com sucesso');
      setConnectionStatus('Conectado ao servidor, aguardando WhatsApp...');
      setError('');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Erro de conexão socket:', err);
      setError(`Erro de conexão: ${err.message}. Tentando reconectar...`);
      setIsConnected(false);
    });

    newSocket.on('qr', (qr) => {
      console.log('Novo QR Code recebido');
      setQrCode(qr);
      setConnectionStatus('Aguardando leitura do QR Code...');
      setError('');
    });

    newSocket.on('ready', () => {
      console.log('WhatsApp conectado com sucesso');
      setQrCode(null);
      setConnectionStatus('WhatsApp conectado!');
      setIsConnected(true);
      setError('');
    });

    newSocket.on('disconnected', () => {
      console.log('WhatsApp desconectado');
      setConnectionStatus('WhatsApp desconectado. Tentando reconectar...');
      setIsConnected(false);
      setQrCode(null);
    });

    setSocket(newSocket);

    // Verificar status inicial
    fetch(`${config.API_URL}/status`)
      .then(response => response.json())
      .then(data => {
        console.log('Status inicial:', data);
        if (data.connected) {
          setConnectionStatus('WhatsApp conectado!');
          setIsConnected(true);
          setQrCode(null);
        }
      })
      .catch(err => {
        console.error('Erro ao verificar status:', err);
        setError('Erro ao verificar status do servidor');
      });

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <WhatsAppContext.Provider value={{ isConnected, qrCode, connectionStatus, error, socket }}>
      {children}
    </WhatsAppContext.Provider>
  );
};

export const useWhatsApp = () => useContext(WhatsAppContext);
