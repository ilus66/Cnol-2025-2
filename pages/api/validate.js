import { supabase } from '../../lib/supabaseClient';
import { generateBadge } from '../../lib/generateBadge';
import sendBadgeEmail from '../../lib/sendBadgeEmail';

// Fonction pour faire un nom safe (à copier aussi dans generateBadge.js)
function makeSafeFileName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID manquant' });
  }

  // S'assurer que id est une chaîne de caractères
  const idStr = String(id);

  try {
    // Extraire l'ID de la base de données (enlever le préfixe cnol2025-)
    const prefix = 'cnol2025-';
    if (!idStr.startsWith(prefix)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    const dbId = idStr.slice(prefix.length);

    // Récupérer l'inscription
    const { data: inscrit, error } = await supabase
      .from('inscription')
      .select('*')
      .eq('id', dbId)
      .single();

    if (error || !inscrit) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }

    if (inscrit.valide) {
      return res.status(400).json({ message: 'Inscription déjà validée' });
    }

    // Mise à jour statut valide
    const { data: updated, error: updateError } = await supabase
      .from('inscription')
      .update({ valide: true })
      .eq('id', dbId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Erreur lors de la validation' });
    }

    // Générer badge avec userId = id reçu
    const pdfBuffer = await generateBadge({
      name: `${updated.prenom} ${updated.nom}`,
      function: updated.fonction,
      city: updated.ville,
      email: updated.email,
      userId: idStr,  // utiliser la version string de l'id
      identifiant_badge: updated.identifiant_badge,
    });

    // Envoyer mail
    await sendBadgeEmail(updated.email, `${updated.prenom} ${updated.nom}`, pdfBuffer);

    // Envoi notification push (et insertion en base)
    if (updated && updated.id) {
      await supabase.from('notifications').insert({
        user_id: updated.id,
        title: 'Validation inscription CNOL 2025',
        body: "Votre inscription a été validée ! Votre badge nominatif a été envoyé par email.",
        url: null
      });
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: updated.id,
            title: 'Validation inscription CNOL 2025',
            body: "Votre inscription a été validée ! Votre badge nominatif a été envoyé par email.",
            url: null
          })
        });
      } catch (e) {
        console.error('Erreur envoi notification push:', e);
      }
    }

    return res.status(200).json({ message: 'Inscription validée et mail envoyé.' });
  } catch (error) {
    console.error('❌ Erreur API validate:', error);
    return res.status(500).json({ message: 'Erreur serveur interne.' });
  }
}
