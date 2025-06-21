import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material'
import toast, { Toaster } from 'react-hot-toast'

export default function ScanTicket() {
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastQr, setLastQr] = useState('')
  const [errorScan, setErrorScan] = useState('')

  useEffect(() => {
    if (!scanning) return
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: 250,
        // Configuration pour utiliser la caméra arrière sur mobile
        videoConstraints: {
          facingMode: { ideal: "environment" } // "environment" = caméra arrière
        }
      },
      false
    )
    scanner.render(
      async (decodedText) => {
        setScanning(false)
        scanner.clear()
        handleScan(decodedText)
      },
      (error) => {
        // ignorer les erreurs de scan
      }
    )
    return () => scanner.clear().catch(() => {})
  }, [scanning])

  const handleScan = async (decodedText) => {
    setLoading(true);
    setLastResult(null);
    setLastQr(decodedText);
    setErrorScan('');
    try {
      // On suppose que le QR code contient l'id de réservation (numérique ou string)
      const res = await fetch('/api/scan-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: decodedText })
      })
      const json = await res.json()
      if (res.ok) {
        setLastResult(json)
        playSound('success')
        toast.success(json.scanned ? 'Déjà scanné' : 'Ticket validé !')
      } else {
        setErrorScan(json.message || 'Erreur inconnue')
        playSound('error')
        toast.error(json.message || 'Erreur lors du scan')
      }
    } catch (err) {
      setErrorScan('Erreur réseau')
      playSound('error')
      toast.error('Erreur réseau')
    }
    setLoading(false)
  }

  const playSound = (type) => {
    let audio
    switch (type) {
      case 'success':
        audio = new Audio('/success.mp3')
        break
      case 'error':
        audio = new Audio('/error.mp3')
        break
      case 'warning':
        audio = new Audio('/warning.mp3')
        break
      default:
        return
    }
    audio.play().catch(() => {})
  }

  return (
    <Box sx={{ p: 3 }}>
      <Toaster />
      <Typography variant="h5" gutterBottom>Scan des tickets atelier/masterclass</Typography>
      {loading && <CircularProgress />}
      {!scanning && !loading && (
        <Button variant="contained" onClick={() => setScanning(true)}>
          Lancer le scanner
        </Button>
      )}
      <div id="reader" style={{ marginTop: 20 }} />
      {lastResult && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6">Dernier ticket scanné :</Typography>
          <Typography><b>Nom :</b> {lastResult.nom} {lastResult.prenom}</Typography>
          <Typography><b>Email :</b> {lastResult.email}</Typography>
          <Typography><b>Type :</b> {lastResult.eventType}</Typography>
          <Typography><b>Atelier/Masterclass :</b> {lastResult.eventTitle}</Typography>
          <Typography><b>Date :</b> {new Date(lastResult.eventDate).toLocaleString()}</Typography>
          <Typography><b>Statut :</b> {lastResult.scanned ? 'Déjà scanné' : 'Validé (nouveau scan)'}</Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { setScanning(true); setLastResult(null); setErrorScan(''); setLastQr(''); }}>Scanner un autre ticket</Button>
        </Paper>
      )}
      {errorScan && (
        <Paper sx={{ mt: 3, p: 2, background: '#ffeaea' }}>
          <Typography color="error">Erreur : {errorScan}</Typography>
          <Typography variant="body2">QR brut : <code>{lastQr}</code></Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { setScanning(true); setLastResult(null); setErrorScan(''); setLastQr(''); }}>Réessayer</Button>
        </Paper>
      )}
    </Box>
  )
} 