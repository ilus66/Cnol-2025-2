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
    const { data: reservation, error: deleteError } = await supabaseAdmin
      .from('reservations_masterclass')
      .delete()
      .eq('id', id)
      .select('*, masterclass(titre)')
      .single();

    if (deleteError) throw deleteError;
    if (!reservation) throw new Error('Réservation non trouvée.');

    await sendMail({
      to: reservation.email,
      subject: `Information concernant votre réservation pour la masterclass "${reservation.masterclass.titre}"`,
      text: `Bonjour ${reservation.prenom},\n\nNous sommes au regret de vous informer que votre demande de réservation pour la masterclass "${reservation.masterclass.titre}" n'a pas pu être acceptée, probablement en raison du nombre de places limité.\n\nCordialement,\nL'équipe CNOL 2025`,
      html: `<p>Bonjour ${reservation.prenom},</p><p>Nous sommes au regret de vous informer que votre demande de réservation pour la masterclass "<strong>${reservation.masterclass.titre}</strong>" n'a pas pu être acceptée, probablement en raison du nombre de places limité.</p><p>Cordialement,<br>L'équipe CNOL 2025</p>`,
    });

    res.status(200).json({ message: 'Réservation refusée et supprimée.' });

  } catch (error) {
    console.error('Erreur API refuser-reservation-masterclass:', error);
    res.status(500).json({ message: 'Erreur lors du refus.', error: error.message });
  }
} 