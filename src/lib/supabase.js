// ============================================================
// CONFIGURATION SUPABASE
// Supabase est notre backend : base de données + authentification
// + temps réel (pour le suivi des commandes)
// ============================================================

import { createClient } from '@supabase/supabase-js'

// Ces valeurs viennent du fichier .env (variables d'environnement)
// VITE_ devant le nom permet à Vite de les exposer côté navigateur
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Indique si Supabase est correctement configuré
// Si non, l'app utilise les données de démonstration intégrées
export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.warn(
    'ℹ️ Supabase non configuré — mode démonstration actif.\n' +
    'Pour activer la base de données, crée un fichier .env avec :\n' +
    'VITE_SUPABASE_URL=https://ton-projet.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=ta-cle-anon'
  )
}

// Crée le client Supabase uniquement si les variables sont présentes
// Sinon, on crée un faux client qui ne plante pas l'application
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Garde l'utilisateur connecté même après fermeture du navigateur
        persistSession: true,
        // Stocke la session dans le localStorage du navigateur
        storage: window.localStorage,
      },
    })
  : creerClientFactice()

// Faux client Supabase — retourne toujours des résultats vides
// Utilisé quand les variables .env ne sont pas configurées
function creerClientFactice() {
  const reponseVide = { data: null, error: null }
  const requeteVide = {
    select: () => requeteVide,
    insert: () => requeteVide,
    update: () => requeteVide,
    delete: () => requeteVide,
    eq: () => requeteVide,
    order: () => requeteVide,
    limit: () => requeteVide,
    single: () => Promise.resolve(reponseVide),
    then: (fn) => Promise.resolve(reponseVide).then(fn),
  }
  // Rend toutes les méthodes chainables et résolvables
  Object.keys(requeteVide).forEach(cle => {
    requeteVide[cle] = () => requeteVide
  })
  requeteVide.single = () => Promise.resolve(reponseVide)
  requeteVide[Symbol.iterator] = undefined

  return {
    from: () => ({ ...requeteVide, select: () => Promise.resolve({ data: [], error: null }) }),
    channel: () => ({
      on: function() { return this },
      subscribe: () => ({}),
    }),
    removeChannel: () => {},
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }
}

// ---- Fonctions utilitaires pour la base de données ----

// Récupère tous les produits du menu (actifs seulement)
export async function getProduits(categorie = null) {
  let query = supabase
    .from('produits')
    .select('*')
    .eq('actif', true)      // Seulement les produits disponibles
    .order('ordre', { ascending: true }) // Trie par ordre d'affichage

  // Si une catégorie est précisée, filtre par catégorie
  if (categorie) {
    query = query.eq('categorie', categorie)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erreur lors de la récupération des produits:', error)
    return []
  }

  return data
}

// Crée une nouvelle commande dans la base de données
export async function creerCommande(commande) {
  const { data, error } = await supabase
    .from('commandes')
    .insert([commande])
    .select()
    .single() // Retourne un seul objet au lieu d'un tableau

  if (error) {
    console.error('Erreur lors de la création de la commande:', error)
    throw error // On lance l'erreur pour la gérer dans le composant
  }

  return data
}

// Récupère les commandes d'un client par son numéro de téléphone
export async function getCommandesClient(telephone) {
  const { data, error } = await supabase
    .from('commandes')
    .select('*')
    .eq('telephone', telephone)
    .order('created_at', { ascending: false }) // Plus récentes en premier

  if (error) {
    console.error('Erreur lors de la récupération des commandes:', error)
    return []
  }

  return data
}

// Met à jour le statut d'une commande (utilisé par l'admin)
export async function updateStatutCommande(commandeId, nouveauStatut) {
  const { error } = await supabase
    .from('commandes')
    .update({ statut: nouveauStatut })
    .eq('id', commandeId)

  if (error) {
    console.error('Erreur lors de la mise à jour du statut:', error)
    throw error
  }
}

