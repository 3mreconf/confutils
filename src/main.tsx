import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NotificationProvider } from './contexts/NotificationContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ModalProvider } from './contexts/ModalContext';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { checkDebuggerOnce } from './hooks/useAntiDebug';


(async function startupSecurityCheck() {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('🔒 Running security checks...');

      const isDebugged = await checkDebuggerOnce();

      if (isDebugged) {
        console.warn('⚠️ Debugger detected, but continuing...');
      } else {
        console.log('✅ Security checks passed');
      }
    }
  } catch (error) {
    console.warn('Security check failed (non-blocking):', error);
  }
})();


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <LanguageProvider>
          <AuthProvider>
            <ModalProvider>
              <App />
            </ModalProvider>
          </AuthProvider>
        </LanguageProvider>
      </NotificationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);