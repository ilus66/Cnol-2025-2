import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Assurez-vous que les clés VAPID sont bien configurées dans vos variables d'environnement
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Création d'un client Supabase avec la clé de service pour avoir les droits admin
// et contourner les Row Level Security (RLS). Indispensable pour une API serveur.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // Le client admin n'a pas besoin de maintenir une session.
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
} else {
  console.error('Les clés VAPID ne sont pas configurées. L\'envoi de notifications échouera.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  
  try {
    // 1. Vérifier l'authentification de l'admin via le cookie de session
    const sessionCookie = req.cookies['cnol-session'];
    if (!sessionCookie) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }
    
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    if (!sessionData || !sessionData.id) {
      return res.status(401).json({ message: 'Session invalide.' });
    }

    // 2. Vérifier le rôle de l'utilisateur
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('inscription')
      .select('role')
      .eq('id', sessionData.id)
      .single();

    if (adminError || !adminData || adminData.role !== 'admin') {
      return res.status(403).json({ message: 'Accès interdit. Seuls les administrateurs peuvent envoyer des notifications.' });
    }
    
    // 3. Procéder si l'utilisateur est bien un admin
    const { title, body, url } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Le titre et le corps du message sont requis.' });
    }
    
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({ message: 'Les clés VAPID ne sont pas configurées sur le serveur.' });
    }

    // Récupérer TOUS les abonnements push en utilisant le client admin
    const { data: subs, error } = await supabaseAdmin
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
