// ============================================================
// PAGE : Mon Solde (Wallet client)
// Affiche le solde, permet de recharger, historique des transactions
// ============================================================

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSolde } from '../hooks/useSolde'
import { soumettreDemandeRecharge } from '../lib/supabase'
import { formaterPrix } from '../lib/whatsapp'

const MTN_NUMERO   = import.meta.env.VITE_MTN_MOMO_NUMERO   || '06 XXX XXXX'
const AIRTEL_NUMERO = import.meta.env.VITE_AIRTEL_MONEY_NUMERO || '05 XXX XXXX'

const MONTANTS_RAPIDES = [500, 1000, 2000, 5000, 10000]

// ---- Badge statut transaction ----
function BadgeStatut({ statut }) {
  const styles = {
    validee:    'bg-green-400/10 text-green-400',
    en_attente: 'bg-yellow-400/10 text-yellow-400',
    refusee:    'bg-rouge/10 text-rouge',
  }
  const labels = { validee: 'Validée', en_attente: 'En attente', refusee: 'Refusée' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[statut] || 'bg-gray-800 text-gray-400'}`}>
      {labels[statut] || statut}
    </span>
  )
}

export default function SoldePage() {
  const { utilisateur } = useAuth()
  const { solde, transactions, chargement, recharger } = useSolde(utilisateur?.telephone)

  // Sheet de recharge
  const [sheetOuvert, setSheetOuvert] = useState(false)
  const [etape, setEtape]             = useState(1) // 1=montant, 2=instructions+ref
  const [montant, setMontant]         = useState(null)
  const [montantCustom, setMontantCustom] = useState('')
  const [operateur, setOperateur]     = useState('mtn')
  const [reference, setReference]     = useState('')
  const [numeroUtilise, setNumeroUtilise] = useState('')
  const [envoi, setEnvoi]             = useState(false)
  const [succes, setSucces]           = useState(false)
  const [erreurRecharge, setErreurRecharge] = useState('')

  // Filtre transactions
  const [filtre, setFiltre]           = useState('tout')

  if (!utilisateur) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <span className="text-6xl mb-4">💰</span>
        <h2 className="text-xl font-bold text-white mb-2">Connectez-vous</h2>
        <p className="text-gray-400 text-sm mb-6">Vous devez être connecté pour voir votre solde</p>
        <Link to="/profil" className="btn-primary">Se connecter</Link>
      </div>
    )
  }

  const montantFinal = montant === 'custom' ? parseInt(montantCustom) : montant
  const numeroRestaurant = operateur === 'mtn' ? MTN_NUMERO : AIRTEL_NUMERO

  async function soumettreRecharge() {
    setErreurRecharge('')
    if (!montantFinal || montantFinal < 100) { setErreurRecharge('Montant invalide'); return }
    if (!reference.trim()) { setErreurRecharge('Référence obligatoire'); return }
    if (!numeroUtilise.trim()) { setErreurRecharge('Numéro obligatoire'); return }
    setEnvoi(true)
    try {
      await soumettreDemandeRecharge({
        telephone: utilisateur.telephone,
        nom_client: utilisateur.nom,
        montant: montantFinal,
        reference: reference.trim(),
        numero_mobile_money: numeroUtilise.trim(),
        operateur,
      })
      setSucces(true)
      setTimeout(() => {
        setSheetOuvert(false)
        setEtape(1); setMontant(null); setMontantCustom('')
        setReference(''); setNumeroUtilise('')
        setSucces(false)
        recharger()
      }, 2000)
    } catch {
      setErreurRecharge('Une erreur est survenue. Réessaie.')
    } finally {
      setEnvoi(false)
    }
  }

  function ouvrirSheet() {
    setEtape(1); setMontant(null); setMontantCustom('')
    setReference(''); setNumeroUtilise(''); setSucces(false); setErreurRecharge('')
    setSheetOuvert(true)
  }

  const transactionsFiltrees =
    filtre === 'recharges' ? transactions.filter(t => t.type === 'credit') :
    filtre === 'paiements' ? transactions.filter(t => t.type === 'debit')  : transactions

  const enAttente = transactions.filter(t => t.statut === 'en_attente').length

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 max-w-md mx-auto pt-5">

        {/* ---- En-tête ---- */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profil" className="w-9 h-9 bg-noir-clair rounded-xl flex items-center justify-center text-white">←</Link>
          <h1 className="text-2xl font-black text-white">Mon Solde</h1>
        </div>

        {/* ---- Carte solde principale ---- */}
        <div className="gradient-rouge rounded-3xl p-6 mb-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-40 h-40 border-2 border-white rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-52 h-52 border-2 border-white rounded-full" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-sm mb-1">Solde disponible</p>
            {chargement ? (
              <div className="h-12 w-40 bg-white/20 rounded-xl animate-pulse" />
            ) : (
              <p className="text-white text-4xl font-black">{formaterPrix(solde)} <span className="text-2xl font-semibold">FCFA</span></p>
            )}
            <p className="text-white/60 text-xs mt-2">{utilisateur.nom}</p>
            {enAttente > 0 && (
              <div className="mt-3 bg-white/15 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
                <span className="text-white/90 text-xs">{enAttente} recharge{enAttente > 1 ? 's' : ''} en attente de validation</span>
              </div>
            )}
          </div>
        </div>

        {/* ---- Bouton recharger ---- */}
        <button
          onClick={ouvrirSheet}
          className="w-full btn-jaune flex items-center justify-center gap-2 mb-6 py-4 text-base font-black rounded-2xl"
        >
          ⚡ Recharger mon solde
        </button>

        {/* ---- Historique ---- */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-white text-lg">Historique</h2>
            <button onClick={recharger} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
              ↺ Actualiser
            </button>
          </div>

          {/* Filtres */}
          <div className="flex bg-noir-clair rounded-xl p-1 mb-4">
            {[
              { id: 'tout',      label: 'Tout' },
              { id: 'recharges', label: 'Recharges' },
              { id: 'paiements', label: 'Paiements' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltre(f.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtre === f.id ? 'bg-rouge text-white' : 'text-gray-400 hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {chargement ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-noir-clair rounded-2xl animate-pulse" />)}
            </div>
          ) : transactionsFiltrees.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl block mb-3">💸</span>
              <p className="text-gray-400 text-sm">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactionsFiltrees.map(tx => (
                <div key={tx.id} className="bg-noir-clair rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${tx.type === 'credit' ? 'bg-green-400/10' : 'bg-rouge/10'}`}>
                    {tx.source === 'admin' ? '🎁' : tx.source === 'recharge_client' ? (tx.operateur === 'mtn' ? '📱' : '📲') : '🛒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">
                      {tx.source === 'admin' ? 'Crédit admin' :
                       tx.source === 'recharge_client' ? `Recharge ${tx.operateur === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}` :
                       'Paiement commande'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-gray-500 text-xs">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {tx.statut !== 'validee' && <BadgeStatut statut={tx.statut} />}
                    </div>
                    {tx.note && <p className="text-gray-600 text-xs mt-0.5 truncate">{tx.note}</p>}
                  </div>
                  <p className={`font-black text-base flex-shrink-0 ${tx.type === 'credit' ? 'text-green-400' : 'text-rouge'}`}>
                    {tx.type === 'credit' ? '+' : ''}{formaterPrix(Math.abs(tx.montant))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          SHEET DE RECHARGE
      ================================================================ */}
      {sheetOuvert && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setSheetOuvert(false)} />

          <div className="relative bg-[#1C1C1C] rounded-t-3xl animate-slide-up max-h-[92vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-[#1C1C1C]">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            {succes ? (
              /* ---- Succès ---- */
              <div className="px-6 py-12 text-center">
                <span className="text-6xl block mb-4">✅</span>
                <h3 className="text-white font-black text-xl mb-2">Demande envoyée !</h3>
                <p className="text-gray-400 text-sm">
                  On vérifie ton paiement et on crédite ton solde dans les plus brefs délais.
                </p>
              </div>
            ) : etape === 1 ? (
              /* ---- Étape 1 : montant + opérateur ---- */
              <div className="px-5 pb-8 pt-3">
                <h3 className="text-white font-black text-lg mb-5">Recharger mon solde</h3>

                <p className="text-gray-400 text-sm mb-3">Choisir un montant</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {MONTANTS_RAPIDES.map(m => (
                    <button
                      key={m}
                      onClick={() => { setMontant(m); setMontantCustom('') }}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${montant === m ? 'bg-rouge text-white' : 'bg-noir-clair text-gray-300 hover:bg-gray-700'}`}
                    >
                      {formaterPrix(m)}
                    </button>
                  ))}
                  <button
                    onClick={() => setMontant('custom')}
                    className={`py-3 rounded-xl text-sm font-bold transition-all ${montant === 'custom' ? 'bg-rouge text-white' : 'bg-noir-clair text-gray-300 hover:bg-gray-700'}`}
                  >
                    Autre
                  </button>
                </div>
                {montant === 'custom' && (
                  <div className="mb-4">
                    <input
                      type="number"
                      autoFocus
                      value={montantCustom}
                      onChange={e => setMontantCustom(e.target.value)}
                      placeholder="Montant en FCFA"
                      className="input-field"
                    />
                  </div>
                )}

                <p className="text-gray-400 text-sm mb-3 mt-4">Via quel opérateur ?</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { id: 'mtn',    label: 'MTN MoMo',     icone: '📱', couleur: 'text-yellow-400' },
                    { id: 'airtel', label: 'Airtel Money',  icone: '📲', couleur: 'text-red-400' },
                  ].map(op => (
                    <button
                      key={op.id}
                      onClick={() => setOperateur(op.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${operateur === op.id ? 'border-rouge bg-rouge/10' : 'border-gray-700 bg-noir-clair'}`}
                    >
                      <span className="text-2xl">{op.icone}</span>
                      <span className={`font-semibold text-sm ${operateur === op.id ? 'text-white' : 'text-gray-300'}`}>{op.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { if (montantFinal && montantFinal >= 100) setEtape(2) }}
                  disabled={!montantFinal || montantFinal < 100}
                  className="btn-primary w-full disabled:opacity-40"
                >
                  Continuer →
                </button>
              </div>
            ) : (
              /* ---- Étape 2 : instructions + référence ---- */
              <div className="px-5 pb-8 pt-3">
                <button onClick={() => setEtape(1)} className="text-gray-500 text-sm mb-4 flex items-center gap-1">
                  ← Retour
                </button>
                <h3 className="text-white font-black text-lg mb-2">Envoie {formaterPrix(montantFinal)} FCFA</h3>

                {/* Instructions */}
                <div className="bg-jaune/10 border border-jaune/30 rounded-2xl p-4 mb-5">
                  <p className="text-jaune font-bold text-sm mb-2">
                    {operateur === 'mtn' ? '📱 MTN MoMo' : '📲 Airtel Money'}
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">1.</span> Envoie <span className="text-white font-bold">{formaterPrix(montantFinal)} FCFA</span> au numéro :
                    </p>
                    <p className="text-white font-black text-xl text-center py-2 bg-noir-clair rounded-xl">
                      {numeroRestaurant}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">2.</span> Note la référence de la transaction
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">3.</span> Remplis le formulaire ci-dessous
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Référence de la transaction *</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      placeholder="Ex: MP2412345678"
                      className="input-field"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Ton numéro {operateur === 'mtn' ? 'MTN' : 'Airtel'} *</label>
                    <input
                      type="tel"
                      value={numeroUtilise}
                      onChange={e => setNumeroUtilise(e.target.value)}
                      placeholder="06 XXXXXXX"
                      className="input-field"
                    />
                  </div>
                </div>

                {erreurRecharge && (
                  <div className="mt-4 bg-rouge/10 border border-rouge/30 rounded-xl px-4 py-3 text-rouge text-sm">
                    {erreurRecharge}
                  </div>
                )}

                <button
                  onClick={soumettreRecharge}
                  disabled={envoi}
                  className="btn-primary w-full mt-5 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {envoi && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Soumettre la demande
                </button>
                <p className="text-gray-600 text-xs text-center mt-3">
                  Votre solde sera crédité après vérification par le restaurant
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
