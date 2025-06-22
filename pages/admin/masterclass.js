import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import {
  Box, Button, TextField, Typography, List, ListItem, IconButton,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  Stack, CircularProgress, ListItemText
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ListIcon from '@mui/icons-material/List'
import DownloadIcon from '@mui/icons-material/Download'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

// CHARGEMENT SÉCURISÉ DES DONNÉES CÔTÉ SERVEUR
export async function getServerSideProps() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await supabaseAdmin.from('masterclass').select('*').order('date_heure');

  if (error) {
    console.error("Erreur admin/masterclass (SSR):", error.message);
    return { props: { initialMasterclasses: [] } };
  }
  return { props: { initialMasterclasses: data || [] } };
}

export default function AdminMasterclass({ initialMasterclasses }) {
  const [masterclasses, setMasterclasses] = useState(initialMasterclasses)
  const [newMasterclass, setNewMasterclass] = useState({
    titre: '', intervenant: '', date_heure: '', salle: '', places: ''
  })
  // ... (tous vos autres états 'useState' restent ici)
  const [editMasterclass, setEditMasterclass] = useState(null)
  const [editForm, setEditForm] = useState({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
  const [openListMasterclassId, setOpenListMasterclassId] = useState(null)
  const [listResas, setListResas] = useState([])
  const [loadingResas, setLoadingResas] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  // Fonction pour rafraîchir la liste depuis le client
  const fetchMasterclasses = async () => {
    const { data, error } = await supabase.from('masterclass').select('*').order('date_heure')
    if (!error) setMasterclasses(data)
  }

  const handleAdd = async () => {
    // ... votre logique de handleAdd ...
    setAddError('')
    setAddSuccess('')
    if (!newMasterclass.titre || !newMasterclass.intervenant || !newMasterclass.date_heure || !newMasterclass.salle || !newMasterclass.places) {
      setAddError('Tous les champs sont obligatoires')
      return
    }
    const { error } = await supabase.from('masterclass').insert([newMasterclass])
    if (error) {
      setAddError('Erreur lors de l\'ajout : ' + error.message)
    } else {
      setAddSuccess('Masterclass ajoutée avec succès !')
      setNewMasterclass({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
      fetchMasterclasses()
    }
  }

  const handleDelete = async (id) => {
    await supabase.from('masterclass').delete().eq('id', id)
    fetchMasterclasses()
  }

  const handleOpenEdit = (mc) => {
    setEditMasterclass(mc)
    setEditForm({
        titre: mc.titre, intervenant: mc.intervenant, date_heure: mc.date_heure,
        salle: mc.salle, places: mc.places
    })
  }
  
  const handleEdit = async () => {
      // ... votre logique handleEdit
  }
  
  // UTILISATION DE L'API SÉCURISÉE
  const handleOpenList = async (masterclassId) => {
    setOpenListMasterclassId(masterclassId)
    setLoadingResas(true);
    setListResas([]);
    try {
        const response = await fetch(`/api/admin/list-reservations?masterclass_id=${masterclassId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Erreur API");
        setListResas(data);
    } catch (err) {
        toast.error(`Erreur chargement: ${err.message}`);
    } finally {
        setLoadingResas(false);
    }
  }

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-masterclass', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation validée !')
      handleOpenList(openListMasterclassId); // Rafraîchir
    } else {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleRefuse = async (resaId) => {
    const res = await fetch('/api/refuser-reservation-masterclass', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation refusée')
      handleOpenList(openListMasterclassId); // Rafraîchir
    } else {
      toast.error('Erreur lors du refus')
    }
  }

  // ... (tous vos autres handlers)

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      {/* ... Tout votre JSX existant pour le formulaire et la liste ... */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Link href="/admin" passHref legacyBehavior>
          <Button variant="outlined" component="a">Retour à l'admin</Button>
        </Link>
      </Box>
      <Toaster position="top-right" />
      <Typography variant="h4" gutterBottom>Gestion des Masterclass</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
         {/* ... JSX du formulaire d'ajout ... */}
      </Paper>
      <Typography variant="h6" gutterBottom>Liste des masterclass</Typography>
      <Stack spacing={2}>
        {masterclasses.map(mc => (
            <Paper key={mc.id} sx={{ p: 2, mb: 2 }}>
                {/* ... JSX pour afficher chaque masterclass et les boutons ... */}
                <Button variant="outlined" color="secondary" onClick={() => handleOpenList(mc.id)} startIcon={<ListIcon />} fullWidth={isMobile}>Liste inscrits</Button>
                {/* ... autres boutons ... */}
            </Paper>
        ))}
      </Stack>

      {/* Dialog Liste des inscrits */}
      <Dialog open={openListMasterclassId !== null} onClose={() => setOpenListMasterclassId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Liste des inscrits</DialogTitle>
        <DialogContent>
            {loadingResas ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : listResas.length === 0 ? (
                <Typography>Aucun inscrit pour le moment.</Typography>
            ) : (
                <List>
                    {listResas.map(resa => (
                        <ListItem key={resa.id} dense divider>
                            <ListItemText
                                primary={`${resa.prenom} ${resa.nom} (${resa.email})`}
                                secondary={`Statut: ${resa.statut}`}
                            />
                            {resa.statut === 'en attente' && (
                                <Stack direction="row" spacing={1}>
                                    <Button onClick={() => handleValidate(resa.id)} variant="contained" color="success" size="small">Valider</Button>
                                    <Button onClick={() => handleRefuse(resa.id)} variant="outlined" color="error" size="small">Refuser</Button>
                                </Stack>
                            )}
                        </ListItem>
                    ))}
                </List>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListMasterclassId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
      {/* ... autres Dialogs ... */}
    </Box>
  )
}
