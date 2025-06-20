import { supabase } from '../../lib/supabaseClient'
import { generateTicket } from '../../lib/generateTicket'
import { sendTicketMail } from '../../lib/mailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id } = req.body
  if (!id) return res.status(400).json({ message: 'ID manquant' })

  // Récupérer la réservation
  const { data: resa, error } = await supabase.from('reservations_masterclass').select('*').eq('id', id).single()
  if (error || !resa) return res.status(404).json({ message: 'Réservation introuvable' })

  // Récupérer la masterclass
  const { data: masterclass } = await supabase.from('masterclass').select('*').eq('id', resa.masterclass_id).single()
  if (!masterclass) return res.status(404).json({ message: 'Masterclass introuvable' })

  // Générer ticket PDF
  const pdfBuffer = await generateTicket({
    nom: resa.nom,
    prenom: resa.prenom,
    email: resa.email,
    eventType: 'Masterclass',
    eventTitle: masterclass.titre,
    eventDate: masterclass.date_heure,
    reservationId: String(resa.id),
    salle: masterclass.salle,
    intervenant: masterclass.intervenant
  })

  // Envoyer mail avec ticket
  await sendTicketMail({
    to: resa.email,
    nom: resa.nom,
    prenom: resa.prenom,
    eventType: 'Masterclass',
    eventTitle: masterclass.titre,
    eventDate: masterclass.date_heure,
    pdfBuffer
  })

  // Marquer comme validé
  await supabase.from('reservations_masterclass').update({ valide: true }).eq('id', id)

  return res.status(200).json({ success: true })
} 