# 🔧 GUIDE DE MAINTENANCE - SYSTÈME DE BULLETINS PDF

## Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│              API REST (Express)                          │
│  POST /payslips/:id/generate-pdf                         │
│  POST /payslips/generate-pdfs                            │
│  GET  /payslips/pdf/download/:filename                   │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│         Controllers & Services                           │
│  payslipController.js  (routes HTTP)                     │
│  payslipPdfService.js  (logique PDF)                     │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│     Handlebars + Puppeteer (Génération PDF)              │
│  templates/payslip.hbs  (template HTML)                  │
│  Puppeteer (HTML → PDF)                                  │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│     Prisma (Base de données)                             │
│  Payslip, PayrollItem, PayslipContribution               │
└─────────────────────────────────────────────────────────┘
```

---

## Fichiers clés et leur rôle

| Fichier | Rôle | Responsable |
|---------|------|-------------|
| `services/payslipPdfService.js` | Génération PDF | Backend/DevOps |
| `templates/payslip.hbs` | Mise en forme | Design/Frontend |
| `controllers/payslipController.js` | Logique HTTP | Backend |
| `routes/payslipRoutes.js` | Routing | Backend |
| `services/payrollCalculationService.js` | Calcul salaires | Paie/Compta |
| `prisma/schema.prisma` | Structure données | DBA |

---

## Tâches courantes de maintenance

### 1. Modifier le layout du bulletin

**Fichier à modifier:** `templates/payslip.hbs`

```handlebars
<!-- Exemple: ajouter un logo -->
<img src="logo.png" alt="Logo" style="width: 50px">

