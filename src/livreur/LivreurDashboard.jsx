// ============================================================
// PAGE : Dashboard livreur
// Liste les commandes assignées + bouton "Confirmer la livraison"
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCommandesLivreur, confirmerLivraison, ecouterCommande } from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'

export default function LivreurDashboard() {
  const navigate  = useNavigate()
  const [livreur, setLivreur]   = useState(null)
  const [commandes, setCommandes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [confirmant, setConfirmant] = useState(null)
  const [livrees,    setLivrees]    = useState([]) // IDs marqués livrés dans cette session

  // Récupère la session livreur
  useEffect(() => {
    const session = sessionStorage.getItem('bigman_livreur')
    if (!session) {
      navigate('/livreur')
      return
    }
    const l = JSON.parse(session)
    setLivreur(l)
    charger(l.id)
  }, [])

  async function charger(livreurId) {
    setChargement(true)
    const data = await getCommandesLivreur(livreurId)
    setCommandes(data)
    setChargement(false)
  }

  async function handleConfirmer(commande) {
    setConfirmant(commande.id)
    try {
      await confirmerLivraison(commande.id)
      setLivrees(prev => [...prev, commande.id])
      setCommandes(prev => prev.filter(c => c.id !== commande.id))
    } catch {
      alert('Erreur, réessaie')
    } finally {
      setConfirmant(null)
    }
  }

  function seDeconnecter() {
    sessionStorage.removeItem('bigman_livreur')
    navigate('/livreur')
  }

  if (!livreur) return null

  return (
    <div className="min-h-screen bg-noir pb-10">

      {/* Header */}
      <div className="bg-noir-clair border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-black">🛵 {livreur.nom}</p>
          <p className="text-gray-400 text-xs">{livreur.telephone}</p>
        </div>
        <button
          onClick={seDeconnecter}
          className="text-gray-400 hover:text-rouge text-sm transition-colors"
        >
          🚪 Déconnexion
        </button>
      </div>

      <div className="px-4 max-w-lg mx-auto pt-6">

        {/* Titre */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-white">Mes livraisons</h1>
            <p className="text-gray-400 text-sm">
              {chargement ? '…' : `${commandes.length} en cours`}
            </p>
          </div>
          <button
            onClick={() => livreur && charger(livreur.id)}
            className="text-jaune text-sm font-semibold"
          >
            Actualiser ↻
          </button>
        </div>

        {/* Livraisons terminées dans cette session */}
        {livrees.length > 0 && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-3 mb-4">
            <p className="text-green-400 text-sm font-semibold">
              ✅ {livrees.length} livraison{livrees.length > 1 ? 's' : ''} confirmée{livrees.length > 1 ? 's' : ''} aujourd'hui
            </p>
          </div>
        )}

        {/* Liste commandes */}
        {chargement ? (
          <div className="space-y-4">
            {Array(2).fill(0).map((_, i) => (
              <div key={i} className="bg-noir-clair rounded-2xl h-40 skeleton" />
            ))}
          </div>
        ) : commandes.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🛵</span>
            <p className="text-white font-bold text-lg mb-2">Aucune livraison en cours</p>
            <p className="text-gray-400 text-sm">L'admin t'assignera les prochaines commandes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commandes.map(commande => (
              <div key={commande.id} className="bg-noir-clair rounded-2xl overflow-hidden">

                {/* Header commande */}
                <div className="bg-rouge/10 border-b border-rouge/20 px-4 py-3 flex items-center justify-between">
                  <span className="text-rouge text-xs font-bold">
                    🛵 En livraison — #{commande.id.toString().slice(-6)}
                  </span>
                  <span className="text-jaune font-black text-sm">
                    {formaterPrix(commande.total)} FCFA
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Client */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">{commande.nom_client}</p>
                      <p className="text-gray-400 text-sm">{commande.telephone}</p>
                    </div>
                    {/* Appeler le client */}
                    <a
                      href={`tel:${commande.telephone}`}
                      className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white"
                    >
                      📞
                    </a>
                  </div>

                  {/* Adresse */}
                  <div className="bg-noir rounded-xl p-3 flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">📍</span>
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Adresse de livraison</p>
                      <p className="text-white text-sm font-semibold">{commande.adresse}</p>
                    </div>
                  </div>

                  {/* Produits */}
                  <div className="bg-noir rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-2">Commande :</p>
                    {(Array.isArray(commande.produits) ? commande.produits : []).map((p, i) => (
                      <p key={i} className="text-white text-sm">
                        {p.quantite}× {p.nom}
                      </p>
                    ))}
                  </div>

                  {/* Notes */}
                  {commande.notes && (
                    <div className="bg-jaune/10 border border-jaune/20 rounded-xl p-3">
                      <p className="text-jaune text-xs font-semibold mb-1">📝 Note client :</p>
                      <p className="text-gray-300 text-sm">{commande.notes}</p>
                    </div>
                  )}

                  {/* Mode paiement */}
                  <p className="text-gray-500 text-xs">
                    💳 Paiement :{' '}
                    <span className="text-white font-semibold">
                      {commande.mode_paiement === 'cash' ? 'Cash à récupérer' :
                       commande.mode_paiement === 'mtn_momo' ? 'MTN MoMo (déjà payé)' :
                       commande.mode_paiement === 'airtel_money' ? 'Airtel Money (déjà payé)' :
                       commande.mode_paiement}
                    </span>
                  </p>

                  {/* Bouton confirmation */}
                  <button
                    onClick={() => handleConfirmer(commande)}
                    disabled={confirmant === commande.id}
                    className="btn-primary w-full mt-2"
                  >
                    {confirmant === commande.id ? (
                      <span className="flex items-center gap-2 justify-center">
                        <div className="w-4 h-4 border-2 border-noir border-t-transparent rounded-full animate-spin" />
                        Confirmation…
                      </span>
                    ) : (
                      '✅ Confirmer la livraison'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
