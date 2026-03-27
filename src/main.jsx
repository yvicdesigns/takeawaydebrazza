// ============================================================
// MAIN.JSX — Point d'entrée absolu de l'application
// C'est le premier fichier exécuté, il monte React dans le HTML
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Import des styles globaux (Tailwind CSS)
import './index.css'
import { activerSonsGlobaux } from './lib/sounds'

// Active les sons sur tous les boutons de l'app
activerSonsGlobaux()

// ReactDOM.createRoot monte l'application React dans le div#root du HTML
// StrictMode active des avertissements supplémentaires en développement
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
