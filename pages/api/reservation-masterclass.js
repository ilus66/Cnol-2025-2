import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { masterclass_id, nom, prenom, email, telephone } = req.body;

  if (!masterclass_id || !nom || !prenom || !email) {
    return res.status(400).json({ message: 'Informations manquantes.' });
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from('reservations_masterclass')
      .select('id')
      .eq('email', email)
      .eq('masterclass_id', masterclass_id)
      .single();

    if (existing) {
      return res.status(409).json({ message: 'Vous êtes déjà inscrit à cette masterclass.' });
    }

    const { data, error } = await supabaseAdmin
      .from('reservations_masterclass')
      .insert({ masterclass_id, nom, prenom, email, telephone, statut: 'confirmé' })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Réservation à la masterclass réussie !', reservation: data });

  } catch (error) {
    console.error('Erreur API reservation-masterclass:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
}
