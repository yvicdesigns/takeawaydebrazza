// ============================================================
// COMPOSANT : OrderStatus
// Affiche le statut d'une commande avec une timeline visuelle
// ============================================================

const ETAPES_LIVRAISON = [
  {
    cle: 'en_attente',
    label: 'Commande reçue',
    description: 'Votre commande a bien été enregistrée',
    emoji: '📋',
  },
  {
    cle: 'en_preparation',
    label: 'En préparation',
    description: 'Notre équipe prépare votre commande',
    emoji: '👨‍🍳',
  },
  {
    cle: 'en_livraison',
    label: 'En livraison',
    description: 'Votre commande est en route',
    emoji: '🛵',
  },
  {
    cle: 'livre',
    label: 'Livré !',
    description: 'Commande livrée. Bon appétit !',
    emoji: '✅',
  },
]

const ETAPES_RETRAIT = [
  {
    cle: 'en_attente',
    label: 'Commande reçue',
    description: 'Votre commande a bien été enregistrée',
    emoji: '📋',
  },
  {
    cle: 'en_preparation',
    label: 'En préparation',
    description: 'Notre équipe prépare votre commande',
    emoji: '👨‍🍳',
  },
  {
    cle: 'en_livraison',
    label: 'Prêt à retirer',
    description: 'Votre commande vous attend au comptoir',
    emoji: '🏪',
  },
  {
    cle: 'livre',
    label: 'Récupéré !',
    description: 'Commande récupérée. Bon appétit !',
    emoji: '✅',
  },
]

// Styles selon le statut de chaque étape
const STYLES_ETAPE = {
  complete: {
    cercle: 'bg-green-500 border-green-500',
    texte: 'text-white',
    label: 'text-green-400',
  },
  active: {
    cercle: 'bg-rouge border-rouge animate-pulse',
    texte: 'text-white',
    label: 'text-rouge font-bold',
  },
  inactive: {
    cercle: 'bg-transparent border-gray-700',
    texte: 'text-gray-600',
    label: 'text-gray-500',
  },
}

export default function OrderStatus({ statut, commandeId, modeLivraison = 'livraison' }) {
  const ETAPES = modeLivraison === 'retrait' ? ETAPES_RETRAIT : ETAPES_LIVRAISON

  // Trouve l'index de l'étape actuelle
  const indexActuel = ETAPES.findIndex(e => e.cle === statut)

  function getStyleEtape(index) {
    if (index < indexActuel) return STYLES_ETAPE.complete
    if (index === indexActuel) return STYLES_ETAPE.active
    return STYLES_ETAPE.inactive
  }

  return (
    <div className="bg-noir-clair rounded-2xl p-5">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white">Suivi de commande</h3>
        {commandeId && (
          <span className="text-xs text-gray-500 font-mono">#{commandeId.toString().slice(-6)}</span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {ETAPES.map((etape, index) => {
          const styles = getStyleEtape(index)
          const estDerniere = index === ETAPES.length - 1

          return (
            <div key={etape.cle} className="flex gap-4">
              {/* Colonne gauche : cercle + ligne */}
              <div className="flex flex-col items-center">
                {/* Cercle indicateur */}
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${styles.cercle}`}>
                  <span className={`text-lg ${index > indexActuel ? 'opacity-30' : ''}`}>
                    {index <= indexActuel ? etape.emoji : '○'}
                  </span>
                </div>
                {/* Ligne verticale entre les étapes */}
                {!estDerniere && (
                  <div className={`w-0.5 h-10 my-1 transition-colors duration-300 ${index < indexActuel ? 'bg-green-500' : 'bg-gray-700'}`} />
                )}
              </div>

              {/* Colonne droite : texte */}
              <div className={`pb-4 ${estDerniere ? 'pb-0' : ''}`}>
                <p className={`font-semibold text-sm transition-colors duration-300 ${styles.label}`}>
                  {etape.label}
                </p>
                {index <= indexActuel && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    {etape.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
