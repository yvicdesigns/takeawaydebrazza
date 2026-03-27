// ============================================================
// PAGE ADMIN : Réglages Audio
// Toggles, volumes, sons personnalisés, tests
// ============================================================

import { useState, useRef } from 'react'
import {
  getAudioSettings,
  saveAudioSettings,
  playClick,
  playSuccess,
  playNewOrder,
  playPaiementValide,
  playError,
  parler,
} from '../lib/sounds'

const MAX_SIZE_MB = 3

function SliderVolume({ label, valeur, onChange }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-gray-300 text-sm w-36 flex-shrink-0">{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={valeur}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-rouge h-2 cursor-pointer"
      />
      <span className="text-gray-400 text-xs w-10 text-right">
        {Math.round(valeur * 100)}%
      </span>
    </div>
  )
}

function SonPersonnalise({ label, cle, dataUrl, onSave, onDelete, onTest }) {
  const inputRef = useRef()

  function handleFichier(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Fichier trop lourd (max ${MAX_SIZE_MB} Mo)`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => onSave(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4 space-y-3">
      <p className="text-white font-semibold text-sm">{label}</p>

      {dataUrl ? (
        <div className="flex items-center gap-3">
          <span className="text-green-400 text-xs flex-1">✅ Son personnalisé chargé</span>
          <button
            onClick={onTest}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            ▶ Tester
          </button>
          <button
            onClick={onDelete}
            className="text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Supprimer
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs flex-1">Son par défaut (cloches)</span>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs bg-rouge hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Importer un son
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFichier}
      />
      <p className="text-gray-600 text-xs">MP3, WAV, OGG — max {MAX_SIZE_MB} Mo</p>
    </div>
  )
}

export default function ManageAudio() {
  const [s, setS] = useState(() => getAudioSettings())
  const [sauvegarde, setSauvegarde] = useState(false)

  function update(patch) {
    setS(prev => ({ ...prev, ...patch }))
    saveAudioSettings(patch)
    flashSauvegarde()
  }

  function flashSauvegarde() {
    setSauvegarde(true)
    setTimeout(() => setSauvegarde(false), 1500)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Réglages audio</h1>
          <p className="text-gray-400 text-sm">Sons, volumes et notifications vocales</p>
        </div>
        {sauvegarde && (
          <span className="text-green-400 text-sm font-semibold animate-pulse">
            ✓ Sauvegardé
          </span>
        )}
      </div>

      {/* ---- Général ---- */}
      <div className="bg-noir rounded-2xl border border-gray-800 p-5 space-y-4">
        <h2 className="text-white font-bold text-sm">Général</h2>

        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Sons activés</p>
            <p className="text-gray-500 text-xs">Activer ou désactiver tous les sons</p>
          </div>
          <button
            onClick={() => update({ active: !s.active })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              s.active ? 'bg-rouge' : 'bg-gray-700'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
              s.active ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Voice toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Annonces vocales</p>
            <p className="text-gray-500 text-xs">Voix française à chaque nouvelle commande</p>
          </div>
          <button
            onClick={() => update({ voice: !s.voice })}
            disabled={!s.active}
            className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-40 ${
              s.voice && s.active ? 'bg-rouge' : 'bg-gray-700'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
              s.voice ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Test voix */}
        {s.active && s.voice && (
          <button
            onClick={() => parler('Nouvelle commande de Test')}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            ▶ Tester la voix
          </button>
        )}
      </div>

      {/* ---- Volumes ---- */}
      <div className={`bg-noir rounded-2xl border border-gray-800 p-5 space-y-5 transition-opacity ${!s.active ? 'opacity-40 pointer-events-none' : ''}`}>
        <h2 className="text-white font-bold text-sm">Volumes</h2>

        <SliderVolume
          label="Clic bouton"
          valeur={s.volClick}
          onChange={v => update({ volClick: v })}
        />
        <SliderVolume
          label="Nouvelle commande"
          valeur={s.volOrder}
          onChange={v => update({ volOrder: v })}
        />
        <SliderVolume
          label="Paiement validé"
          valeur={s.volPayment}
          onChange={v => update({ volPayment: v })}
        />
      </div>

      {/* ---- Tests ---- */}
      <div className={`bg-noir rounded-2xl border border-gray-800 p-5 space-y-3 transition-opacity ${!s.active ? 'opacity-40 pointer-events-none' : ''}`}>
        <h2 className="text-white font-bold text-sm">Tester les sons</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '🖱 Clic bouton',       fn: playClick },
            { label: '✅ Succès',            fn: playSuccess },
            { label: '🔔 Nouvelle commande', fn: playNewOrder },
            { label: '💰 Paiement validé',   fn: playPaiementValide },
            { label: '❌ Erreur',            fn: playError },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="bg-[#1a1a1a] hover:bg-gray-800 border border-gray-800 text-white text-xs font-medium px-4 py-3 rounded-xl transition-colors text-left"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Sons personnalisés ---- */}
      <div className={`space-y-3 transition-opacity ${!s.active ? 'opacity-40 pointer-events-none' : ''}`}>
        <h2 className="text-white font-bold text-sm px-1">Sons personnalisés</h2>
        <p className="text-gray-500 text-xs px-1">
          Importe ton propre fichier audio pour remplacer les sons par défaut.
        </p>

        <SonPersonnalise
          label="🔔 Son — Nouvelle commande"
          cle="customOrder"
          dataUrl={s.customOrder}
          onSave={url => update({ customOrder: url })}
          onDelete={() => update({ customOrder: null })}
          onTest={() => {
            if (s.customOrder) {
              const a = new Audio(s.customOrder)
              a.volume = s.volOrder
              a.play().catch(() => {})
            }
          }}
        />

        <SonPersonnalise
          label="💰 Son — Paiement validé"
          cle="customPayment"
          dataUrl={s.customPayment}
          onSave={url => update({ customPayment: url })}
          onDelete={() => update({ customPayment: null })}
          onTest={() => {
            if (s.customPayment) {
              const a = new Audio(s.customPayment)
              a.volume = s.volPayment
              a.play().catch(() => {})
            }
          }}
        />
      </div>

    </div>
  )
}
