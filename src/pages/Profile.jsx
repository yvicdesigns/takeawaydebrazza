// ============================================================
// PAGE : Profil client
// Photo, email, WhatsApp, Mobile Money, commande active,
// fidélité, adresse favorite, stats, recommander, partager
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getCommandesClient, ecouterCommande, getParametre, getFideliteClient } from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'
import { OptionsPhotoSheet, ModalRecadrage } from '../components/profile/PhotoPicker'
import { useSolde } from '../hooks/useSolde'

// ---- Composant : Champ mot de passe avec œil ----
function ChampMotDePasse({ value, onChange, placeholder, className = '' }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-field pr-10 ${className}`}
        autoComplete="current-password"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
        tabIndex={-1}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

const STATUTS_ACTIFS   = ['en_attente', 'en_preparation', 'en_livraison']
const STATUTS_TERMINES = ['livre', 'envoyee_whatsapp']
const SEUIL_FIDELITE   = 10
const CLE_ADRESSE      = 'bigman_adresse_favorite'

const COULEURS_STATUT = {
  en_attente:       'text-yellow-400 bg-yellow-400/10',
  en_preparation:   'text-blue-400 bg-blue-400/10',
  en_livraison:     'text-orange-400 bg-orange-400/10',
  livre:            'text-green-400 bg-green-400/10',
  envoyee_whatsapp: 'text-green-400 bg-green-400/10',
}
const LABELS_STATUT = {
  en_attente: 'En attente', en_preparation: 'En préparation',
  en_livraison: 'En livraison', livre: 'Livré', envoyee_whatsapp: 'Via WhatsApp',
}
const ETAPES = [
  { statut: 'en_attente',     label: 'Reçue',      emoji: '📋' },
  { statut: 'en_preparation', label: 'Préparation', emoji: '👨‍🍳' },
  { statut: 'en_livraison',   label: 'En route',    emoji: '🛵' },
  { statut: 'livre',          label: 'Livré',       emoji: '✅' },
]

function indexEtape(statut) {
  const idx = ETAPES.findIndex(e => e.statut === statut)
  return idx === -1 ? (STATUTS_TERMINES.includes(statut) ? 3 : 0) : idx
}

// ---- Composant : Avatar ----
function Avatar({ photo, nom }) {
  return (
    <div className="w-20 h-20 gradient-rouge rounded-full flex items-center justify-center text-white text-3xl font-black overflow-hidden flex-shrink-0">
      {photo
        ? <img src={photo} alt={nom} className="w-full h-full object-cover" />
        : <span>{(nom || '?').charAt(0).toUpperCase()}</span>
      }
    </div>
  )
}

// ---- Composant : Ligne d'info ----
function LigneInfo({ icone, label, valeur, placeholder, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 border-b border-gray-800 last:border-0 text-left hover:bg-gray-800/20 rounded-lg px-1 transition-colors"
    >
      <span className="text-lg w-7 text-center flex-shrink-0">{icone}</span>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs">{label}</p>
        <p className={`text-sm font-medium truncate ${valeur ? 'text-white' : 'text-gray-600'}`}>
          {valeur || placeholder}
        </p>
      </div>
      <span className="text-gray-600 text-xs flex-shrink-0">✏️</span>
    </button>
  )
}

export default function Profile() {
  const { utilisateur, inscrire, connexion, definirMotDePasse, mettreAJourProfil, deconnexion } = useAuth()
  const { ajouterAuPanier, viderPanier } = useCart()
  const navigate = useNavigate()

  const { solde } = useSolde(utilisateur?.telephone)

  const [commandes, setCommandes]         = useState([])
  const [chargement, setChargement]       = useState(false)
  const [filtreOnglet, setFiltreOnglet]   = useState('tout')

  // Fidélité — données fraîches depuis Supabase
  const [seuilFidelite, setSeuilFidelite]     = useState(SEUIL_FIDELITE)
  const [paliersUtilises, setPaliersUtilises] = useState(utilisateur?.fidelite_paliers_utilises || 0)
  const [pointsBonus, setPointsBonus]         = useState(utilisateur?.fidelite_points_bonus || 0)

  // Photo picker
  const [optionsPhotoOuvert, setOptionsPhotoOuvert] = useState(false)
  const [srcRecadrage, setSrcRecadrage]             = useState(null) // URL blob en attente de crop

  // Modal modification profil
  const [modalOuvert, setModalOuvert]   = useState(false)
  const [champEdit, setChampEdit]       = useState(null)
  const [draft, setDraft]               = useState({})

  // Adresse favorite
  const [adresseFav, setAdresseFav]     = useState(() => localStorage.getItem(CLE_ADRESSE) || '')
  const [editAdresse, setEditAdresse]   = useState(false)
  const [champAdresse, setChampAdresse] = useState('')

  // Commande active temps réel
  const [commandeActive, setCommandeActive] = useState(null)
  const desabonnementRef = useRef(null)

  // Auth form
  const [ongletAuth, setOngletAuth]     = useState('connexion') // 'connexion' | 'inscription'
  const [formConnexion, setFormConnexion] = useState({ identifiant: '', motDePasse: '' })
  const [formInscription, setFormInscription] = useState({ nom: '', telephone: '', username: '', motDePasse: '', confirmer: '' })
  const [erreurAuth, setErreurAuth]     = useState('')
  const [erreursInscription, setErreursInscription] = useState({})
  // Migration : compte sans mot de passe
  const [compteMigre, setCompteMigre]   = useState(null) // compte à sécuriser
  const [formMdp, setFormMdp]           = useState({ motDePasse: '', confirmer: '' })
  const [erreurMdp, setErreurMdp]       = useState('')

  useEffect(() => {
    if (utilisateur) {
      chargerCommandes()
      // Charge seuil et données fidélité fraîches
      getParametre('fidelite_seuil').then(v => setSeuilFidelite(parseInt(v) || SEUIL_FIDELITE))
      if (utilisateur.id) {
        getFideliteClient(utilisateur.id).then(data => {
          if (data) {
            setPaliersUtilises(data.fidelite_paliers_utilises || 0)
            setPointsBonus(data.fidelite_points_bonus || 0)
          }
        })
      }
    }
  }, [utilisateur])

  useEffect(() => {
    desabonnementRef.current?.()
    if (!commandeActive || STATUTS_TERMINES.includes(commandeActive.statut)) return
    desabonnementRef.current = ecouterCommande(commandeActive.id, (maj) => {
      setCommandeActive(maj)
      setCommandes(prev => prev.map(c => c.id === maj.id ? maj : c))
    })
    return () => desabonnementRef.current?.()
  }, [commandeActive?.id])

  async function chargerCommandes() {
    setChargement(true)
    const data = await getCommandesClient(utilisateur.telephone)
    setCommandes(data)
    setCommandeActive(data.find(c => STATUTS_ACTIFS.includes(c.statut)) || null)
    setChargement(false)
  }

  const [authChargement, setAuthChargement] = useState(false)

  async function handleConnexion(e) {
    e.preventDefault()
    setErreurAuth('')
    if (!formConnexion.identifiant.trim()) { setErreurAuth('Identifiant obligatoire'); return }
    if (!formConnexion.motDePasse) { setErreurAuth('Mot de passe obligatoire'); return }
    setAuthChargement(true)
    const res = await connexion(formConnexion)
    setAuthChargement(false)
    if (!res.ok) {
      if (res.erreur === 'DEFINIR_MDP') { setCompteMigre(res.compte); return }
      setErreurAuth(res.erreur)
    }
  }

  async function handleInscription(e) {
    e.preventDefault()
    const errs = {}
    if (!formInscription.nom.trim())       errs.nom = 'Nom obligatoire'
    if (!formInscription.telephone.trim()) errs.telephone = 'Numéro obligatoire'
    if (!formInscription.motDePasse)       errs.motDePasse = 'Mot de passe obligatoire'
    if (formInscription.motDePasse.length < 4) errs.motDePasse = 'Minimum 4 caractères'
    if (formInscription.motDePasse !== formInscription.confirmer) errs.confirmer = 'Les mots de passe ne correspondent pas'
    if (Object.keys(errs).length) { setErreursInscription(errs); return }
    setErreursInscription({})
    setAuthChargement(true)
    const res = await inscrire(formInscription)
    setAuthChargement(false)
    if (!res.ok) setErreursInscription(res.champ ? { [res.champ]: res.erreur } : { _global: res.erreur })
  }

  async function handleDefinirMdp(e) {
    e.preventDefault()
    setErreurMdp('')
    if (!formMdp.motDePasse) { setErreurMdp('Mot de passe obligatoire'); return }
    if (formMdp.motDePasse.length < 4) { setErreurMdp('Minimum 4 caractères'); return }
    if (formMdp.motDePasse !== formMdp.confirmer) { setErreurMdp('Les mots de passe ne correspondent pas'); return }
    setAuthChargement(true)
    await definirMotDePasse({ compteId: compteMigre.id, motDePasse: formMdp.motDePasse })
    setAuthChargement(false)
    setCompteMigre(null)
  }

  // ---- Photo ----
  function handlePhotoChoisie(src, source) {
    if (source === 'avatar') {
      // Avatar pré-généré → sauvegarder directement
      mettreAJourProfil({ photo: src })
    } else {
      // Photo réelle → ouvrir le recadrage
      setSrcRecadrage(src)
    }
  }

  function handlePhotoRecadree(base64) {
    mettreAJourProfil({ photo: base64 })
    setSrcRecadrage(null)
  }

  // ---- Modal édition champ ----
  function ouvrirChamp(champ) {
    setChampEdit(champ)
    setDraft({ [champ]: utilisateur[champ] || '' })
    setModalOuvert(true)
  }

  const [erreurChamp, setErreurChamp] = useState('')

  async function sauvegarderChamp() {
    if (!champEdit) return
    setErreurChamp('')
    let valeur = draft[champEdit]?.trim() || ''
    if (champEdit === 'username') valeur = valeur.replace(/^@/, '').toLowerCase()
    const res = await mettreAJourProfil({ [champEdit]: valeur })
    if (res && !res.ok) { setErreurChamp(res.erreur); return }
    fermerModal()
  }

  function fermerModal() {
    setModalOuvert(false)
    setChampEdit(null)
    setDraft({})
    setErreurChamp('')
  }

  // ---- Adresse ----
  function sauvegarderAdresse() {
    const addr = champAdresse.trim()
    localStorage.setItem(CLE_ADRESSE, addr)
    setAdresseFav(addr)
    setEditAdresse(false)
  }

  // ---- Recommander ----
  function recommander(commande) {
    viderPanier()
    ;(commande.produits || []).forEach(p => {
      for (let i = 0; i < (p.quantite || 1); i++)
        ajouterAuPanier({ id: p.id, nom: p.nom, prix: p.prix, image_url: p.image_url })
    })
    navigate('/panier')
  }

  function partagerApp() {
    const texte = `🍔 *Big Man Fast Food — Brazzaville*\nLes meilleurs burgers de la ville ! ${window.location.origin}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, '_blank')
  }

  // ---- Stats ----
  const commandesTerminees = commandes.filter(c => STATUTS_TERMINES.includes(c.statut))
  const commandesEnCours   = commandes.filter(c => STATUTS_ACTIFS.includes(c.statut))
  const totalDepense       = commandes.reduce((t, c) => t + (c.total || 0), 0)
  const moyenneCommande    = commandes.length > 0 ? Math.round(totalDepense / commandes.length) : 0

  const articleFavori = (() => {
    const compteur = {}
    commandes.forEach(c => (c.produits || []).forEach(p => {
      compteur[p.nom] = (compteur[p.nom] || 0) + (p.quantite || 1)
    }))
    const entrees = Object.entries(compteur)
    return entrees.length ? entrees.sort((a, b) => b[1] - a[1])[0] : null
  })()

  const nbLivrees         = commandesTerminees.filter(c => c.statut === 'livre').length
  const pointsEffectifs   = nbLivrees + pointsBonus
  const progressFidelite  = pointsEffectifs % seuilFidelite
  const palierGagne       = Math.floor(pointsEffectifs / seuilFidelite)
  const palierDisponible  = Math.max(0, palierGagne - paliersUtilises)

  const commandesFiltrees =
    filtreOnglet === 'en_cours' ? commandesEnCours :
    filtreOnglet === 'livrees'  ? commandesTerminees : commandes

  // Libellé du champ en cours d'édition
  const CHAMPS_INFO = {
    nom:          { label: 'Nom complet',         icone: '👤', type: 'text',  placeholder: 'Jean-Pierre Moukala' },
    username:     { label: '@Username',            icone: '🏷️', type: 'text',  placeholder: 'monpseudo', prefixe: '@' },
    email:        { label: 'Email',               icone: '📧', type: 'email', placeholder: 'exemple@gmail.com' },
    whatsapp:     { label: 'WhatsApp',            icone: '💬', type: 'tel',   placeholder: '+242 06 XXXXXXX' },
    mtn_momo:     { label: 'Numéro MTN MoMo',     icone: '📱', type: 'tel',   placeholder: '06 XXXXXXX' },
    airtel_money: { label: 'Numéro Airtel Money', icone: '📲', type: 'tel',   placeholder: '05 XXXXXXX' },
  }

  // ---- Définir mot de passe (compte migré) ----
  if (compteMigre) {
    return (
      <div className="min-h-screen pb-24">
        <div className="px-4 max-w-md mx-auto pt-8">
          <button onClick={() => setCompteMigre(null)} className="text-gray-500 text-sm mb-6 flex items-center gap-1">
            ← Retour
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 gradient-rouge rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              🔐
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Sécuriser votre compte</h1>
            <p className="text-gray-400 text-sm">
              Bonjour <span className="text-white font-semibold">{compteMigre.nom}</span> !<br />
              Choisissez un mot de passe pour sécuriser votre compte.
            </p>
          </div>
          <form onSubmit={handleDefinirMdp} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Nouveau mot de passe</label>
              <ChampMotDePasse
                value={formMdp.motDePasse}
                onChange={e => setFormMdp(p => ({ ...p, motDePasse: e.target.value }))}
                placeholder="Minimum 4 caractères"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Confirmer le mot de passe</label>
              <ChampMotDePasse
                value={formMdp.confirmer}
                onChange={e => setFormMdp(p => ({ ...p, confirmer: e.target.value }))}
                placeholder="Répétez le mot de passe"
              />
            </div>
            {erreurMdp && <p className="text-rouge text-sm">{erreurMdp}</p>}
            <button type="submit" disabled={authChargement} className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
              {authChargement && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Confirmer et se connecter
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ---- Non connecté ----
  if (!utilisateur) {
    return (
      <div className="min-h-screen pb-24">
        <div className="px-4 max-w-md mx-auto pt-5">

          {/* Logo / titre */}
          <div className="text-center mb-8 pt-4">
            <div className="w-16 h-16 bg-jaune rounded-2xl flex items-center justify-center font-black text-noir text-3xl mx-auto mb-4">B</div>
            <h1 className="text-2xl font-black text-white">Big Man</h1>
            <p className="text-gray-500 text-sm mt-1">Connectez-vous ou créez un compte</p>
          </div>

          {/* Onglets */}
          <div className="flex bg-noir-clair rounded-2xl p-1 mb-6">
            {[
              { id: 'connexion',   label: 'Se connecter' },
              { id: 'inscription', label: 'Créer un compte' },
            ].map(o => (
              <button key={o.id} onClick={() => { setOngletAuth(o.id); setErreurAuth(''); setErreursInscription({}) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${ongletAuth === o.id ? 'bg-rouge text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                {o.label}
              </button>
            ))}
          </div>

          {/* ---- Connexion ---- */}
          {ongletAuth === 'connexion' && (
            <form onSubmit={handleConnexion} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Téléphone ou @username</label>
                <input
                  type="text"
                  value={formConnexion.identifiant}
                  onChange={e => setFormConnexion(p => ({ ...p, identifiant: e.target.value }))}
                  placeholder="Téléphone, @username ou email"
                  className="input-field"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Mot de passe</label>
                <ChampMotDePasse
                  value={formConnexion.motDePasse}
                  onChange={e => setFormConnexion(p => ({ ...p, motDePasse: e.target.value }))}
                  placeholder="Votre mot de passe"
                />
              </div>
              {erreurAuth && (
                <div className="bg-rouge/10 border border-rouge/30 rounded-xl px-4 py-3 text-rouge text-sm">
                  {erreurAuth}
                </div>
              )}
              <button type="submit" disabled={authChargement} className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
                {authChargement && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Se connecter
              </button>
              <p className="text-center text-gray-600 text-xs mt-2">
                Pas encore de compte ?{' '}
                <button type="button" onClick={() => setOngletAuth('inscription')} className="text-jaune font-semibold">
                  Créer un compte
                </button>
              </p>
            </form>
          )}

          {/* ---- Inscription ---- */}
          {ongletAuth === 'inscription' && (
            <form onSubmit={handleInscription} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Nom complet *</label>
                <input
                  type="text"
                  value={formInscription.nom}
                  onChange={e => setFormInscription(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Jean-Pierre Moukala"
                  className={`input-field ${erreursInscription.nom ? 'border-rouge' : ''}`}
                  autoComplete="name"
                />
                {erreursInscription.nom && <p className="text-rouge text-xs mt-1">{erreursInscription.nom}</p>}
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Numéro de téléphone *</label>
                <input
                  type="tel"
                  value={formInscription.telephone}
                  onChange={e => setFormInscription(p => ({ ...p, telephone: e.target.value }))}
                  placeholder="06 XXXXXXX"
                  className={`input-field ${erreursInscription.telephone ? 'border-rouge' : ''}`}
                  autoComplete="tel"
                />
                {erreursInscription.telephone && <p className="text-rouge text-xs mt-1">{erreursInscription.telephone}</p>}
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">
                  @Username <span className="text-gray-600">(optionnel)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">@</span>
                  <input
                    type="text"
                    value={formInscription.username}
                    onChange={e => setFormInscription(p => ({ ...p, username: e.target.value.replace(/^@/, '') }))}
                    placeholder="monpseudo"
                    className={`input-field pl-7 ${erreursInscription.username ? 'border-rouge' : ''}`}
                    autoComplete="username"
                  />
                </div>
                {erreursInscription.username
                  ? <p className="text-rouge text-xs mt-1">{erreursInscription.username}</p>
                  : <p className="text-gray-600 text-xs mt-1">Permet de se connecter sans taper le numéro</p>
                }
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Mot de passe *</label>
                <ChampMotDePasse
                  value={formInscription.motDePasse}
                  onChange={e => setFormInscription(p => ({ ...p, motDePasse: e.target.value }))}
                  placeholder="Minimum 4 caractères"
                  className={erreursInscription.motDePasse ? 'border-rouge' : ''}
                />
                {erreursInscription.motDePasse && <p className="text-rouge text-xs mt-1">{erreursInscription.motDePasse}</p>}
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Confirmer le mot de passe *</label>
                <ChampMotDePasse
                  value={formInscription.confirmer}
                  onChange={e => setFormInscription(p => ({ ...p, confirmer: e.target.value }))}
                  placeholder="Répétez le mot de passe"
                  className={erreursInscription.confirmer ? 'border-rouge' : ''}
                />
                {erreursInscription.confirmer && <p className="text-rouge text-xs mt-1">{erreursInscription.confirmer}</p>}
              </div>

              {erreursInscription._global && (
                <div className="bg-rouge/10 border border-rouge/30 rounded-xl px-4 py-3 text-rouge text-sm">
                  {erreursInscription._global}
                </div>
              )}
              <button type="submit" disabled={authChargement} className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
                {authChargement && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Créer mon compte
              </button>
              <p className="text-center text-gray-600 text-xs mt-2">
                Déjà un compte ?{' '}
                <button type="button" onClick={() => setOngletAuth('connexion')} className="text-jaune font-semibold">
                  Se connecter
                </button>
              </p>
            </form>
          )}

          {/* Avantages */}
          <div className="mt-10 space-y-2.5 border-t border-gray-800 pt-6">
            {[
              { emoji: '📋', texte: 'Historique de vos commandes' },
              { emoji: '⚡', texte: 'Commande plus rapide (infos pré-remplies)' },
              { emoji: '🔔', texte: 'Suivi en temps réel' },
              { emoji: '🎁', texte: 'Programme de fidélité' },
            ].map(item => (
              <div key={item.texte} className="flex items-center gap-3 text-sm text-gray-500">
                <span>{item.emoji}</span><span>{item.texte}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---- Profil connecté ----
  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 max-w-md mx-auto pt-5 space-y-4">

        {/* ---- En-tête ---- */}
        <div className="flex items-center gap-4">
          {/* Photo de profil */}
          <div className="relative flex-shrink-0">
            <button onClick={() => setOptionsPhotoOuvert(true)} className="block">
              <Avatar photo={utilisateur.photo} nom={utilisateur.nom} />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                <span className="text-white text-xl">📷</span>
              </div>
            </button>
            <button
              onClick={() => setOptionsPhotoOuvert(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-rouge rounded-full flex items-center justify-center text-white text-xs shadow-lg border-2 border-noir"
            >
              📷
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white truncate">{utilisateur.nom}</h1>
            {utilisateur.username && (
              <p className="text-jaune text-sm font-semibold">@{utilisateur.username}</p>
            )}
            <p className="text-gray-400 text-sm">📱 {utilisateur.telephone}</p>
            {utilisateur.email && (
              <p className="text-gray-500 text-xs truncate">📧 {utilisateur.email}</p>
            )}
          </div>
          <button onClick={deconnexion} className="text-gray-500 text-xs hover:text-rouge transition-colors flex-shrink-0">
            Déco
          </button>
        </div>

        {/* ---- Infos personnelles ---- */}
        <div className="bg-noir-clair rounded-2xl p-4">
          <p className="font-bold text-white text-sm mb-3">👤 Mes informations</p>
          <LigneInfo icone="👤" label="Nom" valeur={utilisateur.nom} placeholder="Ajouter un nom" onClick={() => ouvrirChamp('nom')} />
          <LigneInfo
            icone="🏷️"
            label="@Username"
            valeur={utilisateur.username ? `@${utilisateur.username}` : ''}
            placeholder="Ajouter un @username"
            onClick={() => ouvrirChamp('username')}
          />
          <LigneInfo icone="📧" label="Email" valeur={utilisateur.email} placeholder="Ajouter un email" onClick={() => ouvrirChamp('email')} />
          <LigneInfo icone="💬" label="WhatsApp" valeur={utilisateur.whatsapp} placeholder="Ajouter un numéro WhatsApp" onClick={() => ouvrirChamp('whatsapp')} />
        </div>

        {/* Bannière : suggérer d'ajouter un username si absent */}
        {!utilisateur.username && (
          <button
            onClick={() => ouvrirChamp('username')}
            className="w-full flex items-center gap-3 bg-jaune/10 border border-jaune/30 rounded-2xl p-4 text-left hover:bg-jaune/15 transition-colors"
          >
            <span className="text-2xl">🏷️</span>
            <div className="flex-1">
              <p className="text-jaune font-bold text-sm">Ajouter un @username</p>
              <p className="text-gray-400 text-xs">Pour vous connecter sans taper votre numéro</p>
            </div>
            <span className="text-jaune text-sm">›</span>
          </button>
        )}

        {/* ---- Mobile Money ---- */}
        <div className="bg-noir-clair rounded-2xl p-4">
          <p className="font-bold text-white text-sm mb-3">💳 Mobile Money</p>
          <LigneInfo
            icone="📱" label="MTN MoMo"
            valeur={utilisateur.mtn_momo}
            placeholder="Ajouter ton numéro MTN MoMo"
            onClick={() => ouvrirChamp('mtn_momo')}
          />
          <LigneInfo
            icone="📲" label="Airtel Money"
            valeur={utilisateur.airtel_money}
            placeholder="Ajouter ton numéro Airtel Money"
            onClick={() => ouvrirChamp('airtel_money')}
          />
          <p className="text-gray-600 text-xs mt-3">
            Ces numéros sont pré-remplis automatiquement lors du paiement
          </p>
        </div>

        {/* ---- Commande active temps réel ---- */}
        {commandeActive && (
          <div className="bg-noir-clair rounded-2xl p-4 border border-jaune/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-rouge rounded-full animate-pulse inline-block" />
                  Commande en cours
                </p>
                <p className="text-gray-500 text-xs">#{commandeActive.id.toString().slice(-6)} — {formaterPrix(commandeActive.total)} FCFA</p>
              </div>
              <Link to={`/commandes/${commandeActive.id}`} className="text-jaune text-xs font-bold bg-jaune/10 px-3 py-1.5 rounded-xl">
                Suivre →
              </Link>
            </div>
            <div className="relative flex items-start justify-between">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-800">
                <div className="h-full bg-jaune transition-all duration-700"
                  style={{ width: `${(indexEtape(commandeActive.statut) / (ETAPES.length - 1)) * 100}%` }} />
              </div>
              {ETAPES.map((etape, idx) => {
                const fait = idx <= indexEtape(commandeActive.statut)
                return (
                  <div key={etape.statut} className="flex flex-col items-center gap-1.5 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${fait ? 'bg-jaune text-noir' : 'bg-gray-800 text-gray-600'}`}>
                      {etape.emoji}
                    </div>
                    <p className={`text-[10px] text-center w-14 ${fait ? 'text-jaune' : 'text-gray-600'}`}>{etape.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ---- Solde ---- */}
        <Link
          to="/solde"
          className="flex items-center gap-4 bg-gradient-to-r from-rouge/80 to-rouge rounded-2xl p-4 hover:opacity-90 transition-opacity"
        >
          <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            💰
          </div>
          <div className="flex-1">
            <p className="text-white/70 text-xs">Mon solde</p>
            <p className="text-white font-black text-xl">{formaterPrix(solde)} <span className="text-base font-semibold">FCFA</span></p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white font-bold text-sm">Recharger</p>
            <p className="text-white/60 text-xs">⚡</p>
          </div>
        </Link>

        {/* ---- Fidélité ---- */}
        <div className={`bg-noir-clair rounded-2xl p-4 ${palierDisponible > 0 ? 'border border-jaune/40' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-white text-sm">🎁 Carte de fidélité</p>
              {palierDisponible > 0 && (
                <p className="text-jaune text-xs font-bold animate-pulse">
                  🍔 {palierDisponible} burger{palierDisponible > 1 ? 's' : ''} offert{palierDisponible > 1 ? 's' : ''} — Montre ça au restaurant !
                </p>
              )}
            </div>
            <p className="text-white font-bold text-sm">
              {progressFidelite}<span className="text-gray-600 font-normal text-xs">/{seuilFidelite}</span>
            </p>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-jaune rounded-full transition-all duration-500"
              style={{ width: `${(progressFidelite / seuilFidelite) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-xs">
              {palierDisponible > 0
                ? `${palierGagne} gagné${palierGagne > 1 ? 's' : ''} · ${paliersUtilises} utilisé${paliersUtilises > 1 ? 's' : ''}`
                : `encore ${seuilFidelite - progressFidelite} commande${seuilFidelite - progressFidelite > 1 ? 's' : ''} pour un burger offert`}
            </p>
            {pointsBonus > 0 && (
              <p className="text-green-400 text-xs">+{pointsBonus} pts bonus</p>
            )}
          </div>
        </div>

        {/* ---- Messages ---- */}
        <button onClick={() => navigate('/messages')}
          className="w-full flex items-center gap-3 bg-noir-clair rounded-2xl p-4 hover:bg-gray-800 transition-colors">
          <div className="w-10 h-10 bg-rouge/20 rounded-xl flex items-center justify-center text-rouge text-lg flex-shrink-0">💬</div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-sm">Messages</p>
            <p className="text-gray-400 text-xs">Contacter le restaurant & annonces</p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

        {/* ---- Adresse favorite ---- */}
        <div className="bg-noir-clair rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-white text-sm">📍 Adresse favorite</p>
            <button onClick={() => { setChampAdresse(adresseFav); setEditAdresse(true) }}
              className="text-gray-500 hover:text-white text-xs transition-colors">
              {adresseFav ? '✏️ Modifier' : '+ Ajouter'}
            </button>
          </div>
          {editAdresse ? (
            <div className="space-y-2">
              <textarea autoFocus value={champAdresse} onChange={e => setChampAdresse(e.target.value)}
                placeholder="Ex: Quartier Bacongo, rue Moukanda..."
                className="input-field resize-none h-16 text-sm w-full" />
              <div className="flex gap-2">
                <button onClick={sauvegarderAdresse} className="btn-primary py-1.5 text-xs flex-1">Sauvegarder</button>
                <button onClick={() => setEditAdresse(false)} className="text-gray-500 text-xs px-3">Annuler</button>
              </div>
            </div>
          ) : adresseFav ? (
            <p className="text-gray-300 text-sm">{adresseFav}</p>
          ) : (
            <p className="text-gray-600 text-xs">Enregistre ton adresse pour pré-remplir le checkout</p>
          )}
        </div>

        {/* ---- Stats ---- */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-noir-clair rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-rouge">{commandes.length}</p>
            <p className="text-gray-400 text-xs mt-1">Commandes</p>
          </div>
          <div className="bg-noir-clair rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-jaune">{commandesTerminees.filter(c => c.statut === 'livre').length}</p>
            <p className="text-gray-400 text-xs mt-1">Livrées</p>
          </div>
          <div className="bg-noir-clair rounded-2xl p-4 text-center">
            <p className="text-base font-black text-white">{formaterPrix(totalDepense)}</p>
            <p className="text-gray-400 text-xs mt-1">FCFA dépensés</p>
          </div>
          <div className="bg-noir-clair rounded-2xl p-4 text-center">
            <p className="text-base font-black text-white">{commandes.length > 0 ? formaterPrix(moyenneCommande) : '—'}</p>
            <p className="text-gray-400 text-xs mt-1">Moy. commande</p>
          </div>
        </div>
        {articleFavori && (
          <div className="bg-noir-clair rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🍔</span>
            <div>
              <p className="text-white text-sm font-bold">Ton article favori</p>
              <p className="text-gray-400 text-xs">{articleFavori[0]} — commandé {articleFavori[1]} fois</p>
            </div>
          </div>
        )}

        {/* ---- Commandes ---- */}
        <div>
          <h2 className="font-black text-white text-lg mb-3">Mes commandes</h2>
          <div className="flex gap-1 bg-noir-clair rounded-xl p-1 mb-4">
            {[
              { id: 'tout',     label: 'Tout' },
              { id: 'en_cours', label: commandesEnCours.length > 0 ? `En cours (${commandesEnCours.length})` : 'En cours' },
              { id: 'livrees',  label: 'Livrées' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltreOnglet(f.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtreOnglet === f.id ? 'bg-rouge text-white' : 'text-gray-400 hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {chargement ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-rouge border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : commandesFiltrees.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl block mb-4">📋</span>
              <p className="text-gray-400 text-sm">Aucune commande ici</p>
              {filtreOnglet === 'tout' && <Link to="/menu" className="btn-primary inline-flex mt-4">Commander maintenant</Link>}
            </div>
          ) : (
            <div className="space-y-3">
              {commandesFiltrees.map(commande => (
                <div key={commande.id} className="bg-noir-clair rounded-2xl overflow-hidden">
                  <Link to={`/commandes/${commande.id}`} className="block p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold text-sm">Commande #{commande.id.toString().slice(-6)}</span>
                      <span className={`badge text-xs ${COULEURS_STATUT[commande.statut] || 'text-gray-400'}`}>
                        {LABELS_STATUT[commande.statut] || commande.statut}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-2">
                      {new Date(commande.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">{commande.mode_livraison === 'retrait' ? '🏪 Retrait' : '🛵 Livraison'}</span>
                      <span className="text-jaune font-bold text-sm">{formaterPrix(commande.total)} FCFA</span>
                    </div>
                  </Link>
                  <button onClick={() => recommander(commande)}
                    className="w-full py-2.5 border-t border-gray-800 text-rouge text-xs font-bold hover:bg-rouge/5 transition-colors">
                    🔄 Recommander cette commande
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- Partager ---- */}
        <button onClick={partagerApp}
          className="w-full flex items-center gap-3 bg-noir-clair rounded-2xl p-4 hover:bg-gray-800 transition-colors">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 text-lg flex-shrink-0">📤</div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-sm">Partager Big Man</p>
            <p className="text-gray-400 text-xs">Invite tes amis à commander</p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

      </div>

      {/* ================================================================
          PHOTO : Options + Recadrage
      ================================================================ */}
      {optionsPhotoOuvert && (
        <OptionsPhotoSheet
          utilisateur={utilisateur}
          onFermer={() => setOptionsPhotoOuvert(false)}
          onPhotoChoisie={handlePhotoChoisie}
          onSupprimerPhoto={() => mettreAJourProfil({ photo: '' })}
        />
      )}

      {srcRecadrage && (
        <ModalRecadrage
          src={srcRecadrage}
          onConfirmer={handlePhotoRecadree}
          onAnnuler={() => setSrcRecadrage(null)}
        />
      )}

      {/* ================================================================
          MODAL : Modifier un champ du profil
      ================================================================ */}
      {modalOuvert && champEdit && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={fermerModal} />

          {/* Sheet */}
          <div className="relative bg-noir-clair rounded-t-3xl p-6 animate-slide-up">
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />

            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{CHAMPS_INFO[champEdit]?.icone}</span>
              <h3 className="text-white font-black text-lg">{CHAMPS_INFO[champEdit]?.label}</h3>
            </div>

            {CHAMPS_INFO[champEdit]?.prefixe ? (
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                  {CHAMPS_INFO[champEdit].prefixe}
                </span>
                <input
                  autoFocus
                  type="text"
                  value={draft[champEdit] || ''}
                  onChange={e => setDraft({ [champEdit]: e.target.value.replace(/^@/, '') })}
                  onKeyDown={e => { if (e.key === 'Enter') sauvegarderChamp() }}
                  placeholder={CHAMPS_INFO[champEdit]?.placeholder}
                  className="input-field text-base pl-7"
                />
              </div>
            ) : (
              <input
                autoFocus
                type={CHAMPS_INFO[champEdit]?.type || 'text'}
                value={draft[champEdit] || ''}
                onChange={e => setDraft({ [champEdit]: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') sauvegarderChamp() }}
                placeholder={CHAMPS_INFO[champEdit]?.placeholder}
                className="input-field mb-4 text-base"
              />
            )}
            {erreurChamp && (
              <p className="text-rouge text-sm mb-4 -mt-2">{erreurChamp}</p>
            )}

            {/* Tips spécifiques */}
            {champEdit === 'whatsapp' && (
              <p className="text-gray-500 text-xs mb-4">
                💡 Peut être différent de ton numéro principal — utilisé pour le suivi commande
              </p>
            )}
            {(champEdit === 'mtn_momo' || champEdit === 'airtel_money') && (
              <p className="text-gray-500 text-xs mb-4">
                💡 Pré-rempli automatiquement lors du paiement mobile money
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={fermerModal} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-semibold text-sm">
                Annuler
              </button>
              <button onClick={sauvegarderChamp} className="flex-1 btn-primary">
                Sauvegarder
              </button>
            </div>

            {/* Supprimer la valeur */}
            {utilisateur[champEdit] && champEdit !== 'nom' && (
              <button
                onClick={() => { mettreAJourProfil({ [champEdit]: '' }); fermerModal() }}
                className="w-full text-center text-rouge text-xs mt-4"
              >
                Supprimer cette information
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
