// ============================================================
// HOOK : useMenu
// Récupère et gère les produits du menu depuis Supabase
// Un "hook" est une fonction React réutilisable qui gère de la logique
// ============================================================

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Données de démonstration (utilisées si Supabase n'est pas configuré)
const PRODUITS_DEMO = [
  {
    id: 1,
    nom: 'Takeaway De Brazza Classic',
    description: 'Notre burger signature : steak haché, cheddar fondu, salade, tomate, oignons caramélisés et sauce maison',
    prix: 3500,
    categorie: 'burgers',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    options: { tailles: ['Simple', 'Double'], supplements: ['Bacon +500', 'Oeuf +300', 'Avocat +400'] },
    populaire: true,
    actif: true,
    ordre: 1,
  },
  {
    id: 2,
    nom: 'Takeaway De Brazza Crispy',
    description: 'Poulet croustillant, sauce piquante maison, coleslaw frais et cornichons',
    prix: 3000,
    categorie: 'burgers',
    image_url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400',
    options: { tailles: ['Simple', 'Double'], supplements: ['Extra sauce +200', 'Fromage +300'] },
    populaire: true,
    actif: true,
    ordre: 2,
  },
  {
    id: 3,
    nom: 'Menu Takeaway De Brazza',
    description: 'Takeaway De Brazza Classic + frites croustillantes + boisson au choix',
    prix: 5500,
    categorie: 'menus',
    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
    options: { boissons: ['Coca-Cola', 'Fanta Orange', 'Eau minérale', 'Jus de bissap'] },
    populaire: true,
    actif: true,
    ordre: 1,
  },
  {
    id: 4,
    nom: 'Menu Crispy',
    description: 'Takeaway De Brazza Crispy + frites + boisson au choix',
    prix: 5000,
    categorie: 'menus',
    image_url: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400',
    options: { boissons: ['Coca-Cola', 'Fanta Orange', 'Eau minérale', 'Jus de bissap'] },
    populaire: false,
    actif: true,
    ordre: 2,
  },
  {
    id: 5,
    nom: 'Frites Maison',
    description: 'Frites dorées et croustillantes, assaisonnées à la perfection',
    prix: 1000,
    categorie: 'accompagnements',
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
    options: { tailles: ['Petite', 'Grande'] },
    populaire: false,
    actif: true,
    ordre: 1,
  },
  {
    id: 6,
    nom: 'Coca-Cola',
    description: 'Bouteille 50cl bien fraîche',
    prix: 500,
    categorie: 'boissons',
    image_url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
    options: {},
    populaire: false,
    actif: true,
    ordre: 1,
  },
  {
    id: 7,
    nom: 'Jus de Bissap',
    description: 'Jus traditionnel de fleur d\'hibiscus, sucré et désaltérant',
    prix: 500,
    categorie: 'boissons',
    image_url: 'https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=400',
    options: {},
    populaire: true,
    actif: true,
    ordre: 2,
  },
  {
    id: 8,
    nom: 'Combo Famille',
    description: '4 burgers au choix + 4 frites + 4 boissons — idéal pour partager !',
    prix: 18000,
    categorie: 'combos',
    image_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400',
    options: {},
    populaire: true,
    actif: true,
    ordre: 1,
  },
]

// Catégories disponibles dans le menu
export const CATEGORIES = [
  { id: 'tous', label: 'Tous', emoji: '🍽️' },
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'menus', label: 'Menus', emoji: '🍱' },
  { id: 'accompagnements', label: 'Accompagnements', emoji: '🍟' },
  { id: 'boissons', label: 'Boissons', emoji: '🥤' },
  { id: 'combos', label: 'Combos', emoji: '🎉' },
]

export function useMenu() {
  // Liste des produits
  const [produits, setProduits] = useState([])
  // Catégorie actuellement sélectionnée
  const [categorieActive, setCategorieActive] = useState('tous')
  // Indique si les données sont en cours de chargement
  const [chargement, setChargement] = useState(true)
  // Message d'erreur éventuel
  const [erreur, setErreur] = useState(null)

  // Charge les produits au démarrage du composant
  useEffect(() => {
    chargerProduits()
  }, [])

  async function chargerProduits() {
    setChargement(true)
    setErreur(null)

    try {
      // Essaie de charger depuis Supabase
      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .eq('actif', true)
        .order('ordre')

      if (error) throw error

      // Si Supabase retourne des données, on les utilise
      if (data && data.length > 0) {
        setProduits(data)
      } else {
        // Sinon, on utilise les données de démonstration
        console.log('ℹ️ Utilisation des données de démonstration')
        setProduits(PRODUITS_DEMO)
      }
    } catch (err) {
      console.warn('Supabase non disponible, utilisation des données de démonstration:', err.message)
      // En cas d'erreur (Supabase non configuré), on utilise les démos
      setProduits(PRODUITS_DEMO)
    } finally {
      // Dans tous les cas, le chargement est terminé
      setChargement(false)
    }
  }

  // Filtre les produits selon la catégorie active
  const produitsFiltres = categorieActive === 'tous'
    ? produits
    : produits.filter(p => p.categorie === categorieActive)

  // Produits populaires (pour la section "Nos stars")
  const produitsPopulaires = produits.filter(p => p.populaire)

  return {
    produits: produitsFiltres,
    produitsPopulaires,
    tosProduits: produits,
    categorieActive,
    setCategorieActive,
    chargement,
    erreur,
    recharger: chargerProduits,
  }
}
