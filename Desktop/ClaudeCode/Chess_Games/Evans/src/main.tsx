import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/rye/400.css';
import '@fontsource/zilla-slab/400.css';
import '@fontsource/zilla-slab/400-italic.css';
import '@fontsource/zilla-slab/600.css';
import '@fontsource/zilla-slab/700.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
