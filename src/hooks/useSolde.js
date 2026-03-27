// ============================================================
// HOOK : useSolde
// Gère le solde et les transactions d'un client
// ============================================================

import { useState, useEffect } from 'react'
import { getSolde, getTransactionsSolde, ecouterSolde } from '../lib/supabase'

export function useSolde(telephone) {
  const [solde, setSolde]             = useState(0)
  const [transactions, setTransactions] = useState([])
  const [chargement, setChargement]   = useState(false)

  useEffect(() => {
    if (!telephone) return
    charger()

    // Écoute les changements de solde en temps réel
    const desabonner = ecouterSolde(telephone, (nouveauSolde) => {
      setSolde(nouveauSolde)
    })
    return desabonner
  }, [telephone])

  async function charger() {
    setChargement(true)
    const [s, t] = await Promise.all([
      getSolde(telephone),
      getTransactionsSolde(telephone),
    ])
    setSolde(s)
    setTransactions(t)
    setChargement(false)
  }

  return { solde, transactions, chargement, recharger: charger }
}
