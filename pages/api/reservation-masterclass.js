import { supabase } from '../../lib/supabaseClient'
import { generateTicket } from '../../lib/generateTicket'
import { sendTicketMail, sendMail } from '../../lib/mailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })
  const { masterclass_id, nom, prenom, email, telephone, type } = req.body
  if (!masterclass_id || !nom || !prenom || !email || !telephone || !type) return res.status(400).json({ message: 'Champs manquants' })

  // Récupérer infos masterclass
  const { data: masterclass, error: errMaster } = await supabase.from('masterclass').select('*').eq('id', masterclass_id).single()
  if (errMaster || !masterclass) return res.status(404).json({ message: 'Masterclass introuvable' })

  // Vérifier si déjà inscrit (même email, même masterclass, même type)
  const { data: existing } = await supabase.from('reservations_masterclass')
    .select('id')
    .eq('masterclass_id', masterclass_id)
    .eq('email', email)
    .eq('type', type)
    .single()
  if (existing) {
    return res.status(400).json({ message: 'Vous êtes déjà inscrit à cette masterclass.' })
  }

  // Limite à 30 pour les externes
  if (type === 'externe') {
    const { count } = await supabase
      .from('reservations_masterclass')
      .select('*', { count: 'exact', head: true })
      .eq('masterclass_id', masterclass_id)
      .eq('type', 'externe')
    if (count >= 30) {
      return res.status(400).json({ message: 'Complet : toutes les places externes sont réservées.' })
    }
  }

  // Insérer réservation
  let reservation = {
    masterclass_id,
    nom,
    prenom,
    email,
    telephone,
    type,
    valide: type === 'interne' ? true : false
  }
  const { data, error } = await supabase.from('reservations_masterclass').insert(reservation).select().single()
  if (error) return res.status(500).json({ message: 'Erreur insertion réservation' })

  // Envoi email à l'utilisateur
  await sendMail({
    to: email,
    subject: "Confirmation d'inscription à une masterclass - CNOL 2025",
    text: `Bonjour ${prenom},\n\nMerci pour votre inscription à la masterclass : ${masterclass.titre} !\nVotre inscription est bien reçue et ${type === 'interne' ? 'votre ticket est en pièce jointe.' : 'sera validée par notre équipe.'}\n\n${type === 'interne' ? 'Vous trouverez votre ticket PDF en pièce jointe.' : 'Une fois validée, votre ticket vous sera envoyé par email.'}\n\nÀ très bientôt !\nL'équipe CNOL 2025`,
    html: `<div style=\"font-family: Arial, sans-serif; color: #333; line-height:1.6; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:8px;\"><h2 style=\"color: #0070f3;\">Bonjour ${prenom},</h2><p>Merci pour votre inscription à la masterclass <strong>${masterclass.titre}</strong> !</p><p>Votre inscription est bien reçue et ${type === 'interne' ? '<strong>votre ticket est en pièce jointe.</strong>' : 'sera <strong>validée par notre équipe</strong>.'}</p><p>${type === 'interne' ? '<strong>Vous trouverez votre ticket PDF en pièce jointe.</strong>' : '<strong>Une fois validée, votre ticket vous sera envoyé par email.</strong>'}</p><p>Nous avons hâte de vous accueillir lors de cet événement incontournable de l'optique au Maroc.</p><hr style=\"border:none; border-top:1px solid #eee; margin:20px 0;\" /><p style=\"font-size: 0.9em; color: #666;\">Pour toute question, contactez-nous à <a href=\"mailto:cnol.maroc@gmail.com\">cnol.maroc@gmail.com</a><br />&copy; 2025 CNOL. Tous droits réservés.</p></div>`
  })

  // Envoi email à l'admin
  await sendMail({
    to: 'cnol.badge@gmail.com',
    subject: `📥 Nouvelle inscription masterclass - ${prenom} ${nom}`,
    text: `Nouvelle inscription à une masterclass :\n\nNom : ${nom}\nPrénom : ${prenom}\nEmail : ${email}\nTéléphone : ${telephone}\nMasterclass : ${masterclass.titre}\nType : ${type}\nDate : ${new Date().toLocaleString()}`,
    html: `<div style=\"font-family: Arial, sans-serif; color: #333; max-width:600px; margin:auto; padding:25px; border:1px solid #ddd; border-radius:10px; background:#ffffff;\"><h2 style=\"color:#0070f3;\">📥 Nouvelle inscription à une masterclass</h2><table style=\"width:100%; border-collapse:collapse; margin-top:15px;\"><tr><td style=\"padding:8px; font-weight:bold;\">Nom :</td><td style=\"padding:8px;\">${nom}</td></tr><tr><td style=\"padding:8px; font-weight:bold;\">Prénom :</td><td style=\"padding:8px;\">${prenom}</td></tr><tr><td style=\"padding:8px; font-weight:bold;\">Email :</td><td style=\"padding:8px;\">${email}</td></tr><tr><td style=\"padding:8px; font-weight:bold;\">Téléphone :</td><td style=\"padding:8px;\">${telephone}</td></tr><tr><td style=\"padding:8px; font-weight:bold;\">Masterclass :</td><td style=\"padding:8px;\">${masterclass.titre}</td></tr><tr><td style=\"padding:8px; font-weight:bold;\">Type :</td><td style=\"padding:8px;\">${type}</td></tr><tr><td style=\"padding:8px; font-weight:bold;\">Date :</td><td style=\"padding:8px;\">${new Date().toLocaleString()}</td></tr></table></div>`
  })

  // Envoi notification push (et insertion en base)
  // Chercher l'utilisateur (participant) pour récupérer son id
  const { data: inscrit } = await supabase
    .from('inscription')
    .select('id, email')
    .eq('email', email)
    .single();
  if (inscrit && inscrit.id) {
    const notifBody = type === 'interne'
      ? 'Votre ticket masterclass est envoyé par email.'
      : 'Votre réservation masterclass est bien prise en compte. Vous recevrez votre ticket par email après validation.';
    await supabase.from('notifications').insert({
      user_id: inscrit.id,
      title: 'Réservation masterclass CNOL 2025',
      body: notifBody,
      url: null
    });
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: inscrit.id,
          title: 'Réservation masterclass CNOL 2025',
          body: notifBody,
          url: null
        })
      });
    } catch (e) {
      console.error('Erreur envoi notification push:', e);
    }
  }

  // Si interne, générer et envoyer le ticket tout de suite
  if (type === 'interne') {
    const pdfBuffer = await generateTicket({
      nom,
      prenom,
      email,
      eventType: 'Masterclass',
      eventTitle: masterclass.titre,
      eventDate: masterclass.date_heure,
      reservationId: String(data.id),
      salle: masterclass.salle,
      intervenant: masterclass.intervenant
    })
    await sendTicketMail({
      to: email,
      nom,
      prenom,
      eventType: 'Masterclass',
      eventTitle: masterclass.titre,
      eventDate: masterclass.date_heure,
      pdfBuffer
    })
  }

  return res.status(200).json({
    success: true,
    message: type === 'interne'
      ? "Inscription confirmée, ticket envoyé par email."
      : "Inscription effectuée, en attente de validation. Vous recevrez votre ticket après validation."
  })
} 