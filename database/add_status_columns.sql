-- Ajouter la colonne statut à la table reservations_ateliers
ALTER TABLE reservations_ateliers 
ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'en attente';

-- Ajouter la colonne statut à la table reservations_masterclass
ALTER TABLE reservations_masterclass 
ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'en attente';

-- Mettre à jour les réservations existantes pour avoir un statut par défaut
UPDATE reservations_ateliers 
SET statut = 'confirmé' 
WHERE statut IS NULL;

UPDATE reservations_masterclass 
SET statut = 'confirmé' 
WHERE statut IS NULL;

-- Créer des index pour améliorer les performances des requêtes par statut
CREATE INDEX IF NOT EXISTS idx_reservations_ateliers_statut ON reservations_ateliers(statut);
CREATE INDEX IF NOT EXISTS idx_reservations_masterclass_statut ON reservations_masterclass(statut); 