<!-- Exemple: changer les couleurs -->
<style>
  .summary-value { color: #2196F3; } /* au lieu de #1976d2 */
</style>

<!-- Exemple: ajouter un champ -->
{{employee.cin}} <!-- affiche le CIN -->
```

**Helpers disponibles:**
- `{{formatDate date}}` - Format date
- `{{formatMoney amount}}` - Format monnaie
- `{{today}}` - Date actuelle
- `{{multiply a b}}` - Multiplication
- `{{ifEquals a b}}` - Condition égalité

### 2. Ajouter un nouveau champ au bulletin

**Étapes:**

1. **S'assurer que la donnée existe en BD:**
   ```javascript
   // Vérifier dans Prisma schema.prisma
   model Payslip {
     ...
     monNouveauChamp  String?
     ...
   }
   ```

2. **Ajouter au template:**
   ```handlebars
   <p><strong>Mon champ:</strong> {{payslip.monNouveauChamp}}</p>
   ```

3. **Passer la donnée du service:**
   ```javascript
   // payslipPdfService.js, fonction generatePayslipPdf()
   payslip: {
     ...
     monNouveauChamp: payslip.monNouveauChamp,
   }
   ```

### 3. Modifier un calcul de cotisation

**Fichier à modifier:** `services/payrollCalculationService.js`

```javascript
// Trouver la section "Cotisations salariales"

// Exemple: augmenter le taux CNSS
const cnssEmployee = getRate("CNSS_EMPLOYEE");
// Anciennement: 4.29%
// Modifier dans table StatutoryRate si changement global
```

### 4. Ajouter un nouvel impôt/cotisation

**Fichier à modifier:** `services/payrollCalculationService.js`

```javascript
// 1. Créer la ligne de cotisation
const maNouvelleCotisation = getRate("MA_NOUVELLE_COTISATION");

// 2. Calculer le montant
const montant = round2(grossSalary * maNouvelleCotisation.rate);

// 3. Ajouter au PayrollItem
payrollItemsData.push({
  ...
  itemType: "OTHER",
  code: "MA_NOUVELLE_COTISATION",
  label: "Ma nouvelle cotisation",
  amount: -montant,
  ...
});
```

### 5. Debugger une génération PDF qui échoue

```bash
# 1. Activer les logs
export DEBUG=puppeteer:*
node server.js

# 2. Vérifier que le template est valide
cat templates/payslip.hbs

# 3. Vérifier les données du bulletin
node test-payslip-pdf.js

# 4. Vérifier l'erreur Puppeteer
# Error: Protocol error ... → Chromium crash (RAM, OS resources)
# Solution: installer dépendances système

# Linux:
sudo apt-get install -y chromium-browser libnss3

# macOS:
brew install chromium
```

### 6. Optimiser la génération pour gros volumes

**Problème:** 100+ bulletins = lent

**Solutions:**

**Option 1: Queue asynchrone** (recommandé)
```javascript
// Installer Bull
npm install bull redis

// services/payslipPdfQueue.js
import Queue from "bull";

const pdfQueue = new Queue("payslip-pdf", {
  redis: { host: "localhost", port: 6379 }
});

pdfQueue.process(async (job) => {
  return await generatePayslipPdf(job.data.payslipId);
});

// API: ajouter à la queue
pdfQueue.add({ payslipId }, { delay: 1000 });
```

**Option 2: Batch processing**
```javascript
// Générer 10 par 10 pour éviter surcharge RAM
for (let i = 0; i < payslipIds.length; i += 10) {
  const batch = payslipIds.slice(i, i + 10);
  await generatePayslipsBatch(batch);
  // Attendre avant prochain batch
  await new Promise(r => setTimeout(r, 1000));
}
```

**Option 3: Worker threads**
```javascript
// Utiliser worker_threads pour traitement parallèle
import { Worker } from "worker_threads";
```

### 7. Ajouter une signature numérique au PDF

**Bibliothèque:** `pdfkit` (déjà installée)

```javascript
import PDFDocument from "pdfkit";

// Dans payslipPdfService.js
const doc = new PDFDocument();

// Ajouter signature
doc.text("Signé numériquement le: " + new Date().toISOString());

// Ou utiliser une image de signature
doc.image("signature.png", 100, 100, { width: 100 });

doc.pipe(fs.createWriteStream("bulletin.pdf"));
```

### 8. Envoyer un email avec le bulletin

**Installer Nodemailer:**
```bash
npm install nodemailer
```

**Code:**
```javascript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendPayslipEmail(payslipId, recipientEmail) {
  const result = await generatePayslipPdf(payslipId);
  
  await transporter.sendMail({
    from: "paie@company.com",
    to: recipientEmail,
    subject: "Votre bulletin de paie",
    text: "Veuillez trouver ci-joint votre bulletin de paie.",
    attachments: [{
      filename: result.filename,
      path: result.filepath
    }]
  });
}
```

---

## Monitoring et logs

### Activer les logs

```javascript
// payslipPdfService.js
if (process.env.DEBUG_PDF) {
  console.log("DEBUG: Génération PDF pour", payslipId);
  console.log("DEBUG: Données", data);
}
```

### Surveiller les fichiers PDF

```bash
# Voir taille des PDFs générés
du -sh generated-pdfs/payslips/

# Voir les PDFs les plus récents
ls -lt generated-pdfs/payslips/ | head -10

# Archiver les anciens PDFs
find generated-pdfs/payslips -mtime +90 -exec gzip {} \;
```

---

## Performance et scalabilité

| Métrique | Recommandation |
|----------|----------------|
| Temps/bulletin | < 5 sec (Puppeteer) |
| Mémoire/bulletin | ~50 MB |
| CPU | Multi-core recommandé |
| Disque | 1-2 MB par PDF |
| Concurrence | Max 5-10 simultanés |

### Optimisations possibles

1. **Cache des PDFs**
   ```javascript
   // Ne régénérer que si données changent
   const cacheKey = `payslip-${payslipId}-${hash}`;
   if (cache.exists(cacheKey)) return cache.get(cacheKey);
   ```

2. **Template pré-compilé**
   ```javascript
   // Compiler le template une fois
   const template = Handlebars.compile(source);
   // Réutiliser template
   ```

3. **Puppeteer pool**
   ```javascript
   // Réutiliser browser instances
   const pool = new GenericPool.Pool({
     create: () => puppeteer.launch(),
     destroy: (browser) => browser.close()
   });
   ```

---

## Checklist de déploiement

- [ ] Dossier `generated-pdfs/payslips` créé et accessible
- [ ] Dépendances Puppeteer/Chromium installées
- [ ] Template `payslip.hbs` en place
- [ ] Configuration taux dans `StatutoryRate`
- [ ] Configuration barème IR dans `TaxBracket`
- [ ] Variables d'environnement configurées
- [ ] Tests lancés avec succès
- [ ] Permissions fichiers correctes (755 sur dossiers, 644 sur fichiers)
- [ ] Logs configurés
- [ ] Backup automatique des PDFs en place

---

## Rollback rapide

Si un changement casse le système:

```bash
# 1. Identifier le problème
git log --oneline

# 2. Revenir à la version précédente
git revert <commit_id>

# 3. Redéployer
npm start

# 4. Analyser l'erreur sans urgence
```

---

## Contacts/Support

- **Développeur backend:** Paie PDF
- **DBA:** Configuration données
- **DevOps:** Infrastructure Chromium
- **Design:** Template Handlebars

---

**Dernière révision:** 2024
**Version du système:** 1.0
**Statut:** Maintenu et supporté
