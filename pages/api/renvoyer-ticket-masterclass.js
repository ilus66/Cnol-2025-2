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

  const { id, download } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID de réservation manquant.' });
  }

  try {
    // 1. Récupérer la réservation
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations_masterclass')
      .select('*, masterclass(*)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!reservation) throw new Error('Réservation non trouvée.');
    if (reservation.statut !== 'confirmé') {
      return res.status(403).json({ message: 'La réservation n\'est pas confirmée.' });
    }

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

    // 3. Si `download` est vrai, renvoyer le PDF. Sinon, envoyer le mail.
    if (download) {
      const filename = `ticket-masterclass-${reservation.masterclass.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(pdfBuffer);
    } else {
      // Comportement original : envoyer le mail
      await sendTicketMail({
        to: reservation.email,
        nom: reservation.nom,
        prenom: reservation.prenom,
        eventType: 'Masterclass',
        eventTitle: reservation.masterclass.titre,
        eventDate: reservation.masterclass.date_heure,
        pdfBuffer
      });
      res.status(200).json({ message: 'Ticket renvoyé par email avec succès.' });
    }

  } catch (error) {
    console.error('Erreur API renvoyer-ticket-masterclass:', error);
    res.status(500).json({ message: 'Erreur lors du traitement.', error: error.message });
  }
} 