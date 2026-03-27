// ============================================================
// CONTEXTE : Thème (light / dark)
// - Automatique : light de 7h à 19h, dark le soir
// - Manuel : bouton toggle qui overrride pour la session
// - Transition douce entre les deux modes
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react'

const HEURE_DEBUT_JOUR = 7   // 07h00
const HEURE_FIN_JOUR   = 19  // 19h00

function detecterThemeAuto() {
  const h = new Date().getHours()
  return h >= HEURE_DEBUT_JOUR && h < HEURE_FIN_JOUR ? 'light' : 'dark'
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // Au chargement : lire la préférence manuelle ou auto-détecter
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bigman_theme') || detecterThemeAuto()
  })
  // Indique si l'utilisateur a overridé manuellement
  const [modeAuto, setModeAuto] = useState(
    !localStorage.getItem('bigman_theme')
  )

  // Appliquer la classe sur <html> à chaque changement de thème
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    html.classList.add(theme)
    if (!modeAuto) {
      localStorage.setItem('bigman_theme', theme)
    }
  }, [theme, modeAuto])

  // Vérifier automatiquement toutes les 30 minutes
  useEffect(() => {
    const id = setInterval(() => {
      if (modeAuto) {
        setTheme(detecterThemeAuto())
      }
    }, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [modeAuto])

  function basculerTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setModeAuto(false)
    localStorage.setItem('bigman_theme', next)
  }

  function reinitialiserAuto() {
    localStorage.removeItem('bigman_theme')
    setModeAuto(true)
    setTheme(detecterThemeAuto())
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      isLight: theme === 'light',
      modeAuto,
      basculerTheme,
      reinitialiserAuto,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
