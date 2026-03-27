// ============================================================
// ADMIN : Gestion des promotions
// Liste, création, modification, suppression
// Upload image ou vidéo vers Supabase Storage
// ============================================================

import { useState, useEffect, useRef } from 'react'
import {
  getPromotions, creerPromotion, updatePromotion, supprimerPromotion,
  uploadMediaPromotion, supprimerMediaPromotion, getProduits,
} from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'

const FORM_VIDE = {
  titre: '',
  description: '',
  prix_original: '',
  prix_promo: '',
  actif: true,
  date_debut: '',
  date_fin: '',
  produit_id: '',
  media_url: '',
  media_type: 'image',
}

export default function ManagePromotions() {
  const [promos,      setPromos]      = useState([])
  const [produits,    setProduits]    = useState([])
  const [chargement,  setChargement]  = useState(true)
  const [formOuvert,  setFormOuvert]  = useState(false)
  const [promoEditee, setPromoEditee] = useState(null)
  const [uploading,   setUploading]   = useState(false)
  const [supprimant,  setSupprimant]  = useState(null)
  const [sauvegarde,  setSauvegarde]  = useState(false)
  const [form,        setForm]        = useState(FORM_VIDE)
  const fileInputRef = useRef(null)

  useEffect(() => {
    charger()
    getProduits().then(setProduits)
  }, [])

  async function charger() {
    setChargement(true)
    const data = await getPromotions(false) // toutes, y compris inactives
    setPromos(data)
    setChargement(false)
  }

  function ouvrirFormulaire(promo = null) {
    if (promo) {
      setPromoEditee(promo)
      setForm({
        titre:        promo.titre        || '',
        description:  promo.description  || '',
        prix_original: String(promo.prix_original || ''),
        prix_promo:   String(promo.prix_promo   || ''),
        actif:        promo.actif ?? true,
        date_debut:   promo.date_debut   || '',
        date_fin:     promo.date_fin     || '',
        produit_id:   promo.produit_id   || '',
        media_url:    promo.media_url    || '',
        media_type:   promo.media_type   || 'image',
      })
    } else {
      setPromoEditee(null)
      setForm(FORM_VIDE)
    }
    setFormOuvert(true)
  }

  async function handleFileChange(e) {
    const fichier = e.target.files[0]
    if (!fichier) return

    // Vérif taille max 50 Mo
    if (fichier.size > 50 * 1024 * 1024) {
      alert('Fichier trop lourd (max 50 Mo)')
      return
    }

    setUploading(true)
    try {
      const { url, type } = await uploadMediaPromotion(fichier)
      setForm(f => ({ ...f, media_url: url, media_type: type }))
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSauvegarder() {
    if (!form.titre.trim())    { alert('Le titre est requis') ; return }
    if (!form.prix_original)   { alert('Le prix original est requis') ; return }
    if (!form.prix_promo)      { alert('Le prix promo est requis') ; return }

    setSauvegarde(true)
    try {
      const payload = {
        titre:        form.titre.trim(),
        description:  form.description.trim() || null,
        prix_original: parseInt(form.prix_original),
        prix_promo:   parseInt(form.prix_promo),
        actif:        form.actif,
        date_debut:   form.date_debut || null,
        date_fin:     form.date_fin   || null,
        produit_id:   form.produit_id  || null,
        media_url:    form.media_url   || null,
        media_type:   form.media_type,
      }

      if (promoEditee) {
        await updatePromotion(promoEditee.id, payload)
      } else {
        await creerPromotion(payload)
      }

      setFormOuvert(false)
      await charger()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSauvegarde(false)
    }
  }

  async function handleSupprimer(promo) {
    if (!confirm(`Supprimer "${promo.titre}" ?`)) return
    setSupprimant(promo.id)
    try {
      if (promo.media_url) await supprimerMediaPromotion(promo.media_url)
      await supprimerPromotion(promo.id)
      await charger()
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSupprimant(null)
    }
  }

  async function toggleActif(promo) {
    await updatePromotion(promo.id, { actif: !promo.actif })
    setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, actif: !p.actif } : p))
  }

  // Calcule le % de réduction en direct dans le formulaire
  const reductionForm = (form.prix_original && form.prix_promo && +form.prix_original > 0)
    ? Math.round((1 - +form.prix_promo / +form.prix_original) * 100)
    : 0

  return (
    <div className="p-4 max-w-2xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white">🎯 Promotions</h1>
          <p className="text-gray-400 text-sm">{promos.length} promotion{promos.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => ouvrirFormulaire()} className="btn-primary text-sm px-4 py-2">
          + Nouvelle promo
        </button>
      </div>

      {/* Liste */}
      {chargement ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <div key={i} className="bg-noir-clair rounded-2xl h-24 skeleton" />)}
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🎯</span>
          <p className="text-gray-400 text-sm mb-4">Aucune promotion créée</p>
          <button onClick={() => ouvrirFormulaire()} className="btn-primary">Créer la première promo</button>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(promo => {
            const red = Math.round((1 - promo.prix_promo / promo.prix_original) * 100)
            return (
              <div
                key={promo.id}
                className={`bg-noir-clair rounded-2xl overflow-hidden flex transition-opacity ${!promo.actif ? 'opacity-50' : ''}`}
              >
                {/* Miniature */}
                <div className="w-20 h-20 flex-shrink-0 bg-gray-800 relative">
                  {promo.media_url ? (
                    promo.media_type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                        <span className="text-xl">🎬</span>
                        <span className="text-gray-500 text-[9px] mt-1">vidéo</span>
                      </div>
                    ) : (
                      <img src={promo.media_url} alt={promo.titre} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                  )}
                  {red > 0 && (
                    <span className="absolute bottom-1 left-1 bg-rouge text-white text-[9px] font-black px-1 py-0.5 rounded-md">
                      -{red}%
                    </span>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 p-3 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{promo.titre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-jaune text-sm font-black">{formaterPrix(promo.prix_promo)}</span>
                    <span className="text-gray-500 text-xs line-through">{formaterPrix(promo.prix_original)}</span>
                    <span className="text-gray-500 text-xs">FCFA</span>
                  </div>
                  {promo.date_fin && (
                    <p className="text-gray-500 text-xs mt-0.5">Expire le {promo.date_fin}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center justify-center gap-2 pr-3">
                  {/* Toggle actif */}
                  <button
                    onClick={() => toggleActif(promo)}
                    title={promo.actif ? 'Désactiver' : 'Activer'}
                    className={`relative w-10 h-6 rounded-full transition-colors ${promo.actif ? 'bg-green-500' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${promo.actif ? 'left-5' : 'left-1'}`} />
                  </button>
                  <button onClick={() => ouvrirFormulaire(promo)} className="text-gray-400 hover:text-jaune text-sm">✏️</button>
                  <button
                    onClick={() => handleSupprimer(promo)}
                    disabled={supprimant === promo.id}
                    className="text-gray-400 hover:text-rouge text-sm"
                  >
                    {supprimant === promo.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---- Modal formulaire ---- */}
      {formOuvert && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-noir-clair rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

            {/* Header modal */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-noir-clair z-10">
              <h2 className="text-white font-black">
                {promoEditee ? 'Modifier la promotion' : 'Nouvelle promotion'}
              </h2>
              <button onClick={() => setFormOuvert(false)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="p-5 space-y-4">

              {/* Titre */}
              <div>
                <label className="text-gray-400 text-xs block mb-1">Titre *</label>
                <input
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  className="input-field"
                  placeholder="Ex : Burger du mois"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-gray-400 text-xs block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Détails de la promotion..."
                />
              </div>

              {/* Prix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Prix original (FCFA) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.prix_original}
                    onChange={e => setForm(f => ({ ...f, prix_original: e.target.value }))}
                    className="input-field"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Prix promo (FCFA) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.prix_promo}
                    onChange={e => setForm(f => ({ ...f, prix_promo: e.target.value }))}
                    className="input-field"
                    placeholder="3500"
                  />
                </div>
              </div>

              {/* Badge réduction calculé automatiquement */}
              {reductionForm > 0 && (
                <div className="bg-rouge/10 border border-rouge/30 rounded-xl px-4 py-2.5 text-center">
                  <span className="text-rouge font-black text-lg">-{reductionForm}% de réduction</span>
                  <span className="text-gray-400 text-sm ml-2">
                    (économie de {formaterPrix(+form.prix_original - +form.prix_promo)} FCFA)
                  </span>
                </div>
              )}

              {/* Upload média */}
              <div className="space-y-3">
                <label className="text-gray-400 text-xs block">Image ou vidéo</label>

                {/* Onglets image / vidéo */}
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, media_type: 'image', media_url: f.media_type === 'video' ? '' : f.media_url }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${form.media_type !== 'video' ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-400'}`}>
                    📸 Image
                  </button>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, media_type: 'video', media_url: f.media_type !== 'video' ? '' : f.media_url }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${form.media_type === 'video' ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-400'}`}>
                    🎬 Vidéo (URL)
                  </button>
                </div>

                {/* Zone upload (image + vidéo) */}
                <div
                  className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-jaune transition-colors"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="py-4">
                      <div className="w-8 h-8 border-2 border-jaune border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Upload en cours…</p>
                    </div>
                  ) : form.media_url ? (
                    <div>
                      {form.media_type === 'video' ? (
                        form.media_url.startsWith('http') ? (
                          <video src={form.media_url} controls muted className="w-full max-h-40 object-cover rounded-xl" />
                        ) : (
                          <div className="flex items-center justify-center gap-2 py-4">
                            <span className="text-3xl">🎬</span>
                            <p className="text-gray-300 text-sm">Vidéo prête</p>
                          </div>
                        )
                      ) : (
                        <img src={form.media_url} alt="aperçu" className="w-full max-h-40 object-cover rounded-xl" />
                      )}
                      <p className="text-gray-400 text-xs mt-2">Cliquer pour changer</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <span className="text-3xl block mb-2">{form.media_type === 'video' ? '🎬' : '📸'}</span>
                      <p className="text-gray-300 text-sm">
                        {form.media_type === 'video' ? 'Cliquer pour choisir une vidéo' : 'Cliquer pour choisir une image'}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        {form.media_type === 'video' ? 'mp4, mov, webm · max 100 Mo' : 'jpg, png, webp · max 4 Mo'}
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={form.media_type === 'video'
                    ? 'video/mp4,video/webm,video/quicktime,video/mov'
                    : 'image/jpeg,image/png,image/webp,image/gif'}
                  className="hidden"
                  onChange={handleFileChange}
                />
                {form.media_url && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, media_url: '' }))}
                    className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors">
                    🗑 Supprimer le média
                  </button>
                )}
              </div>

              {/* Produit lié */}
              <div>
                <label className="text-gray-400 text-xs block mb-1">Lier à un produit du menu (optionnel)</label>
                <select
                  value={form.produit_id}
                  onChange={e => setForm(f => ({ ...f, produit_id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">— Aucun produit lié —</option>
                  {produits.map(p => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
                {form.produit_id && (
                  <p className="text-gray-500 text-xs mt-1">
                    ✅ Le client pourra ajouter ce produit directement au panier depuis la promo
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Date de début</label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={form.date_fin}
                    onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Toggle actif */}
              <button
                type="button"
                className="flex items-center gap-3 w-full"
                onClick={() => setForm(f => ({ ...f, actif: !f.actif }))}
              >
                <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.actif ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.actif ? 'left-6' : 'left-1'}`} />
                </div>
                <span className="text-white text-sm text-left">
                  Promotion {form.actif ? 'active — visible côté client' : 'inactive — masquée'}
                </span>
              </button>
            </div>

            {/* Footer modal */}
            <div className="p-5 border-t border-gray-800 flex gap-3 sticky bottom-0 bg-noir-clair">
              <button onClick={() => setFormOuvert(false)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button
                onClick={handleSauvegarder}
                disabled={sauvegarde || uploading}
                className="btn-primary flex-1"
              >
                {sauvegarde ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-noir border-t-transparent rounded-full animate-spin" />
                    Sauvegarde…
                  </span>
                ) : promoEditee ? 'Mettre à jour' : 'Créer la promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
