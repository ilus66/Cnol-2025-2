import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Box,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
  CircularProgress
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ListIcon from '@mui/icons-material/List'
import DownloadIcon from '@mui/icons-material/Download'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

export default function AdminMasterclass() {
  const [masterclasses, setMasterclasses] = useState([])
  const [newMasterclass, setNewMasterclass] = useState({
    titre: '',
    intervenant: '',
    date_heure: '',
    salle: '',
    places: ''
  })
  // ... (vos autres états)
  const [editMasterclass, setEditMasterclass] = useState(null)
  const [editForm, setEditForm] = useState({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
  const [openListMasterclassId, setOpenListMasterclassId] = useState(null)
  const [listResas, setListResas] = useState([])
  const [loadingResas, setLoadingResas] = useState(false); // CORRECTION: Ajout état de chargement
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  useEffect(() => {
    fetchMasterclasses()
  }, [])

  const fetchMasterclasses = async () => {
    const { data, error } = await supabase.from('masterclass').select('*').order('date_heure')
    if (!error) setMasterclasses(data)
  }

  const handleAdd = async () => {
    // ... Votre logique d'ajout
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
    setEditForm({ /* ... */ })
  }
  
  const handleEdit = async () => { /* ... */ }

  // CORRECTION: Utilisation de l'API sécurisée
  const handleOpenList = async (masterclassId) => {
    setOpenListMasterclassId(masterclassId)
    setLoadingResas(true);
    setListResas([]);
    try {
        const response = await fetch(`/api/admin/list-reservations?masterclass_id=${masterclassId}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Erreur de l'API");
        }
        setListResas(data);
    } catch (err) {
        toast.error(`Erreur chargement inscrits: ${err.message}`);
    } finally {
        setLoadingResas(false);
    }
  }

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-masterclass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation validée et ticket envoyé !')
      if (openListMasterclassId) handleOpenList(openListMasterclassId); // CORRECTION: Rafraîchissement
    } else {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleRefuse = async (resaId) => {
    const res = await fetch('/api/refuser-reservation-masterclass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation refusée')
      if (openListMasterclassId) handleOpenList(openListMasterclassId); // CORRECTION: Rafraîchissement
    } else {
      toast.error('Erreur lors du refus')
    }
  }
  
  const handleResendTicket = async (resaId) => {
    const res = await fetch('/api/renvoyer-ticket-masterclass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
        toast.success('Ticket renvoyé !')
    } else {
        toast.error('Erreur lors du renvoi du ticket')
    }
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 } }}>
        {/* ... Votre JSX existant (header, Toaster, formulaire d'ajout) ... */}
        {/* ... Votre JSX pour la liste des masterclass ... */}
        
      {/* CORRECTION: Dialog Liste des inscrits mise à jour */}
      <Dialog open={!!openListMasterclassId} onClose={() => setOpenListMasterclassId(null)} maxWidth="md" fullWidth>
        <DialogTitle>Liste des inscrits</DialogTitle>
        <DialogContent>
          {loadingResas ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : listResas.length === 0 ? (
            <Typography sx={{ p: 2 }}>Aucun inscrit pour le moment.</Typography>
          ) : (
            <List>
              {listResas.map(resa => (
                <ListItem key={resa.id} sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
                  <Box flex={1}>
                    <Typography><b>Nom :</b> {resa.nom} {resa.prenom}</Typography>
                    <Typography><b>Email :</b> {resa.email}</Typography>
                    <Typography><b>Téléphone :</b> {resa.telephone}</Typography>
                    <Typography>
                      <b>Statut :</b>
                      <span style={{ fontWeight: 'bold', color: resa.statut === 'confirmé' ? 'green' : 'orange' }}>
                        {` ${resa.statut}`}
                      </span>
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
                    {resa.statut === 'en attente' && (
                      <>
                        <Button variant="contained" color="success" size="small" onClick={() => handleValidate(resa.id)} fullWidth={isMobile}>
                          Valider
                        </Button>
                        <Button variant="outlined" color="error" size="small" onClick={() => handleRefuse(resa.id)} fullWidth={isMobile}>
                          Refuser
                        </Button>
                      </>
                    )}
                    {resa.statut === 'confirmé' && (
                      <Button variant="outlined" color="info" size="small" onClick={() => handleResendTicket(resa.id)} fullWidth={isMobile}>
                        Renvoyer ticket
                      </Button>
                    )}
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListMasterclassId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
      {/* ... Vos autres Dialogs ... */}
    </Box>
  )
}
