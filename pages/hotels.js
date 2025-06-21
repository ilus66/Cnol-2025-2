import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { withSessionSsr } from '../lib/session';
import {
  Box, Typography, Paper, Stack, CircularProgress, Card, CardContent, CardActions, Button, Link as MuiLink, Divider
} from '@mui/material';
import { useRouter } from 'next/router';
import Link from 'next/link';

export const getServerSideProps = withSessionSsr(async function ({ req }) {
  const user = req.session.user;

  if (!user) {
    return {
      redirect: {
        destination: '/identification',
        permanent: false,
      },
    };
  }

  const { data: hotels, error } = await supabase.from('hotels').select('*').order('nom');

  if (error) {
    console.error('Erreur de chargement des hôtels:', error);
    return { props: { hotels: [] } };
  }

  return {
    props: { user, hotels: hotels || [] },
  };
});

const HotelsPage = ({ user, hotels }) => {
  const router = useRouter();

  if (!user) {
    return null; 
  }

  return (
    <Box sx={{ p: 3, maxWidth: 'lg', mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h4">Hôtels Partenaires</Typography>
            <Link href="/mon-espace" passHref>
                <Button variant="outlined">Retour à mon espace</Button>
            </Link>
        </Stack>

      {hotels.length === 0 ? (
        <Paper sx={{p: 4, textAlign: 'center'}}>
            <Typography>Aucun hôtel partenaire n'a été configuré pour le moment.</Typography>
            <Typography>Revenez bientôt !</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {hotels.map((hotel) => (
            <Card key={hotel.id} component={Paper} elevation={3}>
              <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                  {hotel.nom}
                </Typography>
                {hotel.adresse && <Typography sx={{ mb: 1.5 }} color="text.secondary">
                  {hotel.adresse}
                </Typography>}
                {hotel.contact && <Typography variant="body2" sx={{ mb: 1.5 }}>
                  <strong>Contact :</strong> {hotel.contact}
                </Typography>}
                {hotel.tarifs && <>
                    <Divider sx={{my: 1}}/>
                    <Typography variant="body1" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                        <strong>Tarifs négociés :</strong><br/>
                        {hotel.tarifs}
                    </Typography>
                </>}
              </CardContent>
              {hotel.lien_reservation && (
                <CardActions>
                  <Button 
                    component={MuiLink} 
                    href={hotel.lien_reservation} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    variant="contained"
                    size="small">
                    Réserver
                  </Button>
                </CardActions>
              )}
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default HotelsPage;