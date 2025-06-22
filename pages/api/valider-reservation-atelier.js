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

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID de réservation manquant.' });
  }

  try {
    const { data: reservation, error: updateError } = await supabaseAdmin
      .from('reservations_ateliers')
      .update({ statut: 'confirmé' })
      .eq('id', id)
      .select('*, ateliers(titre)')
      .single();

    if (updateError) throw updateError;
    if (!reservation) throw new Error('Réservation non trouvée.');

    await sendMail({
      to: reservation.email,
      subject: `✅ Confirmation de votre réservation pour l'atelier "${reservation.ateliers.titre}"`,
      text: `Bonjour ${reservation.prenom},\n\nBonne nouvelle ! Votre réservation pour l'atelier "${reservation.ateliers.titre}" a été confirmée.\nNous avons hâte de vous y voir.\n\nCordialement,\nL'équipe CNOL 2025`,
      html: `<p>Bonjour ${reservation.prenom},</p><p>Bonne nouvelle ! Votre réservation pour l'atelier "<strong>${reservation.ateliers.titre}</strong>" a été confirmée.</p><p>Nous avons hâte de vous y voir.</p><p>Cordialement,<br>L'équipe CNOL 2025</p>`,
    });

    res.status(200).json({ message: 'Réservation validée avec succès.' });

  } catch (error) {
    console.error('Erreur API valider-reservation-atelier:', error);
    res.status(500).json({ message: 'Erreur lors de la validation.', error: error.message });
  }
} 