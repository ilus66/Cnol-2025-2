import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Stack, Divider, List, ListItem, ListItemText } from '@mui/material';
import { Html5QrcodeScanner } from 'html5-qrcode';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function MonEspace() {
  const [form, setForm] = useState({ code: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [ateliers, setAteliers] = useState([]);
  const [masterclass, setMasterclass] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [standsVisites, setStandsVisites] = useState([]);
  const [visiteursStand, setVisiteursStand] = useState([]);
  const [availableAteliers, setAvailableAteliers] = useState([]);
  const [availableMasterclass, setAvailableMasterclass] = useState([]);
  const [hasAppliedCnolDor, setHasAppliedCnolDor] = useState(false);
  const [reservationMessage, setReservationMessage] = useState('');

  // Détection mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  useEffect(() => {
    if (!showScanner) return;

    const scanner = new Html5QrcodeScanner(
      "reader-contact",
      { 
        fps: 10, 
        qrbox: 250,
        // Configuration pour utiliser la caméra arrière sur mobile
        videoConstraints: {
          facingMode: { ideal: "environment" } // "environment" = caméra arrière
        }
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        setShowScanner(false);
        scanner.clear();
        handleScanSuccess(decodedText);
      },
      (error) => {
        // ignorer les erreurs de scan
      }
    );

    return () => scanner.clear().catch(() => {});
  }, [showScanner]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/user-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Erreur de connexion');
      } else {
        setUser(data.user);
        setAteliers(data.ateliers || []);
        setMasterclass(data.masterclass || []);
        setNotifications(data.notifications || []);
        setContacts((data.contacts || []).map(c => c.inscription));
        setStandsVisites(data.stands_visites || []);
        setVisiteursStand(data.visiteurs_stand || []);
        setAvailableAteliers(data.available_ateliers || []);
        setAvailableMasterclass(data.available_masterclass || []);
        setHasAppliedCnolDor(data.has_applied_cnol_dor || false);
      }
    } catch (err) {
      setError('Erreur réseau');
    }
    setLoading(false);
    setAteliers([]);
    setMasterclass([]);
    setNotifications([]);
    setForm({ code: '', email: '' });
    setAvailableAteliers([]);
    setAvailableMasterclass([]);
    setHasAppliedCnolDor(false);
    setReservationMessage('');
  };

  const handleLogout = () => {
    setUser(null);
    setAteliers([]);
    setMasterclass([]);
    setNotifications([]);
    setForm({ code: '', email: '' });
  };

  // Placeholder pour activer les notifications push
  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator)) {
      alert('Service worker non supporté');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permission refusée');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      // Envoyer l'abonnement à l'API
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.getKey('p256dh') ? btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh')))) : '',
          auth: sub.getKey('auth') ? btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth')))) : '',
        }),
      });
      if (res.ok) {
        alert('Notifications push activées !');
      } else {
        alert("Erreur lors de l'enregistrement de l'abonnement");
      }
    } catch (e) {
      alert('Erreur activation push : ' + e.message);
    }
  };

  // Helper pour la clé VAPID
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Marquer une notification comme lue (placeholder, à relier à l'API)
  const markAsRead = (notifId) => {
    setNotifications(notifications.map(n => n.id === notifId ? { ...n, lu: true } : n));
    // TODO: appel API pour marquer comme lue côté serveur
  };

  // Scan contact
  const handleScanSuccess = async (decodedText) => {
    setScanError('');
    setScanSuccess('');
    setShowScanner(false);
    if (!user?.id) return;
    try {
      const res = await fetch('/api/scan-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, badge_code: decodedText })
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.message || "Erreur lors de l'ajout du contact");
      } else {
        setScanSuccess(data.message);
        setContacts((prev) => {
          // éviter les doublons
          if (prev.some(c => c.email === data.contact.email)) return prev;
          return [...prev, data.contact];
        });
      }
    } catch (e) {
      setScanError('Erreur réseau');
    }
  };

  const handleScanError = (err) => {
    // Ne pas afficher les erreurs de "non-détection" qui sont constantes
    if (err && !err.includes('No MultiFormat Readers')) {
      setScanError(`Erreur de scan : ${err}`);
    }
    // On peut laisser le scanner ouvert pour que l'utilisateur réessaie
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!contacts.length) return;
    const header = ['Prénom', 'Nom', 'Email', 'Téléphone'];
    const rows = contacts.map(c => [c.prenom, c.nom, c.email, c.telephone]);
    const csvContent = [header, ...rows].map(row => row.map(val => `"${val || ''}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts-cnol.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export vCard
  const handleExportVCard = () => {
    if (!contacts.length) return;
    const vcardLines = contacts.map(c => `BEGIN:VCARD\nVERSION:3.0\nN:${c.nom};${c.prenom};;;\nFN:${c.prenom} ${c.nom}\nEMAIL:${c.email || ''}\nTEL:${c.telephone || ''}\nEND:VCARD`).join('\n');
    const blob = new Blob([vcardLines], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts-cnol.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export visiteurs stand CSV
  const handleExportVisiteursCSV = () => {
    if (!visiteursStand.length) return;
    const header = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Date visite'];
    const rows = visiteursStand.map(v => [
      v.visiteur?.prenom || '',
      v.visiteur?.nom || '',
      v.visiteur?.email || '',
      v.visiteur?.telephone || '',
      v.created_at ? new Date(v.created_at).toLocaleString() : ''
    ]);
    const csvContent = [header, ...rows].map(row => row.map(val => `"${val || ''}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visiteurs-stand.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export visiteurs stand vCard
  const handleExportVisiteursVCard = () => {
    if (!visiteursStand.length) return;
    const vcardLines = visiteursStand.map(v => `BEGIN:VCARD\nVERSION:3.0\nN:${v.visiteur?.nom || ''};${v.visiteur?.prenom || ''};;;\nFN:${v.visiteur?.prenom || ''} ${v.visiteur?.nom || ''}\nEMAIL:${v.visiteur?.email || ''}\nTEL:${v.visiteur?.telephone || ''}\nEND:VCARD`).join('\n');
    const blob = new Blob([vcardLines], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visiteurs-stand.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fonction de réservation avec validation
  const handleReserve = async (type, eventId) => {
    // Vérifier que l'utilisateur est validé
    if (!user.valide) {
      setReservationMessage('Erreur : Vous devez être validé par l\'administrateur pour effectuer des réservations.');
      return;
    }
    
    setReservationMessage('Réservation en cours...');
    try {
      const endpoint = type === 'atelier' ? '/api/reservation-atelier' : '/api/reservation-masterclass';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          [type === 'atelier' ? 'atelierId' : 'masterclassId']: eventId,
          // Pas besoin d'envoyer nom/prénom, l'API peut les retrouver via l'email
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReservationMessage(`Erreur: ${data.message}`);
      } else {
        setReservationMessage(data.message);
        // Re-fetch user data to update reservations list
        handleSubmit(new Event('submit')); 
      }
    } catch (err) {
      setReservationMessage('Erreur réseau lors de la réservation.');
    }
  };

  if (user) {
    const isExposant = user.participant_type === 'exposant';
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">Bienvenue {user.prenom} !</Typography>
            <Button onClick={handleLogout} color="error">Déconnexion</Button>
          </Stack>
          <Typography sx={{ mb: 2 }}>Voici votre espace personnel CNOL 2025.</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Informations personnelles</Typography>
          <Typography>Nom : {user.nom}</Typography>
          <Typography>Prénom : {user.prenom}</Typography>
          <Typography>Email : {user.email}</Typography>
          <Typography>Fonction : {user.fonction}</Typography>
          <Typography>Ville : {user.ville}</Typography>
          <Typography>Code badge : {user.identifiant_badge}</Typography>
          
          {/* Statut de validation pour tous les utilisateurs */}
          <Box sx={{ mb: 2, p: 2, bgcolor: user.valide ? '#e8f5e8' : '#fff3cd', borderRadius: 1, border: `1px solid ${user.valide ? '#4caf50' : '#ff9800'}`, mt: 2 }}>
            <Typography variant="subtitle2" color={user.valide ? 'success.main' : 'warning.main'} sx={{ fontWeight: 'bold' }}>
              Statut de validation : {user.valide ? '✅ Validé' : '⏳ En attente de validation'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {user.valide 
                ? 'Votre inscription a été validée par l\'administrateur. Vous avez accès à toutes les fonctionnalités.'
                : 'Votre inscription est en cours de validation par l\'administrateur. Certaines fonctionnalités peuvent être limitées.'
              }
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Mon badge</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            href={`/api/generatedbadge?id=${user.id}`} 
            target="_blank" 
            sx={{ my: 1 }}
            disabled={!user.valide}
          >
            {user.valide ? 'Télécharger mon badge PDF' : 'Badge non disponible (en attente de validation)'}
          </Button>
          {!user.valide && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              Votre badge sera disponible une fois votre inscription validée par l'administrateur.
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Mes réservations ateliers</Typography>
          <List>
            {ateliers.length === 0 && <ListItem><ListItemText primary="Aucune réservation atelier." /></ListItem>}
            {ateliers.map((a) => (
              <ListItem key={a.id} alignItems="flex-start">
                <ListItemText
                  primary={a['ateliers:titre']}
                  secondary={<>
                    <span>Date : {a['ateliers:date_heure'] && new Date(a['ateliers:date_heure']).toLocaleString()}</span><br/>
                    <span>Salle : {a['ateliers:salle']}</span><br/>
                    <span>Intervenant : {a['ateliers:intervenant']}</span><br/>
                    <Button variant="outlined" size="small" href={`/api/generatedticket?id=${a.id}`} target="_blank" sx={{ mt: 1 }}>Ticket PDF</Button>
                  </>}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Mes réservations masterclass</Typography>
          <List>
            {masterclass.length === 0 && <ListItem><ListItemText primary="Aucune réservation masterclass." /></ListItem>}
            {masterclass.map((m) => (
              <ListItem key={m.id} alignItems="flex-start">
                <ListItemText
                  primary={m['masterclass:titre']}
                  secondary={<>
                    <span>Date : {m['masterclass:date_heure'] && new Date(m['masterclass:date_heure']).toLocaleString()}</span><br/>
                    <span>Salle : {m['masterclass:salle']}</span><br/>
                    <span>Intervenant : {m['masterclass:intervenant']}</span><br/>
                    <Button variant="outlined" size="small" href={`/api/generatedticket?id=${m.id}`} target="_blank" sx={{ mt: 1 }}>Ticket PDF</Button>
                  </>}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Notifications</Typography>
          <List>
            {notifications.length === 0 && <ListItem><ListItemText primary="Aucune notification." /></ListItem>}
            {notifications.map((n) => (
              <ListItem key={n.id} alignItems="flex-start" sx={{ bgcolor: n.lu ? '#f5f5f5' : '#e3f2fd', mb: 1 }}>
                <ListItemText
                  primary={n.type || 'Notification'}
                  secondary={<>
                    <span>{n.message}</span><br/>
                    <span style={{ fontSize: '0.85em', color: '#888' }}>{new Date(n.created_at).toLocaleString()}</span>
                  </>}
                />
                {!n.lu && <Button size="small" onClick={() => markAsRead(n.id)}>Marquer comme lue</Button>}
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Button variant="outlined" color="info" onClick={handleEnablePush} fullWidth>
            Activer les notifications push
          </Button>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Mes contacts CNOL</Typography>
          <Button variant="contained" color="secondary" onClick={() => setShowScanner(true)} sx={{ my: 1 }}>
            Scanner un badge
          </Button>
          <Button variant="outlined" color="primary" onClick={handleExportCSV} sx={{ ml: 1, my: 1 }} disabled={!contacts.length}>
            Exporter CSV
          </Button>
          <Button variant="outlined" color="primary" onClick={handleExportVCard} sx={{ ml: 1, my: 1 }} disabled={!contacts.length}>
            Exporter vCard
          </Button>
          {scanError && <Typography color="error">{scanError}</Typography>}
          {scanSuccess && <Typography color="success.main">{scanSuccess}</Typography>}
          {showScanner && (
            <Box sx={{ my: 2, p: 1, border: '1px dashed grey', borderRadius: 2, background: '#f5f5f5' }}>
              <Typography sx={{ mb: 1, textAlign: 'center', color: 'text.secondary' }}>
                Veuillez centrer le QR code dans la zone de scan.
              </Typography>
              <div id="reader-contact" style={{ marginTop: 20 }} />
              <Button onClick={() => setShowScanner(false)} sx={{ mt: 1 }} fullWidth>Annuler</Button>
            </Box>
          )}
          <List>
            {contacts.length === 0 && <ListItem><ListItemText primary="Aucun contact collecté." /></ListItem>}
            {contacts.map((c, idx) => (
              <ListItem key={c.email || idx} alignItems="flex-start">
                <ListItemText
                  primary={`${c.prenom} ${c.nom}`}
                  secondary={<>
                    <span>Email : {c.email}</span><br/>
                    <span>Téléphone : {c.telephone}</span>
                  </>}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Stands visités</Typography>
          <List>
            {standsVisites.length === 0 && <ListItem><ListItemText primary="Aucun stand visité." /></ListItem>}
            {standsVisites.map((s, idx) => (
              <ListItem key={s.exposant?.email || idx} alignItems="flex-start">
                <ListItemText
                  primary={`${s.exposant?.prenom || ''} ${s.exposant?.nom || ''} ${s.exposant?.qualite_sponsoring ? '(' + s.exposant.qualite_sponsoring + ')' : ''}`}
                  secondary={<>
                    <span>Email : {s.exposant?.email}</span><br/>
                    <span>Téléphone : {s.exposant?.telephone}</span><br/>
                    <span style={{ fontSize: '0.85em', color: '#888' }}>Visité le : {s.created_at && new Date(s.created_at).toLocaleString()}</span>
                  </>}
                />
              </ListItem>
            ))}
          </List>
          {isExposant && (
            <Box sx={{ mb: 3, p: 2, bgcolor: '#ffe0b2', borderRadius: 2, mt: 3 }}>
              <Typography variant="h5" color="primary">Espace exposant</Typography>
              <Typography sx={{ mb: 1 }}>Bienvenue {user.prenom}, vous êtes exposant au CNOL 2025.</Typography>
              
              {/* Statut de validation */}
              <Box sx={{ mb: 2, p: 2, bgcolor: user.valide ? '#e8f5e8' : '#fff3cd', borderRadius: 1, border: `1px solid ${user.valide ? '#4caf50' : '#ff9800'}` }}>
                <Typography variant="subtitle2" color={user.valide ? 'success.main' : 'warning.main'} sx={{ fontWeight: 'bold' }}>
                  Statut de validation : {user.valide ? '✅ Validé' : '⏳ En attente de validation'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {user.valide 
                    ? 'Votre inscription a été validée par l\'administrateur. Vous pouvez télécharger votre badge.'
                    : 'Votre inscription est en cours de validation par l\'administrateur. Le badge sera disponible une fois validé.'
                  }
                </Typography>
              </Box>

              <Button 
                variant="contained" 
                color="primary" 
                href={`/api/generatedbadge?id=${user.id}`} 
                target="_blank" 
                sx={{ my: 1 }}
                disabled={!user.valide}
              >
                {user.valide ? 'Télécharger mon badge exposant (PDF)' : 'Badge non disponible (en attente de validation)'}
              </Button>
              
              {!user.valide && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Contactez l'administrateur si vous avez des questions concernant votre validation.
                </Typography>
              )}
              
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6">Visiteurs de mon stand</Typography>
              <Button variant="outlined" color="primary" onClick={handleExportVisiteursCSV} sx={{ mr: 1, my: 1 }} disabled={!visiteursStand.length}>
                Exporter CSV
              </Button>
              <Button variant="outlined" color="primary" onClick={handleExportVisiteursVCard} sx={{ my: 1 }} disabled={!visiteursStand.length}>
                Exporter vCard
              </Button>
              <List>
                {visiteursStand.length === 0 && <ListItem><ListItemText primary="Aucun visiteur pour l'instant." /></ListItem>}
                {visiteursStand.map((v, idx) => (
                  <ListItem key={v.visiteur?.email || idx} alignItems="flex-start">
                    <ListItemText
                      primary={`${v.visiteur?.prenom || ''} ${v.visiteur?.nom || ''}`}
                      secondary={<>
                        <span>Email : {v.visiteur?.email}</span><br/>
                        <span>Téléphone : {v.visiteur?.telephone}</span><br/>
                        <span style={{ fontSize: '0.85em', color: '#888' }}>Visite le : {v.created_at && new Date(v.created_at).toLocaleString()}</span>
                      </>}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Réserver un atelier</Typography>
          {reservationMessage && <Typography color={reservationMessage.startsWith('Erreur') ? 'error' : 'success.main'} sx={{ my:1 }}>{reservationMessage}</Typography>}
          <List>
            {availableAteliers.filter(a => !ateliers.some(ra => ra['ateliers:titre'] === a.titre)).length === 0 && <ListItem><ListItemText primary="Aucun nouvel atelier disponible ou vous êtes déjà inscrit à tout." /></ListItem>}
            {availableAteliers
              .filter(a => !ateliers.some(ra => ra['ateliers:titre'] === a.titre)) // Exclure les ateliers déjà réservés
              .map((a) => (
              <ListItem key={a.id} alignItems="flex-start" sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemText
                  primary={a.titre}
                  secondary={<>
                    <span>{new Date(a.date_heure).toLocaleString()} - Salle: {a.salle}</span><br/>
                    <span>Intervenant: {a.intervenant}</span><br/>
                    <span style={{ color: (a.places_internes_restantes + a.places_externes_restantes) > 0 ? 'green' : 'red' }}>
                      Places restantes: {a.places_internes_restantes + a.places_externes_restantes}
                    </span>
                  </>}
                />
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={() => handleReserve('atelier', a.id)}
                  disabled={(a.places_internes_restantes + a.places_externes_restantes) === 0 || !user.valide}
                >
                  {user.valide ? 'Réserver' : 'Non validé'}
                </Button>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Réserver une masterclass</Typography>
          <List>
            {availableMasterclass.filter(m => !masterclass.some(rm => rm['masterclass:titre'] === m.titre)).length === 0 && <ListItem><ListItemText primary="Aucune nouvelle masterclass disponible ou vous êtes déjà inscrit à tout." /></ListItem>}
            {availableMasterclass
              .filter(m => !masterclass.some(rm => rm['masterclass:titre'] === m.titre)) // Exclure les masterclass déjà réservées
              .map((m) => (
              <ListItem key={m.id} alignItems="flex-start" sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemText
                  primary={m.titre}
                  secondary={<>
                    <span>{new Date(m.date_heure).toLocaleString()} - Salle: {m.salle}</span><br/>
                    <span>Intervenant: {m.intervenant}</span><br/>
                    <span style={{ color: (m.places_internes_restantes + m.places_externes_restantes) > 0 ? 'green' : 'red' }}>
                      Places restantes: {m.places_internes_restantes + m.places_externes_restantes}
                    </span>
                  </>}
                />
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={() => handleReserve('masterclass', m.id)}
                  disabled={(m.places_internes_restantes + m.places_externes_restantes) === 0 || !user.valide}
                >
                  {user.valide ? 'Réserver' : 'Non validé'}
                </Button>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          {!hasAppliedCnolDor && (
            <>
              <Typography variant="h6">Postuler au CNOL d'Or</Typography>
              <Typography sx={{ my: 1 }}>Tentez votre chance et devenez le lauréat du CNOL d'Or 2025.</Typography>
              <Button variant="contained" color="warning" href="/cnol-dor" target="_blank" rel="noopener noreferrer">
                Je postule
              </Button>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* --- NOUVEAU : Section Localisation --- */}
          <Typography variant="h6">Localisation de l'événement</Typography>
          <Typography sx={{ my: 1 }}>
            Fondation Mohammed VI de Promotion des Œuvres Sociales de l'Education et de Formation, Rabat.
          </Typography>
          <Box sx={{ my: 2, borderRadius: 2, overflow: 'hidden', position: 'relative', paddingTop: '75%' /* 4:3 Aspect Ratio */ }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d105873.81423935256!2d-7.0201603027343715!3d33.978232000000006!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda76cdca2be509f%3A0x5737e47164ae0407!2sFondation%20Mohammed%20VI%20de%20Promotion%20des%20Oeuvres%20Sociales%20de%20l'Education%20et%20de%20Formation!5e0!3m2!1sfr!2sma!4v1750455243169!5m2!1sfr!2sma"
              style={{
                border: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </Box>
          <Divider sx={{ my: 2 }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Accéder à mon espace</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Code badge"
            name="code"
            value={form.code}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
            {loading ? 'Connexion...' : 'Accéder à mon espace'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
} 