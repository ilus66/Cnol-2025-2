import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { withSessionSsr } from '../lib/session';
import { Box, Button, Typography, Paper, Stack, Divider, List, ListItem, ListItemText, Alert } from '@mui/material';
import QRCode from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Link from 'next/link';


// Cette partie s'exécute sur le serveur avant d'envoyer la page au navigateur
export const getServerSideProps = withSessionSsr(
  async function getServerSideProps({ req }) {
    const sessionUser = req.session.user;

    // Si l'utilisateur n'est pas connecté, on le redirige
    if (!sessionUser?.isLoggedIn) {
      return {
        redirect: {
          destination: '/identification',
          permanent: false,
        },
      };
    }

    // On récupère les données fraîches de l'utilisateur depuis la BDD
    const { data: user, error } = await supabase
      .from('inscription')
      .select('*, reservations_ateliers(*, ateliers(*)), reservations_masterclass(*, masterclasses(*))')
      .eq('id', sessionUser.id)
      .single();

    // Si l'utilisateur n'est plus en BDD, on détruit la session
    if (error || !user) {
      req.session.destroy();
      await req.session.save();
      return {
        redirect: {
          destination: '/identification?error=user_not_found',
          permanent: false,
        },
      };
    }

    // On passe l'objet utilisateur complet en props à la page
    return {
      props: {
        user,
      },
    };
  }
);

// Le composant est maintenant beaucoup plus simple !
export default function MonEspace({ user }) {
  const router = useRouter();

  // Les states pour gérer l'UI (modales, scanner, messages, etc.)
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [reservationMessage, setReservationMessage] = useState('');

  // Fonction de déconnexion
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/identification');
  };
  
  // NOTE: Gardez ici toutes vos autres fonctions (handleScanSuccess, handleReserve, etc.)
  // Elles fonctionneront de la même manière, en utilisant l'objet `user` des props.
  // Exemple: handleReserve(type, eventId) utilisera `user.id`

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">
              Bonjour, {user.prenom}
            </Typography>
            <Button onClick={handleLogout} variant="outlined" color="secondary" size="small">
              Se déconnecter
            </Button>
          </Box>

          <Divider />

          {/* SECTION BADGE */}
          <Typography variant="h6">Votre Badge</Typography>
          {user.valide ? (
            <Stack alignItems="center" spacing={1}>
              <QRCode id="qr-code" value={user.badge_code || user.email} size={150} />
              <Typography variant="body2" color="text.secondary">
                Code: {user.badge_code || 'N/A'}
              </Typography>
              <Button variant="contained">Télécharger le Badge</Button>
            </Stack>
          ) : (
            <Alert severity="warning">
              Votre inscription est en attente de validation. Votre badge sera disponible ici une fois votre compte approuvé.
            </Alert>
          )}

          <Divider />
          
          {/* SECTION Hôtels */}
          <Typography variant="h6">Hôtels Partenaires</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Consultez la liste des hôtels partenaires et préparez votre séjour.
          </Typography>
          <Link href="/hotels" passHref>
            <Button variant="contained" color="primary">Voir les hôtels</Button>
          </Link>

          <Divider />

          {/* ... Collez ici le reste de votre UI pour les réservations, le scan de contact, etc. ... */}
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              D'autres fonctionnalités à venir...
          </Typography>

        </Stack>
      </Paper>
    </Box>
  );
}