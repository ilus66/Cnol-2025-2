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
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function AdminMasterclass() {
  const [masterclasses, setMasterclasses] = useState([]);
  const [newMasterclass, setNewMasterclass] = useState({
    titre: '', intervenant: '', date_heure: '', salle: '', places: ''
  });
  const [editMasterclass, setEditMasterclass] = useState(null);
  const [openListMasterclassId, setOpenListMasterclassId] = useState(null);
  const [listResas, setListResas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMasterclasses();
  }, []);

  const fetchMasterclasses = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('masterclass').select('*').order('date_heure');
    if (error) {
      setError('Erreur lors du chargement des masterclass.');
      console.error(error);
    } else {
      setMasterclasses(data);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newMasterclass.titre || !newMasterclass.intervenant || !newMasterclass.date_heure || !newMasterclass.salle || !newMasterclass.places) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }
    const { error } = await supabase.from('masterclass').insert([newMasterclass]);
    if (error) {
      toast.error(`Erreur lors de l'ajout : ${error.message}`);
    } else {
      toast.success('Masterclass ajoutée avec succès !');
      setNewMasterclass({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' });
      fetchMasterclasses();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette masterclass ?")) {
      await supabase.from('masterclass').delete().eq('id', id);
      fetchMasterclasses();
      toast.success('Masterclass supprimée.');
    }
  };

  const handleOpenEdit = (mc) => {
    setEditMasterclass(mc);
  };

  const handleUpdateEdit = async () => {
    if (!editMasterclass.titre || !editMasterclass.date_heure) {
      toast.error('Titre et date/heure obligatoires');
      return;
    }
    const { error } = await supabase.from('masterclass').update(editMasterclass).eq('id', editMasterclass.id);
    if (error) {
      toast.error('Erreur lors de la modification');
    } else {
      setEditMasterclass(null);
      fetchMasterclasses();
      toast.success('Masterclass mise à jour.');
    }
  };
  
  const handleOpenList = async (masterclassId) => {
    setOpenListMasterclassId(masterclassId);
    const { data } = await supabase.from('reservations_masterclass').select('*').eq('masterclass_id', masterclassId).order('created_at', { ascending: false });
    setListResas(data || []);
  };

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-masterclass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation validée !');
      if (openListMasterclassId) handleOpenList(openListMasterclassId);
    } else {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleRefuse = async (resaId) => {
    if (window.confirm("Êtes-vous sûr de vouloir refuser et supprimer cette réservation ?")) {
        const res = await fetch('/api/refuser-reservation-masterclass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: resaId })
        });
        if (res.ok) {
          toast.success('Réservation refusée.');
          if (openListMasterclassId) handleOpenList(openListMasterclassId);
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
        <Typography variant="h4">Gestion des Masterclass</Typography>
        <Link href="/admin" passHref>
          <Button variant="outlined">Retour à l'accueil admin</Button>
        </Link>
      </Box>

      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Ajouter une masterclass</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField label="Titre" value={newMasterclass.titre} onChange={e => setNewMasterclass({ ...newMasterclass, titre: e.target.value })} />
          <TextField label="Intervenant" value={newMasterclass.intervenant} onChange={e => setNewMasterclass({ ...newMasterclass, intervenant: e.target.value })} />
          <TextField type="datetime-local" label="Date et heure" value={newMasterclass.date_heure} onChange={e => setNewMasterclass({ ...newMasterclass, date_heure: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Salle" value={newMasterclass.salle} onChange={e => setNewMasterclass({ ...newMasterclass, salle: e.target.value })} />
          <TextField label="Nombre de places" type="number" value={newMasterclass.places} onChange={e => setNewMasterclass({ ...newMasterclass, places: e.target.value })} />
          <Button onClick={handleAdd} variant="contained">Ajouter la masterclass</Button>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2 }}>Liste des masterclass</Typography>
      <List>
        {masterclasses.map(mc => (
          <Paper key={mc.id} sx={{ mb: 2, p: 2 }}>
            <ListItem
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={() => handleOpenList(mc.id)}><ListIcon /></IconButton>
                  <IconButton onClick={() => handleOpenEdit(mc)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(mc.id)} color="error"><DeleteIcon /></IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={mc.titre}
                secondary={`${mc.intervenant} - ${new Date(mc.date_heure).toLocaleString('fr-FR')} - ${mc.salle} (${mc.places} places)`}
              />
            </ListItem>
          </Paper>
        ))}
      </List>
      
      {/* Edit Dialog */}
      <Dialog open={!!editMasterclass} onClose={() => setEditMasterclass(null)}>
        <DialogTitle>Modifier la masterclass</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Titre" value={editMasterclass?.titre} onChange={e => setEditMasterclass({ ...editMasterclass, titre: e.target.value })} />
            <TextField label="Intervenant" value={editMasterclass?.intervenant} onChange={e => setEditMasterclass({ ...editMasterclass, intervenant: e.target.value })} />
            <TextField type="datetime-local" label="Date et heure" value={editMasterclass?.date_heure} onChange={e => setEditMasterclass({ ...editMasterclass, date_heure: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Salle" value={editMasterclass?.salle} onChange={e => setEditMasterclass({ ...editMasterclass, salle: e.target.value })} />
            <TextField label="Places" type="number" value={editMasterclass?.places} onChange={e => setEditMasterclass({ ...editMasterclass, places: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMasterclass(null)}>Annuler</Button>
          <Button onClick={handleUpdateEdit}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Inscription List Dialog */}
      <Dialog open={openListMasterclassId !== null} onClose={() => setOpenListMasterclassId(null)} fullWidth maxWidth="md">
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
          <Button onClick={() => setOpenListMasterclassId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
