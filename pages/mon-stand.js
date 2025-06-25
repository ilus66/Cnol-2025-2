import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, Paper, Divider, Button } from '@mui/material';

export async function getServerSideProps({ req }) {
  const sessionCookie = req.cookies['cnol-session'];
  if (!sessionCookie) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    if (!sessionData || !sessionData.id || sessionData.participant_type !== 'exposant') {
      return { redirect: { destination: '/mon-espace', permanent: false } };
    }
    // Ici, on pourra charger les infos du stand, staff, etc. plus tard
    return { props: { userId: sessionData.id } };
  } catch {
    return { redirect: { destination: '/identification', permanent: false } };
  }
}

export default function MonStand() {
  const router = useRouter();

  useEffect(() => {
    // Ici, on pourra charger les données du stand via API si besoin
  }, []);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Administration de mon stand
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Bloc Infos Stand */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Infos du stand</Typography>
        {/* TODO: Afficher nom société, logo, description, slogan, réseaux, message accueil */}
      </Paper>

      {/* Bloc Marques & Produits */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Marques & Produits</Typography>
        {/* TODO: Liste, ajout, édition, suppression */}
      </Paper>

      {/* Bloc Staff */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Staff</Typography>
        {/* TODO: Formulaire ajout staff, liste staff, actions badge */}
      </Paper>

      {/* Bloc Notifications */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Notifications</Typography>
        {/* TODO: Quota, historique, bouton envoi */}
      </Paper>

      {/* Bloc Scan */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Scan</Typography>
        {/* TODO: QR code stand, liste contacts scannés */}
      </Paper>

      {/* Bloc Personnalisation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Personnalisation du stand</Typography>
        {/* TODO: Logo, description, slogan, message accueil, réseaux sociaux */}
      </Paper>
    </Box>
  );
} 