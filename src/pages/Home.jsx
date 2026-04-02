// ============================================================
// PAGE : Accueil
// Page principale de l'application — vitrine du restaurant
// ============================================================

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMenu } from '../hooks/useMenu'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'
import MenuCard from '../components/menu/MenuCard'
import ProductModal from '../components/menu/ProductModal'
import PromoCarousel from '../components/home/PromoCarousel'
import { SkeletonCarte } from '../components/ui/SkeletonLoader'
import { formaterPrix } from '../lib/whatsapp'

export default function Home() {
  // Récupère les données du menu
  const { produitsPopulaires, chargement } = useMenu()
  const { totalPanier, nombreArticles } = useCart()
  const { isLight } = useTheme()

  // État pour la modale de détail produit
  const [produitSelectionne, setProduitSelectionne] = useState(null)

  return (
    <div className="min-h-screen pb-24">

      {/* ---- Hero Section ---- */}
      <section className="relative overflow-hidden">
        {/* Image de fond */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800"
            alt="Takeaway De Brazza Fast Food"
            className="w-full h-full object-cover"
            loading="eager" // Charge immédiatement car visible au démarrage
          />
          <div className={`absolute inset-0 ${
            isLight
              ? 'bg-gradient-to-b from-black/40 via-black/20 to-[#FFF9F0]'
              : 'bg-gradient-to-b from-noir/70 via-noir/60 to-noir'
          }`} />
        </div>

        {/* Contenu du hero */}
        <div className="relative z-10 px-4 pt-8 pb-12 max-w-md mx-auto">
          {/* Badge localisation */}
          <div className={`inline-flex items-center gap-1.5 backdrop-blur-sm border rounded-full px-3 py-1.5 mb-6 ${
            isLight ? 'bg-white/70 border-gray-300' : 'bg-noir/60 border-gray-700'
          }`}>
            <span className="text-rouge text-xs">📍</span>
            <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>Brazzaville, Congo</span>
          </div>

          <h1 className={`text-4xl font-black leading-tight mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Le meilleur<br />
            burger de <span className="text-jaune">Brazza</span>
          </h1>
          <p className={`text-sm mb-8 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            Commandez en ligne, payez comme vous voulez.<br />
            Livraison rapide ou retrait sur place.
          </p>

          {/* Boutons d'action principaux */}
          <div className="flex gap-3">
            <Link to="/menu" className="btn-primary flex-1 no-tap-highlight">
              🍔 Commander
            </Link>
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMERO || '242XXXXXXXXX'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-jaune px-5 no-tap-highlight"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ---- Promotions dynamiques ---- */}
      <PromoCarousel />

      {/* ---- Nos Stars ---- */}
      <section className="px-4 max-w-md mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white">⭐ Nos stars</h2>
          <Link to="/menu" className="text-jaune text-sm font-semibold">
            Tout voir →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {chargement
            ? Array(4).fill(0).map((_, i) => <SkeletonCarte key={i} />)
            : produitsPopulaires.slice(0, 4).map((produit) => (
                <MenuCard
                  key={produit.id}
                  produit={produit}
                  onOuvrir={setProduitSelectionne}
                />
              ))
          }
        </div>
      </section>

      {/* ---- Comment ça marche ---- */}
      <section className="px-4 max-w-md mx-auto mb-6">
        <h2 className="text-lg font-black text-white mb-4">Comment commander ?</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { etape: '1', emoji: '🍔', texte: 'Choisissez vos produits' },
            { etape: '2', emoji: '🛒', texte: 'Validez votre panier' },
            { etape: '3', emoji: '🛵', texte: 'Recevez votre commande' },
          ].map((item) => (
            <div key={item.etape} className="bg-noir-clair rounded-2xl p-4 text-center">
              <div className="w-8 h-8 gradient-rouge rounded-full flex items-center justify-center text-white text-xs font-black mx-auto mb-2">
                {item.etape}
              </div>
              <span className="text-2xl block mb-1">{item.emoji}</span>
              <p className="text-gray-300 text-xs leading-tight">{item.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Modes de paiement ---- */}
      <section className="px-4 max-w-md mx-auto mb-6">
        <h2 className="text-lg font-black text-white mb-4">💳 On accepte</h2>
        <div className="flex gap-3">
          {[
            { nom: 'Cash', icone: '💵' },
            { nom: 'MTN MoMo', icone: '📱' },
            { nom: 'Airtel Money', icone: '📲' },
          ].map((paiement) => (
            <div key={paiement.nom} className="flex-1 bg-noir-clair rounded-xl p-3 text-center">
              <span className="text-2xl block mb-1">{paiement.icone}</span>
              <p className="text-gray-300 text-xs font-medium">{paiement.nom}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Bouton flottant du panier (visible si articles) ---- */}
      {nombreArticles > 0 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-30 animate-slide-up">
          <Link
            to="/panier"
            className="flex items-center justify-between bg-jaune rounded-2xl p-4 shadow-2xl shadow-jaune/40 no-tap-highlight"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-noir/20 rounded-full flex items-center justify-center text-noir text-xs font-bold">
                {nombreArticles}
              </span>
              <span className="text-noir font-bold">Voir mon panier</span>
            </div>
            <span className="text-noir font-black">{formaterPrix(totalPanier)} FCFA</span>
          </Link>
        </div>
      )}

      {/* Modale de détail produit */}
      <ProductModal
        produit={produitSelectionne}
        ouvert={!!produitSelectionne}
        onFermer={() => setProduitSelectionne(null)}
      />
    </div>
  )
}
