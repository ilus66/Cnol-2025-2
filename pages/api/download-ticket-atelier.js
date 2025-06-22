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
      .from('reservations_ateliers')
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

    // Étape 2: Récupérer l'atelier associé
    const { data: atelier, error: atelierError } = await supabaseAdmin
      .from('ateliers')
      .select('*')
      .eq('id', reservation.atelier_id)
      .single();

    if (atelierError || !atelier) {
      return res.status(404).json({ message: 'Atelier associé non trouvé.' });
    }

    // Étape 3: Générer le ticket PDF
    const pdfBuffer = await generateTicket({
      nom: reservation.nom,
      prenom: reservation.prenom,
      email: reservation.email,
      eventType: 'Atelier',
      eventTitle: atelier.titre,
      eventDate: atelier.date_heure,
      reservationId: String(reservation.id),
      salle: atelier.salle,
      intervenant: atelier.intervenant
    });

    // Étape 4: Envoyer le PDF
    const filename = `ticket-atelier-${atelier.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).end(pdfBuffer);

  } catch (error) {
    console.error('Erreur API download-ticket-atelier:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la génération du ticket.', error: error.message });
  }
} 