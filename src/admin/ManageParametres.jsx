// ============================================================
// PAGE ADMIN : Paramètres restaurant
// Ouvert/fermé, frais livraison, ETA, heures d'ouverture, codes promo
// ============================================================

import { useState, useEffect } from 'react'
import { supabase, getParametre, updateParametre, getCodesPromo, sauvegarderCodesPromo } from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const HORAIRES_DEFAUT = JOURS.map(j => ({ jour: j, ouvert: true, debut: '08:00', fin: '22:00' }))

function Toggle({ active, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-gray-500 text-xs">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!active)}
        className={`relative w-12 h-6 rounded-full transition-colors ${active ? 'bg-rouge' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${active ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}

function Champ({ label, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">{label}</label>
      {children}
    </div>
  )
}

export default function ManageParametres() {
  const [sauve, setSauve]             = useState('')
  const [reinitConfirm, setReinitConfirm] = useState(false)
  const [reinitEnCours, setReinitEnCours] = useState(false)

  // ---- Infos restaurant ----
  const [nomResto,     setNomResto]     = useState('TAKEAWAY DE BRAZZA')
  const [descResto,    setDescResto]    = useState('')
  const [adresseResto, setAdresseResto] = useState('')
  const [logoUrl,      setLogoUrl]      = useState('')
  const [whatsapp,     setWhatsapp]     = useState('')
  const [telResto,     setTelResto]     = useState('')
  const [mtnMomo,      setMtnMomo]      = useState('')
  const [airtelMoney,  setAirtelMoney]  = useState('')
  const [email,        setEmail]        = useState('')

  // ---- Sécurité ----
  const [mdpActuel,    setMdpActuel]    = useState('')
  const [mdpNouveau,   setMdpNouveau]   = useState('')
  const [mdpConfirm,   setMdpConfirm]   = useState('')
  const [erreurMdp,    setErreurMdp]    = useState('')

  // ---- Réglages généraux ----
  const [ouvert,   setOuvert]   = useState(true)
  const [frais,    setFrais]    = useState('500')
  const [eta,      setEta]      = useState('30-45 min')
  const [horaires, setHoraires] = useState(HORAIRES_DEFAUT)

  // ---- Codes promo ----
  const [codes, setCodes]             = useState([])
  const [nvCode, setNvCode]           = useState({ code: '', type: 'percent', valeur: 10, min_commande: 0, actif: true, date_fin: '' })
  const [ajoutOuvert, setAjoutOuvert] = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    const vals = await Promise.all([
      getParametre('restaurant_ouvert'),
      getParametre('frais_livraison'),
      getParametre('eta_livraison'),
      getParametre('horaires_ouverture'),
      getParametre('resto_nom'),
      getParametre('resto_description'),
      getParametre('resto_adresse'),
      getParametre('resto_logo'),
      getParametre('resto_whatsapp'),
      getParametre('resto_telephone'),
      getParametre('resto_mtn'),
      getParametre('resto_airtel'),
      getParametre('resto_email'),
    ])
    const [ouvertVal, fraisVal, etaVal, horairesVal,
           nomVal, descVal, adresseVal, logoVal,
           waVal, telVal, mtnVal, airtelVal, emailVal] = vals

    if (ouvertVal !== null) setOuvert(ouvertVal !== 'false')
    if (fraisVal)    setFrais(fraisVal)
    if (etaVal)      setEta(etaVal)
    if (horairesVal) { try { setHoraires(JSON.parse(horairesVal)) } catch {} }
    if (nomVal)      setNomResto(nomVal)
    if (descVal)     setDescResto(descVal)
    if (adresseVal)  setAdresseResto(adresseVal)
    if (logoVal)     setLogoUrl(logoVal)
    if (waVal)       setWhatsapp(waVal)
    if (telVal)      setTelResto(telVal)
    if (mtnVal)      setMtnMomo(mtnVal)
    if (airtelVal)   setAirtelMoney(airtelVal)
    if (emailVal)    setEmail(emailVal)

    const c = await getCodesPromo()
    setCodes(c)
  }

  function flash(msg = 'Sauvegardé') {
    setSauve(msg)
    setTimeout(() => setSauve(''), 2000)
  }

  // ---- Sauvegarde infos restaurant ----
  async function sauverInfos() {
    await Promise.all([
      updateParametre('resto_nom',         nomResto),
      updateParametre('resto_description', descResto),
      updateParametre('resto_adresse',     adresseResto),
      updateParametre('resto_logo',        logoUrl),
      updateParametre('resto_whatsapp',    whatsapp),
      updateParametre('resto_telephone',   telResto),
      updateParametre('resto_mtn',         mtnMomo),
      updateParametre('resto_airtel',      airtelMoney),
      updateParametre('resto_email',       email),
    ])
    flash('Informations sauvegardées')
  }

  // ---- Changement mot de passe ----
  async function changerMotDePasse() {
    setErreurMdp('')
    const mdpActuelEnv = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
    if (mdpActuel !== mdpActuelEnv) {
      setErreurMdp('Mot de passe actuel incorrect')
      return
    }
    if (mdpNouveau.length < 6) {
      setErreurMdp('Le nouveau mot de passe doit faire au moins 6 caractères')
      return
    }
    if (mdpNouveau !== mdpConfirm) {
      setErreurMdp('Les mots de passe ne correspondent pas')
      return
    }
    await updateParametre('admin_password_override', mdpNouveau)
    setMdpActuel(''); setMdpNouveau(''); setMdpConfirm('')
    flash('Mot de passe mis à jour')
  }

  async function sauverGeneraux() {
    await Promise.all([
      updateParametre('restaurant_ouvert',  String(ouvert)),
      updateParametre('frais_livraison',    frais),
      updateParametre('eta_livraison',      eta),
      updateParametre('horaires_ouverture', JSON.stringify(horaires)),
    ])
    flash('Paramètres sauvegardés')
  }

  function updateHoraire(index, champ, valeur) {
    setHoraires(prev => prev.map((h, i) => i === index ? { ...h, [champ]: valeur } : h))
  }

  // ---- Codes promo ----
  function ajouterCode() {
    if (!nvCode.code.trim()) return
    const nouveaux = [...codes, { ...nvCode, code: nvCode.code.trim().toUpperCase(), valeur: Number(nvCode.valeur), min_commande: Number(nvCode.min_commande) }]
    setCodes(nouveaux)
    sauvegarderCodesPromo(nouveaux)
    setNvCode({ code: '', type: 'percent', valeur: 10, min_commande: 0, actif: true, date_fin: '' })
    setAjoutOuvert(false)
  }

  function toggleCode(index) {
    const maj = codes.map((c, i) => i === index ? { ...c, actif: !c.actif } : c)
    setCodes(maj)
    sauvegarderCodesPromo(maj)
  }

  function supprimerCode(index) {
    const maj = codes.filter((_, i) => i !== index)
    setCodes(maj)
    sauvegarderCodesPromo(maj)
  }

  // ---- Réinitialisation données ----
  async function reinitialiserDonnees() {
    setReinitEnCours(true)
    try {
      await Promise.all([
        supabase.from('commandes').delete().neq('id', 0),
        supabase.from('avis').delete().neq('id', 0),
        supabase.from('soldes_clients').delete().neq('id', 0),
      ])
      setReinitConfirm(false)
      flash('Données réinitialisées — application prête pour la démo')
    } catch {
      flash('Erreur lors de la réinitialisation')
    } finally {
      setReinitEnCours(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Paramètres</h1>
          <p className="text-gray-400 text-sm">Configuration du restaurant</p>
        </div>
        {sauve && <span className="text-green-400 text-sm font-semibold animate-pulse">✓ {sauve}</span>}
      </div>

      {/* ---- Infos restaurant ---- */}
      <div className="bg-noir rounded-2xl border border-gray-800 p-5 space-y-4">
        <h2 className="text-white font-bold text-sm">🏪 Informations du restaurant</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Champ label="Nom du restaurant">
            <input type="text" value={nomResto} onChange={e => setNomResto(e.target.value)}
              placeholder="TAKEAWAY DE BRAZZA" className="input-field" />
          </Champ>
          <Champ label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="contact@takeawaydebrazza.cg" className="input-field" />
          </Champ>
        </div>

        <Champ label="Description / Slogan">
          <textarea value={descResto} onChange={e => setDescResto(e.target.value)}
            rows={2} placeholder="Les meilleurs burgers de Brazzaville..."
            className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-rouge" />
        </Champ>

        <Champ label="Adresse du restaurant">
          <input type="text" value={adresseResto} onChange={e => setAdresseResto(e.target.value)}
            placeholder="Avenue de l'Indépendance, Brazzaville" className="input-field" />
        </Champ>

        <Champ label="Logo du restaurant">
          <div className="flex gap-3 items-center">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="w-14 h-14 rounded-xl object-cover border border-gray-700 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-500 text-2xl">🍔</span>
              </div>
            )}
            <div className="flex-1 space-y-2">
              <label className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold py-2.5 rounded-xl cursor-pointer transition-colors">
                📁 Choisir une image
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files[0]
                    if (!file) return
                    if (file.size > 3 * 1024 * 1024) { alert('Image trop lourde (max 3 Mo)'); return }
                    const reader = new FileReader()
                    reader.onload = ev => setLogoUrl(ev.target.result)
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="ou coller une URL https://..." className="input-field text-xs" />
              {logoUrl && (
                <button onClick={() => setLogoUrl('')} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  🗑 Supprimer le logo
                </button>
              )}
            </div>
          </div>
        </Champ>

        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider pt-1">Contacts & Paiements</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Champ label="Numéro WhatsApp (sans +)">
            <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="242XXXXXXXXX" className="input-field" />
          </Champ>
          <Champ label="Téléphone restaurant">
            <input type="tel" value={telResto} onChange={e => setTelResto(e.target.value)}
              placeholder="06 XXX XXXX" className="input-field" />
          </Champ>
          <Champ label="📱 Numéro MTN MoMo">
            <input type="tel" value={mtnMomo} onChange={e => setMtnMomo(e.target.value)}
              placeholder="06 XXX XXXX" className="input-field" />
          </Champ>
          <Champ label="📲 Numéro Airtel Money">
            <input type="tel" value={airtelMoney} onChange={e => setAirtelMoney(e.target.value)}
              placeholder="05 XXX XXXX" className="input-field" />
          </Champ>
        </div>

        <button onClick={sauverInfos}
          className="w-full bg-rouge hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors">
          Sauvegarder les informations
        </button>
      </div>

      {/* ---- Sécurité / Mot de passe ---- */}
      <div className="bg-noir rounded-2xl border border-gray-800 p-5 space-y-4">
        <h2 className="text-white font-bold text-sm">🔐 Sécurité</h2>
        <p className="text-gray-500 text-xs">Le nouveau mot de passe sera actif dès la prochaine connexion.</p>

        <Champ label="Mot de passe actuel">
          <input type="password" value={mdpActuel} onChange={e => setMdpActuel(e.target.value)}
            placeholder="••••••••" className="input-field" />
        </Champ>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Champ label="Nouveau mot de passe">
            <input type="password" value={mdpNouveau} onChange={e => setMdpNouveau(e.target.value)}
              placeholder="Min. 6 caractères" className="input-field" />
          </Champ>
          <Champ label="Confirmer le mot de passe">
            <input type="password" value={mdpConfirm} onChange={e => setMdpConfirm(e.target.value)}
              placeholder="Répéter le mot de passe" className="input-field" />
          </Champ>
        </div>
        {erreurMdp && <p className="text-red-400 text-xs">{erreurMdp}</p>}
        <button onClick={changerMotDePasse}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors">
          Changer le mot de passe
        </button>
      </div>

      {/* ---- Statut & général ---- */}
      <div className="bg-noir rounded-2xl border border-gray-800 p-5 space-y-5">
        <h2 className="text-white font-bold text-sm">Général</h2>

        <Toggle
          active={ouvert}
          onChange={setOuvert}
          label="Restaurant ouvert"
          description="Désactiver bloque les nouvelles commandes"
        />

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-gray-400 text-xs mb-1 block">Frais de livraison (FCFA)</label>
            <input
              type="number"
              value={frais}
              onChange={e => setFrais(e.target.value)}
              className="input-field"
              min="0"
              step="100"
            />
          </div>
          <div className="flex-1">
            <label className="text-gray-400 text-xs mb-1 block">ETA livraison</label>
            <input
              type="text"
              value={eta}
              onChange={e => setEta(e.target.value)}
              placeholder="30-45 min"
              className="input-field"
            />
          </div>
        </div>

        <button
          onClick={sauverGeneraux}
          className="w-full bg-rouge hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Sauvegarder
        </button>
      </div>

      {/* ---- Heures d'ouverture ---- */}
      <div className="bg-noir rounded-2xl border border-gray-800 p-5 space-y-4">
        <h2 className="text-white font-bold text-sm">Heures d'ouverture</h2>
        <div className="space-y-3">
          {horaires.map((h, i) => (
            <div key={h.jour} className="flex items-center gap-3">
              <div className="w-20 flex-shrink-0">
                <p className="text-gray-300 text-xs font-medium">{h.jour.slice(0, 3)}</p>
              </div>
              <button
                onClick={() => updateHoraire(i, 'ouvert', !h.ouvert)}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${h.ouvert ? 'bg-rouge' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${h.ouvert ? 'left-5' : 'left-0.5'}`} />
              </button>
              {h.ouvert ? (
                <>
                  <input
                    type="time"
                    value={h.debut}
                    onChange={e => updateHoraire(i, 'debut', e.target.value)}
                    className="bg-[#1a1a1a] border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 flex-1"
                  />
                  <span className="text-gray-600 text-xs">→</span>
                  <input
                    type="time"
                    value={h.fin}
                    onChange={e => updateHoraire(i, 'fin', e.target.value)}
                    className="bg-[#1a1a1a] border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 flex-1"
                  />
                </>
              ) : (
                <span className="text-gray-600 text-xs">Fermé</span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={sauverGeneraux}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
        >
          Sauvegarder les horaires
        </button>
      </div>

      {/* ---- Codes promo ---- */}
      <div className="bg-noir rounded-2xl border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Codes promo</h2>
          <button
            onClick={() => setAjoutOuvert(v => !v)}
            className="bg-rouge hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            + Ajouter
          </button>
        </div>

        {/* Formulaire ajout */}
        {ajoutOuvert && (
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Code *</label>
                <input
                  type="text"
                  value={nvCode.code}
                  onChange={e => setNvCode(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="TAKEAWAYDEBRAZZA10"
                  className="input-field uppercase"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Type</label>
                <select
                  value={nvCode.type}
                  onChange={e => setNvCode(p => ({ ...p, type: e.target.value }))}
                  className="input-field"
                >
                  <option value="percent">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (FCFA)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Valeur *</label>
                <input
                  type="number"
                  value={nvCode.valeur}
                  onChange={e => setNvCode(p => ({ ...p, valeur: e.target.value }))}
                  min="1"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Minimum commande (FCFA)</label>
                <input
                  type="number"
                  value={nvCode.min_commande}
                  onChange={e => setNvCode(p => ({ ...p, min_commande: e.target.value }))}
                  min="0"
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Date d'expiration (optionnel)</label>
              <input
                type="date"
                value={nvCode.date_fin}
                onChange={e => setNvCode(p => ({ ...p, date_fin: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={ajouterCode} className="flex-1 bg-rouge hover:bg-red-700 text-white font-bold py-2 rounded-xl text-sm transition-colors">
                Créer le code
              </button>
              <button onClick={() => setAjoutOuvert(false)} className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des codes */}
        {codes.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">Aucun code promo</p>
        ) : (
          <div className="space-y-2">
            {codes.map((c, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${c.actif ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-800 bg-[#111] opacity-50'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-sm tracking-wider">{c.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.actif ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {c.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {c.type === 'percent' ? `−${c.valeur}%` : `−${formaterPrix(c.valeur)} FCFA`}
                    {c.min_commande > 0 && ` · min ${formaterPrix(c.min_commande)} FCFA`}
                    {c.date_fin && ` · exp. ${new Date(c.date_fin).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <button onClick={() => toggleCode(i)} className="text-xs text-gray-500 hover:text-white transition-colors">
                  {c.actif ? '⏸' : '▶'}
                </button>
                <button onClick={() => supprimerCode(i)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Zone de danger : Réinitialisation ---- */}
      <div className="bg-noir rounded-2xl border border-red-900/50 p-5">
        <h2 className="font-bold text-red-400 text-sm mb-1">⚠️ Zone de danger</h2>
        <p className="text-gray-500 text-xs mb-4">
          Efface toutes les commandes, avis et soldes clients. Le menu, les promotions et les paramètres sont conservés. Utile avant une démo.
        </p>

        {!reinitConfirm ? (
          <button
            onClick={() => setReinitConfirm(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-red-700 text-red-400 hover:bg-red-900/20 transition-colors"
          >
            🗑 Réinitialiser les données
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-red-300 text-sm font-semibold">
              Confirmer ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={reinitialiserDonnees}
                disabled={reinitEnCours}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {reinitEnCours ? 'Réinitialisation...' : 'Oui, tout effacer'}
              </button>
              <button
                onClick={() => setReinitConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
