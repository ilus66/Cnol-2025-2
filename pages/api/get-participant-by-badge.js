import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Utilisation du client Supabase avec la clé de service pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Note: Idéalement, cette route devrait être protégée pour s'assurer 
  // que seul un utilisateur authentifié peut l'appeler.

  const { badge_code } = req.query;

  if (!badge_code) {
    return res.status(400).json({ message: 'Le paramètre badge_code est manquant.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('inscription')
      .select('nom, prenom, email, telephone, fonction, ville')
      .eq('identifiant_badge', badge_code)
      .single();

    if (error || !data) {
      console.error('Erreur Supabase Admin (recherche badge):', error);
      return res.status(404).json({ message: 'Participant non trouvé.' });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Erreur API get-participant-by-badge:', err);
    return res.status(500).json({ message: "Erreur serveur interne." });
  }
} 