import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DeliveryAgencySelection from './pages/DeliveryAgencySelection';
import ActiveDeliveries from './pages/ActiveDeliveries';
import { startTelegramEngine, stopTelegramEngine } from './utils/telegramService';

export default function DeliveryRouter({ session, theme, toggleTheme }) {
  React.useEffect(() => {
    startTelegramEngine();
    return () => {
      stopTelegramEngine();
    };
  }, []);
  return (
    <Routes>
      <Route index element={<DeliveryAgencySelection session={session} theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="panel" element={<ActiveDeliveries session={session} theme={theme} toggleTheme={toggleTheme} />} />
    </Routes>
  );
}
