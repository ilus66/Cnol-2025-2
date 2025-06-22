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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
  CircularProgress,
  ListItemText
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
  const [loadingResas, setLoadingResas] = useState(false)

  // Détection mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  useEffect(() => {
    fetchAteliers()
  }, [])

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
      console.error('Erreur ajout atelier:', error)
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

  const handleAddInternal = async () => {
    setInternalError('')
    if (!internalForm.nom || !internalForm.prenom || !internalForm.email || !internalForm.telephone) {
      setInternalError('Tous les champs sont obligatoires')
      return
    }
    if (internalResas.length >= 15) {
      setInternalError('Limite de 15 réservations internes atteinte')
      return
    }

    // NOUVELLE LOGIQUE : Insertion directe en base de données
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
        participant_id: user.id, // Utiliser l'id de l'utilisateur trouvé
        type: user.participant_type === 'exposant' || user.participant_type === 'intervenant' || user.participant_type === 'vip' || user.participant_type === 'organisation' ? 'interne' : 'externe',
        valide: true, // Les inscriptions internes sont validées d'office
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

  const handleOpenEdit = (atelier) => {
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

  const handleEdit = async () => {
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

  const handleExport = async (atelier) => {
    // Récupérer toutes les réservations pour cet atelier
    const { data: resas } = await supabase
      .from('reservations_ateliers')
      .select('*')
      .eq('atelier_id', atelier.id)
    // Générer le CSV
    const header = [
      'Titre atelier', 'Intervenant', 'Jour/heure', 'Salle', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Type', 'Statut', 'Scanné'
    ]
    const rows = (resas || []).map(r => [
      atelier.titre,
      atelier.intervenant,
      atelier.date_heure,
      atelier.salle,
      r.nom,
      r.prenom,
      r.email,
      r.telephone || '',
      r.type,
      r.statut,
      r.scanned ? 'Oui' : 'Non'
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    // Ajout du BOM UTF-8 pour compatibilité Excel
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
    setLoadingResas(true);
    setListResas([]);
    try {
        const response = await fetch(`/api/admin/list-reservations?atelier_id=${atelierId}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Erreur inconnue de l'API");
        }
        setListResas(data);
    } catch (err) {
        toast.error(`Erreur chargement inscrits: ${err.message}`);
    } finally {
        setLoadingResas(false);
    }
  }

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation validée !')
      await handleOpenList(openListAtelierId)
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
      toast.success('Réservation refusée !')
      await handleOpenList(openListAtelierId)
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
      toast.error('Erreur lors de l\'envoi du ticket')
    }
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Toaster />
      <Link href="/admin" passHref>
        <Button variant="outlined" sx={{ mb: 2 }}>
          Retour à l'admin
        </Button>
      </Link>
      <Typography variant="h4" gutterBottom>
        Gestion des Ateliers
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Ajouter un atelier</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Titre"
            value={newAtelier.titre}
            onChange={e => setNewAtelier({ ...newAtelier, titre: e.target.value })}
          />
          <TextField
            label="Intervenant"
            value={newAtelier.intervenant}
            onChange={e =>
              setNewAtelier({ ...newAtelier, intervenant: e.target.value })
            }
          />
          <TextField
            label="Date et Heure"
            type="datetime-local"
            value={newAtelier.date_heure}
            onChange={e =>
              setNewAtelier({ ...newAtelier, date_heure: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Salle"
            value={newAtelier.salle}
            onChange={e => setNewAtelier({ ...newAtelier, salle: e.target.value })}
          />
          <TextField
            label="Places"
            type="number"
            value={newAtelier.places}
            onChange={e => setNewAtelier({ ...newAtelier, places: e.target.value })}
          />
          <Button variant="contained" onClick={handleAdd}>
            Ajouter
          </Button>
          {addError && <Typography color="error">{addError}</Typography>}
        </Stack>
      </Paper>

      <Typography variant="h5" sx={{ mt: 3 }}>
        Liste des ateliers
      </Typography>
      <List>
        {ateliers.map(atelier => (
          <Paper key={atelier.id} sx={{ mb: 2 }}>
            <ListItem>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{atelier.titre}</Typography>
                <Typography>
                  {atelier.intervenant} -{' '}
                  {new Date(atelier.date_heure).toLocaleString()} - {atelier.salle}{' '}
                  - {atelier.places} places
                </Typography>
              </Box>
              <Box>
                <IconButton onClick={() => handleOpenEdit(atelier)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(atelier.id)}>
                  <DeleteIcon />
                </IconButton>
                <IconButton onClick={() => handleOpenList(atelier.id)}>
                  <ListIcon />
                </IconButton>
                <IconButton onClick={() => handleExport(atelier)}>
                    <DownloadIcon />
                </IconButton>
              </Box>
            </ListItem>
          </Paper>
        ))}
      </List>

      {/* Dialog Liste des inscrits */}
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
                    secondary={
                        <Typography component="span" sx={{ fontWeight: 'bold', color: resa.statut === 'confirmé' ? 'green' : 'orange' }}>
                          Statut: {resa.statut}
                        </Typography>
                    }
                  />
                  {resa.statut === 'en attente' && (
                    <>
                      <Button variant="contained" color="success" size="small" onClick={() => handleValidate(resa.id)} fullWidth={isMobile}>
                        Valider
                      </Button>
                      <Button variant="contained" color="error" size="small" onClick={() => handleRefuse(resa.id)} fullWidth={isMobile}>
                        Refuser
                      </Button>
                    </>
                  )}
                  {resa.statut === 'confirmé' && (
                    <Button variant="contained" color="info" size="small" onClick={() => handleResendTicket(resa.id)} fullWidth={isMobile}>
                      Renvoyer ticket
                    </Button>
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
    </Box>
  )
}
