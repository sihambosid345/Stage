# 📋 CALCUL DU SALAIRE NET - EXPLICATION DÉTAILLÉE

Basé sur le bulletin de paie présenté, voici comment le système calcule le salaire net d'un employé.

---

## 📊 EXEMPLE DU BULLETIN

Voici un exemple basé sur votre bulletin :

```
BULLETIN DE PAIE
Nom : CELEBATAIRE
Prénom : -
Période : [DATE]
Fonction : -
Situation Familiale : CELEBATAIRE
Nombre d'enfants : 2

┌─ HEURS DE TRAVAIL ─────────────────────┐
│ Nombre : 221                           │
└────────────────────────────────────────┘

┌─ SALAIRE DE BASE ──────────────────────┐
│ Nombre : 26 jours                      │
│ Taux : 400.00 MAD/jour                 │
│ Montant : 10,400.00 MAD                │
└────────────────────────────────────────┘

┌─ GAINS (Partie Positive) ──────────────┐
│ Salaire de base : 10,400.00 MAD        │
│ Prime d'ancienneté : (vide)            │
│ Solde congé payé : (vide)              │
│ ─────────────────────────────           │
│ SALAIRE BRUT : 10,400.00 MAD           │
└────────────────────────────────────────┘

┌─ COTISATIONS (Partie Négative) ────────┐
│ CNSS (4.29%) : -257.40 MAD             │
│ AMO (2.26%) : -235.04 MAD              │
│ Indemnité de perte en emploi (0.19%) : │
│   -11.40 MAD                           │
│ Frais professionnels (20%) : -2,080.00 │
│ ─────────────────────────────           │
│ Total cotisations : -2,583.84 MAD      │
└────────────────────────────────────────┘

┌─ IMPÔT SUR LE REVENU (IR) ─────────────┐
│ Base imposable : 7,816.16 MAD          │
│ Impôt à 8% : -625.00 MAD               │
└────────────────────────────────────────┘

┌─ CHARGE DE FAMILLE ────────────────────┐
│ (Si applicable) : -                    │
└────────────────────────────────────────┘

┌─ SALAIRE NET ──────────────────────────┐
│ RÉSULTAT FINAL : 7,816.16 MAD          │
└────────────────────────────────────────┘
```

---

## 🧮 FORMULE PRINCIPALE

```
SALAIRE NET = Salaire Brut 
              - Cotisations Salariales
              - Impôt sur le Revenu (IR)
              - Avances/Retenues
```

### Détail Étape par Étape

#### **ÉTAPE 1 : Calculer le Salaire Brut**
```
Salaire Brut = Salaire de base + Primes + Allocations + Commissions

Exemple :
= 26 jours × 400 MAD/jour + 0
= 10,400.00 MAD
```

#### **ÉTAPE 2 : Identifier la Base pour Cotisations**
```
Les bases sont distinctes selon le type de cotisation :

Base CNSS = Éléments soumis à CNSS
         = 10,400 MAD
         
(Plafond CNSS = 6,000 MAD)
→ Base retenue = Min(10,400 ; 6,000) = 6,000 MAD

Base AMO = Éléments soumis à AMO
        = 10,400 MAD
        
Base imposable = Éléments soumis à IR - Frais professionnels
              = 10,400 - 2,080 (20% du net social)
              = 8,320 MAD
```

#### **ÉTAPE 3 : Calculer les Cotisations Salariales**
```
CNSS Salarié = Base CNSS × Taux CNSS
            = 6,000 × 4.29%
            = 257.40 MAD

AMO Salarié  = Base AMO × Taux AMO
            = 10,400 × 2.26%
            = 235.04 MAD

CIMR Salarié = Salaire Brut × Taux CIMR
            = 10,400 × 0.19%
            = 11.40 MAD

Total Cotisations = 257.40 + 235.04 + 11.40
                  = 503.84 MAD
```

#### **ÉTAPE 4 : Calculer l'Impôt sur le Revenu (IR)**
```
L'IR s'applique par TRANCHE selon le barème progressif :

Barème IR Mensuel (exemple) :
┌─────────────────────────────────────────┐
│ Revenus    │ Taux  │ Déduction          │
├─────────────────────────────────────────┤
│ 0 - 2,000  │ 0%    │ 0                  │
│ 2,001 - 5,000 │ 10% │ 200              │
│ 5,001 - 10,000 │ 20% │ 700             │
│ + 10,000   │ 30%   │ 1,700             │
└─────────────────────────────────────────┘

Base imposable = 8,320 MAD

Calcul IR = 8,320 × 20% - 700
          = 1,664 - 700
          = 964 MAD
```

#### **ÉTAPE 5 : Calculer le Salaire Net**
```
Salaire Net = Salaire Brut 
              - Cotisations Salariales
              - Impôt sur le Revenu
              - Avances/Retenues

Salaire Net = 10,400.00
            - 503.84
            - 964.00
            - 0
            = 8,932.16 MAD
```

---

## 🔐 RÈGLES IMPORTANTES

