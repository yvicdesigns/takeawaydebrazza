// ============================================================
// COMPOSANT : Photo Picker avancé
// - Sheet d'options (caméra / galerie / recadrer / avatar / supprimer)
// - Modal de recadrage : drag + pinch-to-zoom + slider + reset
// - Grille d'avatars (8 couleurs gradient + 8 emojis)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'

const CS             = 280   // taille du cercle de crop (px)
const EXPORT_SIZE    = 400   // taille du canvas exporté (px)
const ZOOM_MIN       = 1     // ne pas laisser l'image plus petite que le cercle
const ZOOM_MAX       = 5

const AVATARS_COULEURS = [
  { id: 'rouge',  a: '#CC1626', b: '#7D0B15' },
  { id: 'orange', a: '#F97316', b: '#9A3412' },
  { id: 'amber',  a: '#F59E0B', b: '#92400E' },
  { id: 'jaune',  a: '#FFCC00', b: '#A37F00' },
  { id: 'vert',   a: '#22C55E', b: '#14532D' },
  { id: 'teal',   a: '#14B8A6', b: '#134E4A' },
  { id: 'bleu',   a: '#3B82F6', b: '#1E3A8A' },
  { id: 'violet', a: '#A855F7', b: '#4C1D95' },
]
const AVATARS_EMOJI = ['🔥', '⭐', '💎', '🏆', '🎯', '🦁', '🎸', '🌶️']

// ---- Génère un avatar couleur sur canvas ----
function genererAvatarCouleur(initiale, couleurA, couleurB) {
  const c = document.createElement('canvas')
  c.width = c.height = EXPORT_SIZE
  const ctx = c.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, EXPORT_SIZE, EXPORT_SIZE)
  grad.addColorStop(0, couleurA)
  grad.addColorStop(1, couleurB)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = `bold ${EXPORT_SIZE * 0.44}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initiale.toUpperCase(), EXPORT_SIZE / 2, EXPORT_SIZE / 2 + 6)
  return c.toDataURL('image/png')
}

function genererAvatarEmoji(emoji) {
  const c = document.createElement('canvas')
  c.width = c.height = EXPORT_SIZE
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1C1C1C'
  ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)
  ctx.font = `${EXPORT_SIZE * 0.52}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, EXPORT_SIZE / 2, EXPORT_SIZE / 2 + 8)
  return c.toDataURL('image/png')
}

