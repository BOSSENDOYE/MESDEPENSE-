import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { requestPersistentStorage } from './db/snapshot';
import './index.css';
import { setupPwa } from './pwa';

setupPwa();
void requestPersistentStorage();

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