// S'abonne aux changements en temps réel d'une commande spécifique
// Retourne une fonction pour se désabonner (important pour éviter les fuites mémoire)
export function ecouterCommande(commandeId, callback) {
  const subscription = supabase
    .channel(`commande-${commandeId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'commandes',
        filter: `id=eq.${commandeId}`,
      },
      (payload) => {
        // payload.new contient les nouvelles données
        callback(payload.new)
      }
    )
    .subscribe()

  // Retourne une fonction de nettoyage
  return () => supabase.removeChannel(subscription)
}

// S'abonne à toutes les nouvelles commandes (pour le dashboard admin)
export function ecouterNouvellesCommandes(callback) {
  const subscription = supabase
    .channel('nouvelles-commandes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'commandes',
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(subscription)
}

// ============================================================
// MESSAGERIE
// ============================================================

// Récupère tous les messages d'un client
export async function getMessagesClient(telephone) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('telephone', telephone)
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

// Récupère toutes les conversations (regroupées par téléphone) pour l'admin
export async function getConversations() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []

  // Regroupe les messages par téléphone, garde le dernier message de chaque conv
  const map = {}
  data.forEach(msg => {
    if (!map[msg.telephone]) {
      map[msg.telephone] = {
        telephone: msg.telephone,
        nom_client: msg.nom_client,
        dernierMessage: msg,
        nonLus: 0,
      }
    }
    if (!msg.lu && msg.expediteur === 'client') {
      map[msg.telephone].nonLus++
    }
  })

  return Object.values(map).sort(
    (a, b) => new Date(b.dernierMessage.created_at) - new Date(a.dernierMessage.created_at)
  )
}

// Envoie un message
export async function envoyerMessage({ telephone, nom_client, expediteur, contenu }) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ telephone, nom_client, expediteur, contenu }])
    .select()
    .single()

  if (error) throw error
  return data
}

// Marque tous les messages d'un client comme lus (côté admin)
export async function marquerMessagesLus(telephone) {
  await supabase
    .from('messages')
    .update({ lu: true })
    .eq('telephone', telephone)
    .eq('expediteur', 'client')
}

// Écoute les nouveaux messages d'une conversation en temps réel
export function ecouterMessages(telephone, callback) {
  const subscription = supabase
    .channel(`messages-${telephone}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `telephone=eq.${telephone}` },
      (payload) => callback(payload.new)
    )
    .subscribe()

  return () => supabase.removeChannel(subscription)
}

// Écoute tous les nouveaux messages (pour le badge admin)
export function ecouterTousMessages(callback) {
  const subscription = supabase
    .channel('tous-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => callback(payload.new)
    )
    .subscribe()

  return () => supabase.removeChannel(subscription)
}

// ============================================================
// NOTIFICATIONS BROADCAST
// ============================================================

