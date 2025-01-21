import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import QRCode from 'qrcode.react';
import { config } from '../config';
import io from 'socket.io-client';

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Iniciando conexão...');
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    messagesSent: 1234,
    activeContacts: 856,
    deliveryRate: '98%',
    responseTime: '5 minutos'
  });

  useEffect(() => {
    const socket = io(config.SOCKET_URL, {
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling']
    });
    
    console.log('Iniciando conexão com:', config.SOCKET_URL);

    socket.on('connect', () => {
      console.log('Socket conectado com sucesso');
      setConnectionStatus('Conectado ao servidor, aguardando WhatsApp...');
      setError('');
    });

    socket.on('connect_error', (err) => {
      console.error('Erro de conexão socket:', err);
      setError(`Erro de conexão: ${err.message}. Tentando reconectar...`);
      setIsLoading(false);
    });

    socket.on('error', (err) => {
      console.error('Erro geral socket:', err);
      setError(`Erro: ${err.message}`);
      setIsLoading(false);
    });

    socket.on('qr', (qr) => {
      console.log('Novo QR Code recebido');
      setQrCode(qr);
      setConnectionStatus('Aguardando leitura do QR Code...');
      setIsLoading(false);
      setError('');
    });

    socket.on('ready', () => {
      console.log('WhatsApp conectado com sucesso');
      setQrCode('');
      setConnectionStatus('WhatsApp conectado!');
      setIsLoading(false);
      setError('');
    });

    socket.on('disconnected', () => {
      console.log('WhatsApp desconectado');
      setConnectionStatus('WhatsApp desconectado. Tentando reconectar...');
      setIsLoading(true);
      setQrCode('');
    });

    // Verificar status inicial
    fetch(`${config.API_URL}/status`)
      .then(response => response.json())
      .then(data => {
        console.log('Status inicial:', data);
        if (data.connected) {
          setConnectionStatus('WhatsApp conectado!');
          setIsLoading(false);
          setQrCode('');
        }
      })
      .catch(err => {
        console.error('Erro ao verificar status:', err);
        setError('Erro ao verificar status do servidor');
      });

    return () => {
      console.log('Desconectando socket...');
      socket.disconnect();
    };
  }, []);

  const StatCard = ({ title, value }: { title: string; value: string | number }) => (
    <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
      <Typography color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4">{value}</Typography>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Painel
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Status da Conexão: {connectionStatus}
        </Typography>
        
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {qrCode && (
          <Box sx={{ mt: 2 }}>
            <QRCode value={qrCode} size={256} />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Escaneie este QR Code com seu WhatsApp
            </Typography>
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Mensagens Enviadas" value={stats.messagesSent} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Contatos Ativos" value={stats.activeContacts} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Mensagens Entregues" value={stats.deliveryRate} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Tempo Médio Resposta" value={stats.responseTime} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
