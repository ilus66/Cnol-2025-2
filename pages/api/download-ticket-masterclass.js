import { createClient } from '@supabase/supabase-js';
import { generateTicket } from '../../lib/generateTicket';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Paramètre id de réservation manquant' });
  }

  try {
    // Étape 1: Récupérer la réservation
    const { data: reservation, error: resaError } = await supabaseAdmin
      .from('reservations_masterclass')
      .select('*')
      .eq('id', id)
      .single();

    if (resaError) throw resaError;
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée.' });
    }
    if (reservation.statut !== 'confirmé') {
      return res.status(403).json({ message: 'La réservation n\'est pas confirmée.' });
    }

    // Étape 2: Récupérer la masterclass associée
    const { data: masterclass, error: masterclassError } = await supabaseAdmin
      .from('masterclass')
      .select('*')
      .eq('id', reservation.masterclass_id)
      .single();

    if (masterclassError || !masterclass) {
      return res.status(404).json({ message: 'Masterclass associée non trouvée.' });
    }

    // Étape 3: Générer le ticket PDF
    const pdfBuffer = await generateTicket({
      nom: reservation.nom,
      prenom: reservation.prenom,
      email: reservation.email,
      eventType: 'Masterclass',
      eventTitle: masterclass.titre,
      eventDate: masterclass.date_heure,
      reservationId: String(reservation.id),
      salle: masterclass.salle,
      intervenant: masterclass.intervenant
    });

    // Étape 4: Envoyer le PDF
    const filename = `ticket-masterclass-${masterclass.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).end(pdfBuffer);

  } catch (error) {
    console.error('Erreur API download-ticket-masterclass:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la génération du ticket.', error: error.message });
  }
} 