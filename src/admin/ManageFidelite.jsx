// ============================================================
// PAGE ADMIN : Gestion de la fidélité
// - Valider les récompenses quand le client réclame son burger
// - Ajuster les points manuellement
// - Configurer le seuil
// ============================================================

import { useState, useEffect } from 'react'
import {
  getStatsFidelite, validerRecompenseFidelite,
  ajusterPointsFidelite, getParametre, updateParametre,
} from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'

export default function ManageFidelite() {
  const [onglet, setOnglet]     = useState('recompenses')
  const [stats, setStats]       = useState([])
  const [seuil, setSeuil]       = useState(10)
  const [seuilDraft, setSeuilDraft] = useState('10')
  const [chargement, setChargement] = useState(false)
  const [action, setAction]     = useState(null)
  const [sauveSeuil, setSauveSeuil] = useState(false)

  // Ajustement de points
  const [clientAjust, setClientAjust] = useState(null)
  const [deltaPoints, setDeltaPoints] = useState('')
  const [envoiAjust, setEnvoiAjust]   = useState(false)

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    setChargement(true)
    const s = parseInt(await getParametre('fidelite_seuil')) || 10
    setSeuil(s)
    setSeuilDraft(String(s))
    const data = await getStatsFidelite(s)
    setStats(data)
    setChargement(false)
  }

  async function handleValider(client) {
    setAction(client.profile_id)
    await validerRecompenseFidelite(client.profile_id, client.fidelite_paliers_utilises)
    await charger()
    setAction(null)
  }

  async function handleAjusterPoints(e) {
    e.preventDefault()
    const delta = parseInt(deltaPoints)
    if (!delta || isNaN(delta)) return
    setEnvoiAjust(true)
    await ajusterPointsFidelite(clientAjust.profile_id, clientAjust.fidelite_points_bonus, delta)
    setClientAjust(null)
    setDeltaPoints('')
    await charger()
    setEnvoiAjust(false)
  }

  async function handleSauverSeuil() {
    const n = parseInt(seuilDraft)
    if (!n || n < 1) return
    setSauveSeuil(true)
    await updateParametre('fidelite_seuil', String(n))
    setSeuil(n)
    const data = await getStatsFidelite(n)
    setStats(data)
    setSauveSeuil(false)
  }

  // Stats globales
  const nbRecompensesDispos = stats.reduce((t, s) => t + Number(s.palier_disponible), 0)
  const nbClientsActifs     = stats.length
  const totalPointsDistrib  = stats.reduce((t, s) => t + Number(s.nb_livrees), 0)

  const recompenses = stats.filter(s => Number(s.palier_disponible) > 0)

  return (
    <div className="p-6 max-w-4xl">

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">🎁 Carte de fidélité</h1>
        <p className="text-gray-400 text-sm">Gérez les récompenses et les points de vos clients</p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-noir-clair rounded-2xl p-4 text-center">
          <p className={`text-2xl font-black ${nbRecompensesDispos > 0 ? 'text-jaune' : 'text-gray-500'}`}>
            {nbRecompensesDispos}
          </p>
          <p className="text-gray-400 text-xs mt-1">Burger{nbRecompensesDispos > 1 ? 's' : ''} à offrir</p>
        </div>
        <div className="bg-noir-clair rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{nbClientsActifs}</p>
          <p className="text-gray-400 text-xs mt-1">Clients actifs</p>
        </div>
        <div className="bg-noir-clair rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-rouge">{totalPointsDistrib}</p>
          <p className="text-gray-400 text-xs mt-1">Commandes livrées</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex bg-noir-clair rounded-xl p-1 mb-6 w-fit gap-1">
        {[
          { id: 'recompenses', label: recompenses.length > 0 ? `🎁 Récompenses (${recompenses.length})` : '🎁 Récompenses' },
          { id: 'clients',     label: '👥 Tous les clients' },
          { id: 'parametres',  label: '⚙️ Paramètres' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${onglet === o.id ? 'bg-rouge text-white' : 'text-gray-400 hover:text-white'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* ---- ONGLET RÉCOMPENSES ---- */}
      {onglet === 'recompenses' && (
        <div>
          {chargement ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-noir-clair rounded-2xl animate-pulse" />)}</div>
          ) : recompenses.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-6xl block mb-4">✅</span>
              <p className="text-white font-bold text-lg mb-1">Aucun burger à offrir</p>
              <p className="text-gray-400 text-sm">Tous les clients sont à jour — continuez comme ça !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recompenses.map(client => (
                <div key={client.profile_id} className="bg-noir-clair rounded-2xl p-5 border border-jaune/20">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 gradient-rouge rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                        {(client.nom || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-bold">{client.nom}</p>
                        <p className="text-gray-400 text-sm">{client.telephone}</p>
                        {client.username && <p className="text-gray-500 text-xs">@{client.username}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-jaune font-black text-2xl">{client.palier_disponible}×</p>
                      <p className="text-gray-400 text-xs">burger{Number(client.palier_disponible) > 1 ? 's' : ''} offert{Number(client.palier_disponible) > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Progression */}
                  <div className="bg-noir rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-white font-bold text-base">{client.nb_livrees}</p>
                      <p className="text-gray-500">Livrées</p>
                    </div>
                    <div>
                      <p className="text-jaune font-bold text-base">{client.palier_gagne}</p>
                      <p className="text-gray-500">Gagnés total</p>
                    </div>
                    <div>
                      <p className="text-green-400 font-bold text-base">{client.palier_disponible}</p>
                      <p className="text-gray-500">Disponibles</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleValider(client)}
                      disabled={action === client.profile_id}
                      className="flex-1 py-3 bg-jaune hover:bg-jaune/90 disabled:opacity-60 text-noir font-black text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {action === client.profile_id
                        ? <span className="w-4 h-4 border-2 border-noir/30 border-t-noir rounded-full animate-spin" />
                        : '🍔'}
                      Valider 1 burger offert
                    </button>
                    <button
                      onClick={() => { setClientAjust(client); setDeltaPoints('') }}
                      className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors"
                      title="Ajuster les points"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- ONGLET TOUS LES CLIENTS ---- */}
      {onglet === 'clients' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={charger} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              ↺ Actualiser
            </button>
          </div>
          {chargement ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-noir-clair rounded-xl animate-pulse" />)}</div>
          ) : stats.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-3">📋</span>
              <p className="text-gray-400">Aucun client avec des commandes livrées</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.map(client => {
                const progress = (Number(client.progression) / seuil) * 100
                return (
                  <div key={client.profile_id} className="bg-noir-clair rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 gradient-rouge rounded-full flex items-center justify-center text-white font-black flex-shrink-0">
                        {(client.nom || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white font-semibold text-sm truncate">{client.nom}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {Number(client.palier_disponible) > 0 && (
                              <span className="bg-jaune/20 text-jaune text-xs font-bold px-2 py-0.5 rounded-full">
                                {client.palier_disponible}× 🍔
                              </span>
                            )}
                            <p className="text-gray-500 text-xs">{client.nb_livrees} livrées</p>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs">{client.telephone}</p>
                      </div>
                      <button
                        onClick={() => { setClientAjust(client); setDeltaPoints('') }}
                        className="text-gray-600 hover:text-gray-400 text-xs transition-colors flex-shrink-0"
                      >
                        ✏️
                      </button>
                    </div>
                    {/* Barre de progression */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-jaune rounded-full transition-all"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <p className="text-gray-600 text-xs flex-shrink-0 w-14 text-right">
                        {client.progression}/{seuil}
                      </p>
                    </div>
                    {client.fidelite_points_bonus !== 0 && (
                      <p className="text-gray-600 text-xs mt-1">
                        +{client.fidelite_points_bonus} points bonus
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- ONGLET PARAMÈTRES ---- */}
      {onglet === 'parametres' && (
        <div className="max-w-sm">
          <div className="bg-noir-clair rounded-2xl p-5 mb-4">
            <h3 className="text-white font-bold mb-1">Seuil de fidélité</h3>
            <p className="text-gray-400 text-sm mb-4">
              Nombre de commandes livrées nécessaires pour gagner 1 burger offert.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="number"
                min="1"
                max="50"
                value={seuilDraft}
                onChange={e => setSeuilDraft(e.target.value)}
                className="input-field w-24 text-center text-lg font-bold"
              />
              <div>
                <p className="text-white text-sm font-semibold">commandes livrées</p>
                <p className="text-gray-500 text-xs">= 1 burger offert</p>
              </div>
            </div>
            {/* Aperçu slider */}
            <div className="flex gap-1 mb-4">
              {[5, 8, 10, 15, 20].map(v => (
                <button
                  key={v}
                  onClick={() => setSeuilDraft(String(v))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${seuilDraft === String(v) ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={handleSauverSeuil}
              disabled={sauveSeuil || parseInt(seuilDraft) === seuil}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sauveSeuil && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Sauvegarder
            </button>
            {parseInt(seuilDraft) !== seuil && (
              <p className="text-gray-500 text-xs text-center mt-2">
                Actuellement : {seuil} commandes → Nouveau : {seuilDraft} commandes
              </p>
            )}
          </div>

          <div className="bg-noir-clair rounded-2xl p-4">
            <p className="text-gray-400 text-sm leading-relaxed">
              <span className="text-white font-semibold">Comment ça marche ?</span><br />
              Quand un client atteint le seuil, l'app lui affiche un badge "Burger offert".
              Il vient au restaurant, tu appuies sur <span className="text-jaune font-semibold">Valider 1 burger offert</span> et son compteur se remet à zéro.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL : Ajustement points
      ================================================================ */}
      {clientAjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setClientAjust(null)} />
          <div className="relative bg-[#1C1C1C] rounded-3xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-white font-black text-lg mb-1">Ajuster les points</h3>
            <p className="text-gray-400 text-sm mb-4">
              {clientAjust.nom} — actuellement {clientAjust.fidelite_points_bonus > 0 ? `+${clientAjust.fidelite_points_bonus}` : clientAjust.fidelite_points_bonus} points bonus
            </p>

            <form onSubmit={handleAjusterPoints} className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">
                  Points à ajouter ou retirer (ex: +2 ou -1)
                </label>
                <input
                  autoFocus
                  type="number"
                  value={deltaPoints}
                  onChange={e => setDeltaPoints(e.target.value)}
                  placeholder="Ex: +3 ou -1"
                  className="input-field text-center text-xl font-bold"
                />
              </div>

              <div className="flex gap-2">
                {[-2, -1, +1, +2, +3].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDeltaPoints(String(v))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${String(deltaPoints) === String(v) ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    {v > 0 ? `+${v}` : v}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setClientAjust(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={envoiAjust || !deltaPoints}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {envoiAjust && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
