import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    // Création d'un client admin pour bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { atelier_id, masterclass_id } = req.query;

    if (atelier_id) {
      const { data, error } = await supabaseAdmin
        .from('reservations_ateliers')
        .select('*')
        .eq('atelier_id', atelier_id)
        .order('created_at', { ascending: false });

      if (error) {
        // Renvoie une erreur spécifique si la requête échoue
        return res.status(500).json({ message: 'Erreur Supabase (ateliers)', error: error.message });
      }
      return res.status(200).json(data);

    } else if (masterclass_id) {
      const { data, error } = await supabaseAdmin
        .from('reservations_masterclass')
        .select('*')
        .eq('masterclass_id', masterclass_id)
        .order('created_at', { ascending: false });

      if (error) {
        // Renvoie une erreur spécifique si la requête échoue
        return res.status(500).json({ message: 'Erreur Supabase (masterclass)', error: error.message });
      }
      return res.status(200).json(data);
        
    } else {
      return res.status(400).json({ message: 'ID de l\'atelier ou de la masterclass manquant.' });
    }
  } catch (e) {
    // Capture toute autre erreur (y compris une mauvaise initialisation du client)
    console.error("Erreur critique dans l'API list-reservations:", e);
    return res.status(500).json({ message: 'Erreur critique du serveur.', error: e.message });
  }
} 