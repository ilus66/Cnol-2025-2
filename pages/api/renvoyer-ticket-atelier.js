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
  if (!resa.valide) return res.status(400).json({ message: 'Réservation non validée' })

  // Récupérer l'atelier
  const { data: atelier } = await supabase.from('ateliers').select('*').eq('id', resa.atelier_id).single()
  if (!atelier) return res.status(404).json({ message: 'Atelier introuvable' })

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

  return res.status(200).json({ success: true })
} 