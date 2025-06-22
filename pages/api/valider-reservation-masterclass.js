import { createClient } from '@supabase/supabase-js';
import { sendTicketMail } from '../../lib/mailer';
import { generateTicket } from '../../lib/generateTicket';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { id } = req.body; // ID de la réservation

  if (!id) {
    return res.status(400).json({ message: 'ID de réservation manquant.' });
  }

  try {
    // 1. Mettre à jour le statut de la réservation
    const { data: reservation, error: updateError } = await supabaseAdmin
      .from('reservations_masterclass')
      .update({ statut: 'confirmé' })
      .eq('id', id)
      .select('*, masterclass(*)')
      .single();

    if (updateError) throw updateError;
    if (!reservation) throw new Error('Réservation non trouvée.');

    // 2. Générer le ticket PDF
    const pdfBuffer = await generateTicket({
      nom: reservation.nom,
      prenom: reservation.prenom,
      email: reservation.email,
      eventType: 'Masterclass',
      eventTitle: reservation.masterclass.titre,
      eventDate: reservation.masterclass.date_heure,
      reservationId: String(reservation.id),
      salle: reservation.masterclass.salle,
      intervenant: reservation.masterclass.intervenant
    });

    // 3. Envoyer le mail avec le ticket en pièce jointe
    await sendTicketMail({
      to: reservation.email,
      nom: reservation.nom,
      prenom: reservation.prenom,
      eventType: 'Masterclass',
      eventTitle: reservation.masterclass.titre,
      eventDate: reservation.masterclass.date_heure,
      pdfBuffer
    });

    res.status(200).json({ message: 'Réservation validée et ticket envoyé avec succès.' });

  } catch (error) {
    console.error('Erreur API valider-reservation-masterclass:', error);
    res.status(500).json({ message: 'Erreur lors de la validation.', error: error.message });
  }
}
