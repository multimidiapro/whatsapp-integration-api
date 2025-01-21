import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { WhatsAppProvider } from './contexts/WhatsAppContext';
import Routes from './routes';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <WhatsAppProvider>
          <Routes />
        </WhatsAppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
