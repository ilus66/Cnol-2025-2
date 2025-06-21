import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Supprimer le cookie de session
  const logoutCookie = cookie.serialize('cnol-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0, // Expire immédiatement
    path: '/',
    sameSite: 'lax',
  });

  res.setHeader('Set-Cookie', logoutCookie);
  res.json({ message: 'Déconnexion réussie' });
}
