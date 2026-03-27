// ============================================================
// COMPOSANT : PromoCarousel
// Carousel horizontal des promotions actives
// Supporte images et vidéos (autoplay muet, boucle)
// IntersectionObserver pour lancer/stopper les vidéos
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { getPromotions } from '../../lib/supabase'
import { useCart } from '../../context/CartContext'
import { formaterPrix } from '../../lib/whatsapp'

// ---- Convertit une URL en URL d'embed si YouTube ou Vimeo ----
function getEmbedUrl(url) {
  if (!url) return null
  // YouTube : youtu.be/ID ou youtube.com/watch?v=ID
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0`
  // Vimeo : vimeo.com/ID
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&controls=0`
  return null // MP4 direct ou autre
}

// ---- Lecteur vidéo intelligent ----
function VideoPromo({ src, className }) {
  const videoRef = useRef(null)
  const embedUrl = getEmbedUrl(src)

  useEffect(() => {
    const video = videoRef.current
    if (!video || embedUrl) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.4 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [embedUrl])

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        className={className}
        allow="autoplay; encrypted-media"
        allowFullScreen
        frameBorder="0"
        style={{ border: 'none' }}
      />
    )
  }

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      loop
      playsInline
      preload="metadata"
      controls
    />
  )
}

// ---- Carte paysage pleine largeur ----
function CartePromo({ promo, onClick }) {
  const reduction = Math.round((1 - promo.prix_promo / promo.prix_original) * 100)

  return (
    <div
      className="flex-shrink-0 w-full snap-start rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform select-none no-tap-highlight relative"
      style={{ height: 200 }}
      onClick={onClick}
    >
      {/* Média plein format */}
      {promo.media_url ? (
        promo.media_type === 'video' ? (
          <VideoPromo src={promo.media_url} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={promo.media_url} alt={promo.titre}
            className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-rouge/80 to-jaune/40 flex items-center justify-center">
          <span className="text-7xl">🎯</span>
        </div>
      )}

      {/* Overlay gradient bas */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Badge réduction */}
      {reduction > 0 && (
        <span className="absolute top-3 left-3 bg-rouge text-white text-sm font-black px-3 py-1 rounded-xl shadow-lg">
          -{reduction}%
        </span>
      )}

      {/* Badge vidéo */}
      {promo.media_type === 'video' && (
        <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          ▶ vidéo
        </span>
      )}

      {/* Infos superposées en bas */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-black text-lg leading-tight mb-1 drop-shadow">{promo.titre}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-jaune font-black text-xl drop-shadow">{formaterPrix(promo.prix_promo)}</span>
          <span className="text-white/60 text-sm line-through">{formaterPrix(promo.prix_original)}</span>
          <span className="text-white/60 text-sm">FCFA</span>
        </div>
      </div>
    </div>
  )
}

// ---- Composant principal ----
export default function PromoCarousel() {
  const [promos,       setPromos]       = useState([])
  const [chargement,   setChargement]   = useState(true)
  const [selectionnee, setSelectionnee] = useState(null)
  const [actif,        setActif]        = useState(0)
  const { ajouterAuPanier } = useCart()

  useEffect(() => {
    getPromotions(true).then(data => { setPromos(data); setChargement(false) })
  }, [])

  // Défilement automatique toutes les 4s
  useEffect(() => {
    if (promos.length <= 1) return
    const t = setInterval(() => setActif(i => (i + 1) % promos.length), 4000)
    return () => clearInterval(t)
  }, [promos.length])

  if (chargement || promos.length === 0) return null

  const red = selectionnee
    ? Math.round((1 - selectionnee.prix_promo / selectionnee.prix_original) * 100)
    : 0

  return (
    <>
      <section className="mb-6 px-4">
        {/* Titre */}
        <div className="flex items-center justify-between max-w-md mx-auto mb-3">
          <h2 className="text-lg font-black text-white">🔥 Promotions</h2>
          <span className="text-gray-500 text-xs">{promos.length} offre{promos.length > 1 ? 's' : ''}</span>
        </div>

        {/* Carousel pleine largeur avec snap */}
        <div className="max-w-md mx-auto">
          <div
            className="flex overflow-x-auto snap-x snap-mandatory gap-0 rounded-2xl"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={e => {
              const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth)
              setActif(idx)
            }}
          >
            {promos.map(promo => (
              <div key={promo.id} className="flex-shrink-0 w-full">
                <CartePromo promo={promo} onClick={() => setSelectionnee(promo)} />
              </div>
            ))}
          </div>

          {/* Indicateurs points */}
          {promos.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {promos.map((_, i) => (
                <span key={i} className={`block rounded-full transition-all duration-300 ${
                  i === actif ? 'w-5 h-1.5 bg-rouge' : 'w-1.5 h-1.5 bg-gray-600'
                }`} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---- Modale détail promotion ---- */}
      {selectionnee && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4"
          onClick={() => setSelectionnee(null)}
        >
          <div
            className="bg-noir-clair rounded-2xl w-full max-w-lg overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Média en grand */}
            <div className="relative h-60 bg-gray-800">
              {selectionnee.media_url ? (
                selectionnee.media_type === 'video' ? (
                  <VideoPromo src={selectionnee.media_url} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={selectionnee.media_url}
                    alt={selectionnee.titre}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rouge/30 to-jaune/20 flex items-center justify-center">
                  <span className="text-7xl">🎯</span>
                </div>
              )}

              {/* Bouton fermer */}
              <button
                onClick={() => setSelectionnee(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white text-sm hover:bg-black/80 transition-colors"
              >
                ✕
              </button>

              {/* Badge */}
              {red > 0 && (
                <span className="absolute top-3 left-3 bg-rouge text-white text-sm font-black px-3 py-1 rounded-xl shadow-lg">
                  -{red}%
                </span>
              )}
            </div>

            {/* Contenu */}
            <div className="p-5">
              <h3 className="text-white font-black text-xl mb-1">{selectionnee.titre}</h3>

              {selectionnee.description && (
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">{selectionnee.description}</p>
              )}

              {/* Prix */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-jaune font-black text-2xl">{formaterPrix(selectionnee.prix_promo)}</span>
                <span className="text-gray-500 text-base line-through">{formaterPrix(selectionnee.prix_original)}</span>
                <span className="text-gray-400 text-sm">FCFA</span>
                {red > 0 && (
                  <span className="ml-auto text-green-400 text-sm font-bold">
                    -{formaterPrix(selectionnee.prix_original - selectionnee.prix_promo)} FCFA
                  </span>
                )}
              </div>

              {/* Dates de validité */}
              {(selectionnee.date_debut || selectionnee.date_fin) && (
                <p className="text-gray-500 text-xs mb-4">
                  📅{' '}
                  {selectionnee.date_debut && `Du ${selectionnee.date_debut}`}
                  {selectionnee.date_fin   && ` au ${selectionnee.date_fin}`}
                </p>
              )}

              {/* Bouton panier si produit lié */}
              {selectionnee.produit_id && selectionnee.produits ? (
                <button
                  onClick={() => {
                    ajouterAuPanier({
                      ...selectionnee.produits,
                      prix: selectionnee.prix_promo,
                    })
                    setSelectionnee(null)
                  }}
                  className="btn-primary w-full"
                >
                  🛒 Ajouter au panier — {formaterPrix(selectionnee.prix_promo)} FCFA
                </button>
              ) : (
                <button
                  onClick={() => setSelectionnee(null)}
                  className="btn-secondary w-full"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
