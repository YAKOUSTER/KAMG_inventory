#!/usr/bin/env node
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
console.log('Ajoutez ces variables dans l’environnement du serveur (systemd ou .env) :\n')
console.log(`KAMG_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`KAMG_VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log('KAMG_VAPID_SUBJECT=mailto:votre-email@example.com')
