import { supabase } from '../../lib/supabaseClient';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, badgeCode } = req.body;

  if (!email || !badgeCode) {
    return res.status(400).json({ message: 'L\'email et le code badge sont requis.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email, type_participant, valide, identifiant_badge')
      .eq('email', email)
      // .eq('identifiant_badge', badgeCode.toUpperCase()) // TEMPORAIREMENT DÉSACTIVÉ POUR DIAGNOSTIC
      .single();

    if (error || !user) {
      // Si la recherche par email seul échoue, l'utilisateur n'existe vraiment pas.
      return res.status(401).json({ message: 'Email non trouvé dans la base de données.' });
    }

    const session = {
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      valide: user.valide,
    };

    const sessionCookie = cookie.serialize('cnol-session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
      sameSite: 'lax',
    });

    res.setHeader('Set-Cookie', sessionCookie);

    res.status(200).json({ message: 'Connexion réussie', user });

  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
} 