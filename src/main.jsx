import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import GymWebsite from './GymWebsite';
import './styles.css';

const gymRoute = window.location.pathname.match(/^\/gyms\/([^/]+)\/?$/);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>{gymRoute ? <GymWebsite gymId={decodeURIComponent(gymRoute[1])}/> : <App />}</React.StrictMode>
);
