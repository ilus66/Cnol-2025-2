import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, Paper, Divider, Button, CircularProgress, TextField, Stack, Alert } from '@mui/material';
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
  const [staffForm, setStaffForm] = useState({ nom: '', prenom: '', email: '', telephone: '', fonction: '' });
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Charger la liste des staff à l'ouverture
  useEffect(() => {
    if (exposant) fetchStaff();
    // eslint-disable-next-line
  }, [exposant]);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    const { data, error } = await supabase
      .from('inscription')
      .select('*')
      .eq('participant_type', 'staff')
      .eq('organisation', exposant.nom);
    setStaffList(data || []);
    setLoadingStaff(false);
  };

  const handleStaffChange = (e) => {
    setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');
    if (!staffForm.nom || !staffForm.prenom || !staffForm.email || !staffForm.fonction) {
      setStaffError('Tous les champs sont obligatoires');
      return;
    }
    const res = await fetch('/api/admin/add-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...staffForm,
        exposant_id: exposant.id,
        organisation: exposant.nom,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setStaffError("Erreur lors de l'ajout : " + data.error);
    } else {
      setStaffSuccess('Staff ajouté, badge généré et envoyé par email !');
      setStaffForm({ nom: '', prenom: '', email: '', telephone: '', fonction: '' });
      fetchStaff();
    }
  };

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
      </Paper>

      {/* Bloc Marques & Produits */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Marques & Produits</Typography>
        {/* TODO: Liste, ajout, édition, suppression */}
      </Paper>

      {/* Bloc Staff */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Staff</Typography>
        <form onSubmit={handleAddStaff}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
            <TextField label="Nom" name="nom" value={staffForm.nom} onChange={handleStaffChange} required fullWidth />
            <TextField label="Prénom" name="prenom" value={staffForm.prenom} onChange={handleStaffChange} required fullWidth />
            <TextField label="Email" name="email" value={staffForm.email} onChange={handleStaffChange} required fullWidth />
            <TextField label="Téléphone" name="telephone" value={staffForm.telephone} onChange={handleStaffChange} fullWidth />
            <TextField label="Fonction" name="fonction" value={staffForm.fonction} onChange={handleStaffChange} required fullWidth />
            <TextField label="Type" value="staff" disabled fullWidth />
            <TextField label="Nom de la société" value={exposant.nom} disabled fullWidth />
          </Stack>
          {staffError && <Alert severity="error" sx={{ mb: 2 }}>{staffError}</Alert>}
          {staffSuccess && <Alert severity="success" sx={{ mb: 2 }}>{staffSuccess}</Alert>}
          <Button type="submit" variant="contained" color="primary">Ajouter le staff</Button>
        </form>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Liste du staff</Typography>
        {loadingStaff ? <CircularProgress /> : staffList.length === 0 ? (
          <Typography color="text.secondary">Aucun staff ajouté pour ce stand.</Typography>
        ) : (
          <Stack spacing={1}>
            {staffList.map(staff => (
              <Paper key={staff.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography><b>{staff.prenom} {staff.nom}</b> ({staff.email})</Typography>
                  <Typography variant="body2" color="text.secondary">Téléphone : {staff.telephone || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Fonction : {staff.fonction || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Badge : {staff.identifiant_badge}</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
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
