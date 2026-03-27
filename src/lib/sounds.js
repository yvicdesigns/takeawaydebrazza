// ============================================================
// SONS — Web Audio API
// Réglages lus depuis localStorage (page /admin/audio)
// ============================================================

let ctx = null

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// ---- Lecture des réglages ----
export function getAudioSettings() {
  return {
    active:        localStorage.getItem('bigman_audio_master')   !== 'false',
    voice:         localStorage.getItem('bigman_audio_voice')    !== 'false',
    volClick:      parseFloat(localStorage.getItem('bigman_audio_vol_click')   ?? '1'),
    volOrder:      parseFloat(localStorage.getItem('bigman_audio_vol_order')   ?? '1'),
    volPayment:    parseFloat(localStorage.getItem('bigman_audio_vol_payment') ?? '1'),
    customOrder:   localStorage.getItem('bigman_audio_custom_order')   ?? null,
    customPayment: localStorage.getItem('bigman_audio_custom_payment') ?? null,
  }
}

export function saveAudioSettings(patch) {
  const map = {
    active:        'bigman_audio_master',
    voice:         'bigman_audio_voice',
    volClick:      'bigman_audio_vol_click',
    volOrder:      'bigman_audio_vol_order',
    volPayment:    'bigman_audio_vol_payment',
    customOrder:   'bigman_audio_custom_order',
    customPayment: 'bigman_audio_custom_payment',
  }
  Object.entries(patch).forEach(([k, v]) => {
    if (map[k]) {
      if (v === null) localStorage.removeItem(map[k])
      else localStorage.setItem(map[k], String(v))
    }
  })
}

// ---- Cloche inharmonique premium ----
function bell(freq, start, duration, volume = 0.15) {
  try {
    const c = ac()

    const osc1 = c.createOscillator()
    const g1   = c.createGain()
    osc1.connect(g1)
    g1.connect(c.destination)
    osc1.type = 'sine'
    osc1.frequency.value = freq
    g1.gain.setValueAtTime(0, start)
    g1.gain.linearRampToValueAtTime(volume, start + 0.006)
    g1.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc1.start(start)
    osc1.stop(start + duration + 0.01)

    const osc2 = c.createOscillator()
    const g2   = c.createGain()
    osc2.connect(g2)
    g2.connect(c.destination)
    osc2.type = 'sine'
    osc2.frequency.value = freq * 2.756
    g2.gain.setValueAtTime(0, start)
    g2.gain.linearRampToValueAtTime(volume * 0.35, start + 0.006)
    g2.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.35)
    osc2.start(start)
    osc2.stop(start + duration + 0.01)
  } catch {}
}

// ---- Lecture audio personnalisé ----
function jouerCustom(dataUrl, volume = 1) {
  try {
    const audio = new Audio(dataUrl)
    audio.volume = Math.min(1, Math.max(0, volume))
    audio.play().catch(() => {})
    return true
  } catch {
    return false
  }
}

// ---- Click : ultra discret ----
export function playClick() {
  try {
    const s = getAudioSettings()
    if (!s.active) return
    const c = ac()
    const t = c.currentTime
    const osc = c.createOscillator()
    const g   = c.createGain()
    osc.connect(g)
    g.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.value = 1400
    const vol = 0.3 * s.volClick
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
    osc.start(t)
    osc.stop(t + 0.04)
  } catch {}
}

// ---- Succès ----
export function playSuccess() {
  try {
    const s = getAudioSettings()
    if (!s.active) return
    const c = ac()
    const t = c.currentTime
    bell(880,  t,        0.7, 0.13 * s.volOrder)
    bell(1318, t + 0.22, 0.9, 0.11 * s.volOrder)
  } catch {}
}

// ---- Nouvelle commande ----
export function playNewOrder() {
  try {
    const s = getAudioSettings()
    if (!s.active) return
    if (s.customOrder) {
      jouerCustom(s.customOrder, s.volOrder)
      return
    }
    const c = ac()
    const t = c.currentTime
    bell(830,  t,        1.0, 0.16 * s.volOrder)
    bell(1109, t + 0.28, 1.3, 0.14 * s.volOrder)
  } catch {}
}

// ---- Paiement validé ----
export function playPaiementValide() {
  try {
    const s = getAudioSettings()
    if (!s.active) return
    if (s.customPayment) {
      jouerCustom(s.customPayment, s.volPayment)
      return
    }
    const c = ac()
    const t = c.currentTime
    bell(1047, t,       1.2, 0.17 * s.volPayment)
    bell(1319, t + 0.2, 1.0, 0.12 * s.volPayment)
  } catch {}
}

// ---- Erreur ----
export function playError() {
  try {
    const s = getAudioSettings()
    if (!s.active) return
    const c = ac()
    const t = c.currentTime
    bell(220, t,        0.5, 0.1)
    bell(185, t + 0.25, 0.5, 0.07)
  } catch {}
}

// ---- Voix française ----
let _voixFr = null

function _chargerVoix() {
  if (_voixFr) return
  const liste = window.speechSynthesis?.getVoices() ?? []
  _voixFr = liste.find(v => v.lang.startsWith('fr')) ?? null
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = _chargerVoix
  _chargerVoix()
}

export function parler(texte) {
  try {
    const s = getAudioSettings()
    if (!s.active || !s.voice) return
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setTimeout(() => {
      try {
        _chargerVoix()
        const u  = new SpeechSynthesisUtterance(texte)
        u.lang   = 'fr-FR'
        u.rate   = 1.0
        u.pitch  = 1.0
        u.volume = 1
        if (_voixFr) u.voice = _voixFr
        window.speechSynthesis.speak(u)
      } catch {}
    }, 80)
  } catch {}
}

// ---- Notifications composées ----

export function notifierNouvelleCommande(nomClient) {
  playNewOrder()
  setTimeout(() => {
    parler(nomClient ? `Nouvelle commande de ${nomClient}` : 'Nouvelle commande')
  }, 1600)
}

export function notifierPaiementValide() {
  playPaiementValide()
  setTimeout(() => parler('Paiement validé'), 800)
}

// ---- Son global sur les boutons ----
export function activerSonsGlobaux() {
  let dernier = 0
  document.addEventListener('click', (e) => {
    const cible = e.target.closest('button:not([disabled]), a[href]')
    if (!cible) return
    const now = Date.now()
    if (now - dernier < 80) return
    dernier = now
    playClick()
  }, { passive: true, capture: true })
}
