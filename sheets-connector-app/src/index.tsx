import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

console.log('🚀 DataPingo Sheets Connector - Frontend Loading...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

console.log('📱 React root created, mounting App component...');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('✅ React App mounted successfully!');
