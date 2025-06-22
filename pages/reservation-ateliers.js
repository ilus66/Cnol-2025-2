import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import {
  Box, Typography, Button, CircularProgress, List, ListItem, ListItemText,
  Alert, Paper, Chip, Divider
} from '@mui/material'
import toast, { Toaster } from 'react-hot-toast'

export const getServerSideProps = async ({ req }) => {
  const sessionCookie = req.cookies['cnol-session'];
  if (!sessionCookie) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
  
  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    const { data: user, error } = await supabase
      .from('inscription')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (error || !user) {
      return { redirect: { destination: '/identification?error=user_not_found', permanent: false } };
    }
    
    // Vérifier si l'utilisateur a le droit de réserver (Opticien ou Ophtalmologue)
    if (user.fonction !== 'Opticien' && user.fonction !== 'Ophtalmologue') {
        return {
            redirect: { destination: '/mon-espace?error=access_denied', permanent: false },
        };
    }

    return { props: { user } };
  } catch (error) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
};

export default function ReservationAteliers({ user }) {
  const [ateliers, setAteliers] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [placesExternes, setPlacesExternes] = useState({})
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', atelier_id: '' })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [settings, setSettings] = useState({ ouverture_reservation_atelier: false })
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData()
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').single()
      if (data) setSettings(data)
      setLoadingSettings(false)
    }
    fetchSettings()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: all, error } = await supabase.from('ateliers').select('*').order('date_heure')
    // Récupérer le nombre de réservations externes pour chaque atelier
    const places = {}
    for (const a of all || []) {
      const { count } = await supabase
        .from('reservations_ateliers')
        .select('*', { count: 'exact', head: true })
        .eq('atelier_id', a.id)
        .eq('type', 'externe')
      places[a.id] = count
    }
    setPlacesExternes(places)
    setAteliers(all || [])
    setLoading(false)
  }

  const handleReserver = async (atelierId) => {
    const toastId = toast.loading('Réservation en cours...');
    
    const response = await fetch('/api/reservation-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
      userId: user.id,
      atelierId: atelierId
    })
    });

    const data = await response.json();
    if (response.ok) {
      toast.success(data.message || 'Réservation confirmée !', { id: toastId });
      fetchData(); // Recharger les données pour mettre à jour l'UI
    } else {
      toast.error(data.message || 'Erreur lors de la réservation.', { id: toastId });
    }
  };

  if (loadingSettings) return <CircularProgress />
  if (!settings.ouverture_reservation_atelier) return <Box sx={{ p: 4 }}><Typography variant="h5">Les réservations d'ateliers ne sont pas encore ouvertes.</Typography></Box>

  if (loading) return <CircularProgress />

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      <Toaster position="top-right" />
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>Réserver un Atelier</Typography>
        <Typography variant="body1" color="text.secondary">
            Bonjour {user.prenom}, sélectionnez un atelier pour réserver votre place. Les places sont limitées.
        </Typography>
      </Paper>
      <List>
        {ateliers.map((atelier) => {
          const isReserved = reservations.includes(atelier.id);
          const placesPrises = atelier.reservations_ateliers[0]?.count || 0;
          const isFull = placesPrises >= atelier.capacite;

          return (
            <ListItem key={atelier.id} divider sx={{ opacity: (isFull && !isReserved) ? 0.6 : 1 }}>
              <ListItemText
                primary={`${atelier.titre} — ${atelier.intervenant}`}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {new Date(atelier.date_heure).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                    </Typography>
                    <br />
                    Salle: {atelier.salle} | Places restantes: {atelier.capacite - placesPrises}
                  </>
                }
              />
              <Button
                variant="contained"
                onClick={() => handleReserver(atelier.id)}
                disabled={isFull || isReserved}
                color={isReserved ? "success" : "primary"}
              >
                {isReserved ? 'Déjà Réservé' : (isFull ? 'Complet' : 'Réserver')}
              </Button>
            </ListItem>
          );
        })}
      </List>
    </Box>
  )
}
