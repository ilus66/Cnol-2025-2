import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, Paper, Divider, Button, CircularProgress } from '@mui/material';
import { supabase } from '../lib/supabaseClient';

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
    // Charger l'utilisateur pour récupérer exposant_id
    const { data: user, error } = await supabase
      .from('inscription')
      .select('id, exposant_id')
      .eq('id', sessionData.id)
      .single();
    if (error || !user || !user.exposant_id) {
      return { props: { exposant: null } };
    }
    // Charger les infos du stand
    const { data: exposant, error: expError } = await supabase
      .from('exposants')
      .select('*')
      .eq('id', user.exposant_id)
      .single();
    return { props: { exposant: exposant || null } };
  } catch {
    return { redirect: { destination: '/identification', permanent: false } };
  }
}

export default function MonStand({ exposant }) {
  const router = useRouter();

  if (!exposant) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /><Typography sx={{ mt: 2 }}>Chargement des infos du stand...</Typography></Box>;
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Administration de mon stand
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Bloc Infos Stand */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Infos du stand</Typography>
        <Typography><b>Nom société :</b> {exposant.nom}</Typography>
        <Typography><b>Email responsable :</b> {exposant.email_responsable}</Typography>
        {/* TODO: afficher logo, description, slogan, etc. */}
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