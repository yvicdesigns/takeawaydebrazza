// ============================================================
// PAGE ADMIN : Guide d'utilisation de l'application
// ============================================================

import { useState } from 'react'

const SECTIONS = [
  {
    id: 'client',
    emoji: '📱',
    titre: 'Application client',
    couleur: 'border-blue-700',
    couleurTitre: 'text-blue-400',
    articles: [
      {
        titre: 'Page d\'accueil',
        emoji: '🏠',
        contenu: [
          'La page d\'accueil affiche les promotions en cours, les produits populaires et les catégories.',
          'Les clients peuvent naviguer directement vers le menu ou leurs commandes en cours.',
          'Si le restaurant est fermé, une bannière rouge s\'affiche automatiquement.',
        ],
      },
      {
        titre: 'Menu & Catalogue',
        emoji: '🍔',
        contenu: [
          'Filtrage par catégorie (burgers, boissons, desserts…) via les boutons en haut.',
          'Bouton ❤️ sur chaque carte pour ajouter un produit aux favoris.',
          'Filtre ❤️ pour afficher uniquement les produits favoris.',
          'Les produits épuisés affichent un badge "Épuisé" et ne peuvent pas être ajoutés au panier.',
          'Cliquer sur une carte ouvre une fiche détaillée avec description complète.',
        ],
      },
      {
        titre: 'Panier & Commande',
        emoji: '🛒',
        contenu: [
          'Le panier est accessible via l\'icône en bas à droite ou le menu.',
          'Modifier les quantités directement dans le panier.',
          'À la caisse, choisir entre livraison à domicile ou retrait sur place.',
          'Les 5 dernières adresses sont mémorisées et proposées en sélection rapide.',
          'Champ code promo : entrer un code et cliquer "Appliquer" pour obtenir la réduction.',
          'Les frais de livraison et l\'ETA estimé s\'affichent dynamiquement.',
          'Modes de paiement disponibles : cash, mobile money, carte.',
        ],
      },
      {
        titre: 'Confirmation & Suivi',
        emoji: '📍',
        contenu: [
          'Après validation, une page de confirmation affiche le récapitulatif complet.',
          'Le suivi de commande se met à jour en temps réel (en attente → préparation → livraison → livré).',
          'Une fois livré, le client peut noter chaque produit de 1 à 5 étoiles et laisser un commentaire.',
          'Bouton WhatsApp pour contacter directement le restaurant depuis le suivi.',
        ],
      },
      {
        titre: 'Notifications sonores',
        emoji: '🔔',
        contenu: [
          'Un son de cloche joue à chaque interaction (ajout panier, validation…).',
          'Une voix française annonce les nouvelles commandes et confirmations de paiement.',
          'Les sons peuvent être personnalisés depuis l\'onglet Audio dans l\'admin.',
        ],
      },
      {
        titre: 'Messages',
        emoji: '💬',
        contenu: [
          'Les clients peuvent envoyer des messages au restaurant depuis l\'onglet Messages.',
          'Les messages sont visibles en temps réel dans l\'admin → Messagerie.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    emoji: '📊',
    titre: 'Tableau de bord',
    couleur: 'border-purple-700',
    couleurTitre: 'text-purple-400',
    articles: [
      {
        titre: 'Statistiques en temps réel',
        emoji: '📈',
        contenu: [
          'Chiffre d\'affaires, nombre de commandes, panier moyen, taux de livraison.',
          'Les stats s\'actualisent automatiquement toutes les 60 secondes.',
          'Filtres : Aujourd\'hui / 7 jours / 30 jours.',
        ],
      },
      {
        titre: 'Navigation historique du graphique',
        emoji: '🗓',
        contenu: [
          'Les flèches ← → sous le graphique permettent de naviguer dans le temps.',
          'En vue "Aujourd\'hui" : voir les heures d\'hier, avant-hier…',
          'En vue "7 jours" : voir les semaines précédentes.',
          'En vue "30 jours" : voir les mois précédents.',
          'Cliquer "Actuel" remet le graphique sur la période en cours.',
        ],
      },
      {
        titre: 'Ouverture / Fermeture rapide',
        emoji: '🔓',
        contenu: [
          'Bouton "Ouvert / Fermé" dans l\'en-tête du tableau de bord.',
          'Fermer le restaurant bloque toutes les nouvelles commandes côté client.',
          'Le statut est synchronisé avec la page Paramètres.',
        ],
      },
    ],
  },
  {
    id: 'commandes',
    emoji: '📋',
    titre: 'Gestion des commandes',
    couleur: 'border-orange-700',
    couleurTitre: 'text-orange-400',
    articles: [
      {
        titre: 'Suivi et mise à jour du statut',
        emoji: '🔄',
        contenu: [
          'Chaque commande affiche son statut actuel : En attente / En préparation / En livraison / Livré.',
          'Cliquer sur les boutons de statut pour faire avancer la commande.',
          'Le client voit la mise à jour en temps réel sur son téléphone.',
        ],
      },
      {
        titre: 'Export CSV',
        emoji: '⬇️',
        contenu: [
          'Bouton "⬇ CSV" en haut à droite pour exporter toutes les commandes visibles.',
          'Le fichier contient : numéro, client, téléphone, produits, total, statut, date, adresse, livraison, paiement.',
          'Compatible Excel, Google Sheets, LibreOffice Calc.',
        ],
      },
      {
        titre: 'Impression de ticket',
        emoji: '🖨️',
        contenu: [
          'Lien "🖨 Imprimer le ticket" sur chaque commande ouvre une fenêtre d\'impression.',
          'Le ticket affiche le numéro de commande, les produits, les quantités, le total, l\'adresse et la date.',
          'Adapté aux imprimantes thermiques (80mm) et aux imprimantes A4.',
        ],
      },
    ],
  },
  {
    id: 'menu',
    emoji: '🍔',
    titre: 'Gestion du menu',
    couleur: 'border-yellow-700',
    couleurTitre: 'text-yellow-400',
    articles: [
      {
        titre: 'Ajouter / Modifier un produit',
        emoji: '➕',
        contenu: [
          'Bouton "+ Ajouter" pour créer un nouveau produit avec nom, description, prix, catégorie et image.',
          'Cliquer sur un produit existant pour modifier ses informations.',
          'L\'image peut être une URL externe (Cloudinary, Unsplash…).',
        ],
      },
      {
        titre: 'Gestion du stock',
        emoji: '📦',
        contenu: [
          'Bouton "📦 Épuisé / ✅ Stock" pour marquer un produit comme épuisé.',
          'Un produit épuisé ne peut plus être commandé par les clients (bouton grisé + badge "Épuisé").',
          'Réactiver le stock en recliquant sur le bouton.',
        ],
      },
      {
        titre: 'Badge Populaire',
        emoji: '⭐',
        contenu: [
          'Cocher "Populaire" pour afficher le badge ⭐ Populaire sur une carte produit.',
          'Les produits populaires remontent en priorité sur la page d\'accueil.',
        ],
      },
    ],
  },
  {
    id: 'parametres',
    emoji: '⚙️',
    titre: 'Paramètres',
    couleur: 'border-gray-600',
    couleurTitre: 'text-gray-300',
    articles: [
      {
        titre: 'Statut du restaurant',
        emoji: '🔓',
        contenu: [
          'Toggle "Restaurant ouvert" pour accepter ou bloquer les commandes.',
          'Quand fermé : bannière rouge visible côté client, aucune commande ne peut être passée.',
        ],
      },
      {
        titre: 'Frais de livraison & ETA',
        emoji: '🛵',
        contenu: [
          'Modifier les frais de livraison (en FCFA) — s\'applique immédiatement à la page caisse.',
          'Modifier l\'ETA estimé (ex : "30-45 min") — affiché au client lors de la commande.',
        ],
      },
      {
        titre: 'Heures d\'ouverture',
        emoji: '🕐',
        contenu: [
          'Configurer l\'ouverture/fermeture pour chaque jour de la semaine.',
          'Toggle par jour pour marquer un jour comme fermé (ex : dimanche).',
          'Définir les heures de début et de fin pour chaque journée ouverte.',
        ],
      },
      {
        titre: 'Codes promo',
        emoji: '🎟️',
        contenu: [
          'Créer des codes promo de type pourcentage (%) ou montant fixe (FCFA).',
          'Définir une commande minimum et une date d\'expiration (optionnels).',
          'Activer / désactiver un code sans le supprimer.',
          'Supprimer un code avec l\'icône 🗑.',
          'Les codes sont insensibles à la casse (BIGMAN10 = bigman10).',
        ],
      },
    ],
  },
  {
    id: 'audio',
    emoji: '🔊',
    titre: 'Audio',
    couleur: 'border-green-700',
    couleurTitre: 'text-green-400',
    articles: [
      {
        titre: 'Sons et volumes',
        emoji: '🎚️',
        contenu: [
          'Master : active/désactive tous les sons de l\'application.',
          'Voix IA : active/désactive les annonces vocales en français.',
          'Volume indépendant pour : clics, nouvelles commandes, confirmation paiement.',
          'Boutons "Tester" pour écouter chaque son avant de valider.',
        ],
      },
      {
        titre: 'Sons personnalisés',
        emoji: '🎵',
        contenu: [
          'Télécharger un fichier audio (.mp3, .wav, .ogg) pour remplacer le son de nouvelle commande.',
          'Télécharger un fichier audio personnalisé pour le son de paiement.',
          'Taille maximale : 3 Mo par fichier.',
          'Cliquer "Supprimer" pour revenir au son par défaut.',
        ],
      },
    ],
  },
  {
    id: 'fidelite',
    emoji: '🎁',
    titre: 'Fidélité & Soldes',
    couleur: 'border-pink-700',
    couleurTitre: 'text-pink-400',
    articles: [
      {
        titre: 'Programme de fidélité',
        emoji: '🏆',
        contenu: [
          'Les clients accumulent des points à chaque commande.',
          'Définir le seuil de points pour obtenir une récompense.',
          'Gérer les récompenses depuis l\'onglet Fidélité.',
        ],
      },
      {
        titre: 'Soldes clients',
        emoji: '💰',
        contenu: [
          'Consulter et modifier le solde de chaque client.',
          'Utile pour les remboursements, crédits ou offerts spéciaux.',
        ],
      },
    ],
  },
  {
    id: 'avis',
    emoji: '⭐',
    titre: 'Avis clients',
    couleur: 'border-yellow-600',
    couleurTitre: 'text-yellow-300',
    articles: [
      {
        titre: 'Modération des avis',
        emoji: '🔍',
        contenu: [
          'Voir tous les avis laissés par les clients après livraison.',
          'Filtrer par note (1 à 5 étoiles) pour identifier rapidement les problèmes.',
          'Masquer un avis négatif ou inapproprié sans le supprimer.',
          'Réafficher un avis masqué à tout moment.',
        ],
      },
      {
        titre: 'Répondre aux avis',
        emoji: '💬',
        contenu: [
          'Écrire une réponse publique à n\'importe quel avis.',
          'La réponse s\'affiche sous l\'avis client côté application.',
          'Modifier la réponse en la réécrivant dans le champ et en renvoyant.',
        ],
      },
    ],
  },
  {
    id: 'livreurs',
    emoji: '🛵',
    titre: 'Livreurs',
    couleur: 'border-teal-700',
    couleurTitre: 'text-teal-400',
    articles: [
      {
        titre: 'Espace livreur',
        emoji: '📲',
        contenu: [
          'Les livreurs accèdent à leur espace via /livreur (page de connexion dédiée).',
          'Le tableau de bord livreur affiche les commandes à livrer en temps réel.',
          'Gérer les comptes livreurs depuis l\'onglet Livreurs dans l\'admin.',
        ],
      },
    ],
  },
]

function Article({ article }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOuvert(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{article.emoji}</span>
          <span className="text-white text-sm font-semibold">{article.titre}</span>
        </div>
        <span className={`text-gray-500 text-xs transition-transform ${ouvert ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {ouvert && (
        <div className="px-4 pb-4 space-y-2 bg-[#111]">
          {article.contenu.map((ligne, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-rouge mt-0.5 flex-shrink-0 text-xs">•</span>
              <p className="text-gray-300 text-sm leading-relaxed">{ligne}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ManageGuide() {
  const [sectionActive, setSectionActive] = useState(null)

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-white">Guide d'utilisation</h1>
        <p className="text-gray-400 text-sm mt-1">
          Documentation complète de l'application BIG MAN
        </p>
      </div>

      {/* Navigation rapide */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => {
              setSectionActive(sectionActive === s.id ? null : s.id)
              setTimeout(() => {
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 50)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              sectionActive === s.id ? 'bg-rouge text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {s.emoji} {s.titre}
          </button>
        ))}
      </div>

      {/* Sections */}
      {SECTIONS.map(section => (
        <div
          key={section.id}
          id={`section-${section.id}`}
          className={`bg-noir rounded-2xl border-l-4 ${section.couleur} border border-gray-800 overflow-hidden`}
        >
          {/* En-tête section */}
          <button
            onClick={() => setSectionActive(sectionActive === section.id ? null : section.id)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1a1a1a] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{section.emoji}</span>
              <div>
                <h2 className={`font-black text-base ${section.couleurTitre}`}>{section.titre}</h2>
                <p className="text-gray-600 text-xs">{section.articles.length} fonctionnalité{section.articles.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <span className={`text-gray-500 transition-transform ${sectionActive === section.id ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Articles */}
          {sectionActive === section.id && (
            <div className="px-4 pb-4 space-y-2">
              {section.articles.map((article, i) => (
                <Article key={i} article={article} />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5 text-center">
        <p className="text-gray-500 text-xs">
          BIG MAN App · Stack : React 18 + Vite + Tailwind CSS + Supabase
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Pour toute question technique, consulter le fichier README ou les commentaires dans le code source.
        </p>
      </div>

    </div>
  )
}
