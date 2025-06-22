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
    places: '',
  })
  const [editAtelier, setEditAtelier] = useState(null)
  const [editForm, setEditForm] = useState({
    titre: '',
    intervenant: '',
    date_heure: '',
    salle: '',
    places: '',
  })
  const [addError, setAddError] = useState('')
  const [editError, setEditError] = useState('')

  const [openListAtelierId, setOpenListAtelierId] = useState(null)
  const [listResas, setListResas] = useState([])
  const [loadingResas, setLoadingResas] = useState(false)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600

  useEffect(() => {
    fetchAteliers()
  }, [])

  const fetchAteliers = async () => {
    const { data, error } = await supabase
      .from('ateliers')
      .select('*')
      .order('date_heure')
    if (!error) setAteliers(data)
  }

  const handleAdd = async () => {
    setAddError('')
    if (
      !newAtelier.titre ||
      !newAtelier.intervenant ||
      !newAtelier.date_heure ||
      !newAtelier.salle ||
      !newAtelier.places
    ) {
      setAddError('Tous les champs sont obligatoires')
      return
    }
    const { error } = await supabase.from('ateliers').insert([newAtelier])
    if (error) {
      setAddError("Erreur lors de l'ajout : " + error.message)
    } else {
      toast.success('Atelier ajouté avec succès !')
      setNewAtelier({
        titre: '',
        intervenant: '',
        date_heure: '',
        salle: '',
        places: '',
      })
      fetchAteliers()
    }
  }

  const handleDelete = async id => {
    if (window.confirm('Voulez-vous vraiment supprimer cet atelier ?')) {
      await supabase.from('ateliers').delete().eq('id', id)
      fetchAteliers()
    }
  }

  const handleOpenEdit = atelier => {
    setEditAtelier(atelier)
    setEditForm({
      titre: atelier.titre,
      intervenant: atelier.intervenant,
      date_heure: atelier.date_heure,
      salle: atelier.salle,
      places: atelier.places,
    })
    setEditError('')
  }

  const handleEdit = async () => {
    setEditError('')
    if (!editForm.titre || !editForm.date_heure) {
      setEditError('Titre et date/heure obligatoires')
      return
    }
    const { error } = await supabase
      .from('ateliers')
      .update(editForm)
      .eq('id', editAtelier.id)
    if (error) {
      setEditError('Erreur lors de la modification')
    } else {
      setEditAtelier(null)
      fetchAteliers()
      toast.success('Atelier modifié avec succès.')
    }
  }

  const handleOpenList = async atelierId => {
    setOpenListAtelierId(atelierId)
    setListResas([])
    setLoadingResas(true)
    try {
      const response = await fetch(
        `/api/admin/list-reservations?table=reservations_ateliers&id=${atelierId}`
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur API')
      }
      const data = await response.json()
      setListResas(data)
    } catch (error) {
      console.error('Erreur fetch inscriptions:', error)
      toast.error(`Impossible de charger la liste: ${error.message}`)
    } finally {
      setLoadingResas(false)
    }
  }

  const handleValidate = async resaId => {
    try {
      const response = await fetch('/api/valider-reservation-atelier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resaId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur serveur')
      toast.success('Réservation validée et ticket envoyé !')
      await handleOpenList(openListAtelierId) // Refresh list
    } catch (error) {
      toast.error(`Erreur validation: ${error.message}`)
      console.error(error)
    }
  }

  const handleRefuse = async resaId => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir refuser cette réservation ? L'utilisateur recevra une notification."
      )
    )
      return
    try {
      const response = await fetch('/api/refuser-reservation-atelier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resaId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur serveur')
      toast.success('Réservation refusée.')
      await handleOpenList(openListAtelierId) // Refresh list
    } catch (error) {
      toast.error(`Erreur refus: ${error.message}`)
      console.error(error)
    }
  }

  const handleResendTicket = async resaId => {
    try {
      const response = await fetch('/api/renvoyer-ticket-atelier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resaId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur serveur')
      toast.success('Ticket renvoyé avec succès !')
    } catch (error) {
      toast.error(`Erreur renvoi: ${error.message}`)
      console.error(error)
    }
  }

  const handleExport = async (atelier) => {
    toast.loading('Exportation en cours...')
    try {
        const response = await fetch(`/api/admin/list-reservations?table=reservations_ateliers&id=${atelier.id}`);
        if (!response.ok) throw new Error("Impossible de récupérer les données.");
        const resas = await response.json();

        const header = [
          'Nom', 'Prénom', 'Email', 'Téléphone', 'Statut'
        ];
        const rows = (resas || []).map(r => [
          r.nom,
          r.prenom,
          r.email,
          r.telephone || '',
          r.statut
        ]);
        const csv = [header, ...rows].map(r => `"${r.join('","')}"`).join('\n');
        
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inscrits-atelier-${atelier.titre.replace(/\s+/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success('Exportation réussie !');
    } catch (error) {
        toast.dismiss();
        toast.error(`Erreur lors de l'exportation: ${error.message}`);
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

            {/* MODAL MODIFICATION */}
            <Dialog open={editAtelier?.id === atelier.id} onClose={() => setEditAtelier(null)}>
              <DialogTitle>Modifier l'atelier</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField label="Titre" value={editForm.titre} onChange={(e) => setEditForm({...editForm, titre: e.target.value})} />
                  <TextField label="Intervenant" value={editForm.intervenant} onChange={(e) => setEditForm({...editForm, intervenant: e.target.value})} />
                  <TextField label="Date et Heure" type="datetime-local" value={editForm.date_heure} onChange={(e) => setEditForm({...editForm, date_heure: e.target.value})} InputLabelProps={{ shrink: true }} />
                  <TextField label="Salle" value={editForm.salle} onChange={(e) => setEditForm({...editForm, salle: e.target.value})} />
                  <TextField label="Places" type="number" value={editForm.places} onChange={(e) => setEditForm({...editForm, places: e.target.value})} />
                  {editError && <Typography color="error">{editError}</Typography>}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditAtelier(null)}>Annuler</Button>
                <Button onClick={handleEdit}>Enregistrer</Button>
              </DialogActions>
            </Dialog>

            {/* MODAL LISTE INSCRITS */}
            <Dialog
              open={openListAtelierId === atelier.id}
              onClose={() => setOpenListAtelierId(null)}
              fullWidth
              maxWidth="md"
            >
              <DialogTitle>
                Inscrits à l'atelier : {atelier.titre}
              </DialogTitle>
              <DialogContent>
                {loadingResas ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      my: 2,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : listResas.length > 0 ? (
                  <List>
                    {listResas.map(resa => (
                      <Paper key={resa.id} sx={{ mb: 1, p: 1 }} elevation={2}>
                        <ListItem>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body1">
                              {resa.prenom} {resa.nom}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                               {resa.email}
                            </Typography>
                             <Typography variant="body2" color="textSecondary">
                              Tél: {resa.telephone || 'N/A'} - Statut:{' '}
                              <Typography component="span" variant="body2" sx={{ fontWeight: 'bold', color: resa.statut === 'confirmé' ? 'green' : 'orange' }}>
                                  {resa.statut}
                              </Typography>
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            {resa.statut === 'en attente' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleValidate(resa.id)}
                                >
                                  Valider
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  onClick={() => handleRefuse(resa.id)}
                                >
                                  Refuser
                                </Button>
                              </>
                            )}
                            {resa.statut === 'confirmé' && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleResendTicket(resa.id)}
                              >
                                Renvoyer ticket
                              </Button>
                            )}
                          </Stack>
                        </ListItem>
                      </Paper>
                    ))}
                  </List>
                ) : (
                  <Typography sx={{ p: 2 }}>
                    Aucun inscrit pour le moment.
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenListAtelierId(null)}>Fermer</Button>
              </DialogActions>
            </Dialog>
          </Paper>
        ))}
      </List>
    </Box>
  )
}
