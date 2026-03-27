// ============================================================
// COMPOSANT : BottomNav
// Barre de navigation en bas — typique des apps mobiles
// Accessible avec le pouce, toujours visible
// ============================================================

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function BottomNav() {
  const location = useLocation()
  const { nombreArticles } = useCart()

  // Masque la navigation sur les pages admin
  if (location.pathname.startsWith('/admin')) return null

  const LIENS_NAV = [
    {
      vers: '/',
      label: 'Accueil',
      icone: (actif) => (
        <svg className={`w-6 h-6 ${actif ? 'text-jaune' : 'text-gray-500'}`} fill={actif ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      vers: '/menu',
      label: 'Menu',
      icone: (actif) => (
        <svg className={`w-6 h-6 ${actif ? 'text-jaune' : 'text-gray-500'}`} fill={actif ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      vers: '/panier',
      label: 'Panier',
      estPanier: true,
      icone: (actif) => (
        <svg className={`w-6 h-6 ${actif ? 'text-jaune' : 'text-gray-500'}`} fill={actif ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 7H4l1-7z" />
        </svg>
      ),
    },
    {
      vers: '/commandes',
      label: 'Commandes',
      icone: (actif) => (
        <svg className={`w-6 h-6 ${actif ? 'text-jaune' : 'text-gray-500'}`} fill={actif ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      vers: '/profil',
      label: 'Profil',
      icone: (actif) => (
        <svg className={`w-6 h-6 ${actif ? 'text-jaune' : 'text-gray-500'}`} fill={actif ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-noir border-t border-gray-800 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {LIENS_NAV.map((lien) => {
          const estActif = location.pathname === lien.vers

          return (
            <Link
              key={lien.vers}
              to={lien.vers}
              className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[60px] no-tap-highlight"
              aria-label={lien.label}
            >
              <div className={`relative transition-transform duration-200 ${estActif ? 'scale-110' : 'scale-100'}`}>
                {lien.icone(estActif)}

                {/* Badge panier */}
                {lien.estPanier && nombreArticles > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rouge rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {nombreArticles > 9 ? '9+' : nombreArticles}
                  </span>
                )}

              </div>

              <span className={`text-[10px] font-medium transition-colors ${estActif ? 'text-jaune' : 'text-gray-500'}`}>
                {lien.label}
              </span>

              {estActif && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-jaune rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
