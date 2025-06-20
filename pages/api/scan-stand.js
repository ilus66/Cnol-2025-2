import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  const { visiteur_id, badge_code } = req.body;
  if (!visiteur_id || !badge_code) {
    return res.status(400).json({ message: 'visiteur_id et badge_code requis' });
  }

  // Chercher l'exposant à partir du code badge
  const { data: exposant, error } = await supabase
    .from('inscription')
    .select('id, nom, prenom, email, telephone, participant_type, qualite_sponsoring')
    .eq('identifiant_badge', badge_code)
    .single();
  if (error || !exposant) {
    return res.status(404).json({ message: 'Badge exposant inconnu' });
  }
  if (exposant.id === visiteur_id) {
    return res.status(400).json({ message: 'Impossible de scanner son propre stand.' });
  }
  if (exposant.participant_type !== 'exposant') {
    return res.status(400).json({ message: 'Ce badge n\'est pas un exposant.' });
  }

  // Vérifier si déjà scanné
  const { data: exists } = await supabase
    .from('leads')
    .select('id, created_at')
    .eq('exposant_id', exposant.id)
    .eq('visiteur_id', visiteur_id)
    .single();
  if (exists) {
    return res.status(200).json({
      message: 'Stand déjà scanné',
      exposant: {
        nom: exposant.nom,
        prenom: exposant.prenom,
        email: exposant.email,
        telephone: exposant.telephone,
        qualite_sponsoring: exposant.qualite_sponsoring
      },
      visite_stand_at: exists.created_at
    });
  }

  // Ajouter le lead
  const { data: newLead, error: insertError } = await supabase
    .from('leads')
    .insert({ exposant_id: exposant.id, visiteur_id })
    .select()
    .single();
  if (insertError) {
    return res.status(500).json({ message: 'Erreur ajout lead' });
  }

  return res.status(200).json({
    message: 'Stand scanné',
    exposant: {
      nom: exposant.nom,
      prenom: exposant.prenom,
      email: exposant.email,
      telephone: exposant.telephone,
      qualite_sponsoring: exposant.qualite_sponsoring
    },
    visite_stand_at: newLead.created_at
  });
} 