import React from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import QRCode from 'qrcode.react';
import { useWhatsApp } from '../contexts/WhatsAppContext';

const Dashboard: React.FC = () => {
  const { isConnected, qrCode, connectionStatus, error } = useWhatsApp();
  const stats = {
    messagesSent: 1234,
    activeContacts: 856,
    deliveryRate: '98%',
    responseTime: '5 minutos'
  };

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

        {!isConnected && !qrCode && (
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
