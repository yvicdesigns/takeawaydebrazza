// ============================================================
// CONTEXTE DU PANIER
// Le "contexte" React permet de partager des données entre tous
// les composants sans les passer manuellement à chaque fois.
// Le panier doit être accessible partout dans l'app.
// ============================================================

import { createContext, useContext, useReducer, useEffect } from 'react'

// 1. Crée le contexte (boîte vide pour l'instant)
const CartContext = createContext(null)

// ---- Reducer : gère les actions sur le panier ----
// Un reducer est une fonction qui reçoit l'état actuel + une action,
// et retourne le nouvel état. C'est le seul endroit où le panier change.
function cartReducer(etat, action) {
  switch (action.type) {

    // Ajouter un produit au panier
    case 'AJOUTER': {
      const produitExistant = etat.items.find(item => item.id === action.produit.id)

      if (produitExistant) {
        // Le produit est déjà dans le panier : on augmente la quantité
        return {
          ...etat,
          items: etat.items.map(item =>
            item.id === action.produit.id
              ? { ...item, quantite: item.quantite + 1 }
              : item
          ),
        }
      } else {
        // Nouveau produit : on l'ajoute avec quantité = 1
        return {
          ...etat,
          items: [...etat.items, { ...action.produit, quantite: 1 }],
        }
      }
    }

    // Retirer un produit du panier (diminue la quantité de 1)
    case 'RETIRER': {
      const produit = etat.items.find(item => item.id === action.id)

      if (produit && produit.quantite > 1) {
        // Diminue la quantité
        return {
          ...etat,
          items: etat.items.map(item =>
            item.id === action.id
              ? { ...item, quantite: item.quantite - 1 }
              : item
          ),
        }
      } else {
        // Supprime complètement si quantité = 1
        return {
          ...etat,
          items: etat.items.filter(item => item.id !== action.id),
        }
      }
    }

    // Supprimer complètement un produit du panier
    case 'SUPPRIMER':
      return {
        ...etat,
        items: etat.items.filter(item => item.id !== action.id),
      }

    // Vider tout le panier (après une commande réussie)
    case 'VIDER':
      return { ...etat, items: [] }

    // Action inconnue : retourne l'état sans le modifier
    default:
      return etat
  }
}

// ---- Fournisseur du contexte ----
// CartProvider enveloppe l'app et fournit le panier à tous les composants enfants
export function CartProvider({ children }) {
  // useReducer est comme useState mais pour des états complexes
  const [etat, dispatch] = useReducer(
    cartReducer,
    // État initial : on lit le panier depuis le localStorage (persistance)
    { items: [] },
    (initial) => {
      try {
        const panierSauvegarde = localStorage.getItem('takeawaydebrazza_panier')
        return panierSauvegarde ? { items: JSON.parse(panierSauvegarde) } : initial
      } catch {
        return initial
      }
    }
  )

  // Sauvegarde le panier dans localStorage à chaque changement
  // Ainsi, le panier n'est pas perdu si l'utilisateur ferme l'app
  useEffect(() => {
    localStorage.setItem('takeawaydebrazza_panier', JSON.stringify(etat.items))
  }, [etat.items])

  // Calcule le nombre total d'articles dans le panier
  const nombreArticles = etat.items.reduce((total, item) => total + item.quantite, 0)

  // Calcule le total du panier
  const totalPanier = etat.items.reduce(
    (total, item) => total + item.prix * item.quantite,
    0
  )

  // Fonctions simplifiées à exposer aux composants
  const ajouterAuPanier = (produit) => dispatch({ type: 'AJOUTER', produit })
  const retirerDuPanier = (id) => dispatch({ type: 'RETIRER', id })
  const supprimerDuPanier = (id) => dispatch({ type: 'SUPPRIMER', id })
  const viderPanier = () => dispatch({ type: 'VIDER' })

  // Tout ce qui est exposé aux composants enfants
  const valeur = {
    items: etat.items,
    nombreArticles,
    totalPanier,
    ajouterAuPanier,
    retirerDuPanier,
    supprimerDuPanier,
    viderPanier,
  }

  return (
    <CartContext.Provider value={valeur}>
      {children}
    </CartContext.Provider>
  )
}

// Hook personnalisé pour utiliser le panier dans n'importe quel composant
// Utilisation : const { items, ajouterAuPanier } = useCart()
export function useCart() {
  const contexte = useContext(CartContext)

  // Affiche une erreur si le composant n'est pas dans CartProvider
  if (!contexte) {
    throw new Error('useCart doit être utilisé à l\'intérieur de <CartProvider>')
  }

  return contexte
}
