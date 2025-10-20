/// <reference types="vite/client" />

interface Window {
  Buffer: typeof import('buffer').Buffer;
}

declare global {
  var Buffer: typeof import('buffer').Buffer;
}

export {};
