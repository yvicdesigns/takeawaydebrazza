// ============================================================
// PAGE CLIENT : Messages
// Conversation avec le restaurant + annonces broadcast
// - Annonce marquée "vue" au clic sur la carte
// - Corbeille locale (localStorage) avec nettoyage auto 30 jours
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import {
  getMessagesClient, envoyerMessage, ecouterMessages,
  getNotifications, ecouterNotifications,
} from '../lib/supabase'

// ---- Clés localStorage ----
const CLE_MSGS    = 'takeawaydebrazza_msgs_caches'
const CLE_NOTIFS  = 'takeawaydebrazza_notifs_cachees'
const CLE_VUES    = 'takeawaydebrazza_notifs_vues'
const TRENTE_JOURS = 30 * 24 * 60 * 60 * 1000

// Charge les IDs cachés et nettoie automatiquement ceux > 30 jours
function chargerCaches(cle) {
  const items = JSON.parse(localStorage.getItem(cle) || '[]')
  const recents = items.filter(i => Date.now() - i.cachedAt < TRENTE_JOURS)
  if (recents.length !== items.length) localStorage.setItem(cle, JSON.stringify(recents))
  return new Set(recents.map(i => i.id))
}

function cacherItem(cle, id) {
  const items = JSON.parse(localStorage.getItem(cle) || '[]')
  if (!items.find(i => i.id === id)) {
    items.push({ id, cachedAt: Date.now() })
    localStorage.setItem(cle, JSON.stringify(items))
  }
}

function chargerVues() {
  return new Set(JSON.parse(localStorage.getItem(CLE_VUES) || '[]'))
}

function marquerVue(id) {
  const vues = chargerVues()
  vues.add(id)
  localStorage.setItem(CLE_VUES, JSON.stringify([...vues]))
  // Déclenche un event pour que BottomNav mette à jour son badge
  window.dispatchEvent(new Event('takeawaydebrazza_notifs_vues_changed'))
}

