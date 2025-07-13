import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { validateApiConfiguration } from './utils/constants.js'
import './index.css'

// Validate API configuration on startup
validateApiConfiguration()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