// ================================================================
// MODAL DE RECADRAGE PLEIN ÉCRAN
// ================================================================
export function ModalRecadrage({ src, onConfirmer, onAnnuler }) {
  const [offset,    setOffset]    = useState({ x: 0, y: 0 })
  const [zoom,      setZoom]      = useState(1)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgNat,    setImgNat]    = useState({ w: CS, h: CS }) // dimensions naturelles
  const [imgBase,   setImgBase]   = useState({ w: CS, h: CS }) // dimensions de base (cover)

  const imgRef       = useRef(null)
  const containerRef = useRef(null)
  const lastPosRef   = useRef(null)
  const lastDistRef  = useRef(null)
  const isDragging   = useRef(false)

  // ---- Chargement image : calcule la taille "cover" de base ----
  function onImgLoad() {
    const img = imgRef.current
    if (!img) return
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    // scale minimum pour couvrir le cercle (cover)
    const s = Math.max(CS / nw, CS / nh)
    setImgNat({ w: nw, h: nh })
    setImgBase({ w: nw * s, h: nh * s })
    setImgLoaded(true)
  }

  // ---- Contraindre le déplacement pour ne pas exposer de bord ----
  function contraindreOffset(ox, oy, z) {
    const visW = imgBase.w * z
    const visH = imgBase.h * z
    // Centre visuel de l'image = CS/2 + ox, CS/2 + oy
    // Bord gauche visible = CS/2 + ox - visW/2, doit être ≤ 0
    const maxX = (visW - CS) / 2
    const maxY = (visH - CS) / 2
    return {
      x: Math.min(maxX, Math.max(-maxX, ox)),
      y: Math.min(maxY, Math.max(-maxY, oy)),
    }
  }

  // ---- Touch events (passive: false pour preventDefault) ----
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      isDragging.current  = true
      lastPosRef.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      lastDistRef.current = null
    } else if (e.touches.length === 2) {
      isDragging.current  = false
      lastPosRef.current  = null
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDistRef.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    if (e.touches.length === 1 && lastPosRef.current) {
      const dx = e.touches[0].clientX - lastPosRef.current.x
      const dy = e.touches[0].clientY - lastPosRef.current.y
      setOffset(p => contraindreOffset(p.x + dx, p.y + dy, zoom))
      lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2 && lastDistRef.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX
      const dy   = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / lastDistRef.current
      setZoom(z => {
        const nz = Math.min(Math.max(z * ratio, ZOOM_MIN), ZOOM_MAX)
        setOffset(p => contraindreOffset(p.x, p.y, nz))
        return nz
      })
      lastDistRef.current = dist
    }
  }, [zoom, imgBase])

  const onTouchEnd = useCallback(() => {
    isDragging.current  = false
    lastPosRef.current  = null
    lastDistRef.current = null
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onTouchStart, onTouchMove, onTouchEnd])

  // ---- Souris (desktop) ----
  function onMouseDown(e) {
    e.preventDefault()
    isDragging.current = true
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }
  function onMouseMove(e) {
    if (!isDragging.current || !lastPosRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    setOffset(p => contraindreOffset(p.x + dx, p.y + dy, zoom))
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }
  function onMouseUp() {
    isDragging.current = false
    lastPosRef.current = null
  }

  // Molette → zoom
  const onWheel = useCallback((e) => {
    e.preventDefault()
    setZoom(z => {
      const nz = Math.min(Math.max(z - e.deltaY * 0.003, ZOOM_MIN), ZOOM_MAX)
      setOffset(p => contraindreOffset(p.x, p.y, nz))
      return nz
    })
  }, [imgBase])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // ---- Appliquer zoom via slider (contraint aussi l'offset) ----
  function changerZoom(nz) {
    setZoom(nz)
    setOffset(p => contraindreOffset(p.x, p.y, nz))
  }

  // ---- Réinitialiser ----
  function reinitialiser() {
    setOffset({ x: 0, y: 0 })
    setZoom(1)
  }

  // ---- Export canvas ----
  function confirmer() {
    const img = imgRef.current
    if (!img || !imgLoaded) return

    // Position visuelle de l'image dans le container
    const imgLeft = CS / 2 - (imgBase.w * zoom) / 2 + offset.x
    const imgTop  = CS / 2 - (imgBase.h * zoom) / 2 + offset.y

    // Scale total : naturel → visuel
    const totalScaleX = (imgBase.w * zoom) / imgNat.w
    const totalScaleY = (imgBase.h * zoom) / imgNat.h

    // Zone source sur l'image naturelle
    const srcX = -imgLeft / totalScaleX
    const srcY = -imgTop  / totalScaleY
    const srcW = CS / totalScaleX
    const srcH = CS / totalScaleY

    const canvas = document.createElement('canvas')
    canvas.width  = EXPORT_SIZE
    canvas.height = EXPORT_SIZE
    const ctx = canvas.getContext('2d')

    // Clip circulaire
    ctx.beginPath()
    ctx.arc(EXPORT_SIZE / 2, EXPORT_SIZE / 2, EXPORT_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, EXPORT_SIZE, EXPORT_SIZE)
    onConfirmer(canvas.toDataURL('image/jpeg', 0.88))
  }

  // ---- Rendu ----
  const imgStyle = {
    position: 'absolute',
    width:  imgBase.w,
    height: imgBase.h,
    left: (CS - imgBase.w) / 2,
    top:  (CS - imgBase.h) / 2,
    transformOrigin: 'center center',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
    pointerEvents: 'none',
    userSelect: 'none',
    willChange: 'transform',
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col" style={{ touchAction: 'none' }}>

      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-5 pt-safe py-4 border-b border-gray-800 flex-shrink-0 bg-[#111]">
        <button
          onClick={onAnnuler}
          className="text-gray-400 active:text-white transition-colors text-sm font-medium px-2 py-1"
        >
          ✕ Annuler
        </button>
        <h3 className="text-white font-bold text-sm">Recadrer la photo</h3>
        <button
          onClick={confirmer}
          disabled={!imgLoaded}
          className="text-noir font-bold text-sm bg-jaune px-4 py-1.5 rounded-xl disabled:opacity-40 active:bg-jaune-sombre transition-colors"
        >
          ✓ Utiliser
        </button>
      </div>

      {/* ---- Zone centrale ---- */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-4 bg-black">

        <p className="text-gray-600 text-xs text-center">
          Glisse • Pince pour zoomer • Scroll
        </p>

        {/* Cercle de crop avec overlay sombre autour */}
        <div className="relative" style={{ width: CS + 40, height: CS + 40 }}>
          {/* Overlay sombre (4 coins) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle ' + (CS / 2) + 'px at center, transparent ' + (CS / 2) + 'px, rgba(0,0,0,0.82) ' + (CS / 2) + 'px)',
            }}
          />

          {/* Container du crop */}
          <div
            ref={containerRef}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              width: CS, height: CS,
              left: 20, top: 20,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(255,204,0,0.8)',
              boxSizing: 'border-box',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Fond pendant le chargement */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-jaune border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              style={{ ...imgStyle, opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
            />
          </div>

          {/* Guides circulaires (tiers) */}
          {imgLoaded && (
            <svg
              className="absolute pointer-events-none"
              style={{ left: 20, top: 20, width: CS, height: CS }}
              viewBox={`0 0 ${CS} ${CS}`}
            >
              <circle cx={CS/2} cy={CS/2} r={CS/6}   fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <circle cx={CS/2} cy={CS/2} r={CS/3}   fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <line x1={CS/3} y1={0} x2={CS/3} y2={CS}   stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1={2*CS/3} y1={0} x2={2*CS/3} y2={CS} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1={0} y1={CS/3} x2={CS} y2={CS/3}   stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1={0} y1={2*CS/3} x2={CS} y2={2*CS/3} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            </svg>
          )}
        </div>

        {/* ---- Slider zoom ---- */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => changerZoom(Math.max(+(zoom - 0.15).toFixed(2), ZOOM_MIN))}
            className="w-10 h-10 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center text-white text-xl font-thin flex-shrink-0 active:bg-gray-700 transition-colors"
          >
            −
          </button>
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min={ZOOM_MIN} max={ZOOM_MAX} step="0.01"
              value={zoom}
              onChange={e => changerZoom(Number(e.target.value))}
              className="w-full accent-jaune cursor-pointer"
              style={{ height: 4 }}
            />
            <div className="flex justify-between text-gray-700 text-[10px]">
              <span>×{ZOOM_MIN}</span>
              <span>×{zoom.toFixed(1)}</span>
              <span>×{ZOOM_MAX}</span>
            </div>
          </div>
          <button
            onClick={() => changerZoom(Math.min(+(zoom + 0.15).toFixed(2), ZOOM_MAX))}
            className="w-10 h-10 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center text-white text-xl font-thin flex-shrink-0 active:bg-gray-700 transition-colors"
          >
            +
          </button>
        </div>

        <button
          onClick={reinitialiser}
          className="text-gray-600 text-xs active:text-gray-400 transition-colors py-1 px-3"
        >
          ↺ Réinitialiser
        </button>
      </div>
    </div>
  )
}

// ================================================================
// GRILLE D'AVATARS
// ================================================================
function GrilleAvatars({ initiale, onChoisir }) {
  return (
    <div className="py-2 max-h-[60vh] overflow-y-auto">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Couleurs</p>
      <div className="grid grid-cols-4 gap-3 mb-5">
        {AVATARS_COULEURS.map(av => (
          <button
            key={av.id}
            onClick={() => onChoisir(genererAvatarCouleur(initiale, av.a, av.b))}
            className="aspect-square rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md active:scale-90 transition-transform"
            style={{ background: `linear-gradient(135deg, ${av.a}, ${av.b})` }}
          >
            {initiale.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Emojis</p>
      <div className="grid grid-cols-4 gap-3">
        {AVATARS_EMOJI.map(emoji => (
          <button
            key={emoji}
            onClick={() => onChoisir(genererAvatarEmoji(emoji))}
            className="aspect-square bg-[#111] rounded-2xl flex items-center justify-center text-3xl shadow-md active:scale-90 transition-transform border border-gray-800"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ================================================================
// FEUILLE D'OPTIONS
// ================================================================
export function OptionsPhotoSheet({ utilisateur, onFermer, onPhotoChoisie, onSupprimerPhoto }) {
  const [vue, setVue] = useState('main') // 'main' | 'avatars'
  const galerieRef = useRef(null)
  const cameraRef  = useRef(null)

  function handleFichier(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const url = URL.createObjectURL(file)
    onFermer()
    // Petit délai pour laisser le sheet se fermer avant d'ouvrir le crop
    setTimeout(() => onPhotoChoisie(url, 'fichier'), 100)
  }

  function choisirAvatar(b64) {
    onPhotoChoisie(b64, 'avatar')
    onFermer()
  }

  const initiale = (utilisateur?.nom || 'U').charAt(0)
  const aPhoto   = !!utilisateur?.photo

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={vue === 'main' ? onFermer : () => setVue('main')}
      />

      <div className="relative bg-[#1C1C1C] rounded-t-3xl animate-slide-up overflow-hidden">
        {/* Poignée */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* ---- VUE PRINCIPALE ---- */}
        {vue === 'main' && (
          <div className="px-4 pb-8 pt-2">
            <h3 className="text-white font-bold text-base mb-1 px-2">Photo de profil</h3>

            {/* Aperçu actuel */}
            {aPhoto && (
              <div className="flex justify-center py-4">
                <img
                  src={utilisateur.photo}
                  alt="actuelle"
                  className="w-24 h-24 rounded-full object-cover border-2 border-jaune shadow-lg shadow-jaune/20"
                />
              </div>
            )}

            <div className="space-y-0.5">

              {/* Prendre une photo */}
              <Ligne
                icone="📷" fond="bg-rouge/15" couleur="text-rouge"
                titre="Prendre une photo"
                sous="Utilise ta caméra frontale"
                onClick={() => cameraRef.current?.click()}
              />
              <input
                ref={cameraRef} type="file" accept="image/*"
                capture="user" className="hidden"
                onChange={handleFichier}
              />

              {/* Galerie */}
              <Ligne
                icone="🖼️" fond="bg-blue-500/15" couleur="text-blue-400"
                titre="Choisir dans la galerie"
                sous="Sélectionne une photo existante"
                onClick={() => galerieRef.current?.click()}
              />
              <input
                ref={galerieRef} type="file" accept="image/*"
                className="hidden" onChange={handleFichier}
              />

              {/* Recadrer l'actuelle */}
              {aPhoto && (
                <Ligne
                  icone="✂️" fond="bg-amber-500/15" couleur="text-amber-400"
                  titre="Recadrer la photo actuelle"
                  sous="Ajuste le cadrage et le zoom"
                  onClick={() => { onFermer(); setTimeout(() => onPhotoChoisie(utilisateur.photo, 'fichier'), 100) }}
                />
              )}

              {/* Avatar */}
              <Ligne
                icone="😊" fond="bg-violet-500/15" couleur="text-violet-400"
                titre="Choisir un avatar"
                sous="Couleurs, initiales et emojis"
                onClick={() => setVue('avatars')}
                fleche
              />

              {/* Supprimer */}
              {aPhoto && (
                <>
                  <div className="h-px bg-gray-800 my-2" />
                  <Ligne
                    icone="🗑️" fond="bg-gray-800" couleur="text-gray-400"
                    titre="Supprimer la photo"
                    titreCouleur="text-rouge"
                    sous="Revenir à l'initiale"
                    onClick={() => { onSupprimerPhoto(); onFermer() }}
                  />
                </>
              )}
            </div>

            <button
              onClick={onFermer}
              className="w-full text-center text-gray-500 text-sm mt-5 py-2 active:text-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        )}

        {/* ---- VUE AVATARS ---- */}
        {vue === 'avatars' && (
          <div className="px-4 pb-8 pt-2">
            <div className="flex items-center gap-3 mb-4 px-1">
              <button
                onClick={() => setVue('main')}
                className="text-gray-400 text-sm active:text-white transition-colors"
              >
                ← Retour
              </button>
              <h3 className="text-white font-bold">Choisir un avatar</h3>
            </div>
            <GrilleAvatars initiale={initiale} onChoisir={choisirAvatar} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Ligne d'option réutilisable ----
function Ligne({ icone, fond, couleur, titre, titreCouleur, sous, onClick, fleche }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors text-left"
    >
      <div className={`w-11 h-11 ${fond} rounded-xl flex items-center justify-center text-xl ${couleur} flex-shrink-0`}>
        {icone}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${titreCouleur || 'text-white'}`}>{titre}</p>
        <p className="text-gray-500 text-xs">{sous}</p>
      </div>
      {fleche && <span className="text-gray-600 text-sm flex-shrink-0">›</span>}
    </button>
  )
}
