import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/hanken-grotesk'
import App from './App.jsx'
import './index.css'
import { applyTheme, getInitialTheme } from './lib/theme'

applyTheme(getInitialTheme(window.matchMedia('(prefers-color-scheme: dark)').matches))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
