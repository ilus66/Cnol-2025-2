import React, { useState, useRef } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
} from '@mui/material';
import { Notifications } from '@mui/icons-material';

export default function NotificationDropdown({ notifications, onMarkAllRead, onNotificationClick }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const unreadCount = notifications.filter(n => !n.lu).length;
  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <Box>
      <IconButton color="inherit" onClick={handleOpen} size="large">
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 340, maxHeight: 400, p: 0 },
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={() => { onMarkAllRead(); handleClose(); }}>Tout marquer comme lu</Button>
          )}
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {notifications.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Aucune notification reçue.
            </Typography>
          )}
          {notifications.map((notif) => (
            <MenuItem
              key={notif.id}
              onClick={() => {
                handleClose();
                if (notif.url) onNotificationClick?.(notif);
              }}
              sx={{ alignItems: 'flex-start', bgcolor: notif.lu ? 'inherit' : 'rgba(25,118,210,0.08)' }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: notif.lu ? 'grey.300' : 'primary.main' }}>
                  <Notifications fontSize="small" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={<Typography fontWeight={notif.lu ? 'normal' : 'bold'}>{notif.title}</Typography>}
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">{notif.message}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(notif.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </Typography>
                    {notif.url && (
                      <><br /><Typography variant="caption" color="primary.main" sx={{ textDecoration: 'underline' }}>Voir plus</Typography></>
                    )}
                  </>
                }
              />
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </Box>
  );
} 