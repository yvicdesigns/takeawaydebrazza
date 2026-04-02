// ============================================================
// LAYOUT ADMIN : Structure commune des pages admin
// Barre de navigation latérale + protection des routes
// ============================================================

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'

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
  const { theme, basculerTheme } = useTheme()
  const [menuOuvert, setMenuOuvert]     = useState(false)
  const [commandesEnAttente, setCommandesEnAttente] = useState(0)

  useEffect(() => {
    // Charge le compte initial
    supabase
      .from('commandes')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente')
      .then(({ count }) => setCommandesEnAttente(count || 0))

    // Mise à jour en temps réel
    const sub = supabase
      .channel('badge-commandes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, () => {
        supabase
          .from('commandes')
          .select('id', { count: 'exact', head: true })
          .eq('statut', 'en_attente')
          .then(({ count }) => setCommandesEnAttente(count || 0))
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  // Ouvrir le groupe Paramètres si on est sur une de ses pages
  const dansParametres = LIENS_PARAMETRES.some(l => location.pathname === l.vers)
  const [parametresOuvert, setParametresOuvert] = useState(dansParametres)

  useEffect(() => {
    if (dansParametres) setParametresOuvert(true)
  }, [location.pathname])

  useEffect(() => {
    const estAdmin = sessionStorage.getItem('takeawaydebrazza_admin')
    if (!estAdmin) navigate('/admin')
  }, [])

  function seDeconnecter() {
    sessionStorage.removeItem('takeawaydebrazza_admin')
    navigate('/admin')
  }

  function LienNav({ lien, sous = false, badge = 0 }) {
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
        <span className="flex-1">{lien.label}</span>
        {badge > 0 && (
          <span className="bg-rouge text-white text-xs font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
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
              <p className="font-black text-white text-sm">TAKEAWAY DE BRAZZA</p>
              <p className="text-gray-500 text-xs">Administration</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">

          {/* Liens principaux */}
          {LIENS_PRINCIPAUX.map(lien => (
            <LienNav
              key={lien.vers}
              lien={lien}
              badge={lien.vers === '/admin/commandes' ? commandesEnAttente : 0}
            />
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
        <div className="flex-shrink-0 p-4 border-t border-gray-800 space-y-2">
          {/* Toggle thème */}
          <button
            onClick={basculerTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-noir-clair hover:bg-gray-800 transition-colors"
          >
            <span className="text-gray-400 text-sm flex items-center gap-2">
              {theme === 'dark' ? '🌙' : '☀️'}
              {theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
            </span>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${theme === 'light' ? 'bg-jaune' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${theme === 'light' ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>

          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm px-3 py-2 transition-colors">
            👁️ Voir l'app client
          </Link>
          <button onClick={seDeconnecter} className="flex items-center gap-2 text-gray-400 hover:text-rouge text-sm px-3 py-2 transition-colors">
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
