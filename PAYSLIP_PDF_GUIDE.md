# Système de Génération de Bulletin de Paie (PDF)

## Vue d'ensemble

Ce système génère automatiquement des bulletins de paie au format PDF en utilisant:
- **Calcul du salaire**: Service `payrollCalculationService.js`
- **Template**: `templates/payslip.hbs` (Handlebars)
- **Génération PDF**: `services/payslipPdfService.js` (Puppeteer)

## Formule de Calcul du Salaire Net

```
Salaire Net = Salaire Brut 
              - Cotisations Salariales (CNSS, AMO, CIMR)
              - Impôt sur le Revenu (IR)
              - Avances et Retenues
```

### Détail des éléments

| Élément | Formule | Notes |
|---------|---------|-------|
| **Salaire Brut** | Somme des gains | Gains = salaire de base + primes + commissions + allocations |
| **Base CNSS** | Min(éléments cnssApplicable, plafond) | Plafonné à 6000 MAD par défaut |
| **Base AMO** | Somme des éléments amoApplicable | Non plafonné |
| **Base Imposable** | Éléments taxable - Frais professionnels | Frais = 20% du net social (max 2500 MAD) |
| **IR** | Appliqué par tranche du barème | Barème dynamique depuis `TaxBracket` |
| **CNSS Salarié** | Base CNSS × taux CNSS | ~4.29% |
| **AMO Salarié** | Base AMO × taux AMO | ~2.26% |
| **CIMR Salarié** | Salaire Brut × taux CIMR | Optionnel |

## Endpoints API

### 1. Générer le PDF pour un bulletin

**POST** `/api/payslips/:id/generate-pdf`

```bash
curl -X POST http://localhost:3000/api/payslips/uuid-du-bulletin/generate-pdf \
  -H "Authorization: Bearer token"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Bulletin PDF généré avec succès",
  "data": {
    "filename": "bulletin-EMP001-2024-01-1234567890.pdf",
    "relativePath": "/payslips/pdf/bulletin-EMP001-2024-01-1234567890.pdf",
    "payslipId": "uuid-du-bulletin",
    "employeeCode": "EMP001",
    "period": "2024-01"
  }
}
```

### 2. Générer les PDFs en masse

**POST** `/api/payslips/generate-pdfs`

Option A: Par liste de bulletins
```bash
curl -X POST http://localhost:3000/api/payslips/generate-pdfs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "payslipIds": ["id1", "id2", "id3"]
  }'
```

Option B: Par période de paie
```bash
curl -X POST http://localhost:3000/api/payslips/generate-pdfs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "payrollPeriodId": "uuid-de-la-periode"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "message": "3 bulletin(s) généré(s)",
  "data": {
    "results": [
      { "filename": "...", "payslipId": "..." },
      { "filename": "...", "payslipId": "..." },
      { "filename": "...", "payslipId": "..." }
    ],
    "errors": []
  }
}
```

### 3. Télécharger un PDF

**GET** `/api/payslips/pdf/download/:filename`

```bash
curl -X GET http://localhost:3000/api/payslips/pdf/download/bulletin-EMP001-2024-01-1234567890.pdf \
  -H "Authorization: Bearer token" \
  -o bulletin.pdf
```

## Contenu du Bulletin PDF

Le bulletin affiche:

### En-tête
- Informations de l'entreprise
- Numéro du bulletin
- Période de paie
- Date de génération

### Informations Employé
- Nom, prénom, matricule
- N° de sécurité sociale
- Fonction
- Type de contrat
- Situation familiale

### Détail des Éléments de Paie

**1. GAINS (Heures, Salaire de base, Allocations)**
- Salaire de base
- Primes d'ancienneté
- Allocations de transport, logement, etc.
- Indemnités et commissions
- **Sous-total: Salaire Brut**

**2. COTISATIONS SALARIALES**
- CNSS Salarié (4.29%)
- AMO Salarié (2.26%)
- CIMR Salarié (optionnel)
- **Sous-total des cotisations**

**3. IMPÔTS**
- Impôt sur le Revenu (IR) - basé sur le barème progressif

