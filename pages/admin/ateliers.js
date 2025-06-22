import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient'; // Client public pour les actions simples
import {
  Box, Button, TextField, Typography, List, ListItem, IconButton,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  Stack, CircularProgress, ListItemText, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ListIcon from '@mui/icons-material/List';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export async function getServerSideProps() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await supabaseAdmin.from('ateliers').select('*').order('date_heure');

  if (error) {
    console.error("Erreur getServerSideProps (ateliers):", error);
    return { props: { initialAteliers: [], serverError: 'Erreur serveur lors du chargement.' } };
  }
  return { props: { initialAteliers: data || [], serverError: null } };
}

export default function AdminAteliers({ initialAteliers, serverError }) {
  const [ateliers, setAteliers] = useState(initialAteliers);
  const [newAtelier, setNewAtelier] = useState({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' });
  const [editAtelier, setEditAtelier] = useState(null);
  const [openListAtelierId, setOpenListAtelierId] = useState(null);
  const [listResas, setListResas] = useState([]);
  const [loadingResas, setLoadingResas] = useState(false);
  
  const fetchAteliers = async () => {
    const { data, error } = await supabase.from('ateliers').select('*').order('date_heure');
    if (!error) setAteliers(data);
  };

  const handleAdd = async () => {
    // Cette action devrait aussi être migrée vers une API Route pour la sécurité
    const { error } = await supabase.from('ateliers').insert([newAtelier]);
    if (error) toast.error(error.message);
    else {
      toast.success('Atelier ajouté');
      fetchAteliers();
    }
  };

  const handleDelete = async (id) => {
    // Idem pour la suppression
    await supabase.from('ateliers').delete().eq('id', id);
    fetchAteliers();
  };

  const handleOpenList = async (atelierId) => {
    setOpenListAtelierId(atelierId);
    setLoadingResas(true);
    try {
        const response = await fetch(`/api/admin/list-reservations?atelier_id=${atelierId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setListResas(data);
    } catch (err) {
        toast.error(`Erreur: ${err.message}`);
        setListResas([]);
    }
    setLoadingResas(false);
  };
  
  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-atelier', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation validée !');
      handleOpenList(openListAtelierId); // Rafraîchir
    } else toast.error('Erreur validation');
  };

  const handleRefuse = async (resaId) => {
    const res = await fetch('/api/refuser-reservation-atelier', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation refusée.');
      handleOpenList(openListAtelierId); // Rafraîchir
    } else toast.error('Erreur refus');
  };
  
  if (serverError) return <Alert severity="error">{serverError}</Alert>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Toaster position="bottom-center" />
      <Typography variant="h4">Gestion des Ateliers</Typography>
      {/* ... Le reste du JSX pour ajouter un atelier ... */}
      <List>
        {ateliers.map(atelier => (
          <Paper key={atelier.id} sx={{ mb: 2, p: 2 }}>
            <ListItem secondaryAction={<IconButton onClick={() => handleOpenList(atelier.id)}><ListIcon /></IconButton>}>
              <ListItemText primary={atelier.titre} secondary={`${new Date(atelier.date_heure).toLocaleString('fr-FR')}`} />
            </ListItem>
          </Paper>
        ))}
      </List>
      
      <Dialog open={openListAtelierId !== null} onClose={() => setOpenListAtatelierId(null)} fullWidth>
        <DialogTitle>Liste des inscrits</DialogTitle>
        <DialogContent>
          {loadingResas ? <CircularProgress /> : listResas.length === 0 ? (
            <Typography>Aucun inscrit.</Typography>
          ) : (
            <List dense>
              {listResas.map(resa => (
                <ListItem key={resa.id} divider secondaryAction={ resa.statut === 'en attente' &&
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => handleValidate(resa.id)} size="small">Valider</Button>
                      <Button onClick={() => handleRefuse(resa.id)} size="small" color="warning">Refuser</Button>
                    </Stack>
                }>
                  <ListItemText primary={`${resa.prenom} ${resa.nom}`} secondary={resa.email} />
                  <Typography variant="caption" color={resa.statut === 'confirmé' ? 'green' : 'orange'}>{resa.statut}</Typography>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenListAtelierId(null)}>Fermer</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
