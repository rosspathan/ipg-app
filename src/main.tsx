import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/safe-area.css'
import { Buffer } from 'buffer'

// Make Buffer available globally for crypto libraries (bip39, ethers, etc.)
// This must run BEFORE any components mount
window.Buffer = Buffer;
globalThis.Buffer = Buffer;

console.log('✅ Buffer polyfill initialized');
console.log('SAFE_AREA_APPLIED - CSS tokens loaded');

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

