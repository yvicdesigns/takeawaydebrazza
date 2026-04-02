// ============================================================
// PAGE : Connexion livreur
// Authentification par téléphone + code d'accès (PIN)
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { connexionLivreur } from '../lib/supabase'

export default function LivreurLogin() {
  const navigate = useNavigate()
  const [telephone,  setTelephone]  = useState('')
  const [codeAcces,  setCodeAcces]  = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur,     setErreur]     = useState('')

  async function handleConnexion(e) {
    e.preventDefault()
    if (!telephone.trim() || !codeAcces.trim()) {
      setErreur('Remplis tous les champs')
      return
    }

    setChargement(true)
    setErreur('')

    try {
      const livreur = await connexionLivreur(telephone, codeAcces)
      if (!livreur) {
        setErreur('Téléphone ou code incorrect')
        return
      }
      // Stocke la session livreur
      sessionStorage.setItem('takeawaydebrazza_livreur', JSON.stringify(livreur))
      navigate('/livreur/dashboard')
    } catch {
      setErreur('Erreur de connexion, réessaie')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="min-h-screen bg-noir flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-jaune rounded-2xl flex items-center justify-center font-black text-noir text-2xl mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-black text-white">Takeaway De Brazza</h1>
          <p className="text-gray-400 text-sm mt-1">Espace livreur</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleConnexion} className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1">Numéro de téléphone</label>
            <input
              type="tel"
              value={telephone}
              onChange={e => setTelephone(e.target.value)}
              className="input-field"
              placeholder="06 XXXXXXX"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1">Code d'accès</label>
            <input
              type="password"
              value={codeAcces}
              onChange={e => setCodeAcces(e.target.value)}
              className="input-field text-center tracking-widest text-lg"
              placeholder="••••"
              maxLength={8}
              autoComplete="current-password"
            />
          </div>

          {erreur && (
            <p className="text-rouge text-sm text-center">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="btn-primary w-full"
          >
            {chargement ? (
              <span className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-noir border-t-transparent rounded-full animate-spin" />
                Connexion…
              </span>
            ) : (
              '🛵 Se connecter'
            )}
          </button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-6">
          Code oublié ? Contacte l'administrateur
        </p>
      </div>
    </div>
  )
}
