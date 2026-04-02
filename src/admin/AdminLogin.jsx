// ============================================================
// PAGE ADMIN : Connexion
// Page de connexion sécurisée pour l'interface d'administration
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getParametre } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  async function handleConnexion(e) {
    e.preventDefault()
    setChargement(true)
    setErreur('')

    try {
      // Vérifie d'abord si un mot de passe personnalisé a été défini dans la DB
      const mdpOverride = await getParametre('admin_password_override')
      const mdpRef = mdpOverride || import.meta.env.VITE_ADMIN_PASSWORD || 'takeawaydebrazza2024'

      if (motDePasse === mdpRef) {
        sessionStorage.setItem('takeawaydebrazza_admin', 'true')
        navigate('/admin/dashboard')
      } else {
        setErreur('Mot de passe incorrect')
      }
    } catch {
      // Fallback si Supabase indisponible
      const mdpRef = import.meta.env.VITE_ADMIN_PASSWORD || 'takeawaydebrazza2024'
      if (motDePasse === mdpRef) {
        sessionStorage.setItem('takeawaydebrazza_admin', 'true')
        navigate('/admin/dashboard')
      } else {
        setErreur('Mot de passe incorrect')
      }
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="min-h-screen bg-noir flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-jaune rounded-2xl flex items-center justify-center font-black text-noir text-3xl mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-black text-white">
            BIG <span className="text-jaune">MAN</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Espace administration</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleConnexion} className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Mot de passe admin</label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Entrez le mot de passe"
              className={`input-field ${erreur ? 'border-rouge' : ''}`}
              autoFocus
            />
            {erreur && <p className="text-rouge text-xs mt-1">❌ {erreur}</p>}
          </div>

          <button
            type="submit"
            disabled={chargement || !motDePasse}
            className="btn-primary w-full mt-6"
          >
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center mt-6">
          <a href="/" className="text-gray-500 text-sm hover:text-white transition-colors">
            ← Retour à l'app
          </a>
        </p>
      </div>
    </div>
  )
}
