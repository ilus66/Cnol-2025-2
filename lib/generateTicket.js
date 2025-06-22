import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

const logoUrl = 'https://cnol-badge.vercel.app/logo-cnol.png';

const fetchImageAsBytes = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
};

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
        const page = pdfDoc.addPage([595, 280]); // Format paysage pour un ticket

        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Couleur principale
        const mainColor = rgb(0.82, 0.08, 0.12); // Rouge CNOL

        // Arrière-plan simple
        page.drawRectangle({
            x: 0,
            y: 0,
            width: 595,
            height: 280,
            color: rgb(0.98, 0.98, 0.98),
        });
        
        // Bandeau supérieur
        page.drawRectangle({
            x: 0,
            y: 230,
            width: 595,
            height: 50,
            color: mainColor,
        });
        page.drawText('CNOL 2025 - TICKET', {
            x: 30,
            y: 245,
            font: font,
            size: 20,
            color: rgb(1, 1, 1),
        });

        // Informations sur l'événement
        page.drawText(eventType || 'Événement', {
            x: 30,
            y: 190,
            font: font,
            size: 24,
            color: mainColor,
        });
        page.drawText(eventTitle || 'Titre non disponible', {
            x: 30,
            y: 160,
            font: regularFont,
            size: 18,
        });

        // Date, Salle et Intervenant
        const date = eventDate ? new Date(eventDate) : null;
        const formattedDate = date ? date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : 'Date non disponible';
        
        page.drawText(`Date: ${formattedDate}`, { x: 30, y: 130, font: regularFont, size: 12 });
        page.drawText(`Salle: ${salle || 'N/A'}`, { x: 30, y: 110, font: regularFont, size: 12 });
        page.drawText(`Intervenant: ${intervenant || 'N/A'}`, { x: 30, y: 90, font: regularFont, size: 12 });

        // Informations du participant
        page.drawText(`${prenom || ''} ${nom || ''}`, {
            x: 30,
            y: 60,
            font: font,
            size: 16,
        });
        page.drawText(email || '', {
            x: 30,
            y: 40,
            font: regularFont,
            size: 11,
            color: rgb(0.3, 0.3, 0.3),
        });
        
        // Génération du QR Code
        const qrCodeString = `CNOL2025-TICKET:${reservationId || 'N/A'}`;
        const qrCodeImage = await QRCode.toDataURL(qrCodeString, { errorCorrectionLevel: 'H' });
        const qrCodePng = await pdfDoc.embedPng(qrCodeImage);

        page.drawImage(qrCodePng, {
            x: 430,
            y: 60,
            width: 120,
            height: 120,
        });
        
        page.drawText(`ID: ${reservationId || 'N/A'}`, {
            x: 430,
            y: 40,
            font: regularFont,
            size: 8,
        });

        return await pdfDoc.save();

    } catch (error) {
        console.error('Erreur lors de la génération du ticket PDF :', error);
        throw new Error('La génération du ticket a échoué.');
    }
} 