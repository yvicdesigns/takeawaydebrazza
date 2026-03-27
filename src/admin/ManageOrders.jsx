// ============================================================
// PAGE ADMIN : Gestion des commandes
// ============================================================

import { useState, useEffect } from 'react'
import { supabase, updateStatutCommande, ecouterNouvellesCommandes, validerPaiementCommande, rejeterPaiementCommande, assignerLivreurCommande } from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'
import { notifierNouvelleCommande, playSuccess, notifierPaiementValide } from '../lib/sounds'

const FILTRE_STATUTS = [
  { id: 'tous',           label: 'Toutes' },
  { id: 'en_attente',     label: '⏳ Attente' },
  { id: 'en_preparation', label: '👨‍🍳 Prépa' },
  { id: 'en_livraison',   label: '🛵 Livraison' },
  { id: 'livre',          label: '✅ Livrée' },
]

const BADGE = {
  en_attente:     { label: 'En attente',     cls: 'bg-gray-700 text-gray-300' },
  en_preparation: { label: 'En préparation', cls: 'bg-blue-900/60 text-blue-300' },
  en_livraison:   { label: 'En livraison',   cls: 'bg-orange-900/60 text-orange-300' },
  livre:          { label: 'Livré ✓',        cls: 'bg-green-900/60 text-green-300' },
}

const LABELS_PAIEMENT = {
  cash: 'Cash', mtn_momo: 'MTN MoMo', airtel_money: 'Airtel Money', solde: 'Solde',
}

