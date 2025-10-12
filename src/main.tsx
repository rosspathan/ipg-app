import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/safe-area.css'

// Console marker for safe-area
console.log('SAFE_AREA_APPLIED - CSS tokens loaded');

createRoot(document.getElementById("root")!).render(<App />);

