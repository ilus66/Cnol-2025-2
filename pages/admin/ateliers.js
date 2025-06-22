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

export default function AdminAteliers() {
  const [ateliers, setAteliers] = useState([])
  const [newAtelier, setNewAtelier] = useState({
    titre: '',
    intervenant: '',
    date_heure: '',
    salle: '',
    places: ''
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
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  useEffect(() => {
    fetchAteliers()
  }, [])

  const fetchAteliers = async () => {
    const { data, error } = await supabase.from('ateliers').select('*').order('date_heure')
    if (!error) setAteliers(data)
  }

  const handleAdd = async () => { /* Votre code original */
    setAddError('')
    setAddSuccess('')
    if (!newAtelier.titre || !newAtelier.intervenant || !newAtelier.date_heure || !newAtelier.salle || !newAtelier.places) {
      setAddError('Tous les champs sont obligatoires')
      return
    }
    const { error } = await supabase.from('ateliers').insert([newAtelier])
    if (error) {
      setAddError('Erreur lors de l\'ajout : ' + error.message)
      console.error('Erreur ajout atelier:', error)
    } else {
      setAddSuccess('Atelier ajouté avec succès !')
      setNewAtelier({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
      fetchAteliers()
    }
  }

  const handleDelete = async (id) => { /* Votre code original */
    await supabase.from('ateliers').delete().eq('id', id)
    fetchAteliers()
  }

  const fetchInternalResas = async (atelierId) => { /* Votre code original */
    const { data } = await supabase.from('reservations_ateliers').select('*').eq('atelier_id', atelierId).eq('type', 'interne')
    setInternalResas(data || [])
  }

  const handleOpenInternal = async (atelierId) => { /* Votre code original */
    setOpenAtelierId(atelierId)
    await fetchInternalResas(atelierId)
  }

  const handleAddInternal = async () => { /* Votre code original */
    setInternalError('')
    if (!internalForm.nom || !internalForm.prenom || !internalForm.email || !internalForm.telephone) {
      setInternalError('Tous les champs sont obligatoires')
      return
    }
    if (internalResas.length >= 15) {
      setInternalError('Limite de 15 réservations internes atteinte')
      return
    }
    const { data: user } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email, telephone, participant_type')
      .eq('email', internalForm.email.trim())
      .single();
    if (!user) {
      setInternalError("Cet utilisateur n'existe pas dans la base des inscrits. Veuillez l'ajouter d'abord.");
      return;
    }
    const { error: insertError } = await supabase
      .from('reservations_ateliers')
      .insert({
        atelier_id: openAtelierId,
        participant_id: user.id,
        type: user.participant_type === 'exposant' || user.participant_type === 'intervenant' || user.participant_type === 'vip' || user.participant_type === 'organisation' ? 'interne' : 'externe',
        valide: true,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
      });
    if (insertError) {
      console.error('Erreur insertion directe:', insertError);
      setInternalError('Erreur lors de l\'ajout : ' + insertError.message);
    } else {
      setInternalForm({ nom: '', prenom: '', email: '', telephone: '' });
      await fetchInternalResas(openAtelierId);
      toast.success('Participant ajouté à l\'atelier !');
    }
  }

  const handleOpenEdit = (atelier) => { /* Votre code original */
    setEditAtelier(atelier)
    setEditForm({
      titre: atelier.titre,
      intervenant: atelier.intervenant,
      date_heure: atelier.date_heure,
      salle: atelier.salle,
      places: atelier.places
    })
    setEditError('')
  }

  const handleEdit = async () => { /* Votre code original */
    setEditError('')
    if (!editForm.titre || !editForm.date_heure) {
      setEditError('Titre et date/heure obligatoires')
      return
    }
    const { error } = await supabase.from('ateliers').update(editForm).eq('id', editAtelier.id)
    if (error) {
      setEditError('Erreur lors de la modification')
    } else {
      setEditAtelier(null)
      fetchAteliers()
    }
  }

  const handleExport = async (atelier) => { /* Votre code original */
    const { data: resas } = await supabase
      .from('reservations_ateliers')
      .select('*')
      .eq('atelier_id', atelier.id)
    const header = [
      'Titre atelier', 'Intervenant', 'Jour/heure', 'Salle', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Type', 'Validé', 'Scanné'
    ]
    const rows = (resas || []).map(r => [
      atelier.titre, atelier.intervenant, atelier.date_heure, atelier.salle,
      r.nom, r.prenom, r.email, r.telephone || '', r.type,
      r.valide ? 'Oui' : 'Non', r.scanned ? 'Oui' : 'Non'
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atelier-${atelier.titre.replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenList = async (atelierId) => {
    setOpenListAtelierId(atelierId)
    const { data } = await supabase.from('reservations_ateliers').select('*').eq('atelier_id', atelierId)
    setListResas(data || [])
  }

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation validée et ticket envoyé !')
      if (openListAtelierId) handleOpenList(openListAtelierId);
    } else {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleRefuse = async (resaId) => {
    const res = await fetch('/api/refuser-reservation-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation refusée')
      if (openListAtelierId) handleOpenList(openListAtelierId);
    } else {
      toast.error('Erreur lors du refus')
    }
  }

  const handleResendTicket = async (resaId) => {
    const res = await fetch('/api/renvoyer-ticket-atelier', {
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
      {/* ... Votre JSX ... */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Link href="/admin" passHref legacyBehavior>
          <Button variant="outlined" component="a">Retour à l'admin</Button>
        </Link>
      </Box>
      <Toaster position="top-right" />

      <Typography variant="h4" gutterBottom>Gestion des Ateliers</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        {/* ... Votre formulaire d'ajout ... */}
      </Paper>

      <Typography variant="h6" gutterBottom>Liste des ateliers</Typography>
      <Stack spacing={2}>
        {/* ... Votre liste d'ateliers ... */}
      </Stack>

      {/* Dialog Réservations internes */}
      <Dialog open={!!openAtelierId} onClose={() => setOpenAtelierId(null)} maxWidth="md" fullWidth>
        {/* ... Votre Dialog de réservations internes ... */}
      </Dialog>
      
      {/* MODIFIÉ: Dialog Liste des inscrits (nettoyée) */}
      <Dialog open={!!openListAtelierId} onClose={() => setOpenListAtelierId(null)} maxWidth="md" fullWidth>
        <DialogTitle>Liste des inscrits</DialogTitle>
        <DialogContent>
          <List>
            {listResas.map(resa => (
              <ListItem key={resa.id} sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
                <Box flex={1}>
                  <Typography><b>Nom :</b> {resa.nom} {resa.prenom}</Typography>
                  <Typography><b>Email :</b> {resa.email}</Typography>
                  <Typography><b>Téléphone :</b> {resa.telephone}</Typography>
                  <Typography><b>Type :</b> {resa.type}</Typography>
                  <Typography>
                    <b>Statut :</b>
                    <span style={{ fontWeight: 'bold', color: (resa.statut === 'confirmé' || resa.valide) ? 'green' : 'orange' }}>
                      {` ${resa.statut || (resa.valide ? 'confirmé' : 'en attente')}`}
                    </span>
                  </Typography>
                  <Typography><b>Scanné :</b> {resa.scanned ? '✓' : '✗'}</Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
                  {(resa.statut === 'en attente' || resa.valide === false) && (
                    <>
                      <Button variant="contained" color="success" size="small" onClick={() => handleValidate(resa.id)} fullWidth={isMobile}>
                        Valider
                      </Button>
                      <Button variant="outlined" color="error" size="small" onClick={() => handleRefuse(resa.id)} fullWidth={isMobile}>
                        Refuser
                      </Button>
                    </>
                  )}
                  {(resa.statut === 'confirmé' || resa.valide === true) && (
                    <Button variant="outlined" color="info" size="small" onClick={() => handleResendTicket(resa.id)} fullWidth={isMobile}>
                      Renvoyer ticket
                    </Button>
                  )}
                </Stack>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListAtelierId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Modification */}
      <Dialog open={!!editAtelier} onClose={() => setEditAtelier(null)} maxWidth="sm" fullWidth>
        {/* ... Votre Dialog de modification ... */}
      </Dialog>
    </Box>
  )
}
