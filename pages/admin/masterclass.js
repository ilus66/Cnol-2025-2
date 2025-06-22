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
  
  const { data, error } = await supabaseAdmin.from('masterclass').select('*').order('date_heure');

  if (error) {
    console.error("Erreur getServerSideProps (masterclass):", error);
    return { props: { initialMasterclasses: [], serverError: 'Erreur serveur lors du chargement.' } };
  }
  return { props: { initialMasterclasses: data || [], serverError: null } };
}

export default function AdminMasterclass({ initialMasterclasses, serverError }) {
  const [masterclasses, setMasterclasses] = useState(initialMasterclasses);
  const [newMasterclass, setNewMasterclass] = useState({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' });
  const [editMasterclass, setEditMasterclass] = useState(null);
  const [openListMasterclassId, setOpenListMasterclassId] = useState(null);
  const [listResas, setListResas] = useState([]);
  const [loadingResas, setLoadingResas] = useState(false);
  
  const fetchMasterclasses = async () => {
    const { data, error } = await supabase.from('masterclass').select('*').order('date_heure');
    if (!error) setMasterclasses(data);
  };

  const handleAdd = async () => {
    // Idéalement, à migrer vers une API Route sécurisée
    const { error } = await supabase.from('masterclass').insert([newMasterclass]);
    if (error) toast.error(error.message);
    else {
      toast.success('Masterclass ajoutée');
      fetchMasterclasses();
    }
  };

  const handleDelete = async (id) => {
    // Idéalement, à migrer vers une API Route sécurisée
    await supabase.from('masterclass').delete().eq('id', id);
    fetchMasterclasses();
  };

  const handleOpenList = async (masterclassId) => {
    setOpenListMasterclassId(masterclassId);
    setLoadingResas(true);
    try {
        const response = await fetch(`/api/admin/list-reservations?masterclass_id=${masterclassId}`);
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
    const res = await fetch('/api/valider-reservation-masterclass', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation validée !');
      handleOpenList(openListMasterclassId); // Rafraîchir la liste
    } else toast.error('Erreur validation');
  };

  const handleRefuse = async (resaId) => {
    const res = await fetch('/api/refuser-reservation-masterclass', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation refusée.');
      handleOpenList(openListMasterclassId); // Rafraîchir la liste
    } else toast.error('Erreur refus');
  };
  
  if (serverError) return <Alert severity="error">{serverError}</Alert>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Toaster position="bottom-center" />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Gestion des Masterclass</Typography>
          <Link href="/admin" passHref><Button variant="outlined">Retour Admin</Button></Link>
      </Box>

      {/* Formulaire d'ajout */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Ajouter une Masterclass</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField label="Titre" value={newMasterclass.titre} onChange={e => setNewMasterclass({ ...newMasterclass, titre: e.target.value })} />
          <TextField label="Intervenant" value={newMasterclass.intervenant} onChange={e => setNewMasterclass({ ...newMasterclass, intervenant: e.target.value })} />
          <TextField type="datetime-local" label="Date et heure" value={newMasterclass.date_heure} onChange={e => setNewMasterclass({ ...newMasterclass, date_heure: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Salle" value={newMasterclass.salle} onChange={e => setNewMasterclass({ ...newMasterclass, salle: e.target.value })} />
          <TextField label="Nombre de places" type="number" value={newMasterclass.places} onChange={e => setNewMasterclass({ ...newMasterclass, places: e.target.value })} />
          <Button onClick={handleAdd} variant="contained">Ajouter</Button>
        </Stack>
      </Paper>

      <Typography variant="h6">Liste des Masterclass</Typography>
      <List>
        {masterclasses.map(mc => (
          <Paper key={mc.id} sx={{ mb: 2, p: 2 }}>
            <ListItem secondaryAction={<IconButton onClick={() => handleOpenList(mc.id)}><ListIcon /></IconButton>}>
              <ListItemText primary={mc.titre} secondary={`${mc.intervenant} - ${new Date(mc.date_heure).toLocaleString('fr-FR')}`} />
            </ListItem>
          </Paper>
        ))}
      </List>
      
      {/* Dialogue pour la liste des inscrits */}
      <Dialog open={openListMasterclassId !== null} onClose={() => setOpenListMasterclassId(null)} fullWidth>
        <DialogTitle>Liste des inscrits</DialogTitle>
        <DialogContent>
          {loadingResas ? <CircularProgress /> : listResas.length === 0 ? (
            <Typography>Aucun inscrit pour le moment.</Typography>
          ) : (
            <List dense>
              {listResas.map(resa => (
                <ListItem key={resa.id} divider secondaryAction={ resa.statut === 'en attente' &&
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => handleValidate(resa.id)} size="small" variant="contained" color="success">Valider</Button>
                      <Button onClick={() => handleRefuse(resa.id)} size="small" variant="outlined" color="error">Refuser</Button>
                    </Stack>
                }>
                  <ListItemText primary={`${resa.prenom} ${resa.nom}`} secondary={resa.email} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: resa.statut === 'confirmé' ? 'green' : 'orange' }}>
                    {resa.statut}
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenListMasterclassId(null)}>Fermer</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
