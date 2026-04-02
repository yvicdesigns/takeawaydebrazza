// ============================================================
// PAGE ADMIN : Rapports & Historique
// Données persistantes, filtres par période, export CSV/impression
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'

// ---- Utilitaires dates ----
function debutJour(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function finJour(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
function dateISO(date) {
  return date.toISOString().slice(0, 10)
}
function formatDate(str) {
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatHeure(str) {
  return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ---- Carte stat ----
function StatCard({ label, valeur, sub, couleur = 'text-white' }) {
  return (
    <div className="bg-noir rounded-2xl border border-gray-800 p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`font-black text-xl ${couleur}`}>{valeur}</p>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ---- Badge statut ----
const STATUTS = {
  en_attente:     { label: 'En attente',     cls: 'bg-yellow-900/40 text-yellow-400' },
  en_preparation: { label: 'En préparation', cls: 'bg-blue-900/40 text-blue-400' },
  en_livraison:   { label: 'En livraison',   cls: 'bg-orange-900/40 text-orange-400' },
  livre:          { label: 'Livré',          cls: 'bg-green-900/40 text-green-400' },
}

export default function ManageRapports() {
  const [commandes, setCommandes] = useState([])
  const [chargement, setChargement]   = useState(true)

  // Filtres
  const aujourd_hui = dateISO(new Date())
  const il_y_a_30j  = dateISO(new Date(Date.now() - 30 * 86400000))
  const [dateDebut, setDateDebut] = useState(il_y_a_30j)
  const [dateFin,   setDateFin]   = useState(aujourd_hui)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtrePaiement, setFiltrePaiement] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [vue, setVue] = useState('liste') // liste | jour | produits

  useEffect(() => { charger() }, [dateDebut, dateFin])

  async function charger() {
    setChargement(true)
    const debut = new Date(dateDebut); debut.setHours(0,0,0,0)
    const fin   = new Date(dateFin);   fin.setHours(23,59,59,999)

    const { data, error } = await supabase
      .from('commandes')
      .select('*')
      .gte('created_at', debut.toISOString())
      .lte('created_at', fin.toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) setCommandes(data)
    setChargement(false)
  }

  // ---- Filtrage ----
  const commandesFiltrees = useMemo(() => {
    return commandes.filter(c => {
      if (filtreStatut !== 'tous' && c.statut !== filtreStatut) return false
      if (filtrePaiement !== 'tous' && c.mode_paiement !== filtrePaiement) return false
      if (recherche) {
        const q = recherche.toLowerCase()
        if (!c.nom_client?.toLowerCase().includes(q) &&
            !c.telephone?.includes(q) &&
            !String(c.id).includes(q)) return false
      }
      return true
    })
  }, [commandes, filtreStatut, filtrePaiement, recherche])

  // ---- Stats globales ----
  const stats = useMemo(() => {
    const livrees = commandesFiltrees.filter(c => c.statut === 'livre')
    const ca = livrees.reduce((s, c) => s + (c.total || 0), 0)
    const panier = livrees.length ? Math.round(ca / livrees.length) : 0
    return { total: commandesFiltrees.length, livrees: livrees.length, ca, panier }
  }, [commandesFiltrees])

  // ---- Grouper par jour ----
  const parJour = useMemo(() => {
    const map = {}
    commandesFiltrees.forEach(c => {
      const jour = c.created_at?.slice(0, 10) || '?'
      if (!map[jour]) map[jour] = { commandes: [], ca: 0 }
      map[jour].commandes.push(c)
      if (c.statut === 'livre') map[jour].ca += c.total || 0
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [commandesFiltrees])

  // ---- Top produits ----
  const topProduits = useMemo(() => {
    const map = {}
    commandesFiltrees.forEach(c => {
      const produits = Array.isArray(c.produits) ? c.produits : []
      produits.forEach(p => {
        if (!map[p.nom]) map[p.nom] = { nom: p.nom, qte: 0, ca: 0 }
        map[p.nom].qte += p.quantite || 1
        map[p.nom].ca  += (p.prix || 0) * (p.quantite || 1)
      })
    })
    return Object.values(map).sort((a, b) => b.qte - a.qte).slice(0, 10)
  }, [commandesFiltrees])

  // ---- Export CSV ----
  function exporterCSV() {
    const BOM = '\uFEFF'
    const entetes = ['Date', 'Heure', 'N° Commande', 'Client', 'Téléphone', 'Produits', 'Total (FCFA)', 'Statut', 'Livraison', 'Paiement', 'Adresse']
    const lignes = commandesFiltrees.map(c => {
      const produits = Array.isArray(c.produits)
        ? c.produits.map(p => `${p.quantite}x ${p.nom}`).join(' | ')
        : ''
      return [
        formatDate(c.created_at),
        formatHeure(c.created_at),
        String(c.id).slice(-8),
        c.nom_client || '',
        c.telephone || '',
        produits,
        c.total || 0,
        STATUTS[c.statut]?.label || c.statut,
        c.mode_livraison === 'retrait' ? 'Retrait' : 'Livraison',
        c.mode_paiement?.replace('_', ' ') || '',
        c.adresse || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = BOM + [entetes.join(','), ...lignes].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `rapport_takeawaydebrazza_${dateDebut}_${dateFin}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Génère le HTML du rapport (partagé entre impression et PDF) ----
  function genererHTML(pourPDF = false) {
    const topProduitsHTML = topProduits.map((p, i) => `
      <tr>
        <td style="color:#666">${i + 1}</td>
        <td><strong>${p.nom}</strong></td>
        <td style="text-align:center">${p.qte}</td>
        <td style="text-align:right;font-weight:bold">${formaterPrix(p.ca)} FCFA</td>
      </tr>`).join('')

    return `
      <html><head>
      <title>Rapport TAKEAWAY DE BRAZZA — ${dateDebut} au ${dateFin}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #E63946; padding-bottom: 12px; margin-bottom: 16px; }
        .logo { font-size: 22px; font-weight: 900; color: #E63946; letter-spacing: 1px; }
        .meta { text-align: right; color: #666; font-size: 10px; line-height: 1.6; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
        .stat-card { background: #f7f7f7; border-radius: 8px; padding: 10px; text-align: center; }
        .stat-val { font-size: 18px; font-weight: 900; color: #E63946; }
        .stat-lbl { font-size: 9px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
        h2 { font-size: 12px; font-weight: 700; color: #333; border-left: 3px solid #E63946; padding-left: 8px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #E63946; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10px; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; }
        .badge-livre { background: #d4edda; color: #155724; }
        .badge-attente { background: #fff3cd; color: #856404; }
        .badge-autre { background: #e2e3e5; color: #383d41; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; color: #aaa; font-size: 9px; }
        ${pourPDF ? '' : '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'}
      </style></head><body>

      <div class="header">
        <div>
          <div class="logo">🍔 TAKEAWAY DE BRAZZA</div>
          <div style="color:#666;font-size:10px;margin-top:4px">Rapport de performance</div>
        </div>
        <div class="meta">
          Période : <strong>${formatDate(dateDebut)} → ${formatDate(dateFin)}</strong><br>
          Généré le : ${new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}<br>
          ${commandesFiltrees.length} commande${commandesFiltrees.length > 1 ? 's' : ''} affichée${commandesFiltrees.length > 1 ? 's' : ''}
        </div>
      </div>

      <div class="stats">
        <div class="stat-card"><div class="stat-val">${stats.total}</div><div class="stat-lbl">Commandes</div></div>
        <div class="stat-card"><div class="stat-val">${stats.livrees}</div><div class="stat-lbl">Livrées</div></div>
        <div class="stat-card"><div class="stat-val">${formaterPrix(stats.ca)}</div><div class="stat-lbl">CA (FCFA)</div></div>
        <div class="stat-card"><div class="stat-val">${formaterPrix(stats.panier)}</div><div class="stat-lbl">Panier moyen</div></div>
      </div>

      <h2>Détail des commandes</h2>
      <table>
        <tr><th>Date & Heure</th><th>N°</th><th>Client</th><th>Téléphone</th><th>Produits</th><th>Total</th><th>Statut</th><th>Livraison</th></tr>
        ${commandesFiltrees.map(c => {
          const badge = c.statut === 'livre'
            ? `<span class="badge badge-livre">Livré</span>`
            : c.statut === 'en_attente'
            ? `<span class="badge badge-attente">En attente</span>`
            : `<span class="badge badge-autre">${STATUTS[c.statut]?.label || c.statut}</span>`
          return `<tr>
            <td>${formatDate(c.created_at)}<br><span style="color:#999">${formatHeure(c.created_at)}</span></td>
            <td style="color:#E63946;font-weight:bold">#${String(c.id).slice(-8)}</td>
            <td><strong>${c.nom_client || ''}</strong></td>
            <td>${c.telephone || ''}</td>
            <td>${Array.isArray(c.produits) ? c.produits.map(p => `${p.quantite}× ${p.nom}`).join('<br>') : ''}</td>
            <td style="font-weight:bold;white-space:nowrap">${formaterPrix(c.total)} FCFA</td>
            <td>${badge}</td>
            <td>${c.mode_livraison === 'retrait' ? '🏪 Retrait' : '🛵 Livraison'}</td>
          </tr>`
        }).join('')}
      </table>

      ${topProduits.length > 0 ? `
      <h2>Top produits</h2>
      <table>
        <tr><th>#</th><th>Produit</th><th style="text-align:center">Qté vendue</th><th style="text-align:right">CA généré</th></tr>
        ${topProduitsHTML}
      </table>` : ''}

      <div class="footer">TAKEAWAY DE BRAZZA — Rapport généré automatiquement · ${new Date().toLocaleDateString('fr-FR')}</div>
      </body></html>
    `
  }

  // ---- Impression ----
  function imprimer() {
    const w = window.open('', '_blank')
    w.document.write(genererHTML(false))
    w.document.close()
    w.print()
  }

  // ---- Export PDF ----
  function exporterPDF() {
    const w = window.open('', '_blank')
    w.document.write(genererHTML(true))
    w.document.close()
    // Déclenche la boîte de dialogue "Enregistrer en PDF"
    w.addEventListener('load', () => {
      w.focus()
      w.print()
    })
    // Fallback si load déjà déclenché
    setTimeout(() => { try { w.focus(); w.print() } catch {} }, 500)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Rapports & Historique</h1>
          <p className="text-gray-400 text-sm">Toutes les commandes, sans limite dans le temps</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exporterCSV} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
            ⬇ CSV
          </button>
          <button onClick={exporterPDF} className="flex items-center gap-2 bg-rouge hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
            📄 PDF
          </button>
          <button onClick={imprimer} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
            🖨 Imprimer
          </button>
        </div>
      </div>

      {/* Filtres dates */}
      <div className="bg-noir rounded-2xl border border-gray-800 p-4 space-y-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Période</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: "Aujourd'hui",  debut: aujourd_hui, fin: aujourd_hui },
            { label: 'Hier',         debut: dateISO(new Date(Date.now()-86400000)),  fin: dateISO(new Date(Date.now()-86400000)) },
            { label: '7 derniers jours', debut: dateISO(new Date(Date.now()-6*86400000)), fin: aujourd_hui },
            { label: '30 derniers jours', debut: il_y_a_30j, fin: aujourd_hui },
            { label: 'Ce mois',      debut: dateISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), fin: aujourd_hui },
            { label: 'Mois dernier', debut: dateISO(new Date(new Date().getFullYear(), new Date().getMonth()-1, 1)), fin: dateISO(new Date(new Date().getFullYear(), new Date().getMonth(), 0)) },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => { setDateDebut(p.debut); setDateFin(p.fin) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                dateDebut === p.debut && dateFin === p.fin
                  ? 'bg-rouge text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-gray-500 text-xs mb-1 block">Du</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-rouge" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-gray-500 text-xs mb-1 block">Au</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-rouge" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-gray-500 text-xs mb-1 block">Rechercher</label>
            <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder="Client, téléphone, N°…"
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-rouge" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap pt-1">
          {['tous','en_attente','en_preparation','en_livraison','livre'].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${filtreStatut === s ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {s === 'tous' ? 'Tous statuts' : STATUTS[s]?.label}
            </button>
          ))}
          {['tous','cash','mtn_momo','airtel_money'].map(p => (
            <button key={p} onClick={() => setFiltrePaiement(p)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${filtrePaiement === p ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {p === 'tous' ? 'Tout paiement' : p === 'cash' ? '💵 Cash' : p === 'mtn_momo' ? '📱 MTN' : '📲 Airtel'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Commandes" valeur={stats.total} sub={`${commandesFiltrees.filter(c=>c.statut==='livre').length} livrées`} />
        <StatCard label="Chiffre d'affaires" valeur={`${formaterPrix(stats.ca)} FCFA`} couleur="text-jaune" sub="commandes livrées" />
        <StatCard label="Panier moyen" valeur={`${formaterPrix(stats.panier)} FCFA`} />
        <StatCard label="Taux livraison" valeur={stats.total ? `${Math.round(stats.livrees/stats.total*100)}%` : '—'} couleur="text-green-400" />
      </div>

      {/* Onglets vue */}
      <div className="flex gap-2">
        {[
          { id: 'liste',    label: '📋 Liste' },
          { id: 'jour',     label: '📅 Par jour' },
          { id: 'produits', label: '🍔 Top produits' },
        ].map(v => (
          <button key={v.id} onClick={() => setVue(v.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${vue === v.id ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {chargement ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-rouge border-t-transparent rounded-full animate-spin" />
        </div>
      ) : commandesFiltrees.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">📭</p>
          <p>Aucune commande sur cette période</p>
        </div>
      ) : (
        <>
          {/* ---- Vue liste ---- */}
          {vue === 'liste' && (
            <div className="space-y-3">
              {commandesFiltrees.map(c => {
                const s = STATUTS[c.statut] || { label: c.statut, cls: 'bg-gray-800 text-gray-400' }
                return (
                  <div key={c.id} className="bg-noir rounded-2xl border border-gray-800 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-sm">{c.nom_client}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">
                          #{String(c.id).slice(-8)} · {formatDate(c.created_at)} {formatHeure(c.created_at)}
                        </p>
                      </div>
                      <span className="text-jaune font-black text-sm flex-shrink-0">{formaterPrix(c.total)} FCFA</span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      {Array.isArray(c.produits) ? c.produits.map(p => `${p.quantite}× ${p.nom}`).join(' · ') : ''}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-600">
                      <span>{c.telephone}</span>
                      <span>{c.mode_livraison === 'retrait' ? '🏪 Retrait' : `🛵 ${c.adresse || 'Livraison'}`}</span>
                      <span>{c.mode_paiement === 'cash' ? '💵' : c.mode_paiement === 'mtn_momo' ? '📱 MTN' : '📲 Airtel'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ---- Vue par jour ---- */}
          {vue === 'jour' && (
            <div className="space-y-3">
              {parJour.map(([jour, data]) => (
                <div key={jour} className="bg-noir rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold text-sm">{formatDate(jour)}</span>
                      <span className="text-gray-500 text-xs">{data.commandes.length} commande{data.commandes.length > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-jaune font-black text-sm">{formaterPrix(data.ca)} FCFA</span>
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {data.commandes.map(c => {
                      const s = STATUTS[c.statut] || { label: c.statut, cls: 'bg-gray-800 text-gray-400' }
                      return (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-gray-600 text-xs w-12 flex-shrink-0">{formatHeure(c.created_at)}</span>
                          <span className="text-white text-sm flex-1 min-w-0 truncate">{c.nom_client}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
                          <span className="text-gray-300 text-sm font-bold flex-shrink-0">{formaterPrix(c.total)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---- Vue top produits ---- */}
          {vue === 'produits' && (
            <div className="bg-noir rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h3 className="text-white font-bold">Produits les plus commandés</h3>
                <p className="text-gray-500 text-xs">Sur la période sélectionnée</p>
              </div>
              <div className="divide-y divide-gray-800">
                {topProduits.map((p, i) => {
                  const maxQte = topProduits[0]?.qte || 1
                  return (
                    <div key={p.nom} className="px-5 py-3">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-gray-600 text-xs w-5 text-right">{i + 1}</span>
                        <span className="text-white text-sm font-semibold flex-1">{p.nom}</span>
                        <span className="text-gray-400 text-sm">{p.qte} vendu{p.qte > 1 ? 's' : ''}</span>
                        <span className="text-jaune text-sm font-bold">{formaterPrix(p.ca)} FCFA</span>
                      </div>
                      <div className="ml-8 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rouge rounded-full transition-all"
                          style={{ width: `${(p.qte / maxQte) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
