import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css';
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
