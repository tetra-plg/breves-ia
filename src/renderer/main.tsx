import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { APP_NAME } from '@config/constants';

function App() {
  return (
    <main className="placeholder">
      <h1>{APP_NAME}</h1>
      <p>Migration TypeScript + React en cours — Phase 1 (fondation).</p>
      <p className="hint">UI legacy disponible via <code>npm run hud</code>.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
