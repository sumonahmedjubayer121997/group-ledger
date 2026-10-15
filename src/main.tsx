import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Catches the browser's one-time install offer before the app has rendered.
import './lib/install'

createRoot(document.getElementById("root")!).render(<App />);
