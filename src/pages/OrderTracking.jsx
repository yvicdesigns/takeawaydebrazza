// ============================================================
// PAGE : Suivi de commande
// Affiche l'état en temps réel d'une commande
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { supabase, ecouterCommande, soumettreAvis, aDejaNote } from '../lib/supabase'
import OrderStatus from '../components/order/OrderStatus'
import { formaterPrix } from '../lib/whatsapp'

// ---- Composant section notation ----
function SectionAvis({ commande }) {
  const [dejaNote, setDejaNote] = useState(null) // null = chargement
  const [notes, setNotes]       = useState({})   // { nomProduit: 1-5 }
  const [commentaire, setCommentaire] = useState('')
  const [envoye, setEnvoye]     = useState(false)
  const [envoi, setEnvoi]       = useState(false)

  const produits = Array.isArray(commande.produits) ? commande.produits : []

  useEffect(() => {
    aDejaNote(commande.id).then(setDejaNote)
  }, [commande.id])

  async function soumettre() {
    if (envoi) return
    const notesProduits = produits.map(p => ({
      produit_id: String(p.id || p.nom),
      produit_nom: p.nom,
      note: notes[p.nom] || 0,
    })).filter(n => n.note > 0)

    setEnvoi(true)
    await soumettreAvis({
      commande_id: String(commande.id),
      telephone: commande.telephone || '',
      nom_client: commande.nom_client || '',
      notes_produits: notesProduits,
      commentaire,
    })
    setEnvoye(true)
  }

  if (dejaNote === null) return null // encore en chargement

  if (dejaNote || envoye) {
    return (
      <div className="bg-green-900/20 border border-green-800 rounded-2xl p-5 mb-6 text-center">
        <span className="text-3xl">⭐</span>
        <p className="text-green-400 font-bold mt-2">Merci pour votre avis !</p>
        <p className="text-gray-500 text-xs mt-1">Votre retour nous aide à améliorer nos produits</p>
      </div>
    )
  }

  return (
    <div className="bg-noir-clair rounded-2xl p-5 mb-6">
      <h3 className="font-bold text-white mb-4">⭐ Donnez votre avis</h3>

      <div className="space-y-4">
        {produits.map(p => (
          <div key={p.nom}>
            <p className="text-gray-300 text-sm mb-2">{p.nom}</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setNotes(prev => ({ ...prev, [p.nom]: n }))}
                  className={`text-2xl transition-transform active:scale-90 ${
                    (notes[p.nom] || 0) >= n ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="text-gray-400 text-xs mb-1 block">Commentaire (optionnel)</label>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            rows={2}
            placeholder="Dites-nous ce que vous avez pensé..."
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-rouge"
          />
        </div>

        <button
          onClick={soumettre}
          disabled={envoi || Object.keys(notes).length === 0}
          className="w-full bg-rouge hover:bg-red-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {envoi ? 'Envoi...' : 'Envoyer mon avis'}
        </button>
      </div>
    </div>
  )
}

// Traduit les identifiants de statut en texte lisible
const LABELS_STATUT = {
  en_attente: 'En attente',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livre: 'Livré !',
  envoyee_whatsapp: 'Envoyée via WhatsApp',
}

export default function OrderTracking() {
  // Récupère l'ID de commande depuis l'URL (/commandes/:id)
  const { id } = useParams()

  // useLocation permet d'accéder aux données passées lors de la navigation
  const location = useLocation()

  const [commande, setCommande] = useState(
    // Utilise les données passées depuis le checkout si disponibles
    location.state?.commande || null
  )
  const [chargement, setChargement] = useState(!location.state?.commande)
  const [erreur, setErreur] = useState(null)

  // Charge les données de la commande depuis Supabase
  useEffect(() => {
    if (id && !location.state?.commande) {
      chargerCommande()
    }
  }, [id])

  // S'abonne aux mises à jour en temps réel
  useEffect(() => {
    if (!id || id.startsWith('WA-')) return

    // Active l'écoute en temps réel
    const seDesabonner = ecouterCommande(id, (nouvellesData) => {
      setCommande(prev => ({ ...prev, ...nouvellesData }))
    })

    // Se désabonne quand le composant est démontés (évite les fuites mémoire)
    return seDesabonner
  }, [id])

  async function chargerCommande() {
    setChargement(true)
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCommande(data)
    } catch (err) {
      setErreur('Commande introuvable')
    } finally {
      setChargement(false)
    }
  }

  // Affichage pendant le chargement
  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rouge border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement de votre commande...</p>
        </div>
      </div>
    )
  }

  // Erreur ou commande introuvable
  if (erreur || !commande) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <span className="text-6xl mb-4">❌</span>
        <h2 className="text-xl font-bold text-white mb-2">Commande introuvable</h2>
        <p className="text-gray-400 text-sm mb-6">
          {erreur || 'Cette commande n\'existe pas ou a été supprimée'}
        </p>
        <Link to="/" className="btn-primary">Retour à l'accueil</Link>
      </div>
    )
  }

  const estLivre = commande.statut === 'livre'

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 max-w-md mx-auto pt-5">

        {/* ---- Message de confirmation (nouvelle commande) ---- */}
        {location.state?.nouvelleCommande && (
          <div className="bg-green-900/30 border border-green-800 rounded-2xl p-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-bold text-green-400">Commande confirmée !</p>
                <p className="text-green-300/70 text-xs">
                  Un message WhatsApp a été envoyé au restaurant
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---- En-tête ---- */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-9 h-9 bg-noir-clair rounded-xl flex items-center justify-center text-white">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">Suivi de commande</h1>
            <p className="text-gray-500 text-xs">
              #{commande.id?.toString().slice(-8) || id}
            </p>
          </div>
        </div>

        {/* ---- Timeline de statut ---- */}
        <div className="mb-6">
          <OrderStatus
            statut={commande.statut || 'en_attente'}
            commandeId={commande.id}
            modeLivraison={commande.mode_livraison || 'livraison'}
          />
        </div>

        {/* ---- Infos de la commande ---- */}
        <div className="bg-noir-clair rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-white mb-4">Détails de la commande</h3>

          {/* Produits commandés */}
          {commande.produits && (
            <div className="space-y-2 mb-4">
              {(Array.isArray(commande.produits) ? commande.produits : []).map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-400">{item.quantite}× {item.nom}</span>
                  <span className="text-white">{formaterPrix(item.prix * item.quantite)} FCFA</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-700 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Client</span>
              <span className="text-white">{commande.nom_client}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Livraison</span>
              <span className="text-white">
                {commande.mode_livraison === 'retrait' ? 'Retrait sur place' : commande.adresse}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Paiement</span>
              <span className="text-white capitalize">
                {commande.mode_paiement?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-white">Total</span>
              <span className="text-jaune">{formaterPrix(commande.total)} FCFA</span>
            </div>
          </div>
        </div>

        {/* ---- Notation après livraison ---- */}
        {estLivre && <SectionAvis commande={commande} />}

        {/* ---- Actions ---- */}
        <div className="space-y-3">
          {/* Contacter le restaurant */}
          <a
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMERO || '242XXXXXXXXX'}?text=Bonjour, je voudrais des informations sur ma commande #${commande.id?.toString().slice(-8) || id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-jaune w-full no-tap-highlight"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            Contacter le restaurant
          </a>

          {estLivre && (
            <Link to="/menu" className="btn-primary w-full no-tap-highlight">
              🍔 Commander à nouveau
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
