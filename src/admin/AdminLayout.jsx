// ============================================================
// LAYOUT ADMIN : Structure commune des pages admin
// Barre de navigation latérale + protection des routes
// ============================================================

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'

const LIENS_PRINCIPAUX = [
  { vers: '/admin/dashboard',  label: 'Tableau de bord', emoji: '📊' },
  { vers: '/admin/commandes',  label: 'Commandes',       emoji: '📋' },
  { vers: '/admin/menu',       label: 'Gérer le menu',   emoji: '🍔' },
  { vers: '/admin/promotions', label: 'Promotions',      emoji: '🎯' },
  { vers: '/admin/messages',   label: 'Messagerie',      emoji: '💬' },
  { vers: '/admin/soldes',     label: 'Soldes clients',  emoji: '💰' },
  { vers: '/admin/fidelite',   label: 'Fidélité',        emoji: '🎁' },
  { vers: '/admin/avis',       label: 'Avis clients',    emoji: '⭐' },
  { vers: '/admin/livreurs',   label: 'Livreurs',        emoji: '🛵' },
]

const LIENS_PARAMETRES = [
  { vers: '/admin/parametres', label: 'Paramètres',  emoji: '⚙️' },
  { vers: '/admin/rapports',   label: 'Rapports',    emoji: '📈' },
  { vers: '/admin/audio',      label: 'Audio',       emoji: '🔊' },
  { vers: '/admin/guide',      label: 'Guide & Aide', emoji: '📖' },
]

export default function AdminLayout() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const [menuOuvert, setMenuOuvert]   = useState(false)

  // Ouvrir le groupe Paramètres si on est sur une de ses pages
  const dansParametres = LIENS_PARAMETRES.some(l => location.pathname === l.vers)
  const [parametresOuvert, setParametresOuvert] = useState(dansParametres)

  useEffect(() => {
    if (dansParametres) setParametresOuvert(true)
  }, [location.pathname])

  useEffect(() => {
    const estAdmin = sessionStorage.getItem('bigman_admin')
    if (!estAdmin) navigate('/admin')
  }, [])

  function seDeconnecter() {
    sessionStorage.removeItem('bigman_admin')
    navigate('/admin')
  }

  function LienNav({ lien, sous = false }) {
    const estActif = location.pathname === lien.vers
    return (
      <Link
        to={lien.vers}
        onClick={() => setMenuOuvert(false)}
        className={`
          flex items-center gap-3 rounded-xl text-sm font-medium transition-all
          ${sous ? 'px-4 py-2 ml-3' : 'px-4 py-3'}
          ${estActif
            ? 'bg-rouge text-white'
            : 'text-gray-400 hover:text-white hover:bg-noir-clair'
          }
        `}
      >
        <span className={sous ? 'text-sm' : ''}>{lien.emoji}</span>
        {lien.label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-[#111] flex">

      {/* ---- Sidebar ---- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-noir border-r border-gray-800 flex flex-col
        transform transition-transform duration-300 lg:relative lg:translate-x-0
        ${menuOuvert ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-jaune rounded-xl flex items-center justify-center font-black text-noir">B</div>
            <div>
              <p className="font-black text-white text-sm">BIG MAN</p>
              <p className="text-gray-500 text-xs">Administration</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">

          {/* Liens principaux */}
          {LIENS_PRINCIPAUX.map(lien => (
            <LienNav key={lien.vers} lien={lien} />
          ))}

          {/* Groupe Paramètres */}
          <div className="pt-1">
            <button
              onClick={() => setParametresOuvert(v => !v)}
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${dansParametres ? 'text-white bg-noir-clair' : 'text-gray-400 hover:text-white hover:bg-noir-clair'}
              `}
            >
              <div className="flex items-center gap-3">
                <span>⚙️</span>
                Paramètres
              </div>
              <span className={`text-xs transition-transform ${parametresOuvert ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {parametresOuvert && (
              <div className="mt-1 space-y-0.5">
                {LIENS_PARAMETRES.map(lien => (
                  <LienNav key={lien.vers} lien={lien} sous={true} />
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Bas de sidebar */}
        <div className="flex-shrink-0 p-4 border-t border-gray-800">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3 transition-colors">
            👁️ Voir l'app client
          </Link>
          <button onClick={seDeconnecter} className="flex items-center gap-2 text-gray-400 hover:text-rouge text-sm transition-colors">
            🚪 Se déconnecter
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {menuOuvert && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMenuOuvert(false)} />
      )}

      {/* ---- Contenu principal ---- */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-noir">
          <button onClick={() => setMenuOuvert(true)} className="w-9 h-9 bg-noir-clair rounded-lg flex items-center justify-center">
            ☰
          </button>
          <span className="font-bold text-white text-sm">Admin</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
