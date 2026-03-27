// ============================================================
// PAGE ADMIN : Messagerie
// Conversations avec les clients + notifications broadcast
// Corbeille manuelle (localStorage) — l'admin vide lui-même
// ============================================================

import { useState, useEffect, useRef } from 'react'
import {
  getConversations, getMessagesClient, envoyerMessage, marquerMessagesLus,
  ecouterMessages, ecouterTousMessages,
  getNotifications, envoyerNotification, supprimerNotification,
} from '../lib/supabase'

const ONGLETS = [
  { id: 'conversations', label: '💬 Conversations' },
  { id: 'broadcast',     label: '📢 Annonces' },
]

// ---- Clés localStorage (admin) ----
const CLE_CONVS_CACHEES = 'bigman_admin_convs_cachees'
const CLE_MSGS_CACHES   = 'bigman_admin_msgs_caches'

function chargerCaches(cle) {
  return new Set(JSON.parse(localStorage.getItem(cle) || '[]'))
}

function cacherItem(cle, id) {
  const items = chargerCaches(cle)
  items.add(id)
  localStorage.setItem(cle, JSON.stringify([...items]))
}

function viderCorbeille(cle) {
  localStorage.removeItem(cle)
}

export default function AdminMessages() {
  const [onglet, setOnglet]                   = useState('conversations')
  const [conversations, setConversations]     = useState([])
  const [convActive, setConvActive]           = useState(null)
  const [messages, setMessages]               = useState([])
  const [nouveauMessage, setNouveauMessage]   = useState('')
  const [envoi, setEnvoi]                     = useState(false)
  const [chargement, setChargement]           = useState(true)
  const [voirCorbeille, setVoirCorbeille]     = useState(false)
  const [convsCachees, setConvsCachees]       = useState(() => chargerCaches(CLE_CONVS_CACHEES))
  const [msgsCaches, setMsgsCaches]           = useState(() => chargerCaches(CLE_MSGS_CACHES))

  // Broadcast
  const [notifications, setNotifications]     = useState([])
  const [formNotif, setFormNotif]             = useState({ titre: '', contenu: '', emoji: '📢' })
  const [envoiNotif, setEnvoiNotif]           = useState(false)

  const finMessagesRef = useRef(null)

  useEffect(() => {
    chargerConversations()
    chargerNotifications()

    // Écoute les nouveaux messages pour mettre à jour la liste des convs
    const seDesabonner = ecouterTousMessages((msg) => {
      setConversations(prev => {
        const existe = prev.find(c => c.telephone === msg.telephone)
        if (existe) {
          return prev.map(c =>
            c.telephone === msg.telephone
              ? { ...c, dernierMessage: msg, nonLus: msg.expediteur === 'client' ? c.nonLus + 1 : c.nonLus }
              : c
          ).sort((a, b) => new Date(b.dernierMessage.created_at) - new Date(a.dernierMessage.created_at))
        }
        return [{ telephone: msg.telephone, nom_client: msg.nom_client, dernierMessage: msg, nonLus: msg.expediteur === 'client' ? 1 : 0 }, ...prev]
      })
    })

    return seDesabonner
  }, [])

  // Scroll automatique vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    finMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function chargerConversations() {
    setChargement(true)
    const data = await getConversations()
    setConversations(data)
    setChargement(false)
  }

  async function ouvrirConversation(conv) {
    setConvActive(conv)
    const msgs = await getMessagesClient(conv.telephone)
    setMessages(msgs)
    await marquerMessagesLus(conv.telephone)
    // Remet le compteur non-lus à 0
    setConversations(prev => prev.map(c =>
      c.telephone === conv.telephone ? { ...c, nonLus: 0 } : c
    ))

    // Écoute les nouveaux messages en temps réel
    const seDesabonner = ecouterMessages(conv.telephone, (msg) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
    })

    return seDesabonner
  }

  async function envoyerReponse(e) {
    e.preventDefault()
    if (!nouveauMessage.trim() || !convActive) return
    setEnvoi(true)
    try {
      const msg = await envoyerMessage({
        telephone:  convActive.telephone,
        nom_client: convActive.nom_client,
        expediteur: 'admin',
        contenu:    nouveauMessage.trim(),
      })
      setMessages(prev => [...prev, msg])
      setNouveauMessage('')
    } catch {
      alert('Erreur lors de l\'envoi')
    } finally {
      setEnvoi(false)
    }
  }

  async function chargerNotifications() {
    const data = await getNotifications()
    setNotifications(data)
  }

  async function publierNotification(e) {
    e.preventDefault()
    if (!formNotif.titre.trim() || !formNotif.contenu.trim()) return
    setEnvoiNotif(true)
    try {
      const notif = await envoyerNotification(formNotif)
      setNotifications(prev => [notif, ...prev])
      setFormNotif({ titre: '', contenu: '', emoji: '📢' })
    } catch {
      alert('Erreur lors de la publication')
    } finally {
      setEnvoiNotif(false)
    }
  }

  async function supprimerNotif(id) {
    if (!confirm('Supprimer cette annonce ?')) return
    try {
      await supprimerNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {
      alert('Erreur lors de la suppression')
    }
  }

  function cacherConversation(telephone) {
    cacherItem(CLE_CONVS_CACHEES, telephone)
    setConvsCachees(chargerCaches(CLE_CONVS_CACHEES))
    if (convActive?.telephone === telephone) setConvActive(null)
  }

  function cacherMessage(id) {
    cacherItem(CLE_MSGS_CACHES, id)
    setMsgsCaches(chargerCaches(CLE_MSGS_CACHES))
  }

  function viderCorbeilleConvs() {
    if (!confirm('Vider la corbeille ? Les conversations masquées réapparaîtront.')) return
    viderCorbeille(CLE_CONVS_CACHEES)
    viderCorbeille(CLE_MSGS_CACHES)
    setConvsCachees(new Set())
    setMsgsCaches(new Set())
    setVoirCorbeille(false)
  }

  const totalNonLus = conversations.reduce((t, c) => t + c.nonLus, 0)

  return (
    <div className="h-screen flex flex-col">

      {/* ---- En-tête + onglets ---- */}
      <div className="p-4 md:px-6 md:pt-6 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white">
            Messagerie
            {totalNonLus > 0 && (
              <span className="ml-2 bg-rouge text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalNonLus}
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-1 bg-noir rounded-xl p-1 border border-gray-800 self-start w-fit">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                onglet === o.id ? 'bg-rouge text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================
          ONGLET : Conversations
      ================================================================ */}
      {onglet === 'conversations' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Liste des conversations */}
          <div className={`
            flex-shrink-0 border-r border-gray-800 overflow-y-auto
            ${convActive ? 'hidden md:flex md:flex-col w-72' : 'flex flex-col w-full md:w-72'}
          `}>
            {/* Barre corbeille */}
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
              <button
                onClick={() => setVoirCorbeille(v => !v)}
                className={`text-xs font-medium transition-colors ${voirCorbeille ? 'text-rouge' : 'text-gray-500 hover:text-white'}`}
              >
                🗑️ Corbeille ({convsCachees.size})
              </button>
              {convsCachees.size > 0 && (
                <button
                  onClick={viderCorbeilleConvs}
                  className="text-xs text-gray-600 hover:text-rouge transition-colors"
                >
                  Vider
                </button>
              )}
            </div>

            {chargement ? (
              <div className="p-4 space-y-3">
                {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : (() => {
              const convsAffichees = voirCorbeille
                ? conversations.filter(c => convsCachees.has(c.telephone))
                : conversations.filter(c => !convsCachees.has(c.telephone))

              if (convsAffichees.length === 0) return (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <span className="text-5xl mb-4">{voirCorbeille ? '🗑️' : '💬'}</span>
                  <p className="text-gray-400 text-sm">
                    {voirCorbeille ? 'Corbeille vide' : 'Aucune conversation'}
                  </p>
                  {!voirCorbeille && <p className="text-gray-600 text-xs mt-1">Les messages des clients apparaîtront ici</p>}
                </div>
              )

              return convsAffichees.map(conv => (
                <div
                  key={conv.telephone}
                  className={`group flex items-stretch border-b border-gray-800 hover:bg-noir-clair/50 transition-colors ${
                    convActive?.telephone === conv.telephone ? 'bg-noir-clair' : ''
                  }`}
                >
                  <button
                    onClick={() => ouvrirConversation(conv)}
                    className="flex-1 text-left p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rouge/20 rounded-full flex items-center justify-center text-rouge font-bold text-sm flex-shrink-0">
                        {(conv.nom_client || conv.telephone).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white text-sm truncate">
                            {conv.nom_client || conv.telephone}
                          </p>
                          {conv.nonLus > 0 && !voirCorbeille && (
                            <span className="bg-rouge text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                              {conv.nonLus}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{conv.telephone}</p>
                        <p className="text-gray-400 text-xs truncate mt-0.5">
                          {conv.dernierMessage.expediteur === 'admin' ? 'Vous : ' : ''}
                          {conv.dernierMessage.contenu}
                        </p>
                      </div>
                    </div>
                  </button>
                  {/* Bouton corbeille */}
                  {!voirCorbeille && (
                    <button
                      onClick={() => cacherConversation(conv.telephone)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-3 text-gray-600 hover:text-rouge flex-shrink-0"
                      title="Mettre en corbeille"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))
            })()}
          </div>

          {/* Zone de conversation */}
          {convActive ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header de la conv */}
              <div className="p-4 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setConvActive(null)}
                  className="md:hidden w-8 h-8 bg-noir-clair rounded-lg flex items-center justify-center text-white"
                >
                  ←
                </button>
                <div className="w-9 h-9 bg-rouge/20 rounded-full flex items-center justify-center text-rouge font-bold">
                  {(convActive.nom_client || convActive.telephone).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{convActive.nom_client || 'Client'}</p>
                  <p className="text-gray-500 text-xs">{convActive.telephone}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.filter(m => !msgsCaches.has(m.id)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <span className="text-4xl mb-3">👋</span>
                    <p className="text-gray-400 text-sm">Démarrez la conversation</p>
                  </div>
                ) : (
                  messages.filter(m => !msgsCaches.has(m.id)).map(msg => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1 group ${msg.expediteur === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.expediteur === 'client' && (
                        <button
                          onClick={() => cacherMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-rouge text-xs p-1 flex-shrink-0 mb-1"
                          title="Masquer ce message"
                        >
                          🗑️
                        </button>
                      )}
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        msg.expediteur === 'admin'
                          ? 'bg-rouge text-white rounded-br-sm'
                          : 'bg-noir-clair text-white rounded-bl-sm'
                      }`}>
                        <p>{msg.contenu}</p>
                        <p className={`text-xs mt-1 ${msg.expediteur === 'admin' ? 'text-white/60' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {msg.expediteur === 'admin' && (
                        <button
                          onClick={() => cacherMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-rouge text-xs p-1 flex-shrink-0 mb-1"
                          title="Masquer ce message"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={finMessagesRef} />
              </div>

              {/* Zone de saisie */}
              <form onSubmit={envoyerReponse} className="p-4 border-t border-gray-800 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={nouveauMessage}
                  onChange={e => setNouveauMessage(e.target.value)}
                  placeholder="Écrire un message..."
                  className="input-field flex-1 py-2.5"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!nouveauMessage.trim() || envoi}
                  className="bg-rouge hover:bg-rouge-sombre text-white font-bold px-5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {envoi ? '...' : '→'}
                </button>
              </form>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-center">
              <div>
                <span className="text-5xl block mb-4">💬</span>
                <p className="text-gray-400">Sélectionne une conversation</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          ONGLET : Annonces broadcast
      ================================================================ */}
      {onglet === 'broadcast' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Formulaire nouvelle annonce */}
          <div className="bg-noir rounded-2xl border border-gray-800 p-5">
            <h2 className="font-bold text-white text-sm mb-4">📢 Nouvelle annonce</h2>
            <form onSubmit={publierNotification} className="space-y-3">
              <div className="flex gap-3">
                {/* Emoji picker simple */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Emoji</label>
                  <select
                    value={formNotif.emoji}
                    onChange={e => setFormNotif(p => ({ ...p, emoji: e.target.value }))}
                    className="input-field w-20 text-center text-lg"
                  >
                    {['📢', '🎉', '🍔', '🔥', '⚠️', '✅', '🛵', '🎁', '⏰', '❤️'].map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-gray-400 text-xs mb-1 block">Titre *</label>
                  <input
                    type="text"
                    value={formNotif.titre}
                    onChange={e => setFormNotif(p => ({ ...p, titre: e.target.value }))}
                    placeholder="Ex: Promo du soir, Fermeture..."
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Message *</label>
                <textarea
                  value={formNotif.contenu}
                  onChange={e => setFormNotif(p => ({ ...p, contenu: e.target.value }))}
                  placeholder="Ex: -20% sur tous les menus ce soir de 18h à 20h !"
                  className="input-field resize-none h-20"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={envoiNotif || !formNotif.titre.trim() || !formNotif.contenu.trim()}
                className="btn-primary w-full disabled:opacity-50"
              >
                {envoiNotif ? 'Publication...' : '📢 Publier l\'annonce'}
              </button>
            </form>
          </div>

          {/* Liste des annonces publiées */}
          <div>
            <h2 className="font-bold text-white text-sm mb-3">Annonces publiées ({notifications.length})</h2>
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500">Aucune annonce publiée</div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notif => (
                  <div key={notif.id} className="bg-noir rounded-xl border border-gray-800 p-4 flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{notif.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{notif.titre}</p>
                      <p className="text-gray-400 text-xs mt-1">{notif.contenu}</p>
                      <p className="text-gray-600 text-xs mt-2">
                        {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => supprimerNotif(notif.id)}
                      className="text-gray-600 hover:text-rouge transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
