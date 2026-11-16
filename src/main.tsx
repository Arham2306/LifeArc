import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ComingSoonScreen } from './components/layout/ComingSoonScreen';

const root = createRoot(document.getElementById('root')!);

if (import.meta.env.VITE_COMING_SOON === 'true') {
  root.render(
    <StrictMode>
      <ComingSoonScreen />
    </StrictMode>
  );
} else {
  void import('./App.tsx').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
