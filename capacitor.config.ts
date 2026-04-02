// Configuration Capacitor — permet de packager l'app React en APK Android et iOS
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Identifiant unique de l'app sur les stores (format : com.NomEntreprise.NomApp)
  appId: 'com.takeawaydebrazza.app',

  // Nom affiché sur l'écran d'accueil du téléphone
  appName: 'Takeaway De Brazza',

  // Dossier contenant le build de l'app (généré par "npm run build")
  webDir: 'dist',

  // Configuration du serveur en développement
  server: {
    // En développement, pointe vers le serveur Vite local
    // En production, commente cette ligne pour utiliser les fichiers buildés
    // url: 'http://192.168.1.X:5173', // Remplace par ton IP locale pour tester sur téléphone
    cleartext: true, // Permet les connexions HTTP (utile en développement)
  },

  // Plugins Capacitor utilisés
  plugins: {
    // Notifications push — pour alerter les clients du statut de leur commande
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Barre de statut — couleur de la barre en haut du téléphone
    StatusBar: {
      style: 'dark',
      backgroundColor: '#E63946', // Rouge Takeaway De Brazza
    },

    // Écran de démarrage (splash screen)
    SplashScreen: {
      launchShowDuration: 2000,         // Durée d'affichage en ms
      backgroundColor: '#E63946',       // Fond rouge Big Man
      showSpinner: false,
    },
  },
}

export default config
