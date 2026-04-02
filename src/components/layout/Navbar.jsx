// ============================================================
// COMPOSANT : Navbar
// Barre de navigation en haut de l'application
// ============================================================

import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useTheme } from '../../context/ThemeContext'

export default function Navbar() {
  const location = useLocation()
  const { nombreArticles } = useCart()
  const { isLight, basculerTheme } = useTheme()
  const estAdmin = sessionStorage.getItem('takeawaydebrazza_admin') === 'true'

  // On n'affiche pas la navbar sur les pages admin
  if (location.pathname.startsWith('/admin')) return null

  return (
    <header className="sticky top-0 z-40 bg-noir/95 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo Takeaway De Brazza */}
        <Link to="/" className="flex items-center gap-2 no-tap-highlight">
          <div className="w-9 h-9 bg-jaune rounded-xl flex items-center justify-center font-black text-noir text-lg">
            T
          </div>
          <span className="font-black text-xl tracking-tight">
            TAKEAWAY <span className="text-jaune">DE BRAZZA</span>
          </span>
        </Link>

        {/* Actions à droite */}
        <div className="flex items-center gap-3">

          {/* Retour admin — visible uniquement si session admin active */}
          {estAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-rouge/20 hover:bg-rouge/30 text-rouge text-xs font-bold transition-colors no-tap-highlight"
              title="Retour au tableau de bord"
            >
              ⚙️ Admin
            </Link>
          )}
          {/* Bouton thème ☀️ / 🌙 */}
          <button
            onClick={basculerTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-noir-clair hover:bg-gray-700 transition-colors no-tap-highlight text-lg"
            aria-label={isLight ? 'Passer en mode sombre' : 'Passer en mode clair'}
            title={isLight ? 'Mode sombre' : 'Mode clair'}
          >
            {isLight ? '🌙' : '☀️'}
          </button>

          {/* Bouton panier avec badge */}
          <Link
            to="/panier"
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-noir-clair hover:bg-gray-700 transition-colors no-tap-highlight"
            aria-label={`Panier — ${nombreArticles} article${nombreArticles > 1 ? 's' : ''}`}
          >
            {/* Icône panier */}
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 7H4l1-7z" />
            </svg>

            {/* Badge rouge avec le nombre d'articles */}
            {nombreArticles > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rouge rounded-full text-white text-xs font-bold flex items-center justify-center animate-fade-in">
                {nombreArticles > 9 ? '9+' : nombreArticles}
              </span>
            )}
          </Link>

          {/* Bouton profil */}
          <Link
            to="/profil"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-noir-clair hover:bg-gray-700 transition-colors no-tap-highlight"
            aria-label="Mon profil"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
