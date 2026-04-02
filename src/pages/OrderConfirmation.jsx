// ============================================================
// PAGE : Confirmation commande
// Affichée après un passage de commande réussi
// ============================================================

import { useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { formaterPrix } from '../lib/whatsapp'

const LABELS_PAIEMENT = {
  cash: '💵 Cash à la livraison',
  mtn_momo: '📱 MTN MoMo',
  airtel_money: '📲 Airtel Money',
  solde: '💰 Solde Takeaway De Brazza',
}

export default function OrderConfirmation() {
  const { id } = useParams()
  const location = useLocation()
  const commande = location.state?.commande

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* ---- Animation succès ---- */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-once">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Commande confirmée !</h1>
          <p className="text-gray-400 text-sm">
            Merci, nous préparons ta commande 🍔
          </p>
        </div>

        {/* ---- Numéro de commande ---- */}
        <div className="bg-noir border border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-gray-500 text-xs mb-1">Numéro de commande</p>
          <p className="text-jaune font-black text-xl tracking-wider">
            #{id?.toString().slice(-8).toUpperCase()}
          </p>
        </div>

        {/* ---- Récapitulatif ---- */}
        {commande && (
          <div className="bg-noir border border-gray-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-white text-sm">Récapitulatif</h3>

            {/* Produits */}
            <div className="space-y-1.5">
              {(commande.produits || []).map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-400">{item.quantite}× {item.nom}</span>
                  <span className="text-white">{formaterPrix(item.prix * item.quantite)} FCFA</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-1">
              {commande.mode_livraison === 'livraison' && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">🛵 Livraison</span>
                  <span className="text-white">+{formaterPrix(commande.frais_livraison || 500)} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black">
                <span className="text-white">Total payé</span>
                <span className="text-jaune">{formaterPrix(commande.total)} FCFA</span>
              </div>
            </div>

            {/* Infos */}
            <div className="border-t border-gray-800 pt-3 space-y-1 text-xs text-gray-400">
              <p>👤 {commande.nom_client}</p>
              {commande.adresse && <p>📍 {commande.adresse}</p>}
              <p>{LABELS_PAIEMENT[commande.mode_paiement] || commande.mode_paiement}</p>
              {commande.eta && <p>⏱ Livraison estimée : <span className="text-white font-semibold">{commande.eta}</span></p>}
            </div>
          </div>
        )}

        {/* ---- Actions ---- */}
        <div className="space-y-3">
          <Link
            to={`/commandes/${id}`}
            className="btn-primary w-full text-center block"
          >
            Suivre ma commande →
          </Link>
          <Link
            to="/menu"
            className="block text-center text-gray-400 hover:text-white text-sm transition-colors"
          >
            Continuer mes achats
          </Link>
        </div>

      </div>
    </div>
  )
}
