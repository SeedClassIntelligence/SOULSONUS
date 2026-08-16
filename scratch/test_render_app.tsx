import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App';

try {
  const html = renderToString(<App />);
  console.log('RENDER SUCCESS! HTML length:', html.length);
} catch (err: any) {
  console.error('RENDER ERROR DETECTED:', err.stack || err.message || err);
}
