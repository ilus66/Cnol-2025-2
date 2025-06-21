// pages/api/generatedbadge.js
import { supabase } from '../../lib/supabaseClient'
import { generateBadge } from '../../lib/generateBadge'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const { id } = req.query
  if (!id) {
    return res.status(400).json({ message: 'Paramètre id manquant' })
  }

  // Récupérer l'inscrit
  const { data: inscrit, error } = await supabase
    .from('inscription')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !inscrit) {
    return res.status(404).json({ message: 'Inscrit non trouvé' })
  }

  // Vérifier que l'inscription est validée
  if (!inscrit.valide) {
    return res.status(403).json({ 
      message: 'Accès refusé : Votre inscription doit être validée par l\'administrateur avant de pouvoir télécharger votre badge.' 
    })
  }

  try {
    // Préparer les données pour le badge
    const userData = {
      name: `${inscrit.prenom} ${inscrit.nom}`,
      function: inscrit.fonction,
      city: inscrit.ville,
      email: inscrit.email,
      userId: `cnol2025-${inscrit.id}`,
      identifiant_badge: inscrit.identifiant_badge,
    }

    // Générer le PDF (Buffer)
    const pdfBuffer = await generateBadge(userData)

    // Envoyer le PDF en binaire
    function toAscii(str) {
      return str.normalize('NFD').replace(/[^\x00-\x7F]/g, '').replace(/[^a-zA-Z0-9-_]/g, '');
    }
    const filename = `badge-${toAscii(inscrit.prenom.toLowerCase())}-${toAscii(inscrit.nom.toLowerCase())}.pdf`;
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`
    )
    // IMPORTANT : use .end() to send raw buffer
    return res.status(200).end(pdfBuffer)
  } catch (err) {
    console.error('Erreur génération badge :', err)
    return res
      .status(500)
      .json({ message: 'Erreur serveur lors de la génération du badge' })
  }
}
