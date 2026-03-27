// ============================================================
// PAGE ADMIN : Gestion du menu
// Ajouter, modifier et désactiver les produits
// Catégories dynamiques + upload de photos
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'
import Modal from '../components/ui/Modal'

// Catégories par défaut (complétées par celles trouvées dans les produits)
const CATEGORIES_PAR_DEFAUT = ['burgers', 'menus', 'accompagnements', 'boissons', 'combos']
const STORAGE_BUCKET = 'produits-images'

const PRODUIT_VIDE = {
  nom: '',
  description: '',
  prix: '',
  categorie: 'burgers',
  image_url: '',
  populaire: false,
  actif: true,
  ordre: 1,
}

export default function ManageMenu() {
  const [produits, setProduits]                 = useState([])
  const [chargement, setChargement]             = useState(true)
  const [modalOuverte, setModalOuverte]         = useState(false)
  const [modalCategories, setModalCategories]   = useState(false)
  const [produitEnEdition, setProduitEnEdition] = useState(null)
  const [formulaire, setFormulaire]             = useState(PRODUIT_VIDE)
  const [sauvegarde, setSauvegarde]             = useState(false)
  const [categorieFiltre, setCategorieFiltre]   = useState('tous')
  const [uploadEnCours, setUploadEnCours]       = useState(false)

  // Catégories dynamiques : défaut + celles trouvées dans les produits
  const [categories, setCategories] = useState(() => {
    const sauvegardees = localStorage.getItem('bigman_categories')
    return sauvegardees ? JSON.parse(sauvegardees) : CATEGORIES_PAR_DEFAUT
  })
  const [nouvelleCategorie, setNouvelleCategorie] = useState('')

  const inputFichierRef = useRef(null)

  useEffect(() => {
    chargerProduits()
  }, [])

  // Synchronise les catégories avec celles trouvées dans les produits
  function synchroniserCategories(listeProduits) {
    const cats = new Set(categories)
    listeProduits.forEach(p => { if (p.categorie) cats.add(p.categorie) })
    const nouvelles = [...cats].sort()
    setCategories(nouvelles)
    localStorage.setItem('bigman_categories', JSON.stringify(nouvelles))
  }

  async function chargerProduits() {
    try {
      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .order('categorie')
        .order('ordre')

      if (error) throw error
      const liste = data || []
      setProduits(liste)
      synchroniserCategories(liste)
    } catch {
      const demo = [
        { id: 1, nom: 'Big Man Classic', prix: 3500, categorie: 'burgers', actif: true, populaire: true, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=80' },
        { id: 2, nom: 'Menu Big Man',    prix: 5500, categorie: 'menus',   actif: true, populaire: true, image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=80' },
      ]
      setProduits(demo)
    } finally {
      setChargement(false)
    }
  }

  // ---- Upload photo vers Supabase Storage ----
  async function uploaderPhoto(e) {
    const fichier = e.target.files?.[0]
    if (!fichier) return

    // Validation type et taille (max 5 Mo)
    if (!fichier.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image.')
      return
    }
    if (fichier.size > 5 * 1024 * 1024) {
      alert('Image trop lourde. Maximum 5 Mo.')
      return
    }

    setUploadEnCours(true)
    try {
      const extension = fichier.name.split('.').pop().toLowerCase()
      const nomFichier = `${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(nomFichier, fichier, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(nomFichier)

      setFormulaire(p => ({ ...p, image_url: data.publicUrl }))
    } catch (err) {
      alert(
        'Erreur lors de l\'upload.\n\n' +
        'Vérifie que le bucket "produits-images" existe dans Supabase :\n' +
        'Supabase Dashboard → Storage → New bucket → "produits-images" (public)'
      )
    } finally {
      setUploadEnCours(false)
      // Réinitialise l'input pour permettre de re-sélectionner le même fichier
      if (inputFichierRef.current) inputFichierRef.current.value = ''
    }
  }

  // ---- Gestion des catégories ----
  function ajouterCategorie() {
    const cat = nouvelleCategorie.trim().toLowerCase()
    if (!cat) return
    if (categories.includes(cat)) {
      alert('Cette catégorie existe déjà.')
      return
    }
    const mises_a_jour = [...categories, cat].sort()
    setCategories(mises_a_jour)
    localStorage.setItem('bigman_categories', JSON.stringify(mises_a_jour))
    setNouvelleCategorie('')
  }

  function supprimerCategorie(cat) {
    const utilisee = produits.some(p => p.categorie === cat)
    if (utilisee) {
      alert(`Impossible de supprimer "${cat}" : des produits utilisent cette catégorie.`)
      return
    }
    const mises_a_jour = categories.filter(c => c !== cat)
    setCategories(mises_a_jour)
    localStorage.setItem('bigman_categories', JSON.stringify(mises_a_jour))
  }

  // ---- Formulaire produit ----
  function ouvrirAjout() {
    setProduitEnEdition(null)
    setFormulaire({ ...PRODUIT_VIDE, categorie: categories[0] || 'burgers' })
    setModalOuverte(true)
  }

  function ouvrirEdition(produit) {
    setProduitEnEdition(produit)
    setFormulaire({ ...produit })
    setModalOuverte(true)
  }

  async function sauvegarderProduit(e) {
    e.preventDefault()
    setSauvegarde(true)
    try {
      const donnees = {
        ...formulaire,
        prix:  parseInt(formulaire.prix),
        ordre: parseInt(formulaire.ordre) || 1,
      }

      if (produitEnEdition) {
        const { error } = await supabase.from('produits').update(donnees).eq('id', produitEnEdition.id)
        if (error) throw error
        setProduits(prev => prev.map(p => p.id === produitEnEdition.id ? { ...p, ...donnees } : p))
      } else {
        const { data, error } = await supabase.from('produits').insert([donnees]).select().single()
        if (error) throw error
        setProduits(prev => [...prev, data])
      }
      setModalOuverte(false)
    } catch (err) {
      alert('Erreur lors de la sauvegarde : ' + err.message)
    } finally {
      setSauvegarde(false)
    }
  }

  async function toggleActif(produit) {
    try {
      await supabase.from('produits').update({ actif: !produit.actif }).eq('id', produit.id)
      setProduits(prev => prev.map(p => p.id === produit.id ? { ...p, actif: !p.actif } : p))
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  async function toggleStock(produit) {
    const enStock = produit.en_stock === false ? true : false
    try {
      await supabase.from('produits').update({ en_stock: !enStock }).eq('id', produit.id)
      setProduits(prev => prev.map(p => p.id === produit.id ? { ...p, en_stock: !enStock } : p))
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const produitsFiltres = categorieFiltre === 'tous'
    ? produits
    : produits.filter(p => p.categorie === categorieFiltre)

  return (
    <div className="p-4 md:p-6">

      {/* ---- En-tête ---- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Gérer le menu</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setModalCategories(true)}
            className="border border-gray-700 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-xl transition-colors"
          >
            🗂️ Catégories
          </button>
          <button onClick={ouvrirAjout} className="btn-primary text-sm px-4 py-2 min-h-0">
            + Ajouter
          </button>
        </div>
      </div>

      {/* ---- Filtre catégorie ---- */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {['tous', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setCategorieFiltre(cat)}
            className={`
              whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize
              ${categorieFiltre === cat
                ? 'bg-rouge text-white'
                : 'bg-noir text-gray-400 border border-gray-700 hover:border-gray-500'
              }
            `}
          >
            {cat === 'tous' ? 'Tous' : cat}
          </button>
        ))}
      </div>

      {/* ---- Liste des produits ---- */}
      {chargement ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : produitsFiltres.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🍽️</span>
          <p className="text-gray-400 text-sm">Aucun produit dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {produitsFiltres.map(produit => (
            <div
              key={produit.id}
              className={`bg-noir rounded-xl border border-gray-800 p-4 flex items-center gap-4 transition-opacity ${!produit.actif ? 'opacity-50' : ''}`}
            >
              <img
                src={produit.image_url}
                alt={produit.nom}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-800"
                onError={e => { e.target.src = 'https://via.placeholder.com/48/1C1C1C/666?text=📷' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm truncate">{produit.nom}</p>
                  {produit.populaire && <span className="text-jaune text-xs">⭐</span>}
                  {!produit.actif && <span className="text-gray-500 text-xs">(Désactivé)</span>}
                  {produit.en_stock === false && <span className="text-red-400 text-xs">(Épuisé)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-jaune font-bold text-xs">{formaterPrix(produit.prix)} FCFA</span>
                  <span className="text-gray-600 text-xs">•</span>
                  <span className="text-gray-500 text-xs capitalize">{produit.categorie}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleStock(produit)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${produit.en_stock === false ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20' : 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20'}`}
                  title="Toggle stock"
                >
                  {produit.en_stock === false ? '📦 Épuisé' : '✅ Stock'}
                </button>
                <button
                  onClick={() => toggleActif(produit)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${produit.actif ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' : 'text-gray-500 bg-gray-800 hover:bg-gray-700'}`}
                >
                  {produit.actif ? 'Actif' : 'Inactif'}
                </button>
                <button
                  onClick={() => ouvrirEdition(produit)}
                  className="text-xs text-gray-400 hover:text-white bg-noir-clair px-2 py-1 rounded-lg transition-colors"
                >
                  ✏️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================
          MODAL : Formulaire produit
      ================================================================ */}
      <Modal
        ouvert={modalOuverte}
        onFermer={() => setModalOuverte(false)}
        titre={produitEnEdition ? 'Modifier le produit' : 'Ajouter un produit'}
      >
        <form onSubmit={sauvegarderProduit} className="space-y-4">

          {/* ---- Upload photo ---- */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Photo du produit</label>

            {/* Prévisualisation */}
            {formulaire.image_url && (
              <div className="relative mb-2 w-full h-36 rounded-xl overflow-hidden bg-gray-800">
                <img
                  src={formulaire.image_url}
                  alt="Prévisualisation"
                  className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setFormulaire(p => ({ ...p, image_url: '' }))}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Bouton upload */}
            <input
              ref={inputFichierRef}
              type="file"
              accept="image/*"
              onChange={uploaderPhoto}
              className="hidden"
              id="input-photo"
            />
            <label
              htmlFor="input-photo"
              className={`
                flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed
                cursor-pointer transition-colors text-sm font-medium
                ${uploadEnCours
                  ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                  : 'border-gray-700 text-gray-400 hover:border-rouge hover:text-white'
                }
              `}
            >
              {uploadEnCours ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  📷 {formulaire.image_url ? 'Changer la photo' : 'Choisir une photo'}
                </>
              )}
            </label>

            {/* Fallback : URL manuelle */}
            <div className="mt-2">
              <input
                type="url"
                value={formulaire.image_url}
                onChange={e => setFormulaire(p => ({ ...p, image_url: e.target.value }))}
                placeholder="Ou coller une URL https://..."
                className="input-field text-xs py-2"
              />
            </div>
          </div>

          {/* ---- Nom ---- */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nom *</label>
            <input
              type="text"
              value={formulaire.nom}
              onChange={e => setFormulaire(p => ({ ...p, nom: e.target.value }))}
              className="input-field"
              required
            />
          </div>

          {/* ---- Description ---- */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Description</label>
            <textarea
              value={formulaire.description}
              onChange={e => setFormulaire(p => ({ ...p, description: e.target.value }))}
              className="input-field resize-none h-20"
            />
          </div>

          {/* ---- Prix + Catégorie ---- */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Prix (FCFA) *</label>
              <input
                type="number"
                value={formulaire.prix}
                onChange={e => setFormulaire(p => ({ ...p, prix: e.target.value }))}
                className="input-field"
                required min="0"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Catégorie *</label>
              <select
                value={formulaire.categorie}
                onChange={e => setFormulaire(p => ({ ...p, categorie: e.target.value }))}
                className="input-field"
              >
                {categories.map(c => (
                  <option key={c} value={c} className="bg-noir capitalize">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ---- Checkboxes ---- */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formulaire.populaire}
                onChange={e => setFormulaire(p => ({ ...p, populaire: e.target.checked }))}
                className="w-4 h-4 accent-rouge"
              />
              <span className="text-gray-300 text-sm">⭐ Populaire</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formulaire.actif}
                onChange={e => setFormulaire(p => ({ ...p, actif: e.target.checked }))}
                className="w-4 h-4 accent-rouge"
              />
              <span className="text-gray-300 text-sm">Actif</span>
            </label>
          </div>

          <button type="submit" disabled={sauvegarde || uploadEnCours} className="btn-primary w-full">
            {sauvegarde ? 'Sauvegarde...' : produitEnEdition ? 'Enregistrer' : 'Ajouter le produit'}
          </button>
        </form>
      </Modal>

      {/* ================================================================
          MODAL : Gestion des catégories
      ================================================================ */}
      <Modal
        ouvert={modalCategories}
        onFermer={() => setModalCategories(false)}
        titre="🗂️ Gérer les catégories"
      >
        <div className="space-y-4">

          {/* Liste des catégories existantes */}
          <div className="space-y-2">
            {categories.map(cat => {
              const nbProduits = produits.filter(p => p.categorie === cat).length
              return (
                <div key={cat} className="flex items-center justify-between bg-noir rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-semibold capitalize">{cat}</p>
                    <p className="text-gray-500 text-xs">{nbProduits} produit{nbProduits > 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => supprimerCategorie(cat)}
                    disabled={nbProduits > 0}
                    className="text-gray-600 hover:text-rouge transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg"
                    title={nbProduits > 0 ? 'Catégorie utilisée par des produits' : 'Supprimer'}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>

          {/* Ajouter une nouvelle catégorie */}
          <div className="border-t border-gray-800 pt-4">
            <label className="text-gray-400 text-xs mb-2 block">Nouvelle catégorie</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nouvelleCategorie}
                onChange={e => setNouvelleCategorie(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), ajouterCategorie())}
                placeholder="Ex : desserts, pizzas..."
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={ajouterCategorie}
                disabled={!nouvelleCategorie.trim()}
                className="btn-primary px-4 py-2 min-h-0 text-sm disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2">
              Les catégories utilisées par des produits ne peuvent pas être supprimées.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  )
}
