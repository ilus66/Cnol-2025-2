import { supabase } from '../../lib/supabaseClient';
import { withIronSessionApiRoute } from 'iron-session';

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'cnol-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

async function loginRoute(req, res) {
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
      .select('id, nom, prenom, email, participant_type, valide, identifiant_badge')
      .eq('email', email.trim())
      .eq('identifiant_badge', badgeCode.trim().toUpperCase())
      .single();

    if (error) {
      console.error('Supabase query error:', error.message);
      return res.status(500).json({ message: `Erreur de la base de données: ${error.message}` });
    }

    if (!user) {
      return res.status(401).json({ message: 'Aucun utilisateur trouvé avec cette combinaison email/badge.' });
    }

    // Mettre à jour la session avec les informations utilisateur
    req.session.user = {
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      valide: user.valide,
      participant_type: user.participant_type,
    };
    await req.session.save();

    res.status(200).json({ message: 'Connexion réussie', user });

  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);
