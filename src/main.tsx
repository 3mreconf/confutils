import React from 'react';
import ReactDOM from 'react-dom/client';
import PremiumApp from './PremiumApp';
import { I18nProvider } from './i18n/I18nContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <PremiumApp />
    </I18nProvider>
  </React.StrictMode>
);
