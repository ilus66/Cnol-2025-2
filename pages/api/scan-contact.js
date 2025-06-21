import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { user_id, identifiant_badge } = req.body;
  if (!user_id || !identifiant_badge) {
    return res.status(400).json({ message: 'user_id et identifiant_badge requis' });
  }

  try {
    // 1. Trouver l'id de la personne scannée grâce à son badge
    const { data: scannedUser, error: findError } = await supabase
      .from('inscription')
      .select('id')
      .eq('identifiant_badge', identifiant_badge)
      .single();
    
    if (findError || !scannedUser) {
      return res.status(404).json({ message: 'Badge scanné non trouvé.' });
    }

    // 2. Enregistrer le contact
    const { error: insertError } = await supabase
      .from('contacts')
      .insert({
        user_id: user_id, // La personne qui scanne
        contact_id: scannedUser.id, // La personne qui est scannée
      });

    if (insertError) {
      // Gérer les doublons
      if (insertError.code === '23505') {
        return res.status(409).json({ message: 'Ce contact a déjà été ajouté.' });
      }
      throw insertError;
    }

    res.status(200).json({ message: 'Contact ajouté avec succès !' })
  } catch (error) {
    console.error('Erreur API /scan-contact:', error)
    res.status(500).json({ message: "Erreur lors de l'ajout du contact" })
  }
} 