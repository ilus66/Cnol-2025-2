import { createClient } from '@supabase/supabase-js';

// Création d'un client Supabase avec la clé de service pour avoir les droits admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { userId, atelierId } = req.body;

  if (!userId || !atelierId) {
    return res.status(400).json({ message: 'User ID et Atelier ID sont requis.' });
  }

  try {
    // 1. Vérifier si une réservation existe déjà pour cet utilisateur et cet atelier
    const { data: existingReservation, error: existingError } = await supabaseAdmin
      .from('reservations_ateliers')
      .select('id')
      .eq('user_id', userId)
      .eq('atelier_id', atelierId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw existingError;
    }

    if (existingReservation) {
      return res.status(409).json({ message: 'Vous êtes déjà inscrit à cet atelier.' });
    }

    // 2. Créer la nouvelle réservation
    const { data, error } = await supabaseAdmin
      .from('reservations_ateliers')
      .insert({
        user_id: userId,
        atelier_id: atelierId,
        statut: 'confirmé', // ou 'en attente'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ message: 'Réservation à l\'atelier réussie !', reservation: data });

  } catch (error) {
    console.error('Erreur API reservation-atelier:', error);
    res.status(500).json({ message: 'Erreur lors de la réservation de l\'atelier.', error: error.message });
  }
} 