**4. AVANCES ET RETENUES**
- Avances sur salaire
- Retenues diverses
- Charges de famille

**5. RÉSUMÉ**
- Salaire Brut
- Total Cotisations & Impôts
- **Salaire Net Imposable**

**6. DÉTAIL DES COTISATIONS PATRONALES**
| Cotisation | Base | Taux | Salarié | Employeur |
|-----------|------|------|---------|-----------|
| CNSS | 6000 | 4.29% | 257.40 | 257.40 |
| AMO | 10400 | 2.26% | 235.04 | 235.04 |
| CIMR | 10400 | 0.19% | 11.40 | - |

## Configuration

### Taux (de la base de données)

Les taux sont chargés dynamiquement depuis la table `StatutoryRate`:

```javascript
{
  code: "CNSS_EMPLOYEE",
  rate: 0.0429,
  ceilingAmount: 6000,
  effectiveFrom: "2024-01-01",
  effectiveTo: null,
  isActive: true
}
```

### Barème IR (de la base de données)

Le barème IR est chargé depuis `TaxBracket` (montants annuels → convertis en mensuel):

```javascript
{
  taxCode: "IR_SALAIRE",
  annualFrom: 0,
  annualTo: 24000,
  rate: 0,
  deductionAmount: 0
}
```

## Exemple d'utilisation complete

### 1. Créer une période de paie
```bash
POST /api/payroll-periods
{
  "year": 2024,
  "month": 1,
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "type": "MONTHLY"
}
```

### 2. Calculer les salaires
```bash
POST /api/payroll-runs
{
  "payrollPeriodId": "...",
  "companyId": "...",
  "status": "DRAFT"
}
→ POST /api/payroll-runs/{runId}/calculate
```

### 3. Générer les bulletins PDF
```bash
POST /api/payslips/generate-pdfs
{
  "payrollPeriodId": "..."
}
```

### 4. Accéder au PDF
```bash
GET /api/payslips/pdf/download/{filename}
```

## Arborescence des fichiers

```
Stage/
├── services/
│   ├── payrollCalculationService.js   # Calcul des salaires
│   ├── payslipService.js              # CRUD des bulletins
│   └── payslipPdfService.js           # Génération PDF ← NOUVEAU
├── controllers/
│   └── payslipController.js           # API endpoints
├── routes/
│   └── payslipRoutes.js               # Routes API
├── templates/
│   └── payslip.hbs                    # Template Handlebars ← NOUVEAU
└── generated-pdfs/
    └── payslips/                      # Dossier de sortie des PDFs
```

## Dépendances requises

```json
{
  "puppeteer": "^21.0.0",
  "handlebars": "^4.7.0",
  "express": "^4.18.0",
  "prisma": "^5.0.0"
}
```

Vérifiez avec:
```bash
npm list puppeteer handlebars
```

## Sécurité

- Seuls les utilisateurs ayant accès à l'entreprise peuvent générer ses bulletins
- Les SUPER_ADMIN peuvent accéder à tous les bulletins
- Les chemins de fichiers sont sécurisés (pas de path traversal)
- Les PDFs sont générés dans un dossier isolé

## Limitations et Optimisations

- **Génération PDF**: Peut être lente pour de gros volumes (>100 bulletins)
- **Solution**: Implémenter une queue de jobs asynchrones (Bull, Bee-Queue)
- **Stockage**: Les PDFs sont générés à la demande, pas pré-générés
- **Cache**: Implémenter un cache pour éviter les régénérations

## Troubleshooting

### Erreur: "Puppeteer launch failed"
```
Solution: Installer les dépendances système Chromium
Ubuntu/Debian: sudo apt-get install libnss3 libatk1.0-0 libatk-bridge2.0-0 libxkbcommon0
```

### Erreur: "Template not found"
```
Solution: Vérifier le chemin absolu du template dans payslipPdfService.js
```

### PDF vide ou mal formaté
```
Solution: Vérifier les données du template Handlebars
- Utiliser console.log(data) pour debugger
- Vérifier les chemins Handlebars: {{payslip.grossSalary}}
```
