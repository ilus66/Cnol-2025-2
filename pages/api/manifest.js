// API route pour servir le manifest.json avec le bon Content-Type
export default function handler(req, res) {
  // Définir les headers immédiatement
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  // Contenu du manifest en dur pour éviter les problèmes de lecture de fichier
  const manifest = {
    "name": "CNOL 2025",
    "short_name": "CNOL",
    "description": "Congrès National d'Optique Lunetterie 2025",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0d47a1",
    "theme_color": "#1976d2",
    "orientation": "portrait-primary",
    "icons": [
      {
        "src": "/logo-cnol.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/logo-cnol.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  };
  
  res.status(200).json(manifest);
} 