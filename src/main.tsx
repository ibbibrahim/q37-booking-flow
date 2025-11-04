import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { SignalRProvider } from './contexts/SignalRContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <SignalRProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </SignalRProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  // </StrictMode>
);
