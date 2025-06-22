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

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID de réservation manquant.' });
  }

  try {
    // 1. Valider la réservation
    const { data: reservation, error: updateError } = await supabaseAdmin
      .from('reservations_ateliers')
      .update({ statut: 'confirmé' })
      .eq('id', id)
      .select('*, ateliers(*)')
      .single();

    if (updateError) throw updateError;
    if (!reservation) throw new Error('Réservation non trouvée.');

    // 2. Générer le ticket PDF
    const pdfBuffer = await generateTicket({
      nom: reservation.nom,
      prenom: reservation.prenom,
      email: reservation.email,
      eventType: 'Atelier',
      eventTitle: reservation.ateliers.titre,
      eventDate: reservation.ateliers.date_heure,
      reservationId: String(reservation.id),
      salle: reservation.ateliers.salle,
      intervenant: reservation.ateliers.intervenant
    });

    // 3. Envoyer le mail avec le ticket en pièce jointe
    await sendTicketMail({
      to: reservation.email,
      nom: reservation.nom,
      prenom: reservation.prenom,
      eventType: 'Atelier',
      eventTitle: reservation.ateliers.titre,
      eventDate: reservation.ateliers.date_heure,
      pdfBuffer
    });

    res.status(200).json({ message: 'Réservation validée et ticket envoyé avec succès.' });

  } catch (error) {
    console.error('Erreur API valider-reservation-atelier:', error);
    res.status(500).json({ message: 'Erreur lors de la validation.', error: error.message });
  }
}
