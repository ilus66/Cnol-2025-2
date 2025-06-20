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
  Divider
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ListIcon from '@mui/icons-material/List'
import DownloadIcon from '@mui/icons-material/Download'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

export default function AdminMasterclassPage() {
  const [masterclass, setMasterclass] = useState([])
  const [form, setForm] = useState({
    titre: '', intervenant: '', date_heure: '', salle: '', places: ''
  })
  const [openMasterId, setOpenMasterId] = useState(null)
  const [internalResas, setInternalResas] = useState([])
  const [internalForm, setInternalForm] = useState({ nom: '', prenom: '', email: '', telephone: '' })
  const [internalError, setInternalError] = useState('')
  const [openListMasterId, setOpenListMasterId] = useState(null)
  const [listResas, setListResas] = useState([])
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  // Détection mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  const fetchMasterclass = async () => {
    const { data } = await supabase.from('masterclass').select('*').order('date_heure')
    setMasterclass(data || [])
  }

  const fetchInternalResas = async (masterId) => {
    const { data } = await supabase.from('reservations_masterclass').select('*').eq('masterclass_id', masterId).eq('type', 'interne')
    setInternalResas(data || [])
  }

  useEffect(() => { fetchMasterclass() }, [])

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAdd = async () => {
    setAddError('');
    setAddSuccess('');
    // Vérification des champs requis
    if (!form.titre || !form.intervenant || !form.date_heure || !form.salle || !form.places) {
      setAddError('Tous les champs sont obligatoires');
      return;
    }
    const { error } = await supabase.from('masterclass').insert({ ...form, places: parseInt(form.places) || 0 });
    if (error) {
      setAddError('Erreur lors de l\'ajout : ' + error.message);
      console.error('Erreur ajout masterclass:', error);
    } else {
      setAddSuccess('Masterclass ajoutée avec succès !');
      setForm({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' });
      fetchMasterclass();
    }
  }

  const handleDelete = async (id) => {
    await supabase.from('masterclass').delete().eq('id', id)
    fetchMasterclass()
  }

  const handleOpenInternal = async (masterId) => {
    setOpenMasterId(masterId)
    await fetchInternalResas(masterId)
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
      .from('reservations_masterclass')
      .insert({
        masterclass_id: openMasterId,
        participant_id: user.id,
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
      await fetchInternalResas(openMasterId);
      toast.success('Participant ajouté à la masterclass !');
    }
  }

  const handleExport = async (master) => {
    // Récupérer toutes les réservations pour cette masterclass
    const { data: resas } = await supabase
      .from('reservations_masterclass')
      .select('*')
      .eq('masterclass_id', master.id)
    // Générer le CSV
    const header = [
      'Titre masterclass', 'Intervenant', 'Jour/heure', 'Salle', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Type', 'Validé', 'Scanné'
    ]
    const rows = (resas || []).map(r => [
      master.titre,
      master.intervenant,
      master.date_heure,
      master.salle,
      r.nom,
      r.prenom,
      r.email,
      r.telephone || '',
      r.type,
      r.valide ? 'Oui' : 'Non',
      r.scanned ? 'Oui' : 'Non'
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    // Ajout du BOM UTF-8 pour compatibilité Excel
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masterclass-${master.titre.replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenList = async (masterId) => {
    setOpenListMasterId(masterId)
    const { data } = await supabase.from('reservations_masterclass').select('*').eq('masterclass_id', masterId)
    setListResas(data || [])
  }

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-masterclass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation validée et ticket envoyé !')
      fetchInternalResas(openMasterId)
      handleOpenList(openMasterId)
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
      fetchInternalResas(openMasterId)
      handleOpenList(openMasterId)
    } else {
      toast.error('Erreur lors de la refus')
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Link href="/admin" passHref legacyBehavior>
          <Button variant="outlined" component="a">Retour à l'admin</Button>
        </Link>
      </Box>
      <Toaster position="top-right" />

      <Typography variant="h4" gutterBottom>Gestion des Masterclass</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Ajouter une masterclass</Typography>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
          <TextField
            label="Titre"
            name="titre"
            value={form.titre}
            onChange={handleChange}
            fullWidth
            required
          />
          <TextField
            label="Intervenant"
            name="intervenant"
            value={form.intervenant}
            onChange={handleChange}
            fullWidth
            required
          />
        </Stack>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
          <TextField
            label="Date et heure"
            name="date_heure"
            type="datetime-local"
            value={form.date_heure}
            onChange={handleChange}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Salle"
            name="salle"
            value={form.salle}
            onChange={handleChange}
            fullWidth
            required
          />
          <TextField
            label="Places"
            name="places"
            type="number"
            value={form.places}
            onChange={handleChange}
            fullWidth
            required
          />
        </Stack>
        {addError && <Typography color="error" sx={{ mb: 2 }}>{addError}</Typography>}
        {addSuccess && <Typography color="success.main" sx={{ mb: 2 }}>{addSuccess}</Typography>}
        <Button variant="contained" color="primary" onClick={handleAdd} fullWidth={isMobile}>
          Ajouter la masterclass
        </Button>
      </Paper>

      <Typography variant="h6" gutterBottom>Liste des masterclass</Typography>
      <Stack spacing={2}>
        {masterclass.map(master => (
          <Paper key={master.id} sx={{ p: 2, mb: 2 }}>
            <Stack spacing={1}>
              <Typography variant="h6">{master.titre}</Typography>
              <Typography><b>Intervenant :</b> {master.intervenant}</Typography>
              <Typography><b>Date/Heure :</b> {new Date(master.date_heure).toLocaleString()}</Typography>
              <Typography><b>Salle :</b> {master.salle}</Typography>
              <Typography><b>Places :</b> {master.places}</Typography>
              <Typography><b>Places restantes :</b> {master.places - (master.reservations_validated || 0)}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" color="primary" onClick={() => handleOpenInternal(master.id)} fullWidth={isMobile}>Réservations internes</Button>
                <Button variant="outlined" color="secondary" href={`/admin/masterclass/${master.id}`} fullWidth={isMobile}>Liste inscrits</Button>
                <Button variant="outlined" color="success" onClick={() => handleExport(master)} fullWidth={isMobile}>Exporter</Button>
                <Button variant={master.publie ? 'outlined' : 'contained'} color={master.publie ? 'warning' : 'success'} onClick={async () => { await supabase.from('masterclass').update({ publie: !master.publie }).eq('id', master.id); fetchMasterclass(); }} fullWidth={isMobile}>{master.publie ? 'Cacher' : 'Publier'}</Button>
                <Button variant="outlined" color="error" onClick={() => handleDelete(master.id)} fullWidth={isMobile}>Supprimer</Button>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* Dialog Réservations internes */}
      <Dialog open={!!openMasterId} onClose={() => setOpenMasterId(null)} maxWidth="md" fullWidth>
        <DialogTitle>Réservations internes</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Ajouter une réservation interne</Typography>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
              <TextField
                label="Nom"
                value={internalForm.nom}
                onChange={(e) => setInternalForm({ ...internalForm, nom: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Prénom"
                value={internalForm.prenom}
                onChange={(e) => setInternalForm({ ...internalForm, prenom: e.target.value })}
                fullWidth
                required
              />
            </Stack>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={internalForm.email}
                onChange={(e) => setInternalForm({ ...internalForm, email: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Téléphone"
                value={internalForm.telephone}
                onChange={(e) => setInternalForm({ ...internalForm, telephone: e.target.value })}
                fullWidth
                required
              />
            </Stack>
            {internalError && <Typography color="error" sx={{ mb: 2 }}>{internalError}</Typography>}
            <Button variant="contained" color="primary" onClick={handleAddInternal} fullWidth={isMobile}>
              Ajouter
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>Liste des réservations internes</Typography>
          <List>
            {internalResas.map(resa => (
              <ListItem key={resa.id} sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
                <Box flex={1}>
                  <Typography><b>Nom :</b> {resa.nom} {resa.prenom}</Typography>
                  <Typography><b>Email :</b> {resa.email}</Typography>
                  <Typography><b>Téléphone :</b> {resa.telephone}</Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
                  <Button variant="contained" color="error" size="small" onClick={() => handleDelete(resa.id)} fullWidth={isMobile}>
                    Supprimer
                  </Button>
                </Stack>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMasterId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Liste des inscrits */}
      <Dialog open={!!openListMasterId} onClose={() => setOpenListMasterId(null)} maxWidth="md" fullWidth>
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
                  <Typography><b>Statut :</b> <span style={{ color: resa.valide ? 'green' : 'red' }}>{resa.valide ? 'Validé' : 'Non validé'}</span></Typography>
                  <Typography><b>Scanné :</b> {resa.scanned ? '✓' : '✗'}</Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
                  {!resa.valide && resa.type === 'externe' && (
                    <>
                      <Button variant="contained" color="success" size="small" onClick={() => handleValidate(resa.id)} fullWidth={isMobile}>
                        Valider
                      </Button>
                      <Button variant="contained" color="error" size="small" onClick={() => handleRefuse(resa.id)} fullWidth={isMobile}>
                        Refuser
                      </Button>
                    </>
                  )}
                  {resa.valide && (
                    <Button variant="contained" color="info" size="small" onClick={() => handleResendTicket(resa.id)} fullWidth={isMobile}>
                      Renvoyer ticket
                    </Button>
                  )}
                </Stack>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListMasterId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
