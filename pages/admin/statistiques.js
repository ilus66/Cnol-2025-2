import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Divider, CircularProgress } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';

export default function AdminStatistiques() {
  const [loading, setLoading] = useState(false);
  const [classement, setClassement] = useState([]);
  const [searchParticipant, setSearchParticipant] = useState('');
  const [standsVisites, setStandsVisites] = useState([]);
  const [searchExposant, setSearchExposant] = useState('');
  const [visiteursStand, setVisiteursStand] = useState([]);

  // Classement des stands les plus visités
  const fetchClassement = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('exposant_id, exposant:exposant_id (nom, prenom, qualite_sponsoring)')
      .neq('exposant_id', null);
    if (error) return setLoading(false);
    // Agréger côté client
    const countByExposant = {};
    data.forEach(l => {
      const key = l.exposant_id;
      if (!countByExposant[key]) countByExposant[key] = { ...l.exposant, count: 0 };
      countByExposant[key].count++;
    });
    setClassement(Object.values(countByExposant).sort((a, b) => b.count - a.count));
    setLoading(false);
  };

  // Recherche stands visités par un participant
  const handleSearchParticipant = async () => {
    setLoading(true);
    const { data: inscrits } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email')
      .ilike('nom', `%${searchParticipant}%`);
    if (!inscrits || inscrits.length === 0) {
      setStandsVisites([]);
      setLoading(false);
      return;
    }
    const participant = inscrits[0];
    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, exposant:exposant_id (nom, prenom, qualite_sponsoring)')
      .eq('visiteur_id', participant.id);
    setStandsVisites(leads.map(l => ({ ...l, participant })));
    setLoading(false);
  };

  // Recherche visiteurs d'un stand (exposant)
  const handleSearchExposant = async () => {
    setLoading(true);
    const { data: exposants } = await supabase
      .from('inscription')
      .select('id, nom, prenom, qualite_sponsoring')
      .ilike('nom', `%${searchExposant}%`);
    if (!exposants || exposants.length === 0) {
      setVisiteursStand([]);
      setLoading(false);
      return;
    }
    const exposant = exposants[0];
    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, visiteur:visiteur_id (nom, prenom, email)')
      .eq('exposant_id', exposant.id);
    setVisiteursStand(leads.map(l => ({ ...l, exposant })));
    setLoading(false);
  };

  // Export CSV générique
  const exportCSV = (rows, header, filename) => {
    const csvContent = [header, ...rows].map(row => row.map(val => `"${val || ''}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>Statistiques - CNOL</Typography>
        <Button variant="contained" onClick={fetchClassement} sx={{ mb: 2 }}>Afficher classement stands les plus visités</Button>
        {loading && <CircularProgress sx={{ ml: 2 }} />}
        {classement.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Classement des stands les plus visités</Typography>
            <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(classement.map(e => [e.prenom, e.nom, e.qualite_sponsoring, e.count]), ['Prénom', 'Nom', 'Sponsoring', 'Nombre de visiteurs'], 'classement-stands.csv')}>Exporter CSV</Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Prénom</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Sponsoring</TableCell>
                  <TableCell>Nombre de visiteurs</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classement.map((e, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{e.prenom}</TableCell>
                    <TableCell>{e.nom}</TableCell>
                    <TableCell>{e.qualite_sponsoring}</TableCell>
                    <TableCell>{e.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Recherche stands visités par un participant</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField label="Nom participant" value={searchParticipant} onChange={e => setSearchParticipant(e.target.value)} />
          <Button variant="contained" onClick={handleSearchParticipant}>Rechercher</Button>
        </Box>
        {standsVisites.length > 0 && (
          <>
            <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(standsVisites.map(s => [s.participant.prenom, s.participant.nom, s.exposant?.prenom, s.exposant?.nom, s.exposant?.qualite_sponsoring, s.created_at && new Date(s.created_at).toLocaleString()]), ['Prénom participant', 'Nom participant', 'Prénom exposant', 'Nom exposant', 'Sponsoring', 'Date/Heure'], 'stands-visites-par-participant.csv')}>Exporter CSV</Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Prénom exposant</TableCell>
                  <TableCell>Nom exposant</TableCell>
                  <TableCell>Sponsoring</TableCell>
                  <TableCell>Date/Heure</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standsVisites.map((s, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{s.exposant?.prenom}</TableCell>
                    <TableCell>{s.exposant?.nom}</TableCell>
                    <TableCell>{s.exposant?.qualite_sponsoring}</TableCell>
                    <TableCell>{s.created_at && new Date(s.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Recherche visiteurs d'un stand (exposant)</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField label="Nom exposant" value={searchExposant} onChange={e => setSearchExposant(e.target.value)} />
          <Button variant="contained" onClick={handleSearchExposant}>Rechercher</Button>
        </Box>
        {visiteursStand.length > 0 && (
          <>
            <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(visiteursStand.map(v => [v.exposant.prenom, v.exposant.nom, v.visiteur?.prenom, v.visiteur?.nom, v.visiteur?.email, v.created_at && new Date(v.created_at).toLocaleString()]), ['Prénom exposant', 'Nom exposant', 'Prénom visiteur', 'Nom visiteur', 'Email visiteur', 'Date/Heure'], 'visiteurs-stand.csv')}>Exporter CSV</Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Prénom visiteur</TableCell>
                  <TableCell>Nom visiteur</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Date/Heure</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visiteursStand.map((v, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{v.visiteur?.prenom}</TableCell>
                    <TableCell>{v.visiteur?.nom}</TableCell>
                    <TableCell>{v.visiteur?.email}</TableCell>
                    <TableCell>{v.created_at && new Date(v.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </Box>
  );
} 