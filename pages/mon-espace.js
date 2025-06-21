import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Stack, 
  Divider, 
  Alert, 
  Card, 
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge
} from '@mui/material';
import QRCode from 'qrcode.react';
import Link from 'next/link';
import {
  QrCodeScanner,
  Notifications,
  NotificationsOff,
  Person,
  Event,
  Hotel,
  LocationOn,
  Download,
  Logout,
  ContactPhone,
  School,
  EmojiEvents,
  Map
} from '@mui/icons-material';
import QRCodeScanner from '../components/QRCodeScanner';

export const getServerSideProps = async ({ req }) => {
  // Vérifier si l'utilisateur est connecté via la session
  const sessionCookie = req.cookies['cnol-session'];
  
  if (!sessionCookie) {
    return {
      redirect: {
        destination: '/identification',
        permanent: false,
      },
    };
  }

  try {
    // Décoder la session
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    
    if (!sessionData || !sessionData.id) {
      return {
        redirect: {
          destination: '/identification',
          permanent: false,
        },
      };
    }

    const { data: userData, error } = await supabase
      .from('inscription')
      // On simplifie la requête pour le débogage. On ne charge que les infos de l'utilisateur.
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (error || !userData) {
      return {
        redirect: {
          destination: '/identification?error=user_not_found',
          permanent: false,
        },
      };
    }

    return {
      props: {
        user: userData,
      },
    };
  } catch (error) {
    console.error('Erreur de session:', error);
    return {
      redirect: {
        destination: '/identification',
        permanent: false,
      },
    };
  }
};