export default function ManageOrders() {
  const [commandes,        setCommandes]        = useState([])
  const [filtre,           setFiltre]           = useState('tous')
  const [chargement,       setChargement]       = useState(true)
  const [enCours,          setEnCours]          = useState(null)
  const [livreurs,         setLivreurs]         = useState([])
  const [livreurChoisi,    setLivreurChoisi]    = useState({}) // { [commandeId]: livreurId }
  const [assignant,        setAssignant]        = useState(null)
  const [screenshotOuvert, setScreenshotOuvert] = useState(null)

  useEffect(() => {
    charger()
    supabase.from('livreurs').select('*')
      .then(({ data }) => setLivreurs((data || []).filter(l => l.actif !== false)))
      .catch(() => {})
    const unsub = ecouterNouvellesCommandes(c => {
      setCommandes(p => [c, ...p])
      notifierNouvelleCommande(c.nom_client)
    })
    return unsub
  }, [])

  async function charger() {
    setChargement(true)
    try {
      const { data, error } = await supabase
        .from('commandes').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setCommandes(data || [])
    } catch (e) {
      alert('Erreur chargement : ' + e.message)
      setCommandes([])
    } finally {
      setChargement(false)
    }
  }

  async function changerStatut(commandeId, nouveauStatut) {
    setEnCours(commandeId)
    try {
      await updateStatutCommande(commandeId, nouveauStatut)
      setCommandes(prev => prev.map(c =>
        c.id === commandeId ? { ...c, statut: nouveauStatut } : c
      ))
      playSuccess()
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setEnCours(null)
    }
  }

  async function handleAssigner(commande) {
    const lid = livreurChoisi[commande.id]
    if (!lid) { alert('Choisis un livreur dans la liste') ; return }
    const l = livreurs.find(x => x.id === lid)
    if (!l) return
    setAssignant(commande.id)
    try {
      await assignerLivreurCommande(commande.id, l)
      setCommandes(prev => prev.map(c =>
        c.id === commande.id
          ? { ...c, livreur_id: l.id, livreur_nom: l.nom, livreur_telephone: l.telephone }
          : c
      ))
    } catch (e) {
      alert('Erreur assignation : ' + e.message)
    } finally {
      setAssignant(null)
    }
  }

  async function validerPaiement(commandeId) {
    setEnCours(commandeId)
    try {
      await validerPaiementCommande(commandeId)
      setCommandes(prev => prev.map(c =>
        c.id === commandeId ? { ...c, statut_paiement: 'valide', statut: 'en_preparation' } : c
      ))
      notifierPaiementValide()
    } catch (e) { alert('Erreur : ' + e.message) }
    finally { setEnCours(null) }
  }

  async function rejeterPaiement(commandeId) {
    setEnCours(commandeId)
    try {
      await rejeterPaiementCommande(commandeId)
      setCommandes(prev => prev.map(c =>
        c.id === commandeId ? { ...c, statut_paiement: 'rejete' } : c
      ))
    } catch (e) { alert('Erreur : ' + e.message) }
    finally { setEnCours(null) }
  }

  const nbAVerifier = commandes.filter(c => c.statut_paiement === 'en_attente').length

  const liste = filtre === 'tous' ? commandes
    : commandes.filter(c => c.statut === filtre)

  // ---- Export CSV ----
  function exporterCSV() {
    const entetes = ['ID', 'Date', 'Client', 'Téléphone', 'Statut', 'Livraison', 'Paiement', 'Total FCFA', 'Adresse', 'Produits']
    const lignes = commandes.map(c => [
      c.id,
      new Date(c.created_at).toLocaleString('fr-FR'),
      c.nom_client || '',
      c.telephone || '',
      c.statut || '',
      c.mode_livraison || '',
      c.mode_paiement || '',
      c.total || 0,
      (c.adresse || '').replace(/,/g, ' '),
      (Array.isArray(c.produits) ? c.produits.map(p => `${p.quantite}x${p.nom}`).join(' | ') : ''),
    ])
    const csv = [entetes, ...lignes].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes_bigman_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Impression ticket ----
  function imprimerTicket(commande) {
    const produits = (Array.isArray(commande.produits) ? commande.produits : [])
      .map(p => `${p.quantite}x ${p.nom} — ${p.prix * p.quantite} FCFA`).join('\n')
    const contenu = `
      <html><head><title>Ticket #${String(commande.id).slice(-8)}</title>
      <style>body{font-family:monospace;font-size:13px;width:300px;margin:0 auto;padding:10px}
      h2{text-align:center;font-size:16px}hr{border:1px dashed #000}.total{font-size:16px;font-weight:bold}</style></head>
      <body>
        <h2>🍔 BIG MAN FAST FOOD</h2>
        <hr/>
        <p>Commande #${String(commande.id).slice(-8).toUpperCase()}</p>
        <p>Client: ${commande.nom_client}</p>
        <p>Tél: ${commande.telephone}</p>
        <p>Date: ${new Date(commande.created_at).toLocaleString('fr-FR')}</p>
        <hr/>
        <pre>${produits}</pre>
        <hr/>
        ${commande.mode_livraison === 'livraison' ? `<p>🛵 Livraison: +${commande.frais_livraison || 500} FCFA</p>` : '<p>🏪 Retrait sur place</p>'}
        ${commande.adresse ? `<p>📍 ${commande.adresse}</p>` : ''}
        <hr/>
        <p class="total">TOTAL: ${commande.total} FCFA</p>
        <p>Paiement: ${commande.mode_paiement}</p>
        ${commande.notes ? `<p>Notes: ${commande.notes}</p>` : ''}
        <hr/>
        <p style="text-align:center;font-size:11px">Merci pour votre commande !</p>
      </body></html>`
    const w = window.open('', '_blank', 'width=400,height=600')
    w.document.write(contenu)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Commandes</h1>
          <p className="text-gray-400 text-sm">{commandes.length} commande{commandes.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={exporterCSV}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 px-3 py-2 rounded-xl transition-colors"
        >
          ⬇ CSV
        </button>
        <div className="flex items-center gap-2">
          {nbAVerifier > 0 && (
            <span className="bg-rouge text-white text-xs font-black px-3 py-1 rounded-full animate-pulse">
              {nbAVerifier} paiement{nbAVerifier > 1 ? 's' : ''} à vérifier
            </span>
          )}
          <button onClick={charger} className="w-9 h-9 bg-noir-clair rounded-xl flex items-center justify-center text-gray-400 hover:text-white text-lg">↻</button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {FILTRE_STATUTS.map(s => (
          <button key={s.id} onClick={() => setFiltre(s.id)}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              filtre === s.id ? 'bg-rouge text-white' : 'bg-noir border border-gray-700 text-gray-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {chargement ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : liste.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-gray-400">Aucune commande</p>
        </div>
      ) : (
        <div className="space-y-4">
          {liste.map(commande => {
            const loading   = enCours === commande.id
            const aVerifier = commande.statut_paiement === 'en_attente'
            const badge     = BADGE[commande.statut] || { label: commande.statut, cls: 'bg-gray-700 text-gray-300' }

            return (
              <div key={commande.id} className="bg-noir-clair rounded-2xl overflow-hidden">

                {/* Infos commande */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-white font-bold">{commande.nom_client}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {aVerifier && (
                          <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                            💳 À vérifier
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">
                        {commande.mode_livraison === 'retrait' ? '🏪 Retrait' : '🛵 Livraison'} · {commande.telephone}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">📍 {commande.adresse}</p>
                    </div>
                    <p className="text-jaune font-black text-sm flex-shrink-0">{formaterPrix(commande.total)} FCFA</p>
                  </div>

                  {/* Produits */}
                  <div className="bg-noir rounded-xl p-3 mb-3">
                    {(Array.isArray(commande.produits) ? commande.produits : []).map((p, i) => (
                      <p key={i} className="text-gray-300 text-xs">
                        <span className="text-jaune font-bold">{p.quantite}×</span> {p.nom}
                      </p>
                    ))}
                    {commande.notes && <p className="text-gray-500 text-xs mt-1">📝 {commande.notes}</p>}
                  </div>

                  {/* Impression ticket */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => imprimerTicket(commande)}
                      className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      🖨 Imprimer le ticket
                    </button>
                  </div>

                  {/* Livreur assigné */}
                  {commande.livreur_nom && (
                    <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-2.5 flex items-center gap-2 mb-3">
                      <span>🛵</span>
                      <p className="text-white text-xs font-semibold">{commande.livreur_nom}</p>
                      <p className="text-gray-400 text-xs">· {commande.livreur_telephone}</p>
                    </div>
                  )}

                  {/* Vérification paiement Mobile Money */}
                  {aVerifier && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-3">
                      <p className="text-orange-300 text-xs font-bold mb-2">💳 Paiement Mobile Money à vérifier</p>
                      {commande.screenshot_paiement_url ? (
                        <button onClick={() => setScreenshotOuvert(commande.screenshot_paiement_url)} className="w-full mb-2">
                          <img src={commande.screenshot_paiement_url} alt="screenshot" className="w-full max-h-32 object-contain rounded-lg border border-gray-700" />
                          <p className="text-gray-500 text-xs mt-1 text-center">Agrandir →</p>
                        </button>
                      ) : (
                        <p className="text-gray-500 text-xs mb-2">⚠️ Aucun screenshot fourni</p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => validerPaiement(commande.id)} disabled={loading}
                          className="flex-1 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">
                          {loading ? '⏳' : '✅ Valider'}
                        </button>
                        <button onClick={() => rejeterPaiement(commande.id)} disabled={loading}
                          className="flex-1 bg-rouge text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">
                          {loading ? '⏳' : '❌ Rejeter'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Assignation livreur — toujours visible si en_livraison sans livreur */}
                  {commande.statut === 'en_livraison' && !commande.livreur_nom && (
                    <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-3 mb-3">
                      <p className="text-orange-300 text-xs font-bold mb-2">🛵 Assigner un livreur</p>
                      {livreurs.length === 0 ? (
                        <div>
                          <p className="text-gray-400 text-xs mb-2">Aucun livreur chargé — vérifie les policies RLS de la table <strong>livreurs</strong> dans Supabase, ou crée un livreur dans Admin → Livreurs.</p>
                          <button onClick={() => {
                            supabase.from('livreurs').select('*')
                              .then(({ data, error }) => {
                                if (error) { alert('Erreur livreurs : ' + error.message) ; return }
                                setLivreurs((data || []).filter(l => l.actif !== false))
                                if (!data || data.length === 0) alert('Table livreurs vide — crée un livreur d\'abord')
                              })
                          }} className="text-orange-400 text-xs underline">
                            Réessayer de charger les livreurs →
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={livreurChoisi[commande.id] || ''}
                            onChange={e => setLivreurChoisi(prev => ({ ...prev, [commande.id]: e.target.value }))}
                            className="flex-1 bg-noir border border-gray-700 text-white text-sm rounded-xl px-3 py-2"
                          >
                            <option value="">— Choisir —</option>
                            {livreurs.map(l => (
                              <option key={l.id} value={l.id}>{l.nom} ({l.telephone})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssigner(commande)}
                            disabled={assignant === commande.id || !livreurChoisi[commande.id]}
                            className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            {assignant === commande.id ? '⏳' : 'OK'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bouton action principal */}
                  {commande.statut === 'en_attente' && !aVerifier && (
                    <button
                      onClick={() => changerStatut(commande.id, 'en_preparation')}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {loading ? '⏳ En cours…' : '▶️ Démarrer la préparation'}
                    </button>
                  )}

                  {commande.statut === 'en_attente' && aVerifier && (
                    <p className="text-center text-orange-400 text-sm py-2">⚠️ Validez le paiement d'abord</p>
                  )}

                  {commande.statut === 'en_preparation' && (
                    <button
                      onClick={() => changerStatut(commande.id, 'en_livraison')}
                      disabled={loading}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {loading ? '⏳ En cours…' : '🛵 Envoyer en livraison'}
                    </button>
                  )}

                  {commande.statut === 'en_livraison' && (
                    <button
                      onClick={() => changerStatut(commande.id, 'livre')}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors mt-2"
                    >
                      {loading ? '⏳ En cours…' : '✅ Marquer comme livré'}
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Screenshot plein écran */}
      {screenshotOuvert && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setScreenshotOuvert(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full text-white text-lg"
            onClick={() => setScreenshotOuvert(null)}>✕</button>
          <img src={screenshotOuvert} alt="screenshot"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
