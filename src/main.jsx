import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext';
import SCMSToaster from './components/SCMSToaster';
import theme from './theme';
import { queryClient } from './lib/queryClient';
import './lib/apiClient';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider value={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <SCMSToaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ChakraProvider>
  </StrictMode>
);
