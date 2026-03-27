// ============================================================
// APP.JSX — Point d'entrée de l'application
// Définit toutes les routes (pages) de l'application
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

// Layout
import Navbar from './components/layout/Navbar'
import BottomNav from './components/layout/BottomNav'

// Pages client
import Home from './pages/Home'
import Menu from './pages/Menu'
import CartPage from './pages/CartPage'
import Checkout from './pages/Checkout'
import OrderTracking from './pages/OrderTracking'
import Profile from './pages/Profile'
import MessagesPage from './pages/MessagesPage'
import SoldePage from './pages/SoldePage'

// Pages admin
import AdminLogin from './admin/AdminLogin'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import ManageOrders from './admin/ManageOrders'
import ManageMenu from './admin/ManageMenu'
import AdminMessages from './admin/AdminMessages'
import ManageSoldes from './admin/ManageSoldes'
import ManageFidelite from './admin/ManageFidelite'
import ManagePromotions from './admin/ManagePromotions'
import ManageLivreurs from './admin/ManageLivreurs'
import ManageAudio from './admin/ManageAudio'
import ManageParametres from './admin/ManageParametres'
import ManageAvis from './admin/ManageAvis'
import ManageGuide from './admin/ManageGuide'
import ManageRapports from './admin/ManageRapports'
import OrderConfirmation from './pages/OrderConfirmation'
import LivreurLogin from './livreur/LivreurLogin'
import LivreurDashboard from './livreur/LivreurDashboard'

// ---- Layout principal (pages client) ----
// Ce composant enveloppe toutes les pages client avec la navbar et la bottom nav
function ClientLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

// Page 404 — affichée si aucune route ne correspond
function Page404() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <span className="text-7xl mb-4">🍔</span>
      <h1 className="text-2xl font-black text-white mb-2">Page introuvable</h1>
      <p className="text-gray-400 text-sm mb-6">Cette page n'existe pas</p>
      <a href="/" className="btn-primary">Retour à l'accueil</a>
    </div>
  )
}

export default function App() {
  return (
    // BrowserRouter gère la navigation entre les pages
    <BrowserRouter>
      {/* AuthProvider rend les infos utilisateur disponibles partout */}
      <ThemeProvider>
      <AuthProvider>
        {/* CartProvider rend le panier disponible partout */}
        <CartProvider>

          {/* Une seule <Routes> à la racine — React Router v6 */}
          <Routes>

            {/* ======== ROUTES ADMIN ======== */}
            {/* Page de connexion admin (sans layout client) */}
            <Route path="/admin" element={<AdminLogin />} />

            {/* Pages admin protégées avec sidebar */}
            <Route path="/admin/dashboard" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/admin/commandes" element={<AdminLayout />}>
              <Route index element={<ManageOrders />} />
            </Route>
            <Route path="/admin/menu" element={<AdminLayout />}>
              <Route index element={<ManageMenu />} />
            </Route>
            <Route path="/admin/messages" element={<AdminLayout />}>
              <Route index element={<AdminMessages />} />
            </Route>
            <Route path="/admin/soldes" element={<AdminLayout />}>
              <Route index element={<ManageSoldes />} />
            </Route>
            <Route path="/admin/fidelite" element={<AdminLayout />}>
              <Route index element={<ManageFidelite />} />
            </Route>
            <Route path="/admin/promotions" element={<AdminLayout />}>
              <Route index element={<ManagePromotions />} />
            </Route>
            <Route path="/admin/livreurs" element={<AdminLayout />}>
              <Route index element={<ManageLivreurs />} />
            </Route>
            <Route path="/admin/audio" element={<AdminLayout />}>
              <Route index element={<ManageAudio />} />
            </Route>
            <Route path="/admin/parametres" element={<AdminLayout />}>
              <Route index element={<ManageParametres />} />
            </Route>
            <Route path="/admin/avis" element={<AdminLayout />}>
              <Route index element={<ManageAvis />} />
            </Route>
            <Route path="/admin/guide" element={<AdminLayout />}>
              <Route index element={<ManageGuide />} />
            </Route>
            <Route path="/admin/rapports" element={<AdminLayout />}>
              <Route index element={<ManageRapports />} />
            </Route>

            {/* ======== ESPACE LIVREUR ======== */}
            <Route path="/livreur" element={<LivreurLogin />} />
            <Route path="/livreur/dashboard" element={<LivreurDashboard />} />

            {/* ======== ROUTES CLIENT ======== */}
            {/* Chaque route client est enveloppée dans ClientLayout */}

            <Route path="/" element={
              <ClientLayout><Home /></ClientLayout>
            } />

            <Route path="/menu" element={
              <ClientLayout><Menu /></ClientLayout>
            } />

            <Route path="/panier" element={
              <ClientLayout><CartPage /></ClientLayout>
            } />

            <Route path="/commander" element={
              <ClientLayout><Checkout /></ClientLayout>
            } />

            <Route path="/commandes" element={
              <ClientLayout><Profile /></ClientLayout>
            } />

            <Route path="/commandes/:id" element={
              <ClientLayout><OrderTracking /></ClientLayout>
            } />

            <Route path="/messages" element={
              <ClientLayout><MessagesPage /></ClientLayout>
            } />

            <Route path="/profil" element={
              <ClientLayout><Profile /></ClientLayout>
            } />

            <Route path="/solde" element={
              <ClientLayout><SoldePage /></ClientLayout>
            } />

            <Route path="/commande-confirmee/:id" element={
              <ClientLayout><OrderConfirmation /></ClientLayout>
            } />

            {/* Route 404 — doit être en dernier */}
            <Route path="*" element={
              <ClientLayout><Page404 /></ClientLayout>
            } />

          </Routes>

        </CartProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
