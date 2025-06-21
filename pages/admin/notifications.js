import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Box, Typography, Paper, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, 
  Stack, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
  Divider, IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminNotifications() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    body: '',
    targetType: 'all', // 'all', 'specific', 'type'
    targetUsers: [],
    targetParticipantType: ''
  });
  const [showHistory, setShowHistory] = useState(false);

  // Détection mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        user:user_id (nom, prenom, email, participant_type)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error) {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email, participant_type')
      .eq('valide', true)
      .order('nom');
    
    if (!error) {
      setUsers(data || []);
    }
  };

  const handleSendNotification = async () => {
    if (!form.title || !form.body) {
      toast.error('Titre et message sont obligatoires');
      return;
    }

    setSending(true);
    let targetUserIds = [];

    // Déterminer les utilisateurs cibles
    if (form.targetType === 'all') {
      targetUserIds = users.map(u => u.id);
    } else if (form.targetType === 'specific') {
      targetUserIds = form.targetUsers;
    } else if (form.targetType === 'type') {
      targetUserIds = users
        .filter(u => u.participant_type === form.targetParticipantType)
        .map(u => u.id);
    }

    if (targetUserIds.length === 0) {
      toast.error('Aucun utilisateur cible sélectionné');
      setSending(false);
      return;
    }

    let success = 0;
    let fail = 0;

    // Envoyer la notification à chaque utilisateur
    for (const userId of targetUserIds) {
      try {
        // Insérer en base
        await supabase.from('notifications').insert({
          user_id: userId,
          title: form.title,
          body: form.body,
          url: null
        });

        // Envoyer la notification push
        const response = await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            title: form.title,
            body: form.body,
            url: null
          })
        });

        if (response.ok) {
          success++;
        } else {
          fail++;
        }
      } catch (error) {
        console.error('Erreur envoi notification:', error);
        fail++;
      }
    }

    toast.success(`Notifications envoyées : ${success}, échecs : ${fail}`);
    setForm({
      title: '',
      body: '',
      targetType: 'all',
      targetUsers: [],
      targetParticipantType: ''
    });
    setSending(false);
    fetchNotifications();
  };

  const handleDeleteNotification = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (!error) {
      toast.success('Notification supprimée');
      fetchNotifications();
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getParticipantTypeCount = (type) => {
    return users.filter(u => u.participant_type === type).length;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestion des Notifications</Typography>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            startIcon={<HistoryIcon />}
            onClick={() => setShowHistory(true)}
          >
            Historique
          </Button>
          <Button variant="outlined" href="/admin">
            Retour à l'admin
          </Button>
        </Stack>
      </Box>

      <Toaster position="top-right" />

      {/* Formulaire d'envoi */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Envoyer une notification</Typography>
        
        <Stack spacing={3}>
          <TextField
            label="Titre de la notification"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            fullWidth
            required
          />
          
          <TextField
            label="Message"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            fullWidth
            multiline
            rows={3}
            required
          />

          <FormControl fullWidth>
            <InputLabel>Type de cible</InputLabel>
            <Select
              value={form.targetType}
              onChange={(e) => setForm({ ...form, targetType: e.target.value })}
              label="Type de cible"
            >
              <MenuItem value="all">
                Tous les utilisateurs validés ({users.length})
              </MenuItem>
              <MenuItem value="type">Par type de participant</MenuItem>
              <MenuItem value="specific">Utilisateurs spécifiques</MenuItem>
            </Select>
          </FormControl>

          {form.targetType === 'type' && (
            <FormControl fullWidth>
              <InputLabel>Type de participant</InputLabel>
              <Select
                value={form.targetParticipantType}
                onChange={(e) => setForm({ ...form, targetParticipantType: e.target.value })}
                label="Type de participant"
              >
                <MenuItem value="exposant">Exposants ({getParticipantTypeCount('exposant')})</MenuItem>
                <MenuItem value="intervenant">Intervenants ({getParticipantTypeCount('intervenant')})</MenuItem>
                <MenuItem value="vip">VIP ({getParticipantTypeCount('vip')})</MenuItem>
                <MenuItem value="organisation">Organisations ({getParticipantTypeCount('organisation')})</MenuItem>
                <MenuItem value="opticien">Opticiens ({getParticipantTypeCount('opticien')})</MenuItem>
                <MenuItem value="ophtalmologue">Ophtalmologues ({getParticipantTypeCount('ophtalmologue')})</MenuItem>
                <MenuItem value="orthoptiste">Orthoptistes ({getParticipantTypeCount('orthoptiste')})</MenuItem>
                <MenuItem value="étudiant">Étudiants ({getParticipantTypeCount('étudiant')})</MenuItem>
                <MenuItem value="presse">Presse ({getParticipantTypeCount('presse')})</MenuItem>
                <MenuItem value="autre">Autres ({getParticipantTypeCount('autre')})</MenuItem>
              </Select>
            </FormControl>
          )}

          {form.targetType === 'specific' && (
            <FormControl fullWidth>
              <InputLabel>Utilisateurs spécifiques</InputLabel>
              <Select
                multiple
                value={form.targetUsers}
                onChange={(e) => setForm({ ...form, targetUsers: e.target.value })}
                label="Utilisateurs spécifiques"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((userId) => {
                      const user = users.find(u => u.id === userId);
                      return (
                        <Chip 
                          key={userId} 
                          label={`${user?.nom} ${user?.prenom}`} 
                          size="small" 
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.nom} {user.prenom} ({user.email}) - {user.participant_type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleSendNotification}
            disabled={sending || !form.title || !form.body}
            fullWidth={isMobile}
          >
            {sending ? 'Envoi en cours...' : 'Envoyer la notification'}
          </Button>
        </Stack>
      </Paper>

      {/* Statistiques */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Statistiques</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <Chip label={`Total utilisateurs : ${users.length}`} color="primary" />
          <Chip label={`Notifications envoyées : ${notifications.length}`} color="secondary" />
          <Chip label={`Avec abonnements push : ${notifications.filter(n => n.user?.push_subscriptions?.length > 0).length}`} color="success" />
        </Stack>
      </Paper>

      {/* Dialog Historique */}
      <Dialog 
        open={showHistory} 
        onClose={() => setShowHistory(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>Historique des notifications</DialogTitle>
        <DialogContent>
          {loading ? (
            <CircularProgress />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell>Titre</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.map((notif) => (
                  <TableRow key={notif.id}>
                    <TableCell>
                      {new Date(notif.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {notif.user?.nom} {notif.user?.prenom}
                      <br />
                      <small>{notif.user?.email}</small>
                    </TableCell>
                    <TableCell>{notif.title}</TableCell>
                    <TableCell>{notif.body}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteNotification(notif.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
