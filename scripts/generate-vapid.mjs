#!/usr/bin/env node
import { ensureVapidKeys, vapidFilePath } from '../server/push.js'

const keys = ensureVapidKeys()
console.log(`Clés enregistrées dans ${vapidFilePath()}`)
console.log(`KAMG_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log('La clé privée n’est pas affichée : elle reste dans data/vapid.env (hors git).')
