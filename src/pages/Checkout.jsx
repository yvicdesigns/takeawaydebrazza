// ============================================================
// PAGE : Commander (Checkout)
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../hooks/useOrders'
import PaymentMethod from '../components/payment/PaymentMethod'
import Button from '../components/ui/Button'
import { formaterPrix, calculerFraisLivraison } from '../lib/whatsapp'
import { getSolde, debiterSoldeCommande, uploadScreenshotPaiement, getInfosRestaurant, validerCodePromo } from '../lib/supabase'

const CLE_ADRESSES = 'bigman_adresses'

function getAdressesSauvegardees() {
  try { return JSON.parse(localStorage.getItem(CLE_ADRESSES) || '[]') } catch { return [] }
}

function sauvegarderAdresse(adresse) {
  const liste = getAdressesSauvegardees()
  if (!liste.includes(adresse)) {
    localStorage.setItem(CLE_ADRESSES, JSON.stringify([adresse, ...liste].slice(0, 5)))
  }
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, totalPanier, viderPanier } = useCart()
  const { utilisateur } = useAuth()
  const { passerCommande, chargement } = useOrders()

  const [formulaire, setFormulaire] = useState({
    nom: utilisateur?.nom || '',
    telephone: utilisateur?.telephone || '',
    adresse: localStorage.getItem('bigman_adresse_favorite') || '',
    notes: '',
  })

  const [modeLivraison,     setModeLivraison]    = useState('livraison')
  const [modePaiement,      setModePaiement]     = useState('cash')
  const [screenshotFichier, setScreenshotFichier] = useState(null)
  const [uploadEnCours,     setUploadEnCours]    = useState(false)
  const [erreurs,           setErreurs]          = useState({})
  const [erreurCommande,    setErreurCommande]   = useState('')

  // Solde client
  const [solde, setSolde]               = useState(0)
  const [utiliseSolde, setUtiliseSolde] = useState(false)

  // Infos restaurant (frais, ETA, ouvert)
  const [infosResto, setInfosResto] = useState({ ouvert: true, frais: 500, eta: '30-45 min' })

  // Code promo
  const [codePromo,       setCodePromo]       = useState('')
  const [promoAppliquee,  setPromoAppliquee]  = useState(null)
  const [promoErreur,     setPromoErreur]     = useState('')
  const [promoChargement, setPromoChargement] = useState(false)

  // Adresses sauvegardées
  const [adressesSauvegardees] = useState(getAdressesSauvegardees)

  useEffect(() => {
    if (utilisateur?.telephone) getSolde(utilisateur.telephone).then(setSolde)
    getInfosRestaurant().then(setInfosResto).catch(() => {})
  }, [utilisateur?.telephone])

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <span className="text-6xl mb-4">🛒</span>
        <h2 className="text-xl font-bold text-white mb-2">Panier vide</h2>
        <p className="text-gray-400 text-sm mb-6">Ajoutez des produits avant de commander</p>
        <Link to="/menu" className="btn-primary">Voir le menu</Link>
      </div>
    )
  }

  function handleChangement(champ, valeur) {
    setFormulaire(prev => ({ ...prev, [champ]: valeur }))
    if (erreurs[champ]) setErreurs(prev => ({ ...prev, [champ]: null }))
  }

  function validerFormulaire() {
    const nouvellesErreurs = {}
    if (!formulaire.nom.trim()) nouvellesErreurs.nom = 'Le nom est obligatoire'
    if (!formulaire.telephone.trim()) {
      nouvellesErreurs.telephone = 'Le numéro de téléphone est obligatoire'
    } else if (!/^(\+?242)?\d{9}$/.test(formulaire.telephone.replace(/\s/g, ''))) {
      nouvellesErreurs.telephone = 'Numéro de téléphone invalide (ex: +242 06 XXXXXXX)'
    }
    if (modeLivraison === 'livraison' && !formulaire.adresse.trim()) {
      nouvellesErreurs.adresse = "L'adresse de livraison est obligatoire"
    }
    setErreurs(nouvellesErreurs)
    return Object.keys(nouvellesErreurs).length === 0
  }

  async function appliquerCodePromo() {
    if (!codePromo.trim()) return
    setPromoChargement(true)
    setPromoErreur('')
    try {
      const res = await validerCodePromo(codePromo, totalPanier + fraisLivraison)
      if (res.valide) {
        setPromoAppliquee(res.code)
      } else {
        setPromoErreur(res.message)
        setPromoAppliquee(null)
      }
    } catch {
      setPromoErreur('Erreur de validation')
    } finally {
      setPromoChargement(false)
    }
  }

  function calculerReduction() {
    if (!promoAppliquee) return 0
    const base = totalPanier + fraisLivraison
    if (promoAppliquee.type === 'percent') return Math.round(base * promoAppliquee.valeur / 100)
    return Math.min(promoAppliquee.valeur, base)
  }

  async function handleSoumission(e) {
    e.preventDefault()

    if (!infosResto.ouvert) {
      alert('Le restaurant est actuellement fermé. Réessayez plus tard.')
      return
    }

    if (!validerFormulaire()) return

    const estMobileMoney = modePaiement === 'mtn_momo' || modePaiement === 'airtel_money'
    if (estMobileMoney && restantAPayer > 0 && !screenshotFichier) {
      alert('Veuillez joindre le screenshot de votre paiement Mobile Money')
      return
    }

    try {
      let screenshotUrl = null
      if (estMobileMoney && screenshotFichier) {
        setUploadEnCours(true)
        screenshotUrl = await uploadScreenshotPaiement(screenshotFichier)
        setUploadEnCours(false)
      }

      if (soldeUtilise > 0) {
        await debiterSoldeCommande({
          telephone: formulaire.telephone,
          nom_client: formulaire.nom,
          montant: soldeUtilise,
          commande_id: 'pending',
        })
      }

      const modePaiementFinal = restantAPayer === 0 ? 'solde' : modePaiement

      const commande = await passerCommande({
        panier: items,
        infosClient: { ...formulaire, modePaiement: modePaiementFinal },
        modeLivraison,
        modePaiement: modePaiementFinal,
        total,
        frais_livraison: fraisLivraison,
        solde_utilise: soldeUtilise,
        reduction: calculerReduction(),
        code_promo: promoAppliquee?.code || null,
        eta: infosResto.eta,
        screenshotPaiementUrl: screenshotUrl,
        statutPaiement: screenshotUrl ? 'en_attente' : 'non_concerne',
      })

      if (modeLivraison === 'livraison' && formulaire.adresse.trim()) {
        localStorage.setItem('bigman_adresse_favorite', formulaire.adresse.trim())
        sauvegarderAdresse(formulaire.adresse.trim())
      }

      viderPanier()

      navigate(`/commande-confirmee/${commande.id}`, {
        state: { commande: { ...commande, eta: infosResto.eta } }
      })
    } catch (err) {
      setUploadEnCours(false)
      setErreurCommande("Une erreur s'est produite. Vérifiez votre connexion et réessayez.")
      console.error('Erreur lors de la commande:', err)
    }
  }

  const fraisLivraison  = calculerFraisLivraison(modeLivraison, formulaire.adresse, infosResto.frais)
  const reduction       = calculerReduction()
  const total           = totalPanier + fraisLivraison - reduction
  const soldeUtilise    = utiliseSolde ? Math.min(solde, total) : 0
  const restantAPayer   = total - soldeUtilise

  return (
    <div className="min-h-screen pb-10">
      <div className="px-4 max-w-md mx-auto pt-5">

        {/* ---- En-tête ---- */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/panier" className="w-9 h-9 bg-noir-clair rounded-xl flex items-center justify-center text-white">
            ←
          </Link>
          <h1 className="text-2xl font-black text-white">Finaliser la commande</h1>
        </div>

        {/* ---- Banner restaurant fermé ---- */}
        {!infosResto.ouvert && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-300 font-bold text-sm">🔴 Restaurant actuellement fermé</p>
            <p className="text-red-400/70 text-xs mt-1">Vous pouvez préparer votre commande mais elle ne sera pas traitée.</p>
          </div>
        )}

        {/* ---- ETA ---- */}
        {modeLivraison === 'livraison' && infosResto.eta && (
          <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-3 mb-4 flex items-center gap-2">
            <span>⏱</span>
            <p className="text-green-300 text-sm">Livraison estimée : <span className="font-bold">{infosResto.eta}</span></p>
          </div>
        )}

        <form onSubmit={handleSoumission} className="space-y-6">

          {/* ---- Mode de livraison ---- */}
          <div>
            <h3 className="font-bold text-white mb-3">Mode de livraison</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'livraison', label: 'Livraison à domicile', emoji: '🛵', prix: `+${formaterPrix(infosResto.frais)} FCFA` },
                { id: 'retrait',   label: 'Retrait sur place',    emoji: '🏪', prix: 'Gratuit' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setModeLivraison(mode.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    modeLivraison === mode.id
                      ? 'border-rouge bg-rouge/10'
                      : 'border-gray-700 bg-noir-clair hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl block mb-2">{mode.emoji}</span>
                  <p className={`text-xs font-semibold leading-tight ${modeLivraison === mode.id ? 'text-white' : 'text-gray-300'}`}>
                    {mode.label}
                  </p>
                  <p className={`text-xs mt-1 ${modeLivraison === mode.id ? 'text-jaune' : 'text-gray-500'}`}>
                    {mode.prix}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ---- Informations client ---- */}
          <div>
            <h3 className="font-bold text-white mb-3">Vos informations</h3>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Nom complet *</label>
                <input
                  type="text"
                  value={formulaire.nom}
                  onChange={(e) => handleChangement('nom', e.target.value)}
                  placeholder="Ex: Jean-Pierre Moukala"
                  className={`input-field ${erreurs.nom ? 'border-rouge' : ''}`}
                  autoComplete="name"
                />
                {erreurs.nom && <p className="text-rouge text-xs mt-1">{erreurs.nom}</p>}
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Numéro de téléphone *</label>
                <input
                  type="tel"
                  value={formulaire.telephone}
                  onChange={(e) => handleChangement('telephone', e.target.value)}
                  placeholder="Ex: 06 XXXXXXX"
                  className={`input-field ${erreurs.telephone ? 'border-rouge' : ''}`}
                  autoComplete="tel"
                />
                {erreurs.telephone && <p className="text-rouge text-xs mt-1">{erreurs.telephone}</p>}
              </div>

              {modeLivraison === 'livraison' && (
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Adresse de livraison *</label>

                  {/* Adresses sauvegardées */}
                  {adressesSauvegardees.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {adressesSauvegardees.map((adr, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleChangement('adresse', adr)}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors truncate max-w-[180px] ${
                            formulaire.adresse === adr
                              ? 'border-rouge bg-rouge/10 text-white'
                              : 'border-gray-700 text-gray-400 hover:border-gray-500'
                          }`}
                        >
                          📍 {adr.length > 25 ? adr.slice(0, 25) + '…' : adr}
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={formulaire.adresse}
                    onChange={(e) => handleChangement('adresse', e.target.value)}
                    placeholder="Ex: Quartier Bacongo, rue Moukanda, 3ème maison à gauche"
                    className={`input-field resize-none h-20 ${erreurs.adresse ? 'border-rouge' : ''}`}
                  />
                  {erreurs.adresse && <p className="text-rouge text-xs mt-1">{erreurs.adresse}</p>}
                </div>
              )}

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Instructions spéciales (optionnel)</label>
                <input
                  type="text"
                  value={formulaire.notes}
                  onChange={(e) => handleChangement('notes', e.target.value)}
                  placeholder="Ex: Sans oignons, sonnez au portail..."
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* ---- Code promo ---- */}
          <div>
            <h3 className="font-bold text-white mb-3">Code promo</h3>
            {promoAppliquee ? (
              <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-green-300 font-bold text-sm">🎉 {promoAppliquee.code} appliqué</p>
                  <p className="text-green-400/70 text-xs">
                    −{promoAppliquee.type === 'percent' ? `${promoAppliquee.valeur}%` : `${formaterPrix(promoAppliquee.valeur)} FCFA`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPromoAppliquee(null); setCodePromo('') }}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codePromo}
                  onChange={(e) => { setCodePromo(e.target.value.toUpperCase()); setPromoErreur('') }}
                  placeholder="BIGMAN10"
                  className="input-field flex-1 uppercase"
                />
                <button
                  type="button"
                  onClick={appliquerCodePromo}
                  disabled={promoChargement || !codePromo.trim()}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {promoChargement ? '…' : 'OK'}
                </button>
              </div>
            )}
            {promoErreur && <p className="text-rouge text-xs mt-1">{promoErreur}</p>}
          </div>

          {/* ---- Solde disponible ---- */}
          {utilisateur && solde > 0 && (
            <div>
              <h3 className="font-bold text-white mb-3">Mon solde</h3>
              <button
                type="button"
                onClick={() => setUtiliseSolde(v => !v)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  utiliseSolde ? 'border-rouge bg-rouge/10' : 'border-gray-700 bg-noir-clair hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">💰</span>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${utiliseSolde ? 'text-white' : 'text-gray-300'}`}>Utiliser mon solde</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formaterPrix(solde)} FCFA disponibles
                    {utiliseSolde && soldeUtilise > 0 && ` → −${formaterPrix(soldeUtilise)} FCFA déduits`}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${utiliseSolde ? 'border-rouge' : 'border-gray-600'}`}>
                  {utiliseSolde && <div className="w-2.5 h-2.5 rounded-full bg-rouge" />}
                </div>
              </button>
            </div>
          )}

          {/* ---- Mode de paiement ---- */}
          {restantAPayer > 0 && (
            <PaymentMethod
              modeSelectionne={modePaiement}
              onChange={(mode) => { setModePaiement(mode); setScreenshotFichier(null) }}
              modeLivraison={modeLivraison}
              montantTotal={restantAPayer}
              screenshotFichier={screenshotFichier}
              onScreenshotChange={setScreenshotFichier}
            />
          )}

          {/* ---- Récapitulatif ---- */}
          <div className="bg-noir-clair rounded-2xl p-4">
            <h3 className="font-bold text-white mb-3">Votre commande</h3>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-400">{item.quantite}× {item.nom}</span>
                  <span className="text-white font-medium">{formaterPrix(item.prix * item.quantite)} FCFA</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Livraison</span>
                <span className="text-white">{fraisLivraison === 0 ? 'Gratuit' : `+${formaterPrix(fraisLivraison)} FCFA`}</span>
              </div>
              {reduction > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">🎉 Réduction ({promoAppliquee?.code})</span>
                  <span className="text-green-400 font-semibold">−{formaterPrix(reduction)} FCFA</span>
                </div>
              )}
              {soldeUtilise > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Solde utilisé</span>
                  <span className="text-green-400 font-semibold">−{formaterPrix(soldeUtilise)} FCFA</span>
                </div>
              )}
              <div className="flex justify-between font-black">
                <span className="text-white">À payer</span>
                <span className="text-jaune text-lg">{formaterPrix(restantAPayer)} FCFA</span>
              </div>
            </div>
          </div>

          {/* ---- Erreur commande ---- */}
          {erreurCommande && (
            <div className="bg-red-900/30 border border-red-800 rounded-2xl p-4 text-center">
              <p className="text-red-400 text-sm">❌ {erreurCommande}</p>
            </div>
          )}

          {/* ---- Bouton commande ---- */}
          <Button
            type="submit"
            variante="primary"
            pleineLargeur
            taille="grand"
            chargement={chargement || uploadEnCours}
          >
            {uploadEnCours
              ? 'Upload du screenshot…'
              : chargement
                ? 'Envoi en cours…'
                : restantAPayer === 0
                  ? '✅ Confirmer — Payé avec le solde'
                  : `Confirmer — ${formaterPrix(restantAPayer)} FCFA`
            }
          </Button>

          <p className="text-gray-500 text-xs text-center">
            📱 Votre commande sera également envoyée via WhatsApp pour confirmation
          </p>
        </form>
      </div>
    </div>
  )
}
