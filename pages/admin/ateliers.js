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

export async function getServerSideProps() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await supabaseAdmin.from('ateliers').select('*').order('date_heure');

  if (error) {
    console.error("Erreur admin/ateliers (SSR):", error.message);
    return { props: { initialAteliers: [] } };
  }
  return { props: { initialAteliers: data || [] } };
}

export default function AdminAteliers({ initialAteliers }) {
  const [ateliers, setAteliers] = useState(initialAteliers)
  const [newAtelier, setNewAtelier] = useState({
    titre: '', intervenant: '', date_heure: '', salle: '', places: ''
  })
  const [openAtelierId, setOpenAtelierId] = useState(null)
  const [internalResas, setInternalResas] = useState([])
  const [internalForm, setInternalForm] = useState({ nom: '', prenom: '', email: '', telephone: '' })
  const [internalError, setInternalError] = useState('')
  const [editAtelier, setEditAtelier] = useState(null)
  const [editForm, setEditForm] = useState({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
  const [editError, setEditError] = useState('')
  const [openListAtelierId, setOpenListAtelierId] = useState(null)
  const [listResas, setListResas] = useState([])
  const [loadingResas, setLoadingResas] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  const fetchAteliers = async () => {
    const { data, error } = await supabase.from('ateliers').select('*').order('date_heure')
    if (!error) setAteliers(data)
  }

  const handleAdd = async () => {
    setAddError('')
    setAddSuccess('')
    if (!newAtelier.titre || !newAtelier.intervenant || !newAtelier.date_heure || !newAtelier.salle || !newAtelier.places) {
      setAddError('Tous les champs sont obligatoires')
      return
    }
    const { error } = await supabase.from('ateliers').insert([newAtelier])
    if (error) {
      setAddError('Erreur lors de l\'ajout : ' + error.message)
    } else {
      setAddSuccess('Atelier ajouté avec succès !')
      setNewAtelier({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
      fetchAteliers()
    }
  }

  const handleDelete = async (id) => {
    await supabase.from('ateliers').delete().eq('id', id)
    fetchAteliers()
  }

  const fetchInternalResas = async (atelierId) => {
    const { data } = await supabase.from('reservations_ateliers').select('*').eq('atelier_id', atelierId).eq('type', 'interne')
    setInternalResas(data || [])
  }

  const handleOpenInternal = async (atelierId) => {
    setOpenAtelierId(atelierId)
    await fetchInternalResas(atelierId)
  }

  const handleAddInternal = async () => { /* ... votre logique existante ... */ }

  const handleOpenEdit = (atelier) => {
    setEditAtelier(atelier)
    setEditForm({
      titre: atelier.titre, intervenant: atelier.intervenant, date_heure: atelier.date_heure,
      salle: atelier.salle, places: atelier.places
    })
    setEditError('')
  }

  const handleEdit = async () => { /* ... votre logique existante ... */ }
  const handleExport = async (atelier) => { /* ... votre logique existante ... */ }

  const handleOpenList = async (atelierId) => {
    setOpenListAtelierId(atelierId)
    setLoadingResas(true);
    setListResas([]);
    try {
        const response = await fetch(`/api/admin/list-reservations?atelier_id=${atelierId}`);
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
    const res = await fetch('/api/valider-reservation-atelier', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation validée !')
      handleOpenList(openListAtelierId); // Rafraîchir
    } else {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleRefuse = async (resaId) => {
    const res = await fetch('/api/refuser-reservation-atelier', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resaId })
    });
    if (res.ok) {
      toast.success('Réservation refusée')
      handleOpenList(openListAtelierId); // Rafraîchir
    } else {
      toast.error('Erreur lors du refus')
    }
  }

  // ... Autres handlers ...

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 } }}>
        {/* ... Tout votre JSX existant ... */}
        {/* Assurez-vous d'ajouter un indicateur de chargement dans la Dialog pour la liste des inscrits */}
        <Dialog open={openListAtelierId !== null} onClose={() => setOpenListAtelierId(null)} fullWidth maxWidth="sm">
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
                <Button onClick={() => setOpenListAtelierId(null)}>Fermer</Button>
            </DialogActions>
        </Dialog>
        {/* ... Le reste de votre JSX ... */}
    </Box>
  )
}