### 1. **Plafond CNSS**
Le taux CNSS ne s'applique que jusqu'à concurrence du plafond :
```
Plafond CNSS = 6,000 MAD (par défaut)

Si Salaire Brut > 6,000 MAD :
  → CNSS calculée sur 6,000 MAD uniquement
  → Le reste du salaire n'est pas soumis à CNSS
```

### 2. **AMO sans plafond**
```
L'AMO s'applique sur la totalité du salaire brut
Pas de plafond
```

### 3. **Frais Professionnels**
```
Frais = 20% du net social (après cotisations)
Plafonné à 2,500 MAD maximum

Exemple :
Net Social = Brut - Cotisations
           = 10,400 - 503.84
           = 9,896.16 MAD

Frais = 9,896.16 × 20% = 1,979.23 MAD ✓ (< 2,500)
```

### 4. **Impôt Progressif par Tranche**
L'IR ne s'applique que sur chaque tranche :
```
Exemple avec revenu de 8,000 MAD et barème :
0 - 2,000 :      2,000 × 0%  = 0
2,001 - 5,000 :  3,000 × 10% = 300
5,001 - 8,000 :  3,000 × 20% = 600
                           Sous-total = 900 MAD

IR final = 900 - Déduction(s applicable(s))
```

### 5. **Charge de Famille**
```
Déduction pour charge de famille = Nombre d'enfants × Montant déductible

Chaque enfant réduit l'IR calculé (montant selon réglementation)
```

---

## 📈 EXEMPLE COMPLET AVEC VARIATIONS

### Scénario 1 : Salaire bas (sans impôt)
```
Salaire Brut : 3,000 MAD
CNSS (3,000 × 4.29%) : -128.70 MAD
AMO (3,000 × 2.26%) : -67.80 MAD
Base imposable : 3,000 - 128.70 - 67.80 = 2,803.50 MAD
IR : 0 (en dessous du seuil non-imposable)
─────────────────────────
Salaire Net : 2,803.50 MAD
```

### Scénario 2 : Salaire moyen
```
Salaire Brut : 10,000 MAD
CNSS (6,000 × 4.29%) : -257.40 MAD (plafonné)
AMO (10,000 × 2.26%) : -226.00 MAD
Frais (-20% du net social) : -1,923.12 MAD
Base imposable : 10,000 - 257.40 - 226 - 1,923.12 = 7,593.48 MAD
IR calculé : -607.48 MAD
─────────────────────────
Salaire Net : 8,909.10 MAD
```

### Scénario 3 : Salaire élevé
```
Salaire Brut : 20,000 MAD
CNSS (6,000 × 4.29%) : -257.40 MAD (plafonné)
AMO (20,000 × 2.26%) : -452.00 MAD
Frais (-20% du net social) : -3,829.12 MAD
Base imposable : 20,000 - 257.40 - 452 - 3,829.12 = 15,461.48 MAD
IR calculé : -2,739.22 MAD
─────────────────────────
Salaire Net : 15,260.26 MAD
```

---

## 💡 CONFIGURATION DANS LA BASE DE DONNÉES

Les taux et barèmes sont stockés dans :

### Table `StatutoryRate`
```sql
INSERT INTO "StatutoryRate" (code, rate, effectiveFrom, isActive) VALUES
('CNSS_EMPLOYEE', 0.0429, '2024-01-01', true),
('AMO_EMPLOYEE', 0.0226, '2024-01-01', true),
('CNSS_EMPLOYER', 0.0829, '2024-01-01', true),
('AMO_EMPLOYER', 0.0826, '2024-01-01', true);
```

### Table `TaxBracket`
```sql
INSERT INTO "TaxBracket" (taxCode, annualFrom, annualTo, rate, deductionAmount) VALUES
('IR_SALAIRE', 0, 24000, 0, 0),
('IR_SALAIRE', 24001, 60000, 0.10, 2400),
('IR_SALAIRE', 60001, 120000, 0.20, 8400),
('IR_SALAIRE', 120001, NULL, 0.30, 20400);
```

---

## 🔧 INTÉGRATION API

Consultez [PAYSLIP_PDF_GUIDE.md](./PAYSLIP_PDF_GUIDE.md) pour:
- Les endpoints API
- Exemples de requêtes
- Configuration

---

## ✅ CHECKLIST DE VÉRIFICATION

Avant de générer les bulletins :

- [ ] Taux CNSS configurés dans `StatutoryRate`
- [ ] Barème IR configuré dans `TaxBracket`
- [ ] Période de paie créée
- [ ] Employés actifs avec contrats
- [ ] Salaires de base définis
- [ ] Dossier `generated-pdfs/payslips` existe
- [ ] Permissions utilisateur suffisantes

---

## 📞 Support

Pour plus d'informations :
- Voir [PAYSLIP_PDF_GUIDE.md](./PAYSLIP_PDF_GUIDE.md)
- Vérifier les logs: `node server.js`
- Tester: `node test-payslip-pdf.js`
