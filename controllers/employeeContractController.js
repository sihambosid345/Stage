import * as contractService from "../services/employeeContractService.js";
import * as pdfService from "../services/contractPdfService.js";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Résout le companyId selon le rôle de l'utilisateur.
 * - Super Admin : doit fournir companyId dans le body
 * - Autres      : utilise le companyId du token
 */
const resolveCompanyId = (req) => {
  const isSuperAdmin = req.user.isSuperAdmin || req.user.role === "SUPER_ADMIN";

  if (isSuperAdmin) {
    if (!req.body?.companyId) {
      throw { status: 400, message: "Le super admin doit sélectionner une entreprise." };
    }
    return req.body.companyId;
  }
  return req.user.companyId;
};

/**
 * Retourne undefined pour le super admin (pas de filtre entreprise),
 * le companyId de l'utilisateur connecté pour les autres.
 */
const getCompanyContext = (req) => {
  const isSuperAdmin = req.user.isSuperAdmin || req.user.role === "SUPER_ADMIN";
  return isSuperAdmin ? undefined : req.user.companyId;
};

// ─── CRUD contrats ────────────────────────────────────────────────────────────

export const createContract = async (req, res) => {
  try {
    const contract = await contractService.createContract({
      ...req.body,
      companyId: resolveCompanyId(req),
    });
    res.status(201).json(contract);
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getContracts = async (req, res) => {
  try {
    const contracts = await contractService.getContracts(getCompanyContext(req));
    res.json(contracts);
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getContract = async (req, res) => {
  try {
    const contract = await contractService.getContractById(
      req.params.id,
      getCompanyContext(req)
    );
    res.json(contract);
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getContractsByEmployee = async (req, res) => {
  try {
    const contracts = await contractService.getContractsByEmployee(
      req.params.employeeId,
      getCompanyContext(req)
    );
    res.json(contracts);
  } catch (error) {
    console.error('Get contracts by employee error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateContract = async (req, res) => {
  try {
    const updated = await contractService.updateContract(
      req.params.id,
      req.body,
      getCompanyContext(req)
    );
    res.json(updated);
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteContract = async (req, res) => {
  try {
    await contractService.deleteContract(req.params.id, getCompanyContext(req));
    res.json({ message: "Contrat supprimé avec succès." });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(error.status || 400).json({ error: error.message });
  }
};

// ─── Génération PDF via Puppeteer + template HBS selon type ───────────────────

/**
 * POST /contracts/:id/generate-pdf
 * Génère un PDF pour le contrat donné selon son type (CDI, CDD, STAGE, INTERIM, FREELANCE)
 * et retourne le chemin du fichier.
 */
export const generateContractPdf = async (req, res) => {
  try {
    const companyContext = getCompanyContext(req);
    
    // Vérifier que le contrat existe et l'utilisateur a le droit d'y accéder
    const contract = await contractService.getContractById(req.params.id, companyContext);
    
    if (!contract) {
      return res.status(404).json({ error: "Contrat non trouvé" });
    }

    console.log(`📄 Génération du PDF pour le contrat ${req.params.id} (Type: ${contract.contractType})...`);
    
    // Appel au service PDF qui va automatiquement sélectionner le bon template selon contractType
    const pdf = await pdfService.generateContractPdf(req.params.id);
    
    console.log(`✅ PDF généré avec succès: ${pdf.filename}`);

    res.json({
      success: true,
      message: "PDF généré avec succès.",
      filename: pdf.filename,
      path: pdf.relativePath,
      contractType: contract.contractType, // Optionnel: retourner le type pour info
    });
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    res.status(error.status || 500).json({ 
      success: false,
      error: error.message || "Erreur lors de la génération du PDF" 
    });
  }
};

/**
 * GET /contracts/pdf/:filename
 * Télécharge un PDF déjà généré.
 */
export const downloadContractPdf = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Sécurité: éviter les attaques path traversal
    const safeName = filename.replace(/\.\./g, '').replace(/\//g, '');
    
    const filepath = await pdfService.getContractPdf(safeName);
    
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Content-Type", "application/pdf");
    res.download(filepath, safeName, (err) => {
      if (err) {
        console.error('Erreur téléchargement:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Erreur lors du téléchargement" });
        }
      }
    });
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

/**
 * POST /contrat/generate
 * Route alternative : génère un PDF à partir de données passées en body (sans BDD).
 * Utilisé pour les tests ou la génération manuelle.
 * 
 * Body attendu: {
 *   contract: { id, type, status, startDate, endDate, baseSalary, ... },
 *   employee: { firstName, lastName, cin, email, phone, ... },
 *   department: { name },
 *   position: { title },
 *   company: { name, address, city, phone, email }
 * }
 */
export const generateContractFromData = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Le body de la requête est vide." });
    }
    
    // Vérifier que le type de contrat est présent
    if (!req.body.contract?.type) {
      return res.status(400).json({ error: "Le type de contrat est requis." });
    }
    
    console.log(`📄 Génération manuelle du contrat (Type: ${req.body.contract.type})...`);
    
    // Appel direct au service PDF avec les données fournies
    // Note: Cette méthode nécessite une adaptation du pdfService pour accepter des données directes
    const pdf = await pdfService.generateContractPdfFromData(req.body);
    
    console.log(`✅ PDF généré: ${pdf.filename}`);
    
    res.json({
      success: true,
      message: "PDF généré avec succès.",
      filename: pdf.filename,
    });
  } catch (error) {
    console.error('Alternative PDF generation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || "Erreur lors de la génération du contrat." 
    });
  }
};