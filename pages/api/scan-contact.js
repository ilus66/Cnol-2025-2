import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  const { user_id, badge_code } = req.body;
  if (!user_id || !badge_code) {
    return res.status(400).json({ message: 'user_id et badge_code requis' });
  }

  // Chercher le contact à partir du code badge
  const { data: contact, error } = await supabase
    .from('inscription')
    .select('id, nom, prenom, email, telephone')
    .eq('identifiant_badge', badge_code)
    .single();
  if (error || !contact) {
    return res.status(404).json({ message: 'Badge inconnu' });
  }
  if (contact.id === user_id) {
    return res.status(400).json({ message: 'Impossible de s\'ajouter soi-même.' });
  }

  // Vérifier si déjà dans la liste
  const { data: exists } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', user_id)
    .eq('contact_id', contact.id)
    .single();
  if (exists) {
    return res.status(200).json({
      message: 'Contact déjà ajouté',
      contact: {
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email,
        telephone: contact.telephone
      }
    });
  }

  // Ajouter le contact
  const { error: insertError } = await supabase
    .from('contacts')
    .insert({ user_id, contact_id: contact.id });
  if (insertError) {
    return res.status(500).json({ message: 'Erreur ajout contact' });
  }

  return res.status(200).json({
    message: 'Contact ajouté',
    contact: {
      nom: contact.nom,
      prenom: contact.prenom,
      email: contact.email,
      telephone: contact.telephone
    }
  });
} 