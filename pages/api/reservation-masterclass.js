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

  const { userId, masterclassId } = req.body;

  if (!userId || !masterclassId) {
    return res.status(400).json({ message: 'User ID et Masterclass ID sont requis.' });
  }

  try {
    // 1. Vérifier si une réservation existe déjà pour cet utilisateur et cette masterclass
    const { data: existingReservation, error: existingError } = await supabaseAdmin
      .from('reservations_masterclass')
      .select('id')
      .eq('user_id', userId)
      .eq('masterclass_id', masterclassId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows found, ce qui est normal
      throw existingError;
    }

    if (existingReservation) {
      return res.status(409).json({ message: 'Vous êtes déjà inscrit à cette masterclass.' });
    }

    // 2. Créer la nouvelle réservation
    const { data, error } = await supabaseAdmin
      .from('reservations_masterclass')
      .insert({
        user_id: userId,
        masterclass_id: masterclassId,
        statut: 'confirmé', // ou 'en attente' selon votre logique métier
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ message: 'Réservation à la masterclass réussie !', reservation: data });

  } catch (error) {
    console.error('Erreur API reservation-masterclass:', error);
    res.status(500).json({ message: 'Erreur lors de la réservation de la masterclass.', error: error.message });
  }
} 