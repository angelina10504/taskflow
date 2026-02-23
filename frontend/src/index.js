import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { system } from './theme';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ChakraProvider value={system}>
        <ThemeProvider attribute="class" defaultTheme="light" storageKey="taskflow-theme" enableSystem={false}>
          <Router>
            <App />
          </Router>
        </ThemeProvider>
      </ChakraProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
