import {
  Box,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
  CircularProgress
} from '@mui/material'
<Dialog open={!!openListMasterclassId} onClose={() => setOpenListMasterclassId(null)} maxWidth="md" fullWidth>
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
            <Typography>
              <b>Statut :</b>
              <span style={{ color: resa.statut === 'confirmé' ? 'green' : 'orange', fontWeight: 'bold', marginLeft: 4 }}>
                {resa.statut}
              </span>
            </Typography>
            <Typography><b>Scanné :</b> {resa.scanned ? '✓' : '✗'}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
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
          </Stack>
        </ListItem>
      ))}
    </List>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenListMasterclassId(null)}>Fermer</Button>
  </DialogActions>
</Dialog>
