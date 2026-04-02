// ============================================================
// COMPOSANT : MenuCard
// Carte animée d'un produit dans le menu
// Animations : entrée cascade, tap feedback, pop du +,
//              particule panier, badge quantité, reflet image
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '../../context/CartContext'
import { formaterPrix } from '../../lib/whatsapp'

function useFavori(id) {
  const [favori, setFavori] = useState(() => {
    try { return JSON.parse(localStorage.getItem('takeawaydebrazza_favoris') || '[]').includes(id) } catch { return false }
  })
  function toggle(e) {
    e.stopPropagation()
    const liste = JSON.parse(localStorage.getItem('takeawaydebrazza_favoris') || '[]')
    const maj = favori ? liste.filter(x => x !== id) : [...liste, id]
    localStorage.setItem('takeawaydebrazza_favoris', JSON.stringify(maj))
    setFavori(!favori)
    window.dispatchEvent(new Event('takeawaydebrazza_favoris_change'))
  }
  return [favori, toggle]
}

export default function MenuCard({ produit, onOuvrir, index = 0 }) {
  const { ajouterAuPanier, items } = useCart()
  const [favori, toggleFavori] = useFavori(produit.id)
  const epuise = produit.en_stock === false

  // État animations
  const [btnPop, setBtnPop]         = useState(false)
  const [badgePop, setBadgePop]     = useState(false)
  const [particles, setParticles]   = useState([]) // liste de particules {id, x, y}
  const [imgLoaded, setImgLoaded]   = useState(false)

  // Ref pour le badge quantité (détecter les changements)
  const quantiteDansPanier = items.find(item => item.id === produit.id)?.quantite || 0
  const prevQuantite       = useRef(quantiteDansPanier)

  // Pop du badge quand la quantité augmente
  useEffect(() => {
    if (quantiteDansPanier > prevQuantite.current) {
      setBadgePop(true)
      setTimeout(() => setBadgePop(false), 320)
    }
    prevQuantite.current = quantiteDansPanier
  }, [quantiteDansPanier])

  function handleAjouter(e) {
    e.stopPropagation()
    if (epuise) return
    ajouterAuPanier(produit)

    // Vibration légère (mobile)
    if (navigator.vibrate) navigator.vibrate(30)

    // Pop du bouton
    setBtnPop(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setBtnPop(true))
    })
    setTimeout(() => setBtnPop(false), 400)

    // Particule qui monte
    const rect  = e.currentTarget.getBoundingClientRect()
    const id    = Date.now()
    const x     = rect.left + rect.width  / 2
    const y     = rect.top  + rect.height / 2
    setParticles(prev => [...prev, { id, x, y }])
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 700)
  }

  // Délai en cascade (max 360ms pour que ça reste rapide)
  const delay = Math.min(index * 55, 360)

  return (
    <>
      <article
        className="carte-produit cursor-pointer select-none no-tap-highlight animate-card-in"
        style={{ animationDelay: `${delay}ms` }}
        onClick={() => onOuvrir && onOuvrir(produit)}
      >
        {/* ---- Image ---- */}
        <div className="relative overflow-hidden" style={{ height: 176 }}>
          {/* Placeholder pendant le chargement */}
          {!imgLoaded && (
            <div className="absolute inset-0 bg-gray-800 skeleton" />
          )}

          <img
            src={produit.image_url}
            alt={produit.nom}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            style={{
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease, transform 0.5s ease',
              willChange: 'transform',
            }}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300/2D2D2D/E63946?text=🍔'
              setImgLoaded(true)
            }}
          />

          {/* Reflet lumineux au chargement de l'image */}
          {imgLoaded && (
            <div
              className="img-shine-layer"
              style={{ animationDelay: `${delay + 100}ms` }}
            />
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 gradient-noir opacity-40 pointer-events-none" />

          {/* Badge Populaire */}
          {produit.populaire && (
            <span
              className="absolute top-2 left-2 badge bg-jaune text-noir text-[10px] animate-card-in"
              style={{ animationDelay: `${delay + 150}ms` }}
            >
              ⭐ Populaire
            </span>
          )}

          {/* Badge Épuisé */}
          {epuise && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-gray-800 text-gray-300 text-xs font-bold px-3 py-1 rounded-full">Épuisé</span>
            </div>
          )}

          {/* Bouton favori */}
          <button
            onClick={toggleFavori}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center transition-transform active:scale-90"
            aria-label="Ajouter aux favoris"
          >
            <span className="text-sm">{favori ? '❤️' : '🤍'}</span>
          </button>

          {/* Badge quantité dans le panier */}
          {quantiteDansPanier > 0 && !epuise && (
            <span
              className={`absolute top-2 left-2 badge bg-rouge text-white text-[10px] ${badgePop ? 'animate-badge-pop' : ''}`}
            >
              {quantiteDansPanier}×
            </span>
          )}
        </div>

        {/* ---- Infos produit ---- */}
        <div className="p-3">
          <h3 className="font-bold text-white text-sm leading-tight mb-1 line-clamp-1">
            {produit.nom}
          </h3>
          <p className="text-gray-400 text-xs line-clamp-2 mb-3 leading-relaxed">
            {produit.description}
          </p>

          {/* Note moyenne */}
          {produit.note_moyenne > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`text-sm ${n <= Math.round(produit.note_moyenne) ? 'text-yellow-400' : 'text-gray-700'}`}>★</span>
                ))}
              </div>
              <span className="text-gray-500 text-xs">({produit.nb_avis})</span>
            </div>
          )}

          {/* Prix + bouton */}
          <div className="flex items-center justify-between">
            <span
              className="font-black text-jaune text-base animate-card-in"
              style={{ animationDelay: `${delay + 80}ms` }}
            >
              {formaterPrix(produit.prix)}{' '}
              <span className="text-xs font-normal text-gray-400">FCFA</span>
            </span>

            {/* Bouton + ou Épuisé */}
            {epuise ? (
              <span className="text-gray-600 text-xs font-bold">—</span>
            ) : (
              <button
                onClick={handleAjouter}
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200
                  ${quantiteDansPanier > 0
                    ? 'bg-rouge shadow-lg shadow-rouge/30'
                    : 'bg-jaune shadow-md shadow-jaune/20 hover:bg-jaune-sombre'
                  }
                  ${btnPop ? 'animate-btn-pop' : ''}
                `}
                aria-label={`Ajouter ${produit.nom} au panier`}
              >
                {quantiteDansPanier > 0 ? (
                  <span className="text-white text-xs font-black">{quantiteDansPanier}</span>
                ) : (
                  <svg className="w-4 h-4 text-noir" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Particules portées au niveau du body (évite le overflow:hidden) */}
      {particles.map(p => createPortal(
        <div
          key={p.id}
          className="animate-float-up fixed z-[9999]"
          style={{
            left:  p.x - 7,
            top:   p.y - 7,
            width:  14,
            height: 14,
            background: 'radial-gradient(circle at 30% 30%, #FFE066, #FFCC00)',
            borderRadius: '50%',
            boxShadow: '0 0 8px rgba(255,204,0,0.8)',
          }}
        />,
        document.body
      ))}
    </>
  )
}
