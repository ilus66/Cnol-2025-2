import { supabase } from '../../lib/supabaseClient';
import jwt from 'jsonwebtoken';
import { withSessionRoute } from '../../lib/session';

export default withSessionRoute(async function verifyMagicLink(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token manquant' });
  }

  // Chercher l'utilisateur avec ce token
  const { data: user, error } = await supabase.from('inscription').select('*').eq('magic_token', token).single();
  if (error || !user) return res.status(404).json({ success: false, message: 'Token invalide' });

  // Vérifier expiration
  if (!user.magic_token_expires || new Date(user.magic_token_expires) < new Date()) {
    return res.status(401).json({ success: false, message: 'Token expiré' });
  }

  // Récupérer les réservations ateliers
  const { data: ateliers } = await supabase.from('reservations_ateliers').select('atelier_id, atelier:atelier_id (titre, date_heure)').eq('user_id', user.id);
  // Récupérer les réservations masterclass
  const { data: masterclass } = await supabase.from('reservations_masterclass').select('masterclass_id, masterclass:masterclass_id (titre, date_heure)').eq('user_id', user.id);

  // Formatage des réservations
  const reservations = [
    ...(ateliers?.map(r => ({ type: 'Atelier', titre: r.atelier?.titre, date_heure: r.atelier?.date_heure })) || []),
    ...(masterclass?.map(r => ({ type: 'Masterclass', titre: r.masterclass?.titre, date_heure: r.masterclass?.date_heure })) || [])
  ];

  // Créer la session pour l'utilisateur
  req.session.user = {
    id: user.id,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    isLoggedIn: true,
  };
  await req.session.save();

  // Rediriger vers l'espace personnel
  res.redirect('/mon-espace');
});