import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRCodeScanner({ onScanSuccess, onScanError }) {
  const qrRegionId = 'html5qr-code-region';
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const qrCode = new Html5Qrcode(qrRegionId);
    html5QrCodeRef.current = qrCode;

    async function startScanner() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0 && isMounted) {
          // Préférer la caméra arrière sur mobile
          let cameraId = devices[0].id;
          
          // Chercher la caméra arrière si disponible
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('arrière') ||
            device.label.toLowerCase().includes('environment')
          );
          
          if (backCamera) {
            cameraId = backCamera.id;
          }
          
          await qrCode.start(
            cameraId,
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              // Configuration pour forcer la caméra arrière
              videoConstraints: {
                facingMode: { ideal: "environment" }
              }
            },
            (decodedText) => {
              if (isMounted) onScanSuccess(decodedText);
            },
            (errorMessage) => {
              if (isMounted && onScanError) onScanError(errorMessage);
            }
          );
        } else {
          console.error('Pas de caméra trouvée');
          if (onScanError) onScanError('Pas de caméra trouvée');
        }
      } catch (err) {
        console.error('Erreur au démarrage du scanner', err);
        if (onScanError) onScanError(err.toString());
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current.clear())
          .catch(() => {
            // ignore errors on stop
          });
      }
    };
  }, [onScanSuccess, onScanError]);

  return <div id={qrRegionId} style={{ width: '100%' }} />;
}
