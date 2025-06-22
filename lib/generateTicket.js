import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

export async function generateTicket({
  nom,
  prenom,
  email,
  eventType,
  eventTitle,
  eventDate,
  reservationId,
  salle,
  intervenant
}) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([320, 540]); // Format vertical
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- AJOUT DU LOGO ---
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-cnol.png');
      const logoImageBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoImageBytes);
      const logoDims = logoImage.scale(0.12);
      page.drawImage(logoImage, { x: (320 - logoDims.width) / 2, y: 480, width: logoDims.width, height: logoDims.height });
    } catch (error) {
        console.error("Could not load local logo image, proceeding without it.", error);
    }
    

    // Titre et infos
    page.drawText(`Ticket ${eventType || 'Événement'}`, { x: 40, y: 440, size: 16, font: fontBold });
    page.drawText(eventTitle || 'Titre non disponible', { x: 40, y: 420, size: 12, font: fontBold });
    if (intervenant) {
        page.drawText(`Intervenant : ${intervenant}`, { x: 40, y: 405, size: 10, font: fontRegular });
    }
    const date = eventDate ? new Date(eventDate).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 'Date non disponible';
    page.drawText(date, { x: 40, y: 390, size: 10, font: fontRegular });
    if (salle) {
        page.drawText(`Salle : ${salle}`, { x: 40, y: 375, size: 10, font: fontBold });
    }

    // Infos participant
    page.drawText(`Nom : ${nom || ''}`, { x: 40, y: 345, size: 12, font: fontBold });
    page.drawText(`Prénom : ${prenom || ''}`, { x: 40, y: 330, size: 12, font: fontRegular });
    page.drawText(`Email : ${email || ''}`, { x: 40, y: 315, size: 10, font: fontRegular });

    // QR Code
    if (reservationId) {
        const qrCodeDataUrl = await QRCode.toDataURL(String(reservationId));
        const qrImageBytes = qrCodeDataUrl.split(',')[1];
        const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageBytes, 'base64'));
        page.drawImage(qrImage, { x: (320 - 140) / 2, y: 150, width: 140, height: 140 });
    }

    // Conditions
    const conditions = [
        "Ce ticket est personnel et non transférable.",
        "Il est obligatoire pour accéder à l'événement.",
        "À présenter à l'entrée sur votre téléphone."
    ];
    conditions.forEach((line, i) => {
        page.drawText(line, { x: 30, y: 80 - i * 15, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    });
    
    page.drawText('www.cnol.ma', { x: (320 - 60) / 2, y: 20, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Erreur lors de la génération du ticket PDF :', error);
    throw new Error('La génération du ticket a échoué.');
  }
}
