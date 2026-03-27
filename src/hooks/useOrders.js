// ============================================================
// HOOK : useOrders
// Gère la création et le suivi des commandes
// ============================================================

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ouvrirWhatsApp } from '../lib/whatsapp'

export function useOrders() {
  const [commandeEnCours, setCommandeEnCours] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(null)

  // Crée une nouvelle commande
  async function passerCommande({ panier, infosClient, modeLivraison, modePaiement, total, frais_livraison, solde_utilise, reduction, code_promo, eta, screenshotPaiementUrl, statutPaiement }) {
    setChargement(true)
    setErreur(null)

    try {
      const nouvelleCommande = {
        nom_client:                infosClient.nom,
        telephone:                 infosClient.telephone,
        adresse:                   modeLivraison === 'livraison' ? infosClient.adresse : 'Retrait sur place',
        mode_livraison:            modeLivraison,
        mode_paiement:             modePaiement,
        notes:                     infosClient.notes || null,
        statut:                    'en_attente',
        screenshot_paiement_url:   screenshotPaiementUrl || null,
        statut_paiement:           statutPaiement || 'non_concerne',
        total,
        frais_livraison:           frais_livraison || 0,
        solde_utilise:             solde_utilise || 0,
        reduction:                 reduction || 0,
        code_promo:                code_promo || null,
        eta:                       eta || null,
        produits:                  panier,
        created_at:                new Date().toISOString(),
      }

      // Tente de sauvegarder dans Supabase
      const { data, error } = await supabase
        .from('commandes')
        .insert([nouvelleCommande])
        .select()
        .single()

      if (error) throw error

      setCommandeEnCours(data)

      // Envoie aussi via WhatsApp (double confirmation)
      ouvrirWhatsApp(panier, infosClient, modeLivraison, total)

      return data

    } catch (err) {
      console.warn('Supabase non disponible, commande via WhatsApp uniquement:', err.message)

      // Si Supabase échoue, on commande quand même via WhatsApp
      const commandeLocale = {
        id: 'WA-' + Date.now(),
        ...infosClient,
        modeLivraison,
        modePaiement,
        statut: 'envoyee_whatsapp',
        produits: panier,
        total,
      }

      ouvrirWhatsApp(panier, infosClient, modeLivraison, total)
      setCommandeEnCours(commandeLocale)
      return commandeLocale

    } finally {
      setChargement(false)
    }
  }

  return {
    commandeEnCours,
    chargement,
    erreur,
    passerCommande,
  }
}
