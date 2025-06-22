import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
import {
  Box, Button, TextField, Typography, List, ListItem, IconButton,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  Stack, CircularProgress, ListItemText, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ListIcon from '@mui/icons-material/List';
import DownloadIcon from '@mui/icons-material/Download';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function AdminAteliers() {
  const [ateliers, setAteliers] = useState([]);
  const [newAtelier, setNewAtelier] = useState({
    titre: '', intervenant: '', date_heure: '', salle: '', places: ''
  });
  const [editAtelier, setEditAtelier] = useState(null);
  const [openListAtelierId, setOpenListAtelierId] = useState(null);
  const [listResas, setListResas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAteliers();
  }, []);

  const fetchAteliers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ateliers').select('*').order('date_heure');
    if (error) {
      setError('Erreur lors du chargement des ateliers.');
      console.error(error);
    } else {
      setAteliers(data);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newAtelier.titre || !newAtelier.intervenant || !newAtelier.date_heure || !newAtelier.salle || !newAtelier.places) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }
    const { error } = await supabase.from('ateliers').insert([newAtelier]);
    if (error) {
      toast.error(`Erreur lors de l'ajout : ${error.message}`);
    } else {
      toast.success('Atelier ajouté avec succès !');
      setNewAtelier({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' });
      fetchAteliers();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet atelier ?")) {
      await supabase.from('ateliers').delete().eq('id', id);
      fetchAteliers();
      toast.success('Atelier supprimé.');
    }
  };

  const handleOpenEdit = (atelier) => {
    setEditAtelier(atelier);
  };

  const handleUpdateEdit = async () => {
    if (!editAtelier.titre || !editAtelier.date_heure) {
      toast.error('Titre et date/heure obligatoires');
      return;
    }
    const { error } = await supabase.from('ateliers').update(editAtelier).eq('id', editAtelier.id);
    if (error) {
      toast.error('Erreur lors de la modification');
    } else {
      setEditAtelier(null);
      fetchAteliers();
      toast.success('Atelier mis à jour.');
    }
  };
  
  const handleOpenList = async (atelierId) => {
    setOpenListAtelierId(atelierId);
    const { data } = await supabase.from('reservations_ateliers').select('*').eq('atelier_id', atelierId).order('created_at', { ascending: false });
    setListResas(data || []);
  };

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation validée !');
      if (openListAtelierId) handleOpenList(openListAtelierId);
    } else {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleRefuse = async (resaId) => {
    if (window.confirm("Êtes-vous sûr de vouloir refuser et supprimer cette réservation ?")) {
        const res = await fetch('/api/refuser-reservation-atelier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: resaId })
        });
        if (res.ok) {
          toast.success('Réservation refusée.');
          if (openListAtelierId) handleOpenList(openListAtelierId);
        } else {
          toast.error('Erreur lors du refus.');
        }
    }
  };
  
  const handleResendTicket = async (resaId) => {
     // Note: API non créée dans le résumé, à implémenter si besoin.
     toast.info("Fonctionnalité de renvoi de ticket à implémenter.");
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Toaster position="bottom-center" />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Gestion des Ateliers</Typography>
        <Link href="/admin" passHref>
          <Button variant="outlined">Retour à l'accueil admin</Button>
        </Link>
      </Box>

      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Ajouter un atelier</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField label="Titre" value={newAtelier.titre} onChange={e => setNewAtelier({ ...newAtelier, titre: e.target.value })} />
          <TextField label="Intervenant" value={newAtelier.intervenant} onChange={e => setNewAtelier({ ...newAtelier, intervenant: e.target.value })} />
          <TextField type="datetime-local" label="Date et heure" value={newAtelier.date_heure} onChange={e => setNewAtelier({ ...newAtelier, date_heure: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Salle" value={newAtelier.salle} onChange={e => setNewAtelier({ ...newAtelier, salle: e.target.value })} />
          <TextField label="Nombre de places" type="number" value={newAtelier.places} onChange={e => setNewAtelier({ ...newAtelier, places: e.target.value })} />
          <Button onClick={handleAdd} variant="contained">Ajouter l'atelier</Button>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2 }}>Liste des ateliers</Typography>
      <List>
        {ateliers.map(atelier => (
          <Paper key={atelier.id} sx={{ mb: 2, p: 2 }}>
            <ListItem
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={() => handleOpenList(atelier.id)}><ListIcon /></IconButton>
                  <IconButton onClick={() => handleOpenEdit(atelier)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(atelier.id)} color="error"><DeleteIcon /></IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={atelier.titre}
                secondary={`${atelier.intervenant} - ${new Date(atelier.date_heure).toLocaleString('fr-FR')} - ${atelier.salle} (${atelier.places} places)`}
              />
            </ListItem>
          </Paper>
        ))}
      </List>
      
      {/* Edit Dialog */}
      <Dialog open={!!editAtelier} onClose={() => setEditAtelier(null)}>
        <DialogTitle>Modifier l'atelier</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Titre" value={editAtelier?.titre} onChange={e => setEditAtelier({ ...editAtelier, titre: e.target.value })} />
            <TextField label="Intervenant" value={editAtelier?.intervenant} onChange={e => setEditAtelier({ ...editAtelier, intervenant: e.target.value })} />
            <TextField type="datetime-local" label="Date et heure" value={editAtelier?.date_heure} onChange={e => setEditAtelier({ ...editAtelier, date_heure: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Salle" value={editAtelier?.salle} onChange={e => setEditAtelier({ ...editAtelier, salle: e.target.value })} />
            <TextField label="Places" type="number" value={editAtelier?.places} onChange={e => setEditAtelier({ ...editAtelier, places: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAtelier(null)}>Annuler</Button>
          <Button onClick={handleUpdateEdit}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Inscription List Dialog */}
      <Dialog open={openListAtelierId !== null} onClose={() => setOpenListAtelierId(null)} fullWidth maxWidth="md">
        <DialogTitle>Liste des inscrits</DialogTitle>
        <DialogContent>
          {listResas.length === 0 ? (
            <Typography sx={{ pt: 2 }}>Aucun inscrit pour le moment.</Typography>
          ) : (
            <List dense>
              {listResas.map(resa => (
                <ListItem
                  key={resa.id}
                  divider
                  secondaryAction={
                    resa.statut === 'en attente' ? (
                      <Stack direction="row" spacing={1}>
                        <Button onClick={() => handleValidate(resa.id)} variant="contained" color="success" size="small">Valider</Button>
                        <Button onClick={() => handleRefuse(resa.id)} variant="outlined" color="error" size="small">Refuser</Button>
                      </Stack>
                    ) : (
                       <Button onClick={() => handleResendTicket(resa.id)} variant="outlined" size="small">Renvoyer Ticket</Button>
                    )
                  }
                >
                  <ListItemText
                    primary={`${resa.prenom} ${resa.nom}`}
                    secondary={
                      <>
                        {resa.email}
                        <Typography component="span" sx={{ color: resa.statut === 'confirmé' ? 'green' : 'orange', display: 'block', fontWeight: 'bold' }}>
                          {resa.statut}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListAtelierId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
