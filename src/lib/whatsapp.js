// ============================================================
// INTÉGRATION WHATSAPP
// Génère un message formaté et ouvre WhatsApp avec la commande
// ============================================================

// Numéro WhatsApp du restaurant (depuis les variables d'environnement)
const NUMERO_RESTAURANT = import.meta.env.VITE_WHATSAPP_NUMERO || '242XXXXXXXXX'

// Génère le message WhatsApp formaté à partir du panier
export function genererMessageWhatsApp(panier, infosClient, modeLivraison, total) {
  // Crée la liste des produits commandés
  const lignesProduits = panier.map((item) => {
    // Format : "• 2x Takeaway De Brazza Burger — 3 000 FCFA"
    return `• ${item.quantite}x ${item.nom} — ${formaterPrix(item.prix * item.quantite)} FCFA`
  })

  const fraisLivraison = modeLivraison === 'livraison' ? 500 : 0

  // Construit le message complet
  const lignes = [
    '🍔 *NOUVELLE COMMANDE — TAKEAWAY DE BRAZZA*',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '*Produits commandés :*',
    ...lignesProduits,
    '',
    fraisLivraison > 0 ? `🛵 Livraison : +${formaterPrix(fraisLivraison)} FCFA` : null,
    `*Total : ${formaterPrix(total)} FCFA*`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '*Informations client :*',
    `👤 Nom : ${infosClient.nom}`,
    `📱 Téléphone : ${infosClient.telephone}`,
    '',
    // Affiche l'adresse si livraison, ou "Retrait sur place"
    modeLivraison === 'livraison'
      ? `🏠 Adresse : ${infosClient.adresse}`
      : '🏪 Mode : Retrait sur place',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `💳 Paiement : ${infosClient.modePaiement}`,
    // Ajoute les notes seulement si présentes
    infosClient.notes ? `📝 Notes : ${infosClient.notes}` : null,
    '',
    '_Commande passée via l\'app Takeaway De Brazza_',
  ]

  return lignes.filter(ligne => ligne !== null).join('\n')
}

// Ouvre WhatsApp avec le message pré-rempli
export function ouvrirWhatsApp(panier, infosClient, modeLivraison, total) {
  const message = genererMessageWhatsApp(panier, infosClient, modeLivraison, total)

  // encodeURIComponent transforme le texte en format URL (espaces → %20, etc.)
  const messageEncoded = encodeURIComponent(message)

  // Construit l'URL WhatsApp
  const urlWhatsApp = `https://wa.me/${NUMERO_RESTAURANT}?text=${messageEncoded}`

  // Ouvre WhatsApp dans un nouvel onglet (ou l'app WhatsApp sur mobile)
  window.open(urlWhatsApp, '_blank')
}

// Formate un nombre en prix lisible
// Exemple : 3000 → "3 000"
export function formaterPrix(montant) {
  return new Intl.NumberFormat('fr-FR').format(montant)
}

// Calcule le total d'un panier
export function calculerTotal(panier) {
  return panier.reduce((total, item) => total + item.prix * item.quantite, 0)
}

// Calcule les frais de livraison (logique simple, à adapter)
export function calculerFraisLivraison(modeLivraison, adresse = '', fraisConfig = 500) {
  if (modeLivraison === 'retrait') return 0
  return fraisConfig
}
