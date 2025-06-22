import { createClient } from '@supabase/supabase-js';
import { sendMail } from '../../lib/mailer';

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
    // 1. Vérifier si une réservation existe déjà
    const { data: existing } = await supabaseAdmin
      .from('reservations_masterclass')
      .select('id')
      .eq('email', email)
      .eq('masterclass_id', masterclass_id)
      .single();

    if (existing) {
      return res.status(409).json({ message: 'Vous êtes déjà inscrit à cette masterclass.' });
    }

    // 2. Récupérer les détails de la masterclass pour l'email
    const { data: masterclass, error: masterclassError } = await supabaseAdmin
      .from('masterclass')
      .select('titre')
      .eq('id', masterclass_id)
      .single();

    if (masterclassError) throw new Error('Impossible de récupérer les détails de la masterclass.');

    // 3. Insérer la nouvelle réservation avec le statut 'en attente'
    const { data, error } = await supabaseAdmin
      .from('reservations_masterclass')
      .insert({ masterclass_id, nom, prenom, email, telephone, statut: 'en attente', type: 'externe', })
      .select()
      .single();

    if (error) throw error;
    
    // 4. Envoyer les emails de notification
    // Email à l'utilisateur
    await sendMail({
      to: email,
      subject: "Confirmation de votre demande de réservation - CNOL 2025",
      text: `Bonjour ${prenom},\n\nNous avons bien reçu votre demande de réservation pour la masterclass : "${masterclass.titre}".\nVotre demande est en cours de validation. Vous recevrez un email de confirmation final une fois celle-ci approuvée par notre équipe.\n\nCordialement,\nL'équipe CNOL 2025`,
      html: `<p>Bonjour ${prenom},</p><p>Nous avons bien reçu votre demande de réservation pour la masterclass : "<strong>${masterclass.titre}</strong>".</p><p>Votre demande est en cours de validation. Vous recevrez un email de confirmation final une fois celle-ci approuvée par notre équipe.</p><p>Cordialement,<br>L'équipe CNOL 2025</p>`
    });

    // Email à l'admin
    await sendMail({
      to: 'cnol.badge@gmail.com',
      subject: `[ADMIN] Nouvelle demande de réservation Masterclass`,
      text: `Une nouvelle demande de réservation a été faite pour la masterclass "${masterclass.titre}" par ${prenom} ${nom} (${email}).\nVous pouvez la valider depuis le panel d'administration.`,
      html: `<p>Une nouvelle demande de réservation a été faite pour la masterclass "<strong>${masterclass.titre}</strong>" par ${prenom} ${nom} (${email}).</p><p>Vous pouvez la valider depuis le panel d'administration.</p>`
    });

    res.status(201).json({ message: 'Votre demande de réservation a été prise en compte. Vous recevrez un email de confirmation après validation.', reservation: data });

  } catch (error) {
    console.error('Erreur API reservation-masterclass:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
}
