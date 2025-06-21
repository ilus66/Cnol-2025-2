import { supabase } from '../../lib/supabaseClient';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ message: 'Email ou code badge requis.' });
  }

  try {
    // Tenter de trouver l'utilisateur par email OU par code badge
    const { data: user, error } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email, type_participant, valide, badge_code')
      .or(`email.eq.${identifier},badge_code.eq.${identifier.toUpperCase()}`)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Identifiants incorrects ou utilisateur non trouvé.' });
    }

    // Créer un objet de session simple
    const session = {
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      valide: user.valide,
    };

    // Sérialiser le cookie de session
    const sessionCookie = cookie.serialize('cnol-session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
      sameSite: 'lax',
    });

    // Envoyer le cookie dans l'en-tête de la réponse
    res.setHeader('Set-Cookie', sessionCookie);

    res.status(200).json({ message: 'Connexion réussie', user });

  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
} 