export default function MonEspace({ user }) {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({});

  // Détermine si l'utilisateur a le droit de voir les ateliers/masterclass
  const isAllowedForWorkshops = user && (user.fonction === 'Opticien' || user.fonction === 'Ophtalmologue');

  useEffect(() => {
    // Vérifier les permissions de notifications
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }

    // Charger les paramètres
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) setSettings(data);
    };
    fetchSettings();

    // Charger les contacts collectés
    const fetchContacts = async () => {
      const { data } = await supabase
        .from('contacts_collected')
        .select('*')
        .eq('collector_id', user.id);
      if (data) setContacts(data);
    };
    fetchContacts();
  }, [user.id]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/identification');
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert("Les notifications ne sont pas supportées par votre navigateur.");
      return;
    }

    if (Notification.permission === 'granted') {
      // Se désabonner (logique à implémenter si nécessaire, pour l'instant on désactive juste)
      setNotificationsEnabled(false);
      alert("Notifications désactivées. Pour réactiver, veuillez gérer les permissions de votre navigateur.");
      // Idéalement, il faudrait aussi appeler une API pour supprimer l'abonnement de la BDD.
      return;
    }

    if (Notification.permission === 'denied') {
      alert("Vous avez bloqué les notifications. Veuillez les autoriser dans les paramètres de votre navigateur.");
      return;
    }

    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert("Permission de notification non accordée.");
      setNotificationsEnabled(false);
      return;
    }
    
    setNotificationsEnabled(true);
    
    try {
      // Enregistrer le Service Worker
      const sw = await navigator.serviceWorker.ready;
      
      // S'abonner aux notifications push
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Envoyer l'abonnement au serveur
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Échec de l\'abonnement côté serveur.');
      }

      alert('Vous êtes maintenant abonné aux notifications !');

    } catch (error) {
      console.error("Erreur lors de l'abonnement aux notifications:", error);
      alert("Une erreur est survenue lors de l'abonnement aux notifications.");
      setNotificationsEnabled(false);
    }
  };

  const handleDownloadPdfBadge = async () => {
    // Vérifier que l'utilisateur est validé avant de permettre le téléchargement
    if (!user.valide) {
      alert('Votre inscription doit être validée par l\'administrateur avant de pouvoir télécharger votre badge.');
      return;
    }

    try {
      // Afficher un indicateur de chargement
      alert('Génération de votre badge PDF en cours... Veuillez patienter.');

      const response = await fetch(`/api/generatedbadge?id=${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'La génération du badge a échoué.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `badge-cnol2025-${user.nom}-${user.prenom}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erreur lors du téléchargement du badge PDF:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleScanBadge = () => {
    setScannerOpen(true);
  };

  const handleScanResult = async (result) => {
    setScannedCode(result);
    setScannerOpen(false);
    
    // Enregistrer le contact
    try {
      const { error } = await supabase
        .from('contacts_collected')
        .insert({
          collector_id: user.id,
          scanned_badge_code: result,
          scanned_at: new Date().toISOString()
        });
      
      if (!error) {
        alert('Contact ajouté avec succès !');
        // Recharger les contacts
        const { data } = await supabase
          .from('contacts_collected')
          .select('*')
          .eq('collector_id', user.id);
        if (data) setContacts(data);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
      {/* En-tête avec infos utilisateur */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Bonjour, {user.prenom} {user.nom}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.email} • {user.participant_type}
            </Typography>
            <Chip 
              label={user.valide ? "Compte validé" : "En attente de validation"} 
              color={user.valide ? "success" : "warning"}
              sx={{ mt: 1 }}
            />
          </Box>
          <Button 
            onClick={handleLogout} 
            variant="outlined" 
            color="secondary" 
            startIcon={<Logout />}
          >
            Se déconnecter
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Badge QR Code */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <QrCodeScanner sx={{ mr: 1, verticalAlign: 'middle' }} />
              Votre QR Code d'accès
            </Typography>
            {user.valide ? (
              <Stack alignItems="center" spacing={2}>
                <QRCode id="qr-code" value={user.identifiant_badge || user.email} size={200} />
                <Typography variant="body2" color="text.secondary">
                  Code: {user.identifiant_badge || 'N/A'}
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Download />}
                  onClick={handleDownloadPdfBadge}
                >
                  Télécharger mon Badge (PDF)
                </Button>
              </Stack>
            ) : (
              <Alert severity="warning">
                Votre inscription est en attente de validation. Votre badge sera disponible ici une fois votre compte approuvé.
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
              Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={handleNotificationToggle}
                />
              }
              label="Activer les notifications push"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Recevez des notifications importantes sur votre appareil
            </Typography>
          </Paper>
        </Grid>

        {/* Mes Réservations Ateliers - Condition d'affichage ajoutée */}
        {user.valide && isAllowedForWorkshops && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                Mes Réservations Ateliers
              </Typography>
              {user.reservations_ateliers && user.reservations_ateliers.length > 0 ? (
                <List>
                  {user.reservations_ateliers.map((reservation) => (
                    <ListItem key={reservation.id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Event />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={reservation.ateliers?.titre}
                        secondary={`${reservation.ateliers?.date} - ${reservation.ateliers?.heure}`}
                      />
                      <Chip 
                        label={reservation.statut} 
                        color={reservation.statut === 'confirmé' ? 'success' : 'warning'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune réservation d'atelier
                </Typography>
              )}
              {settings.ouverture_reservation_atelier && (
                <Button 
                  variant="contained" 
                  fullWidth 
                  sx={{ mt: 2 }}
                  href="/reservation-ateliers"
                >
                  Réserver un atelier
                </Button>
              )}
            </Paper>
          </Grid>
        )}

        {/* Mes Réservations Masterclass - Condition d'affichage ajoutée */}
        {user.valide && isAllowedForWorkshops && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                Mes Réservations Masterclass
              </Typography>
              {user.reservations_masterclass && user.reservations_masterclass.length > 0 ? (
                <List>
                  {user.reservations_masterclass.map((reservation) => (
                    <ListItem key={reservation.id}>
                      <ListItemAvatar>
                        <Avatar>
                          <Event />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={reservation.masterclasses?.titre}
                        secondary={`${reservation.masterclasses?.date} - ${reservation.masterclasses?.heure}`}
                      />
                      <Chip 
                        label={reservation.statut} 
                        color={reservation.statut === 'confirmé' ? 'success' : 'warning'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune réservation de masterclass
                </Typography>
              )}
              {settings.ouverture_reservation_masterclass && (
                <Button 
                  variant="contained" 
                  fullWidth 
                  sx={{ mt: 2 }}
                  href="/reservation-masterclass"
                >
                  Réserver une masterclass
                </Button>
              )}
            </Paper>
          </Grid>
        )}

        {/* Scanner Badge */}
        {user.valide && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <QrCodeScanner sx={{ mr: 1, verticalAlign: 'middle' }} />
                Scanner un Badge
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scannez le badge d'un autre participant pour échanger vos coordonnées
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                startIcon={<QrCodeScanner />}
                onClick={handleScanBadge}
              >
                Scanner un badge
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Contacts Collectés */}
        {user.valide && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <ContactPhone sx={{ mr: 1, verticalAlign: 'middle' }} />
                Contacts Collectés
                <Badge badgeContent={contacts.length} color="primary" sx={{ ml: 1 }}>
                  <ContactPhone />
                </Badge>
              </Typography>
              {contacts.length > 0 ? (
                <List>
                  {contacts.slice(0, 5).map((contact, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`Badge: ${contact.scanned_badge_code}`}
                        secondary={new Date(contact.scanned_at).toLocaleDateString()}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucun contact collecté
                </Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* Postuler CNOL d'Or - Condition d'affichage ajoutée */}
        {user.valide && user.fonction === 'Opticien' && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle' }} />
                CNOL d'Or 2025
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Postulez pour le prix CNOL d'Or 2025
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                href="/cnol-dor"
                startIcon={<EmojiEvents />}
              >
                Postuler au CNOL d'Or
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Réserver un Hôtel */}
        {user.valide && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Hotel sx={{ mr: 1, verticalAlign: 'middle' }} />
                Réserver un Hôtel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Consultez et réservez dans nos hôtels partenaires
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                href="/hotels"
                startIcon={<Hotel />}
              >
                Voir les hôtels partenaires
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Localisation Événement */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
              Localisation de l'Événement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              CNOL 2025 - Rabat, Maroc
            </Typography>
            <Box sx={{ height: 300, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3323.5!2d-6.8498!3d34.0209!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDAxJzE1LjIiTiA2wrA1MCc1OS4zIlc!5e0!3m2!1sfr!2sfr!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog Scanner */}
      <Dialog open={scannerOpen} onClose={() => setScannerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Scanner un Badge</DialogTitle>
        <DialogContent>
          <QRCodeScanner 
            onScanSuccess={handleScanResult}
            onScanError={(error) => console.warn(`QR scan error: ${error}`)}
          />
          <Typography variant="body2" color="text.secondary" sx={{ my: 2, textAlign: 'center' }}>
            Ou entrez manuellement le code du badge :
          </Typography>
          <TextField
            fullWidth
            label="Code du badge"
            value={scannedCode}
            onChange={(e) => setScannedCode(e.target.value)}
            placeholder="Entrez le code du badge"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScannerOpen(false)}>Annuler</Button>
          <Button 
            onClick={() => handleScanResult(scannedCode)} 
            variant="contained"
            disabled={!scannedCode}
          >
            Ajouter le contact
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
