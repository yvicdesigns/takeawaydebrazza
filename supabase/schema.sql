-- ============================================================
-- SCHÉMA SQL — Base de données Big Man
-- À exécuter dans l'éditeur SQL de Supabase
-- (Ton projet > SQL Editor > Nouveau script)
-- ============================================================

-- ---- TABLE : produits ----
-- Stocke tous les produits du menu
CREATE TABLE IF NOT EXISTS produits (
  id          BIGSERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  description TEXT,
  prix        INTEGER NOT NULL,             -- Prix en FCFA (entier)
  categorie   TEXT NOT NULL DEFAULT 'burgers',
  image_url   TEXT,
  options     JSONB DEFAULT '{}',           -- Tailles, suppléments, etc. (flexible)
  populaire   BOOLEAN DEFAULT FALSE,
  actif       BOOLEAN DEFAULT TRUE,         -- Permet de masquer un produit sans le supprimer
  ordre       INTEGER DEFAULT 1,            -- Ordre d'affichage dans la catégorie
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer les filtres fréquents
CREATE INDEX IF NOT EXISTS idx_produits_categorie ON produits(categorie);
CREATE INDEX IF NOT EXISTS idx_produits_actif ON produits(actif);

-- ---- TABLE : commandes ----
-- Stocke toutes les commandes passées
CREATE TABLE IF NOT EXISTS commandes (
  id              BIGSERIAL PRIMARY KEY,
  nom_client      TEXT NOT NULL,
  telephone       TEXT NOT NULL,
  adresse         TEXT,
  mode_livraison  TEXT NOT NULL DEFAULT 'livraison', -- 'livraison' ou 'retrait'
  mode_paiement   TEXT NOT NULL DEFAULT 'cash',       -- 'cash', 'mtn_momo', 'airtel_money'
  statut          TEXT NOT NULL DEFAULT 'en_attente', -- Voir les statuts ci-dessous
  produits        JSONB NOT NULL DEFAULT '[]',        -- Liste des produits commandés
  total           INTEGER NOT NULL DEFAULT 0,         -- Total en FCFA
  notes           TEXT,                               -- Instructions spéciales
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Statuts possibles : en_attente → en_preparation → en_livraison → livre

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_commandes_telephone ON commandes(telephone);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);
CREATE INDEX IF NOT EXISTS idx_commandes_created_at ON commandes(created_at DESC);

-- ---- DONNÉES DE DÉMONSTRATION ----
-- Insère quelques produits pour commencer
INSERT INTO produits (nom, description, prix, categorie, image_url, populaire, actif, ordre) VALUES
  ('Big Man Classic', 'Notre burger signature : steak haché, cheddar fondu, salade, tomate, oignons caramélisés et sauce maison', 3500, 'burgers', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', TRUE, TRUE, 1),
  ('Big Man Crispy', 'Poulet croustillant, sauce piquante maison, coleslaw frais et cornichons', 3000, 'burgers', 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400', TRUE, TRUE, 2),
  ('Big Man Double', 'Double steak, double fromage, double plaisir !', 5000, 'burgers', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400', FALSE, TRUE, 3),
  ('Menu Big Man', 'Big Man Classic + frites croustillantes + boisson au choix', 5500, 'menus', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400', TRUE, TRUE, 1),
  ('Menu Crispy', 'Big Man Crispy + frites + boisson au choix', 5000, 'menus', 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400', FALSE, TRUE, 2),
  ('Frites Maison', 'Frites dorées et croustillantes, assaisonnées à la perfection', 1000, 'accompagnements', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', FALSE, TRUE, 1),
  ('Coca-Cola', 'Bouteille 50cl bien fraîche', 500, 'boissons', 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400', FALSE, TRUE, 1),
  ('Jus de Bissap', 'Jus traditionnel de fleur d''hibiscus, sucré et désaltérant', 500, 'boissons', 'https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=400', TRUE, TRUE, 2),
  ('Eau minérale', 'Bouteille 50cl', 300, 'boissons', 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400', FALSE, TRUE, 3),
  ('Combo Famille', '4 burgers au choix + 4 frites + 4 boissons', 18000, 'combos', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400', TRUE, TRUE, 1)
ON CONFLICT DO NOTHING;

-- ---- POLITIQUES DE SÉCURITÉ (Row Level Security) ----
-- Permet aux utilisateurs non connectés de lire les produits
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des produits" ON produits
  FOR SELECT USING (TRUE);

-- L'admin peut tout faire (via la clé service_role de Supabase)
CREATE POLICY "Admin peut tout modifier les produits" ON produits
  FOR ALL USING (TRUE);

-- Les commandes sont accessibles publiquement pour l'insertion et la lecture par téléphone
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout le monde peut créer une commande" ON commandes
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Lecture des commandes" ON commandes
  FOR SELECT USING (TRUE);
CREATE POLICY "Mise à jour des commandes" ON commandes
  FOR UPDATE USING (TRUE);

-- ---- TABLE : messages ----
-- Messages directs entre l'admin et un client (par numéro de téléphone)
CREATE TABLE IF NOT EXISTS messages (
  id          BIGSERIAL PRIMARY KEY,
  telephone   TEXT NOT NULL,                        -- Numéro du client
  nom_client  TEXT,                                 -- Nom du client (pour l'affichage admin)
  expediteur  TEXT NOT NULL CHECK (expediteur IN ('admin', 'client')),
  contenu     TEXT NOT NULL,
  lu          BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_telephone  ON messages(telephone);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des messages"   ON messages FOR SELECT USING (TRUE);
CREATE POLICY "Insertion publique des messages" ON messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Mise à jour des messages"        ON messages FOR UPDATE USING (TRUE);

-- ---- TABLE : notifications ----
-- Annonces broadcast envoyées par l'admin à tous les clients
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  titre       TEXT NOT NULL,
  contenu     TEXT NOT NULL,
  emoji       TEXT DEFAULT '📢',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des notifications"   ON notifications FOR SELECT USING (TRUE);
CREATE POLICY "Insertion publique des notifications" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Suppression des notifications"        ON notifications FOR DELETE USING (TRUE);

-- ---- ACTIVATION DU TEMPS RÉEL ----
-- Active la réplication pour le suivi en temps réel des commandes et messages
ALTER PUBLICATION supabase_realtime ADD TABLE commandes;  -- Déjà ajouté si schéma existant
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
