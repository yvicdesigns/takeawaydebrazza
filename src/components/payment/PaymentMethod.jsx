// ============================================================
// COMPOSANT : PaymentMethod
// Sélection du mode de paiement
// Pour MTN/Airtel : affiche les instructions + upload screenshot
// ============================================================

import { useRef } from 'react'
import { formaterPrix } from '../../lib/whatsapp'

const MTN_NUMERO    = import.meta.env.VITE_MTN_MOMO_NUMERO    || '06XXXXXXX'
const AIRTEL_NUMERO = import.meta.env.VITE_AIRTEL_MONEY_NUMERO || '05XXXXXXX'

export default function PaymentMethod({
  modeSelectionne,
  onChange,
  modeLivraison = 'livraison',
  montantTotal  = 0,
  screenshotFichier,
  onScreenshotChange,
}) {
  const estRetrait    = modeLivraison === 'retrait'
  const estMobileMoney = modeSelectionne === 'mtn_momo' || modeSelectionne === 'airtel_money'
  const fileInputRef  = useRef(null)

  const MODES_PAIEMENT = [
    {
      id: 'cash',
      label: estRetrait ? 'Cash sur place' : 'Cash à la livraison',
      description: estRetrait ? 'Payez en espèces lors du retrait' : 'Payez en espèces à la réception',
      icone: '💵',
    },
    {
      id: 'mtn_momo',
      label: 'MTN Mobile Money',
      description: 'Envoyez le montant + screenshot',
      icone: '📱',
    },
    {
      id: 'airtel_money',
      label: 'Airtel Money',
      description: 'Envoyez le montant + screenshot',
      icone: '📲',
    },
  ]

  const numeroMobileMoney = modeSelectionne === 'mtn_momo' ? MTN_NUMERO : AIRTEL_NUMERO
  const nomOperateur      = modeSelectionne === 'mtn_momo' ? 'MTN Mobile Money' : 'Airtel Money'

  function handleFichier(e) {
    const fichier = e.target.files[0]
    if (!fichier) return
    if (fichier.size > 10 * 1024 * 1024) {
      alert('Image trop lourde (max 10 Mo)')
      return
    }
    onScreenshotChange?.(fichier)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-white text-base">Mode de paiement</h3>

      {/* Choix du mode */}
      {MODES_PAIEMENT.map((mode) => {
        const estSelectionne = modeSelectionne === mode.id
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => { onChange(mode.id); onScreenshotChange?.(null) }}
            className={`
              w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
              ${estSelectionne
                ? 'border-rouge bg-rouge/10'
                : 'border-gray-700 hover:border-gray-600 bg-noir-clair'
              }
            `}
          >
            <span className="text-2xl">{mode.icone}</span>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${estSelectionne ? 'text-white' : 'text-gray-300'}`}>
                {mode.label}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{mode.description}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${estSelectionne ? 'border-rouge' : 'border-gray-600'}`}>
              {estSelectionne && <div className="w-2.5 h-2.5 rounded-full bg-rouge" />}
            </div>
          </button>
        )
      })}

      {/* Instructions Mobile Money */}
      {estMobileMoney && (
        <div className="bg-noir-clair rounded-xl p-4 border border-gray-700 space-y-4 animate-fade-in">

          {/* Étapes */}
          <div>
            <p className="text-white font-bold text-sm mb-3">Comment payer via {nomOperateur} :</p>
            <div className="space-y-2">
              {[
                { n: '1', texte: `Ouvrez l'application ${nomOperateur} sur votre téléphone` },
                { n: '2', texte: `Envoyez ${formaterPrix(montantTotal)} FCFA au numéro :` },
                { n: '3', texte: 'Prenez un screenshot de la confirmation de paiement' },
                { n: '4', texte: 'Revenez ici et joignez le screenshot ci-dessous' },
              ].map(({ n, texte }) => (
                <div key={n} className="flex gap-3 items-start">
                  <span className="w-6 h-6 bg-rouge rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5">
                    {n}
                  </span>
                  <p className="text-gray-300 text-sm leading-snug">{texte}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Numéro à utiliser */}
          <div className="bg-noir rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Numéro {nomOperateur}</p>
              <p className="text-white font-black text-lg tracking-wider">{numeroMobileMoney}</p>
              <p className="text-jaune text-xs font-semibold">Takeaway De Brazza Fast Food</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(numeroMobileMoney)}
              className="text-gray-400 hover:text-jaune text-xs border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              Copier
            </button>
          </div>

          {/* Montant à envoyer */}
          <div className="bg-jaune/10 border border-jaune/30 rounded-xl p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Montant exact à envoyer</p>
            <p className="text-jaune font-black text-2xl">{formaterPrix(montantTotal)} FCFA</p>
          </div>

          {/* Upload screenshot */}
          <div>
            <p className="text-white font-bold text-sm mb-2">
              📎 Joindre le screenshot *
            </p>
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                screenshotFichier
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-600 hover:border-jaune'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {screenshotFichier ? (
                <div>
                  <img
                    src={URL.createObjectURL(screenshotFichier)}
                    alt="screenshot paiement"
                    className="w-full max-h-48 object-contain rounded-lg mb-2"
                  />
                  <p className="text-green-400 text-xs font-semibold">✅ Screenshot ajouté</p>
                  <p className="text-gray-500 text-xs mt-0.5">Cliquer pour changer</p>
                </div>
              ) : (
                <div className="py-2">
                  <span className="text-3xl block mb-2">📸</span>
                  <p className="text-gray-300 text-sm">Appuyez pour ajouter le screenshot</p>
                  <p className="text-gray-600 text-xs mt-1">JPG, PNG — max 10 Mo</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFichier}
            />
            {!screenshotFichier && (
              <p className="text-gray-500 text-xs mt-1.5">
                ⚠️ Le screenshot est obligatoire pour valider votre commande
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
