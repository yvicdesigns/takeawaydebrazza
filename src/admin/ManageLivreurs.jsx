// ============================================================
// ADMIN : Gestion des livreurs
// Créer, modifier, désactiver les comptes livreurs
// ============================================================

import { useState, useEffect } from 'react'
import { supabase, creerLivreur, updateLivreur, supprimerLivreur } from '../lib/supabase'

const FORM_VIDE = { nom: '', telephone: '', code_acces: '' }

export default function ManageLivreurs() {
  const [livreurs,    setLivreurs]    = useState([])
  const [chargement,  setChargement]  = useState(true)
  const [formOuvert,  setFormOuvert]  = useState(false)
  const [editeLivreur, setEditeLivreur] = useState(null)
  const [form,         setForm]        = useState(FORM_VIDE)
  const [sauvegarde,   setSauvegarde]  = useState(false)
  const [supprimant,   setSupprimant]  = useState(null)
  const [codeVisible,  setCodeVisible] = useState({})

  useEffect(() => { charger() }, [])

  async function charger() {
    setChargement(true)
    const { data } = await supabase.from('livreurs').select('*').order('nom')
    setLivreurs(data || [])
    setChargement(false)
  }

  function ouvrirFormulaire(livreur = null) {
    if (livreur) {
      setEditeLivreur(livreur)
      setForm({ nom: livreur.nom, telephone: livreur.telephone, code_acces: livreur.code_acces })
    } else {
      setEditeLivreur(null)
      setForm(FORM_VIDE)
    }
    setFormOuvert(true)
  }

  async function handleSauvegarder() {
    if (!form.nom.trim())       { alert('Le nom est requis') ; return }
    if (!form.telephone.trim()) { alert('Le téléphone est requis') ; return }
    if (!form.code_acces.trim()) { alert('Le code d\'accès est requis') ; return }

    setSauvegarde(true)
    try {
      if (editeLivreur) {
        await updateLivreur(editeLivreur.id, {
          nom:       form.nom.trim(),
          telephone: form.telephone.replace(/\s/g, ''),
          code_acces: form.code_acces.trim(),
        })
      } else {
        await creerLivreur({
          nom:       form.nom.trim(),
          telephone: form.telephone,
          code_acces: form.code_acces.trim(),
        })
      }
      setFormOuvert(false)
      await charger()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSauvegarde(false)
    }
  }

  async function toggleActif(livreur) {
    await updateLivreur(livreur.id, { actif: !livreur.actif })
    setLivreurs(prev => prev.map(l => l.id === livreur.id ? { ...l, actif: !l.actif } : l))
  }

  async function handleSupprimer(livreur) {
    if (!confirm(`Supprimer le compte de ${livreur.nom} ?`)) return
    setSupprimant(livreur.id)
    try {
      await supprimerLivreur(livreur.id)
      setLivreurs(prev => prev.filter(l => l.id !== livreur.id))
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSupprimant(null)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white">🛵 Livreurs</h1>
          <p className="text-gray-400 text-sm">{livreurs.length} compte{livreurs.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => ouvrirFormulaire()} className="btn-primary text-sm px-4 py-2">
          + Nouveau livreur
        </button>
      </div>

      {/* Info connexion */}
      <div className="bg-noir-clair border border-gray-700 rounded-xl p-3 mb-5 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">ℹ️</span>
        <div>
          <p className="text-white text-xs font-semibold mb-0.5">Lien de connexion livreur</p>
          <p className="text-gray-400 text-xs break-all">
            {window.location.origin}/livreur
          </p>
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.origin + '/livreur')}
            className="text-jaune text-xs font-semibold mt-1"
          >
            Copier le lien →
          </button>
        </div>
      </div>

      {/* Liste */}
      {chargement ? (
        <div className="space-y-3">
          {Array(2).fill(0).map((_, i) => <div key={i} className="bg-noir-clair rounded-2xl h-20 skeleton" />)}
        </div>
      ) : livreurs.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🛵</span>
          <p className="text-gray-400 text-sm mb-4">Aucun livreur créé</p>
          <button onClick={() => ouvrirFormulaire()} className="btn-primary">Créer le premier livreur</button>
        </div>
      ) : (
        <div className="space-y-3">
          {livreurs.map(livreur => (
            <div
              key={livreur.id}
              className={`bg-noir-clair rounded-2xl p-4 flex items-center gap-4 transition-opacity ${!livreur.actif ? 'opacity-50' : ''}`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 bg-jaune/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🛵</span>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{livreur.nom}</p>
                <p className="text-gray-400 text-sm">{livreur.telephone}</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-gray-500 text-xs">
                    Code :{' '}
                    <span className="text-gray-300 font-mono">
                      {codeVisible[livreur.id] ? livreur.code_acces : '••••'}
                    </span>
                  </p>
                  <button
                    onClick={() => setCodeVisible(v => ({ ...v, [livreur.id]: !v[livreur.id] }))}
                    className="text-gray-600 hover:text-gray-400 text-xs"
                  >
                    {codeVisible[livreur.id] ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => toggleActif(livreur)}
                  title={livreur.actif ? 'Désactiver' : 'Activer'}
                  className={`relative w-10 h-6 rounded-full transition-colors ${livreur.actif ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${livreur.actif ? 'left-5' : 'left-1'}`} />
                </button>
                <button onClick={() => ouvrirFormulaire(livreur)} className="text-gray-400 hover:text-jaune text-sm">✏️</button>
                <button
                  onClick={() => handleSupprimer(livreur)}
                  disabled={supprimant === livreur.id}
                  className="text-gray-400 hover:text-rouge text-sm"
                >
                  {supprimant === livreur.id ? '⏳' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulaire */}
      {formOuvert && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-noir-clair rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-white font-black">
                {editeLivreur ? 'Modifier le livreur' : 'Nouveau livreur'}
              </h2>
              <button onClick={() => setFormOuvert(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Nom complet *</label>
                <input
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  className="input-field"
                  placeholder="Ex: Patrick Moukala"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Téléphone *</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  className="input-field"
                  placeholder="06 XXXXXXX"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Code d'accès * (PIN)</label>
                <input
                  value={form.code_acces}
                  onChange={e => setForm(f => ({ ...f, code_acces: e.target.value }))}
                  className="input-field"
                  placeholder="Ex: 1234"
                  maxLength={8}
                />
                <p className="text-gray-500 text-xs mt-1">
                  Le livreur utilisera ce code pour se connecter à son espace
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-800 flex gap-3">
              <button onClick={() => setFormOuvert(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={handleSauvegarder}
                disabled={sauvegarde}
                className="btn-primary flex-1"
              >
                {sauvegarde ? 'Sauvegarde…' : editeLivreur ? 'Mettre à jour' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
