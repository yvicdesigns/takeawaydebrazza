// ============================================================
// PAGE ADMIN : Modération des avis clients
// ============================================================

import { useState, useEffect } from 'react'
import { getTousAvis, toggleVisibiliteAvis, repondreAvis } from '../lib/supabase'

function Etoiles({ note }) {
  return (
    <span>
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= note ? 'text-yellow-400' : 'text-gray-700'}>★</span>
      ))}
    </span>
  )
}

export default function ManageAvis() {
  const [avis, setAvis]         = useState([])
  const [chargement, setChargement] = useState(true)
  const [reponses, setReponses] = useState({}) // { id: texte }
  const [filtreNote, setFiltreNote] = useState(0) // 0 = tous

  useEffect(() => { charger() }, [])

  async function charger() {
    setChargement(true)
    const data = await getTousAvis()
    setAvis(data)
    setChargement(false)
  }

  async function basculerVisibilite(id, visible) {
    await toggleVisibiliteAvis(id, !visible)
    setAvis(prev => prev.map(a => a.id === id ? { ...a, visible: !visible } : a))
  }

  async function envoyerReponse(id) {
    const texte = reponses[id]?.trim()
    if (!texte) return
    await repondreAvis(id, texte)
    setAvis(prev => prev.map(a => a.id === id ? { ...a, reponse_admin: texte } : a))
    setReponses(prev => ({ ...prev, [id]: '' }))
  }

  const avisFiltres = filtreNote > 0 ? avis.filter(a => a.note === filtreNote) : avis

  const moyenneGlobale = avis.length > 0
    ? (avis.reduce((s, a) => s + (a.note || 0), 0) / avis.length).toFixed(1)
    : '—'

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Avis clients</h1>
          <p className="text-gray-400 text-sm">
            {avis.length} avis · Moyenne : {moyenneGlobale} ⭐
          </p>
        </div>
        <button onClick={charger} className="text-gray-500 hover:text-white text-sm transition-colors">
          ↺ Actualiser
        </button>
      </div>

      {/* Filtre par note */}
      <div className="flex gap-2 flex-wrap">
        {[0,5,4,3,2,1].map(n => (
          <button
            key={n}
            onClick={() => setFiltreNote(n)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filtreNote === n ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {n === 0 ? 'Tous' : `${'★'.repeat(n)} (${avis.filter(a => a.note === n).length})`}
          </button>
        ))}
      </div>

      {/* Liste */}
      {chargement ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-rouge border-t-transparent rounded-full animate-spin" />
        </div>
      ) : avisFiltres.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">⭐</p>
          <p>Aucun avis pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {avisFiltres.map(a => (
            <div
              key={a.id}
              className={`bg-noir rounded-2xl border p-5 space-y-3 transition-opacity ${
                a.visible ? 'border-gray-800' : 'border-gray-800 opacity-50'
              }`}
            >
              {/* En-tête avis */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-sm">{a.nom_client || 'Anonyme'}</span>
                    <Etoiles note={a.note} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.visible ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {a.visible ? 'Visible' : 'Masqué'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {a.produit_nom} · {new Date(a.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
                  </p>
                </div>

                <button
                  onClick={() => basculerVisibilite(a.id, a.visible)}
                  className="text-xs text-gray-500 hover:text-white transition-colors flex-shrink-0"
                >
                  {a.visible ? '🙈 Masquer' : '👁 Afficher'}
                </button>
              </div>

              {/* Commentaire */}
              {a.commentaire && (
                <p className="text-gray-300 text-sm bg-[#1a1a1a] rounded-xl px-4 py-3 leading-relaxed">
                  "{a.commentaire}"
                </p>
              )}

              {/* Réponse existante */}
              {a.reponse_admin && (
                <div className="bg-rouge/10 border border-rouge/30 rounded-xl px-4 py-3">
                  <p className="text-rouge text-xs font-bold mb-1">Réponse du restaurant :</p>
                  <p className="text-gray-300 text-sm">{a.reponse_admin}</p>
                </div>
              )}

              {/* Zone réponse */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reponses[a.id] || ''}
                  onChange={e => setReponses(prev => ({ ...prev, [a.id]: e.target.value }))}
                  placeholder={a.reponse_admin ? 'Modifier la réponse...' : 'Répondre à cet avis...'}
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-rouge"
                  onKeyDown={e => e.key === 'Enter' && envoyerReponse(a.id)}
                />
                <button
                  onClick={() => envoyerReponse(a.id)}
                  disabled={!reponses[a.id]?.trim()}
                  className="bg-rouge hover:bg-red-700 disabled:opacity-30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                >
                  ↵
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
