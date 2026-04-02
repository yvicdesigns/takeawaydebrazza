// ============================================================
// CONTEXTE D'AUTHENTIFICATION — Supabase Auth
// Connexion par téléphone ou @username + mot de passe
// Les comptes sont stockés sur Supabase (multi-appareils)
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

// ---- Helpers ----

// Génère un email synthétique à partir du numéro de téléphone
// (Supabase Auth requiert un email — on utilise téléphone@takeawaydebrazza.local)
function emailSynthetique(telephone) {
  return telephone.replace(/\D/g, '') + '@takeawaydebrazza.local'
}

// Récupère le profil complet depuis la table profiles
async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement]   = useState(true)

  // Restaure la session au démarrage
  useEffect(() => {
    if (!supabaseConfigured) {
      // Fallback localStorage si Supabase non configuré
      try {
        const raw = localStorage.getItem('takeawaydebrazza_utilisateur')
        if (raw) setUtilisateur(JSON.parse(raw))
      } catch { /* ignore */ }
      setChargement(false)
      return
    }

    // Vérifie la session Supabase existante
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setUtilisateur(profile)
      }
      setChargement(false)
    })

    // Écoute les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') setUtilisateur(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ---- Inscription ----
  async function inscrire({ nom, telephone, motDePasse, username }) {
    if (!supabaseConfigured) return inscrireLocal({ nom, telephone, motDePasse, username })

    const tel = telephone.trim()
    const un  = username?.trim().replace(/^@/, '').toLowerCase() || null

    // Vérifier si le téléphone est déjà pris
    const { data: existTel } = await supabase
      .from('profiles').select('id').eq('telephone', tel).maybeSingle()
    if (existTel) return { ok: false, champ: 'telephone', erreur: 'Ce numéro est déjà utilisé. Connectez-vous.' }

    // Vérifier si le username est déjà pris
    if (un) {
      const { data: existUn } = await supabase
        .from('profiles').select('id').eq('username', un).maybeSingle()
      if (existUn) return { ok: false, champ: 'username', erreur: 'Ce nom d\'utilisateur est déjà pris.' }
    }

    // Créer le compte Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: emailSynthetique(tel),
      password: motDePasse,
    })

    if (error) {
      if (error.message.includes('already registered')) {
        return { ok: false, champ: 'telephone', erreur: 'Ce numéro est déjà utilisé. Connectez-vous.' }
      }
      return { ok: false, erreur: error.message }
    }

    // Créer le profil dans la table profiles
    const { error: errProfil } = await supabase.from('profiles').insert({
      id: data.user.id,
      nom: nom.trim(),
      telephone: tel,
      username: un,
    })
    if (errProfil) return { ok: false, erreur: errProfil.message }

    const profile = await fetchProfile(data.user.id)
    setUtilisateur(profile)
    return { ok: true }
  }

  // ---- Connexion ----
  async function connexion({ identifiant, motDePasse }) {
    if (!supabaseConfigured) return connexionLocal({ identifiant, motDePasse })

    const id = identifiant.trim()
    let telephone = id

    const estEmail    = id.includes('@') && id.includes('.')
    const estUsername = !estEmail && id.startsWith('@')
    const estTel      = !estEmail && !estUsername && /^[\d\s\+\-\.]+$/.test(id)

    if (estEmail) {
      // Cherche le profil par email réel
      const { data } = await supabase
        .from('profiles').select('telephone').eq('email', id.toLowerCase()).maybeSingle()
      if (!data) return { ok: false, erreur: 'Aucun compte trouvé avec cet email.' }
      telephone = data.telephone
    } else if (estUsername || !estTel) {
      // Cherche par @username
      const un = id.replace(/^@/, '').toLowerCase()
      const { data } = await supabase
        .from('profiles').select('telephone').eq('username', un).maybeSingle()
      if (!data) return { ok: false, erreur: 'Aucun compte trouvé avec cet identifiant.' }
      telephone = data.telephone
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailSynthetique(telephone),
      password: motDePasse,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { ok: false, erreur: 'Identifiant ou mot de passe incorrect.' }
      }
      return { ok: false, erreur: 'Aucun compte trouvé avec cet identifiant.' }
    }

    const profile = await fetchProfile(data.user.id)
    setUtilisateur(profile)
    return { ok: true }
  }

  // ---- Définir mot de passe (compte migré local) ----
  async function definirMotDePasse({ compteId, motDePasse }) {
    if (!supabaseConfigured) return definirMotDePasseLocal({ compteId, motDePasse })
    // Avec Supabase, la migration n'est pas nécessaire — les anciens comptes doivent se réinscrire
    return { ok: false, erreur: 'Veuillez créer un nouveau compte.' }
  }

  // ---- Mise à jour profil ----
  async function mettreAJourProfil(nouvellesInfos) {
    if (!supabaseConfigured) return mettreAJourProfilLocal(nouvellesInfos)

    let infos = { ...nouvellesInfos }

    if (infos.username !== undefined) {
      const un = infos.username?.trim().replace(/^@/, '').toLowerCase() || null
      if (un) {
        const { data: existUn } = await supabase
          .from('profiles').select('id').eq('username', un).neq('id', utilisateur.id).maybeSingle()
        if (existUn) return { ok: false, erreur: 'Ce nom d\'utilisateur est déjà pris.' }
      }
      infos.username = un
    }

    const { error } = await supabase
      .from('profiles')
      .update(infos)
      .eq('id', utilisateur.id)

    if (error) return { ok: false, erreur: error.message }

    setUtilisateur(prev => ({ ...prev, ...infos }))
    return { ok: true }
  }

  // ---- Déconnexion ----
  async function deconnexion() {
    if (supabaseConfigured) {
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem('takeawaydebrazza_utilisateur')
    }
    setUtilisateur(null)
  }

  // ================================================================
  // FALLBACK LOCALSTORAGE (si Supabase non configuré)
  // ================================================================

  function inscrireLocal({ nom, telephone, motDePasse, username }) {
    const comptes = JSON.parse(localStorage.getItem('takeawaydebrazza_comptes') || '[]')
    if (comptes.find(c => c.telephone === telephone.trim()))
      return { ok: false, champ: 'telephone', erreur: 'Ce numéro est déjà utilisé. Connectez-vous.' }
    const un = username?.trim().replace(/^@/, '').toLowerCase() || null
    if (un && comptes.find(c => c.username === un))
      return { ok: false, champ: 'username', erreur: 'Ce nom d\'utilisateur est déjà pris.' }
    const compte = {
      id: Date.now().toString(), nom: nom.trim(), telephone: telephone.trim(),
      username: un, motDePasse, createdAt: new Date().toISOString(),
    }
    comptes.push(compte)
    localStorage.setItem('takeawaydebrazza_comptes', JSON.stringify(comptes))
    const { motDePasse: _, ...session } = compte
    localStorage.setItem('takeawaydebrazza_utilisateur', JSON.stringify(session))
    setUtilisateur(session)
    return { ok: true }
  }

  function connexionLocal({ identifiant, motDePasse }) {
    const comptes = JSON.parse(localStorage.getItem('takeawaydebrazza_comptes') || '[]')
    const id = identifiant.trim().replace(/^@/, '').toLowerCase()
    const compte = comptes.find(c =>
      c.telephone === identifiant.trim() ||
      (c.username && c.username === id) ||
      (c.email && c.email.toLowerCase() === id)
    )
    if (!compte) return { ok: false, erreur: 'Aucun compte trouvé avec cet identifiant.' }
    if (compte.motDePasse === null) return { ok: false, erreur: 'DEFINIR_MDP', compte }
    if (compte.motDePasse !== motDePasse) return { ok: false, erreur: 'Mot de passe incorrect.' }
    const { motDePasse: _, ...session } = compte
    localStorage.setItem('takeawaydebrazza_utilisateur', JSON.stringify(session))
    setUtilisateur(session)
    return { ok: true }
  }

  function definirMotDePasseLocal({ compteId, motDePasse }) {
    const comptes = JSON.parse(localStorage.getItem('takeawaydebrazza_comptes') || '[]')
    const idx = comptes.findIndex(c => c.id === compteId)
    if (idx === -1) return { ok: false, erreur: 'Compte introuvable.' }
    comptes[idx].motDePasse = motDePasse
    localStorage.setItem('takeawaydebrazza_comptes', JSON.stringify(comptes))
    const { motDePasse: _, ...session } = comptes[idx]
    localStorage.setItem('takeawaydebrazza_utilisateur', JSON.stringify(session))
    setUtilisateur(session)
    return { ok: true }
  }

  function mettreAJourProfilLocal(nouvellesInfos) {
    let infos = { ...nouvellesInfos }
    if (infos.username !== undefined) {
      const un = infos.username?.trim().replace(/^@/, '').toLowerCase() || null
      if (un) {
        const comptes = JSON.parse(localStorage.getItem('takeawaydebrazza_comptes') || '[]')
        if (comptes.find(c => c.id !== utilisateur.id && c.username === un))
          return { ok: false, erreur: 'Ce nom d\'utilisateur est déjà pris.' }
      }
      infos.username = un
    }
    const maj = { ...utilisateur, ...infos }
    localStorage.setItem('takeawaydebrazza_utilisateur', JSON.stringify(maj))
    setUtilisateur(maj)
    const comptes = JSON.parse(localStorage.getItem('takeawaydebrazza_comptes') || '[]')
    const idx = comptes.findIndex(c => c.id === utilisateur.id)
    if (idx !== -1) { comptes[idx] = { ...comptes[idx], ...infos }; localStorage.setItem('takeawaydebrazza_comptes', JSON.stringify(comptes)) }
    return { ok: true }
  }

  return (
    <AuthContext.Provider value={{
      utilisateur,
      chargement,
      estConnecte: !!utilisateur,
      inscrire,
      connexion,
      definirMotDePasse,
      mettreAJourProfil,
      deconnexion,
    }}>
      {!chargement && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
