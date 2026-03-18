import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import MfaPage from './MfaPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MfaPage />
  </StrictMode>,
);
