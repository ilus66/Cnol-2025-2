import { supabase } from '../../../lib/supabaseClient';
import webpush from 'web-push';

// Assurez-vous que les clés VAPID sont bien configurées dans vos variables d'environnement
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Configuration de web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@cnol.ma',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.error('Les clés VAPID ne sont pas configurées. L\'envoi de notifications échouera.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  
  // TODO: Sécuriser cette route pour qu'elle ne soit accessible qu'aux administrateurs
  
  const { title, body, url } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: 'Le titre et le corps du message sont requis.' });
  }
  
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ message: 'Les clés VAPID ne sont pas configurées sur le serveur.' });
  }

  try {
    // Récupérer TOUS les abonnements push
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*');
      
    if (error) {
      console.error('Erreur récupération abonnements:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des abonnements.' });
    }

    if (!subs || subs.length === 0) {
      return res.status(404).json({ message: 'Aucun abonnement push trouvé dans la base de données.' });
    }
    
    // Envoyer la notification à chaque abonnement
    let success = 0;
    let fail = 0;
    const notificationPayload = JSON.stringify({ title, body, url });

    const sendPromises = subs.map(sub =>
      webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }, notificationPayload)
      .then(() => {
        success++;
      })
      .catch(err => {
        console.error(`Échec de l'envoi à ${sub.endpoint.slice(0, 30)}... Erreur:`, err.statusCode);
        // Si l'abonnement est expiré ou invalide (code 410), on pourrait le supprimer de la BDD ici.
        fail++;
      })
    );
    
    await Promise.all(sendPromises);
    
    return res.status(200).json({ 
      message: `Rapport d'envoi : ${success} succès, ${fail} échecs.`,
      success,
      fail
    });

  } catch (err) {
    console.error('Erreur API broadcast:', err);
    return res.status(500).json({ message: "Erreur serveur interne." });
  }
} 