const webpush = require('web-push');

// Générer les clés VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('🔑 Clés VAPID générées :');
console.log('');
console.log('📋 Clé publique (à mettre dans .env.local et vercel.json) :');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('');
console.log('🔒 Clé privée (à mettre dans .env.local et vercel.json) :');
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('');
console.log('📧 Email de contact (optionnel) :');
console.log('mailto:contact@cnol.ma');
console.log('');
console.log('💡 Instructions :');
console.log('1. Copiez ces clés dans votre fichier .env.local');
console.log('2. Ajoutez-les aussi dans les variables d\'environnement Vercel');
console.log('3. Redémarrez votre serveur de développement');
console.log('4. Testez les notifications push dans votre application'); 