export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function envoyerNotification({ titre, contenu, emoji = '📢' }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{ titre, contenu, emoji }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function supprimerNotification(id) {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

export function ecouterNotifications(callback) {
  const subscription = supabase
    .channel('notifications-broadcast')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => callback(payload)
    )
    .subscribe()

  return () => supabase.removeChannel(subscription)
}

// ============================================================
// SOLDES / WALLET
// ============================================================

// Récupère le solde d'un client
export async function getSolde(telephone) {
  const { data } = await supabase
    .from('soldes')
    .select('montant')
    .eq('telephone', telephone)
    .maybeSingle()
  return data?.montant || 0
}

// Récupère l'historique des transactions d'un client
export async function getTransactionsSolde(telephone) {
  const { data, error } = await supabase
    .from('transactions_solde')
    .select('*')
    .eq('telephone', telephone)
    .order('created_at', { ascending: false })
  if (error) return []
  return data
}

// Client soumet une demande de recharge
export async function soumettreDemandeRecharge({ telephone, nom_client, montant, reference, numero_mobile_money, operateur }) {
  const { data, error } = await supabase
    .from('transactions_solde')
    .insert([{
      telephone,
      nom_client,
      montant,
      type: 'credit',
      source: 'recharge_client',
      reference,
      numero_mobile_money,
      operateur,
      statut: 'en_attente',
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin : récupère toutes les demandes en attente
export async function getDemandesRecharge() {
  const { data, error } = await supabase
    .from('transactions_solde')
    .select('*')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: false })
  if (error) return []
  return data
}

// Admin : valide une demande de recharge → crédite le solde
export async function validerRecharge(transactionId, telephone, nomClient, montant) {
  await supabase
    .from('transactions_solde')
    .update({ statut: 'validee' })
    .eq('id', transactionId)
  await supabase.rpc('crediter_solde', {
    p_telephone: telephone,
    p_nom_client: nomClient,
    p_montant: montant,
  })
}

// Admin : refuse une demande de recharge
export async function refuserRecharge(transactionId) {
  await supabase
    .from('transactions_solde')
    .update({ statut: 'refusee' })
    .eq('id', transactionId)
}

// Admin : top up manuel d'un client
export async function topUpSoldeAdmin({ telephone, nom_client, montant, note }) {
  await supabase.from('transactions_solde').insert([{
    telephone, nom_client, montant, type: 'credit', source: 'admin', note, statut: 'validee',
  }])
  await supabase.rpc('crediter_solde', {
    p_telephone: telephone,
    p_nom_client: nom_client,
    p_montant: montant,
  })
}

// Checkout : débite le solde lors d'une commande
export async function debiterSoldeCommande({ telephone, nom_client, montant, commande_id }) {
  const { error } = await supabase.rpc('debiter_solde', {
    p_telephone: telephone,
    p_montant: montant,
  })
  if (error) throw new Error('Solde insuffisant')
  await supabase.from('transactions_solde').insert([{
    telephone, nom_client, montant: -montant, type: 'debit',
    source: 'commande', commande_id: String(commande_id), statut: 'validee',
  }])
}

// Admin : récupère tous les soldes clients (triés par montant)
export async function getTousSoldes() {
  const { data, error } = await supabase
    .from('soldes')
    .select('*')
    .order('montant', { ascending: false })
  if (error) return []
  return data
}

// Écoute les changements de solde en temps réel (pour un client)
export function ecouterSolde(telephone, callback) {
  const subscription = supabase
    .channel(`solde-${telephone}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'soldes', filter: `telephone=eq.${telephone}`,
    }, (payload) => callback(payload.new?.montant ?? 0))
    .subscribe()
  return () => supabase.removeChannel(subscription)
}

// ============================================================
// FIDÉLITÉ
// ============================================================

// Récupère un paramètre de l'app
export async function getParametre(cle) {
  const { data } = await supabase
    .from('parametres').select('valeur').eq('cle', cle).maybeSingle()
  return data?.valeur ?? null
}

// Met à jour un paramètre
export async function updateParametre(cle, valeur) {
  await supabase
    .from('parametres')
    .upsert({ cle, valeur, updated_at: new Date().toISOString() }, { onConflict: 'cle' })
}

// Récupère les stats fidélité de tous les clients (via RPC)
export async function getStatsFidelite(seuil = 10) {
  const { data, error } = await supabase.rpc('get_stats_fidelite', { p_seuil: seuil })
  if (error) return []
  return data
}

// Admin : valide 1 récompense pour un client (consomme 1 palier)
export async function validerRecompenseFidelite(profileId, paliersActuels) {
  await supabase
    .from('profiles')
    .update({ fidelite_paliers_utilises: paliersActuels + 1 })
    .eq('id', profileId)
}

// Admin : ajuste manuellement les points bonus d'un client
export async function ajusterPointsFidelite(profileId, pointsActuels, delta) {
  await supabase
    .from('profiles')
    .update({ fidelite_points_bonus: Math.max(0, pointsActuels + delta) })
    .eq('id', profileId)
}

// Récupère les données fidélité fraîches d'un client (pour Profile.jsx)
export async function getFideliteClient(profileId) {
  const { data } = await supabase
    .from('profiles')
    .select('fidelite_paliers_utilises, fidelite_points_bonus')
    .eq('id', profileId)
    .maybeSingle()
  return data
}

// ============================================================
// LIVREURS
// ============================================================

// Récupère tous les livreurs actifs
export async function getLivreurs() {
  const { data, error } = await supabase
    .from('livreurs')
    .select('*')
    .eq('actif', true)
    .order('nom')
  if (error) return []
  return data
}

// Connexion livreur par téléphone + code d'accès
export async function connexionLivreur(telephone, codeAcces) {
  const { data, error } = await supabase
    .from('livreurs')
    .select('*')
    .eq('telephone', telephone.replace(/\s/g, ''))
    .eq('code_acces', codeAcces)
    .eq('actif', true)
    .maybeSingle()
  if (error || !data) return null
  return data
}

// Admin : crée un compte livreur
export async function creerLivreur({ nom, telephone, code_acces }) {
  const { data, error } = await supabase
    .from('livreurs')
    .insert([{ nom, telephone: telephone.replace(/\s/g, ''), code_acces }])
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin : met à jour un livreur
export async function updateLivreur(id, updates) {
  const { error } = await supabase.from('livreurs').update(updates).eq('id', id)
  if (error) throw error
}

// Admin : supprime un livreur
export async function supprimerLivreur(id) {
  const { error } = await supabase.from('livreurs').delete().eq('id', id)
  if (error) throw error
}

// Admin : assigne un livreur à une commande + passe en livraison
export async function assignerLivreurCommande(commandeId, livreur) {
  const { error } = await supabase
    .from('commandes')
    .update({
      livreur_id:        livreur.id,
      livreur_nom:       livreur.nom,
      livreur_telephone: livreur.telephone,
      statut:            'en_livraison',
    })
    .eq('id', commandeId)
  if (error) throw error
}

// Récupère les commandes assignées à un livreur
export async function getCommandesLivreur(livreurId) {
  const { data, error } = await supabase
    .from('commandes')
    .select('*')
    .eq('livreur_id', livreurId)
    .in('statut', ['en_livraison'])
    .order('created_at', { ascending: false })
  if (error) return []
  return data
}

// Livreur : confirme la livraison
export async function confirmerLivraison(commandeId) {
  const { error } = await supabase
    .from('commandes')
    .update({ statut: 'livre' })
    .eq('id', commandeId)
  if (error) throw error
}

// ============================================================
// PAIEMENT MOBILE MONEY — Screenshots
// ============================================================

// Upload le screenshot de paiement dans Supabase Storage
export async function uploadScreenshotPaiement(fichier) {
  const ext        = fichier.name.split('.').pop().toLowerCase()
  const nomFichier = `paiement_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('screenshots-paiement')
    .upload(nomFichier, fichier, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('screenshots-paiement')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// Admin : valide le paiement → passe la commande en préparation
export async function validerPaiementCommande(commandeId) {
  const { error } = await supabase
    .from('commandes')
    .update({ statut_paiement: 'valide', statut: 'en_preparation' })
    .eq('id', commandeId)
  if (error) throw error
}

// Admin : rejette le paiement (screenshot invalide)
export async function rejeterPaiementCommande(commandeId) {
  const { error } = await supabase
    .from('commandes')
    .update({ statut_paiement: 'rejete' })
    .eq('id', commandeId)
  if (error) throw error
}

// ============================================================
// PROMOTIONS
// ============================================================

// Récupère les promotions (actives seulement par défaut, avec le produit lié)
export async function getPromotions(actifSeulement = true) {
  let query = supabase
    .from('promotions')
    .select('*, produits(id, nom, image_url, prix, categorie)')
    .order('created_at', { ascending: false })

  if (actifSeulement) query = query.eq('actif', true)

  const { data, error } = await query
  if (error) return []

  if (!actifSeulement) return data

  // Filtre côté client sur les dates
  const today = new Date().toISOString().split('T')[0]
  return data.filter(p => {
    if (p.date_debut && p.date_debut > today) return false
    if (p.date_fin   && p.date_fin   < today) return false
    return true
  })
}

// Crée une nouvelle promotion
export async function creerPromotion(promo) {
  const { data, error } = await supabase
    .from('promotions')
    .insert([promo])
    .select()
    .single()
  if (error) throw error
  return data
}

// Met à jour une promotion
export async function updatePromotion(id, updates) {
  const { error } = await supabase
    .from('promotions')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

// Supprime une promotion
export async function supprimerPromotion(id) {
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) throw error
}

// Upload un fichier média dans le bucket promotions-media
export async function uploadMediaPromotion(fichier) {
  const estVideo = fichier.type.startsWith('video/')

  // Images → base64 (pas besoin de bucket)
  if (!estVideo) {
    if (fichier.size > 4 * 1024 * 1024) throw new Error('Image trop lourde (max 4 Mo)')
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve({ url: e.target.result, type: 'image' })
      reader.onerror = () => reject(new Error('Erreur lecture fichier'))
      reader.readAsDataURL(fichier)
    })
  }

  // Vidéos → Supabase Storage (bucket "promotions-media" requis)
  if (fichier.size > 100 * 1024 * 1024) throw new Error('Vidéo trop lourde (max 100 Mo)')

  const ext = fichier.name.split('.').pop().toLowerCase()
  const nomFichier = `video_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('promotions-media')
    .upload(nomFichier, fichier, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(error.message)

  const { data: urlData } = supabase.storage
    .from('promotions-media')
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl, type: 'video' }
}

export async function supprimerMediaPromotion(mediaUrl) {
  if (!mediaUrl || mediaUrl.startsWith('data:')) return // base64, rien à supprimer
  const parts = mediaUrl.split('/promotions-media/')
  if (parts.length < 2) return
  const path = decodeURIComponent(parts[1].split('?')[0])
  await supabase.storage.from('promotions-media').remove([path])
}

// ============================================================
// AVIS / NOTATIONS
// ============================================================

export async function soumettreAvis({ commande_id, telephone, nom_client, notes_produits, commentaire }) {
  // notes_produits = [{ produit_id, produit_nom, note }]
  const inserts = notes_produits.map(p => ({
    commande_id: String(commande_id),
    telephone,
    nom_client,
    produit_id:   String(p.produit_id || ''),
    produit_nom:  p.produit_nom,
    note:         p.note,
    commentaire:  commentaire || null,
    visible:      true,
  }))
  const { error } = await supabase.from('avis').insert(inserts)
  if (error) throw error
}

export async function aDejaNote(commande_id) {
  const { data } = await supabase
    .from('avis').select('id').eq('commande_id', String(commande_id)).limit(1)
  return (data?.length ?? 0) > 0
}

export async function getNotesProduitsMultiples(nomsOuIds) {
  if (!nomsOuIds.length) return {}
  const { data } = await supabase
    .from('avis').select('produit_nom, produit_id, note').eq('visible', true)
  const map = {}
  data?.forEach(a => {
    const key = a.produit_id || a.produit_nom
    if (!map[key]) map[key] = { total: 0, count: 0, nom: a.produit_nom }
    map[key].total += a.note
    map[key].count++
  })
  const result = {}
  Object.entries(map).forEach(([k, { total, count, nom }]) => {
    result[k] = { moyenne: Math.round((total / count) * 10) / 10, count, nom }
  })
  return result
}

export async function getAvisProduit(produitNom) {
  const { data, error } = await supabase
    .from('avis').select('*').eq('produit_nom', produitNom).eq('visible', true)
    .order('created_at', { ascending: false }).limit(20)
  if (error) return []
  return data
}

export async function getTousAvis() {
  const { data, error } = await supabase
    .from('avis').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data
}

export async function toggleVisibiliteAvis(id, visible) {
  await supabase.from('avis').update({ visible }).eq('id', id)
}

export async function repondreAvis(id, reponse) {
  await supabase.from('avis').update({ reponse_admin: reponse }).eq('id', id)
}

// ============================================================
// CODES PROMO
// ============================================================

export async function getCodesPromo() {
  const val = await getParametre('codes_promo')
  try { return val ? JSON.parse(val) : [] } catch { return [] }
}

export async function sauvegarderCodesPromo(codes) {
  await updateParametre('codes_promo', JSON.stringify(codes))
}

export async function validerCodePromo(code, montant) {
  const codes = await getCodesPromo()
  const c = codes.find(c => c.code.toUpperCase() === code.trim().toUpperCase() && c.actif)
  if (!c) return { valide: false, message: 'Code promo invalide' }
  if (c.min_commande && montant < c.min_commande)
    return { valide: false, message: `Minimum ${c.min_commande} FCFA requis` }
  if (c.date_fin && new Date(c.date_fin) < new Date())
    return { valide: false, message: 'Code expiré' }
  return { valide: true, code: c }
}

// ============================================================
// PARAMÈTRES RESTAURANT
// ============================================================

export async function getStatutRestaurant() {
  const val = await getParametre('restaurant_ouvert')
  return val !== 'false' // true par défaut si non défini
}

export async function getInfosRestaurant() {
  const [ouvert, frais, eta, horaires] = await Promise.all([
    getParametre('restaurant_ouvert'),
    getParametre('frais_livraison'),
    getParametre('eta_livraison'),
    getParametre('horaires_ouverture'),
  ])
  return {
    ouvert:    ouvert !== 'false',
    frais:     parseInt(frais ?? '500'),
    eta:       eta ?? '30-45 min',
    horaires:  horaires ? JSON.parse(horaires) : null,
  }
}

// Écoute les nouvelles demandes de recharge (pour l'admin)
export function ecouterDemandesRecharge(callback) {
  const subscription = supabase
    .channel('demandes-recharge')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'transactions_solde',
    }, (payload) => { if (payload.new.statut === 'en_attente') callback(payload.new) })
    .subscribe()
  return () => supabase.removeChannel(subscription)
}
