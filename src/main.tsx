import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './styles-surfaces.css';
import './styles-visuals.css';
import './styles-viz.css';
import './styles-library.css';
import './styles-patterns.css';
import './styles-cheatsheet.css';
import './styles-edge.css';
import './styles-quiz.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
