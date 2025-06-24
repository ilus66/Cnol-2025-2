import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Configuration de web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@cnol.ma',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId requis' });
    }

    // Récupérer l'abonnement de l'utilisateur
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Erreur récupération abonnements:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des abonnements.' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ message: 'Aucun abonnement trouvé pour cet utilisateur.' });
    }
    
    // Envoyer la notification de test
    const notificationPayload = JSON.stringify({ 
      title: 'Test CNOL 2025', 
      body: 'Ceci est une notification de test - ' + new Date().toLocaleString('fr-FR'),
      url: '/mon-espace'
    });

    let success = 0;
    let fail = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }, notificationPayload);
        success++;
      } catch (err) {
        console.error(`Échec de l'envoi à ${sub.endpoint.slice(0, 30)}... Erreur:`, err.statusCode);
        fail++;
      }
    }

    return res.status(200).json({ 
      message: `Test terminé : ${success} succès, ${fail} échecs.`,
      success,
      fail
    });

  } catch (err) {
    console.error('Erreur API test notification:', err);
    return res.status(500).json({ message: "Erreur serveur interne." });
  }
} 