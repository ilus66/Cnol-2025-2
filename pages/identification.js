import { useState } from 'react'
import { useRouter } from 'next/router'
import { Box, TextField, Button, Typography, Alert, CircularProgress, Stack } from '@mui/material'
import Link from 'next/link'

export default function IdentificationPage() {
  const [email, setEmail] = useState('')
  const [badgeCode, setBadgeCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { redirect } = router.query

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, badgeCode }),
      })

      const data = await response.json()
      setLoading(false)

      if (!response.ok) {
        setError(data.message || "Une erreur est survenue.")
        return
      }
      
      // Rediriger vers la page demandée initialement ou vers mon-espace par défaut
      // On utilise window.location.href pour forcer un rechargement complet de la page
      // et s'assurer que le nouveau cookie de session est bien pris en compte par le serveur.
      window.location.href = redirect || '/mon-espace';

    } catch (err) {
      setLoading(false)
      setError("Erreur de connexion. Veuillez réessayer.")
      console.error(err)
    }
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Identification
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }} align="center">
        Accédez à votre espace en utilisant votre email et votre code badge.
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="Numéro du badge"
            value={badgeCode}
            onChange={(e) => setBadgeCode(e.target.value.toUpperCase())}
            fullWidth
            required
            inputProps={{ maxLength: 6, style: { textTransform: 'uppercase' } }}
          />
        </Stack>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          fullWidth 
          disabled={loading}
          sx={{ py: 1.5, mt: 3, mb: 2 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Se connecter'}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </form>
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
        Vous n'avez pas encore de compte ?{' '}
        <Link href="/inscription" passHref>
          <Typography component="a" color="primary">
            Inscrivez-vous ici
          </Typography>
        </Link>
      </Typography>
    </Box>
  )
} 