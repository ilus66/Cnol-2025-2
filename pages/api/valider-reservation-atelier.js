import { supabase } from '../../lib/supabaseClient'
import { generateTicket } from '../../lib/generateTicket'
import { sendTicketMail } from '../../lib/mailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id } = req.body
  if (!id) return res.status(400).json({ message: 'ID manquant' })

  // Récupérer la réservation
  const { data: resa, error } = await supabase.from('reservations_ateliers').select('*').eq('id', id).single()
  if (error || !resa) return res.status(404).json({ message: 'Réservation introuvable' })

  // Récupérer l'atelier
  const { data: atelier } = await supabase.from('ateliers').select('*').eq('id', resa.atelier_id).single()
  if (!atelier) return res.status(404).json({ message: 'Atelier introuvable' })

  // DEBUG LOG
  console.log('DEBUG RESA', resa);
  console.log('DEBUG RESA.ID', resa?.id);

  // Générer ticket PDF
  const pdfBuffer = await generateTicket({
    nom: resa.nom,
    prenom: resa.prenom,
    email: resa.email,
    eventType: 'Atelier',
    eventTitle: atelier.titre,
    eventDate: atelier.date_heure,
    reservationId: String(resa.id),
    salle: atelier.salle,
    intervenant: atelier.intervenant
  })

  // Envoyer mail avec ticket
  await sendTicketMail({
    to: resa.email,
    nom: resa.nom,
    prenom: resa.prenom,
    eventType: 'Atelier',
    eventTitle: atelier.titre,
    eventDate: atelier.date_heure,
    pdfBuffer
  })

  // Marquer comme validé
  await supabase.from('reservations_ateliers').update({ valide: true }).eq('id', id)

  return res.status(200).json({ success: true })
} 