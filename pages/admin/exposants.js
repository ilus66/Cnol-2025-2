import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, Button, TextField, Stack, Alert } from '@mui/material';

export default function AdminExposants() {
  const [form, setForm] = useState({ nom: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exposants, setExposants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExposants();
  }, []);

  const fetchExposants = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/list-exposants');
    const data = await res.json();
    setExposants(data.exposants || []);
    setLoading(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.nom || !form.email) {
      setError('Tous les champs sont obligatoires');
      return;
    }
    const res = await fetch('/api/admin/create-exposant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setSuccess('Exposant créé avec succès !');
      setForm({ nom: '', email: '' });
      fetchExposants();
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Gestion des exposants
      </Typography>
      <Divider sx={{ mb: 3 }} />
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Ajouter un exposant</Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
            <TextField label="Nom société" name="nom" value={form.nom} onChange={handleChange} required fullWidth />
            <TextField label="Email responsable" name="email" value={form.email} onChange={handleChange} required fullWidth />
          </Stack>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <Button type="submit" variant="contained" color="primary">Créer l'exposant</Button>
        </form>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Liste des exposants</Typography>
        {loading ? <Typography>Chargement...</Typography> : (
          exposants.length === 0 ? <Typography>Aucun exposant.</Typography> :
          <ul>
            {exposants.map(exp => (
              <li key={exp.id}><b>{exp.nom}</b> ({exp.email_responsable})</li>
            ))}
          </ul>
        )}
      </Paper>
    </Box>
  );
}