export default function MessagesPage() {
  const { utilisateur } = useAuth()
  const [onglet, setOnglet]               = useState('messages')
  const [messages, setMessages]           = useState([])
  const [notifications, setNotifications] = useState([])
  const [nouveauMessage, setNouveauMessage] = useState('')
  const [envoi, setEnvoi]                 = useState(false)
  const [chargement, setChargement]       = useState(true)
  const [msgsCaches, setMsgsCaches]       = useState(() => chargerCaches(CLE_MSGS))
  const [notifsCachees, setNotifsCachees] = useState(() => chargerCaches(CLE_NOTIFS))
  const [notifVues, setNotifVues]         = useState(() => chargerVues())
  const finMessagesRef                    = useRef(null)

  useEffect(() => {
    if (!utilisateur) return
    chargerMessages()
    chargerNotifications()

    const seDesabonnerMsgs = ecouterMessages(utilisateur.telephone, (msg) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
    })
    const seDesabonnerNotifs = ecouterNotifications(() => chargerNotifications())

    return () => { seDesabonnerMsgs(); seDesabonnerNotifs() }
  }, [utilisateur])

  useEffect(() => {
    finMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function chargerMessages() {
    setChargement(true)
    const data = await getMessagesClient(utilisateur.telephone)
    setMessages(data)
    setChargement(false)
  }

  async function chargerNotifications() {
    const data = await getNotifications()
    setNotifications(data)
  }

  async function envoyerReponse(e) {
    e.preventDefault()
    if (!nouveauMessage.trim()) return
    setEnvoi(true)
    try {
      const msg = await envoyerMessage({
        telephone:  utilisateur.telephone,
        nom_client: utilisateur.nom,
        expediteur: 'client',
        contenu:    nouveauMessage.trim(),
      })
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      setNouveauMessage('')
    } catch {
      alert('Erreur lors de l\'envoi. Réessaie.')
    } finally {
      setEnvoi(false)
    }
  }

  function supprimerMessage(id) {
    cacherItem(CLE_MSGS, id)
    setMsgsCaches(prev => new Set([...prev, id]))
  }

  function supprimerNotif(id) {
    cacherItem(CLE_NOTIFS, id)
    setNotifsCachees(prev => new Set([...prev, id]))
    marquerVue(id)
    setNotifVues(chargerVues())
  }

  function ouvrirAnnonce(id) {
    if (!notifVues.has(id)) {
      marquerVue(id)
      setNotifVues(chargerVues())
    }
  }

  // Messages et annonces visibles (non cachés)
  const messagesVisibles   = messages.filter(m => !msgsCaches.has(m.id))
  const notificationsVis   = notifications.filter(n => !notifsCachees.has(n.id))
  const nbNonVues          = notificationsVis.filter(n => !notifVues.has(n.id)).length

  // ---- Non connecté ----
  if (!utilisateur) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center pb-24">
        <span className="text-6xl mb-4">💬</span>
        <h2 className="text-xl font-bold text-white mb-2">Connecte-toi</h2>
        <p className="text-gray-400 text-sm mb-6">
          Pour envoyer un message au restaurant, connecte-toi d'abord à ton compte.
        </p>
        <Link to="/profil" className="btn-primary">Se connecter</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ---- Onglets ---- */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-black text-white mb-4">Messages</h1>
        <div className="flex gap-1 bg-noir-clair rounded-xl p-1">
          <button
            onClick={() => setOnglet('messages')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              onglet === 'messages' ? 'bg-rouge text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            💬 Restaurant
          </button>
          <button
            onClick={() => setOnglet('annonces')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative ${
              onglet === 'annonces' ? 'bg-rouge text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            📢 Annonces
            {nbNonVues > 0 && (
              <span className="absolute -top-1 -right-1 bg-jaune text-noir text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {nbNonVues > 9 ? '9+' : nbNonVues}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ================================================================
          ONGLET : Conversation
      ================================================================ */}
      {onglet === 'messages' && (
        <div className="flex-1 flex flex-col overflow-hidden px-4 max-w-md mx-auto w-full">
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {chargement ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-rouge border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messagesVisibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <span className="text-5xl mb-4">👋</span>
                <p className="text-white font-bold mb-1">Contacte le restaurant</p>
                <p className="text-gray-400 text-sm">Pose une question, signale un problème ou laisse un avis.</p>
              </div>
            ) : (
              messagesVisibles.map(msg => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1 group ${msg.expediteur === 'client' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar admin */}
                  {msg.expediteur === 'admin' && (
                    <div className="w-7 h-7 bg-jaune rounded-full flex items-center justify-center text-noir text-xs font-black flex-shrink-0 mb-1">
                      B
                    </div>
                  )}

                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                    msg.expediteur === 'client'
                      ? 'bg-rouge text-white rounded-br-sm'
                      : 'bg-noir-clair text-white rounded-bl-sm'
                  }`}>
                    <p>{msg.contenu}</p>
                    <p className={`text-xs mt-1 ${msg.expediteur === 'client' ? 'text-white/60' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Bouton corbeille — visible au hover */}
                  <button
                    onClick={() => supprimerMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-rouge text-xs p-1 flex-shrink-0 mb-1"
                    title="Supprimer ce message"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
            <div ref={finMessagesRef} />
          </div>

          <form onSubmit={envoyerReponse} className="py-3 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={nouveauMessage}
              onChange={e => setNouveauMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="input-field flex-1 py-3"
            />
            <button
              type="submit"
              disabled={!nouveauMessage.trim() || envoi}
              className="bg-rouge hover:bg-rouge-sombre text-white font-bold px-5 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {envoi ? '...' : '→'}
            </button>
          </form>
        </div>
      )}

      {/* ================================================================
          ONGLET : Annonces
      ================================================================ */}
      {onglet === 'annonces' && (
        <div className="flex-1 overflow-y-auto px-4 max-w-md mx-auto w-full py-2 space-y-3">
          {notificationsVis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4">📢</span>
              <p className="text-gray-400 text-sm">Aucune annonce pour le moment</p>
            </div>
          ) : (
            notificationsVis.map(notif => {
              const estVue = notifVues.has(notif.id)
              return (
                <div
                  key={notif.id}
                  onClick={() => ouvrirAnnonce(notif.id)}
                  className={`rounded-2xl p-4 flex gap-3 cursor-pointer transition-all ${
                    estVue
                      ? 'bg-noir-clair'
                      : 'bg-noir-clair border border-jaune/40 shadow-sm shadow-jaune/10'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{notif.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-white text-sm">{notif.titre}</p>
                      {!estVue && (
                        <span className="w-2 h-2 bg-jaune rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">{notif.contenu}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {/* Bouton corbeille */}
                  <button
                    onClick={e => { e.stopPropagation(); supprimerNotif(notif.id) }}
                    className="text-gray-600 hover:text-rouge transition-colors flex-shrink-0 self-start mt-0.5"
                    title="Masquer cette annonce"
                  >
                    🗑️
                  </button>
                </div>
              )
            })
          )}
          <p className="text-gray-700 text-xs text-center pb-2">
            Les annonces masquées sont supprimées automatiquement après 30 jours
          </p>
        </div>
      )}
    </div>
  )
}
