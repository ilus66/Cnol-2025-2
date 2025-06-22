import { createClient } from '@supabase/supabase-js';
import { sendMail } from '../../../lib/mailer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { atelier_id, nom, prenom, email, telephone } = req.body;

  if (!atelier_id || !nom || !prenom || !email) {
    return res.status(400).json({ message: 'Informations manquantes.' });
  }

  try {
    // 1. Vérifier si une réservation existe déjà
    const { data: existing } = await supabaseAdmin
      .from('reservations_ateliers')
      .select('id')
      .eq('email', email)
      .eq('atelier_id', atelier_id)
      .single();

    if (existing) {
      return res.status(409).json({ message: 'Vous êtes déjà inscrit à cet atelier.' });
    }

    // 2. Récupérer les détails de l'atelier pour l'email
    const { data: atelier, error: atelierError } = await supabaseAdmin
      .from('ateliers')
      .select('titre')
      .eq('id', atelier_id)
      .single();

    if (atelierError) throw new Error('Impossible de récupérer les détails de l\'atelier.');

    // 3. Insérer la nouvelle réservation avec le statut 'en attente'
    const { data, error } = await supabaseAdmin
      .from('reservations_ateliers')
      .insert({ atelier_id, nom, prenom, email, telephone, statut: 'en attente' })
      .select()
      .single();

    if (error) throw error;
    
    // 4. Envoyer les emails de notification
    // Email à l'utilisateur
    await sendMail({
      to: email,
      subject: "Confirmation de votre demande de réservation - CNOL 2025",
      text: `Bonjour ${prenom},\n\nNous avons bien reçu votre demande de réservation pour l'atelier : "${atelier.titre}".\nVotre demande est en cours de validation. Vous recevrez un email de confirmation final une fois celle-ci approuvée par notre équipe.\n\nCordialement,\nL'équipe CNOL 2025`,
      html: `<p>Bonjour ${prenom},</p><p>Nous avons bien reçu votre demande de réservation pour l'atelier : "<strong>${atelier.titre}</strong>".</p><p>Votre demande est en cours de validation. Vous recevrez un email de confirmation final une fois celle-ci approuvée par notre équipe.</p><p>Cordialement,<br>L'équipe CNOL 2025</p>`
    });

    // Email à l'admin
    await sendMail({
      to: 'cnol.badge@gmail.com',
      subject: `[ADMIN] Nouvelle demande de réservation Atelier`,
      text: `Une nouvelle demande de réservation a été faite pour l'atelier "${atelier.titre}" par ${prenom} ${nom} (${email}).\nVous pouvez la valider depuis le panel d'administration.`,
      html: `<p>Une nouvelle demande de réservation a été faite pour l'atelier "<strong>${atelier.titre}</strong>" par ${prenom} ${nom} (${email}).</p><p>Vous pouvez la valider depuis le panel d'administration.</p>`
    });

    res.status(201).json({ message: 'Votre demande de réservation a été prise en compte. Vous recevrez un email de confirmation après validation.', reservation: data });

  } catch (error) {
    console.error('Erreur API reservation-atelier:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
}
