import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { withIronSessionSsr } from 'iron-session';
import { Box, Button, Typography, Paper, Stack, Divider, Alert } from '@mui/material';
import QRCode from 'qrcode.react';
import Link from 'next/link';

export const getServerSideProps = withIronSessionSsr(
  async function getServerSideProps({ req }) {
    const sessionUser = req.session.user;

    if (!sessionUser?.id) {
      return {
        redirect: {
          destination: '/identification',
          permanent: false,
        },
      };
    }

    const { data: user, error } = await supabase
      .from('inscription')
      .select('*, reservations_ateliers(*, ateliers(*)), reservations_masterclass(*, masterclasses(*))')
      .eq('id', sessionUser.id)
      .single();

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

    return {
      props: {
        user,
      },
    };
  },
  {
    cookieName: 'cnol-session',
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
    },
  }
);

export default function MonEspace({ user }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/identification');
  };

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

          <Typography variant="h6">Hôtels Partenaires</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Consultez la liste des hôtels partenaires et préparez votre séjour.
          </Typography>
          <Link href="/hotels" passHref>
            <Button variant="contained" color="primary">Voir les hôtels</Button>
          </Link>

          <Divider />

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
            D'autres fonctionnalités à venir...
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
} 