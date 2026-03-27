// ============================================================
// PAGE ADMIN : Gestion des soldes clients
// - Valider / refuser les demandes de recharge
// - Top up manuel d'un client
// - Vue d'ensemble des soldes
// ============================================================

import { useState, useEffect } from 'react'
import {
  getDemandesRecharge, getTousSoldes,
  validerRecharge, refuserRecharge, topUpSoldeAdmin,
  ecouterDemandesRecharge,
} from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'

export default function ManageSoldes() {
  const [onglet, setOnglet]           = useState('demandes') // 'demandes' | 'clients' | 'topup'
  const [demandes, setDemandes]       = useState([])
  const [clients, setClients]         = useState([])
  const [chargement, setChargement]   = useState(false)
  const [action, setAction]           = useState(null) // id en cours de traitement

  // Top-up manuel
  const [formTopUp, setFormTopUp]     = useState({ telephone: '', nom_client: '', montant: '', note: '' })
  const [errTopUp, setErrTopUp]       = useState('')
  const [succesTopUp, setSuccesTopUp] = useState(false)
  const [envoiTopUp, setEnvoiTopUp]   = useState(false)

  useEffect(() => {
    chargerDemandes()
    chargerClients()

    // Écoute les nouvelles demandes en temps réel
    const desabonner = ecouterDemandesRecharge((nouvelle) => {
      setDemandes(prev => [nouvelle, ...prev])
    })
    return desabonner
  }, [])

  async function chargerDemandes() {
    setChargement(true)
    const data = await getDemandesRecharge()
    setDemandes(data)
    setChargement(false)
  }

  async function chargerClients() {
    const data = await getTousSoldes()
    setClients(data)
  }

  async function handleValider(d) {
    setAction(d.id)
    await validerRecharge(d.id, d.telephone, d.nom_client, d.montant)
    setDemandes(prev => prev.filter(x => x.id !== d.id))
    chargerClients()
    setAction(null)
  }

  async function handleRefuser(d) {
    setAction(d.id + '_refus')
    await refuserRecharge(d.id)
    setDemandes(prev => prev.filter(x => x.id !== d.id))
    setAction(null)
  }

  async function handleTopUp(e) {
    e.preventDefault()
    setErrTopUp('')
    const montant = parseInt(formTopUp.montant)
    if (!formTopUp.telephone.trim()) { setErrTopUp('Numéro obligatoire'); return }
    if (!montant || montant < 1) { setErrTopUp('Montant invalide'); return }
    setEnvoiTopUp(true)
    try {
      await topUpSoldeAdmin({
        telephone: formTopUp.telephone.trim(),
        nom_client: formTopUp.nom_client.trim() || 'Client',
        montant,
        note: formTopUp.note.trim() || 'Top up admin',
      })
      setSuccesTopUp(true)
      setFormTopUp({ telephone: '', nom_client: '', montant: '', note: '' })
      chargerClients()
      setTimeout(() => setSuccesTopUp(false), 3000)
    } catch {
      setErrTopUp('Erreur lors du top up. Réessaie.')
    } finally {
      setEnvoiTopUp(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">💰 Soldes clients</h1>
        <p className="text-gray-400 text-sm">Gestion des recharges et des portefeuilles</p>
      </div>

      {/* Onglets */}
      <div className="flex bg-noir-clair rounded-xl p-1 mb-6 w-fit gap-1">
        {[
          { id: 'demandes', label: `Demandes${demandes.length > 0 ? ` (${demandes.length})` : ''}` },
          { id: 'clients',  label: 'Tous les soldes' },
          { id: 'topup',    label: '+ Top up manuel' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${onglet === o.id ? 'bg-rouge text-white' : 'text-gray-400 hover:text-white'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* ---- ONGLET DEMANDES ---- */}
      {onglet === 'demandes' && (
        <div>
          {chargement ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-noir-clair rounded-2xl animate-pulse" />)}
            </div>
          ) : demandes.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl block mb-4">✅</span>
              <p className="text-gray-400">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {demandes.map(d => (
                <div key={d.id} className="bg-noir-clair rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-white font-bold">{d.nom_client || 'Client'}</p>
                      <p className="text-gray-400 text-sm">{d.telephone}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {new Date(d.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-jaune font-black text-xl">{formaterPrix(d.montant)} FCFA</p>
                      <p className="text-gray-400 text-xs">{d.operateur === 'mtn' ? '📱 MTN MoMo' : '📲 Airtel Money'}</p>
                    </div>
                  </div>

                  <div className="bg-noir rounded-xl p-3 mb-4 space-y-1.5">
                    <div className="flex gap-3">
                      <span className="text-gray-500 text-xs w-28">Référence :</span>
                      <span className="text-white text-xs font-mono font-bold">{d.reference || '—'}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-gray-500 text-xs w-28">Numéro utilisé :</span>
                      <span className="text-white text-xs">{d.numero_mobile_money || '—'}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleValider(d)}
                      disabled={action === d.id}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {action === d.id && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      ✅ Valider et créditer
                    </button>
                    <button
                      onClick={() => handleRefuser(d)}
                      disabled={action === d.id + '_refus'}
                      className="px-4 py-2.5 bg-rouge/20 hover:bg-rouge/30 disabled:opacity-60 text-rouge font-bold text-sm rounded-xl transition-colors"
                    >
                      ✕ Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- ONGLET TOUS LES SOLDES ---- */}
      {onglet === 'clients' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={chargerClients} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              ↺ Actualiser
            </button>
          </div>
          {clients.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-4">💰</span>
              <p className="text-gray-400">Aucun solde enregistré</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(c => (
                <div key={c.id} className="bg-noir-clair rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 gradient-rouge rounded-full flex items-center justify-center text-white font-black flex-shrink-0">
                    {(c.nom_client || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{c.nom_client || 'Client'}</p>
                    <p className="text-gray-500 text-xs">{c.telephone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-black text-lg ${c.montant > 0 ? 'text-jaune' : 'text-gray-500'}`}>
                      {formaterPrix(c.montant)}
                    </p>
                    <p className="text-gray-600 text-xs">FCFA</p>
                  </div>
                  <button
                    onClick={() => { setOnglet('topup'); setFormTopUp(p => ({ ...p, telephone: c.telephone, nom_client: c.nom_client || '' })) }}
                    className="text-gray-500 hover:text-jaune text-xs transition-colors flex-shrink-0 ml-2"
                    title="Top up"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- ONGLET TOP UP MANUEL ---- */}
      {onglet === 'topup' && (
        <div className="max-w-md">
          <p className="text-gray-400 text-sm mb-6">
            Crédite manuellement le solde d'un client (geste commercial, remboursement, correction, etc.)
          </p>

          {succesTopUp && (
            <div className="bg-green-400/10 border border-green-400/30 rounded-2xl px-4 py-3 text-green-400 text-sm mb-5 flex items-center gap-2">
              ✅ Solde crédité avec succès !
            </div>
          )}

          <form onSubmit={handleTopUp} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Numéro de téléphone *</label>
              <input
                type="tel"
                value={formTopUp.telephone}
                onChange={e => setFormTopUp(p => ({ ...p, telephone: e.target.value }))}
                placeholder="06 XXXXXXX"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Nom du client</label>
              <input
                type="text"
                value={formTopUp.nom_client}
                onChange={e => setFormTopUp(p => ({ ...p, nom_client: e.target.value }))}
                placeholder="Jean-Pierre Moukala"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Montant à créditer (FCFA) *</label>
              <input
                type="number"
                value={formTopUp.montant}
                onChange={e => setFormTopUp(p => ({ ...p, montant: e.target.value }))}
                placeholder="Ex: 2000"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Raison / note</label>
              <input
                type="text"
                value={formTopUp.note}
                onChange={e => setFormTopUp(p => ({ ...p, note: e.target.value }))}
                placeholder="Ex: Remboursement commande #123"
                className="input-field"
              />
            </div>

            {errTopUp && (
              <div className="bg-rouge/10 border border-rouge/30 rounded-xl px-4 py-3 text-rouge text-sm">
                {errTopUp}
              </div>
            )}

            <button
              type="submit"
              disabled={envoiTopUp}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {envoiTopUp && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              ⚡ Créditer le solde
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
