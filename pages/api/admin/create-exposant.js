import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const { nom, email } = req.body;
  if (!nom || !email) return res.status(400).json({ error: 'Champs requis manquants' });
  // 1. Créer l'exposant
  const { data: exposant, error: expError } = await supabase
    .from('exposants')
    .insert({ nom, email_responsable: email })
    .select()
    .single();
  if (expError) return res.status(500).json({ error: expError.message });
  // 2. Créer l'utilisateur inscription lié
  const { error: inscError } = await supabase
    .from('inscription')
    .insert({
      nom: nom,
      prenom: '',
      email: email,
      participant_type: 'exposant',
      organisation: nom,
      exposant_id: exposant.id,
      valide: true,
      created_at: new Date().toISOString(),
    });
  if (inscError) return res.status(500).json({ error: inscError.message });
  return res.status(200).json({ success: true });
}
