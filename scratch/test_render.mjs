import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from '../src/App.tsx';

try {
  const html = ReactDOMServer.renderToString(React.createElement(App));
  console.log("SUCCESS! Rendered", html.length, "bytes of HTML without crashing.");
} catch (err) {
  console.error("RENDER CRASHED WITH ERROR:");
  console.error(err);
}
