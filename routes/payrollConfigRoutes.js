// routes/payrollConfigRoutes.js
import { Router } from "express";
import { requireAdmin, requireSuperAdmin } from "../middlewares/authenticate.js";
import { PrismaClient } from '@prisma/client';
import { monthlyHoursFromWeekly, STANDARD_WEEKLY_HOURS } from "../utils/payrollHours.js";

const prisma = new PrismaClient();
const router = Router();

// Route pour récupérer la configuration de l'entreprise connectée
router.get("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    console.log("GET /payroll-config - companyId:", companyId);
    
    let config = await prisma.payrollConfig.findUnique({
      where: { companyId },
      include: { company: { select: { id: true, name: true } } }
    });
    
    if (!config) {
      config = await prisma.payrollConfig.create({
        data: {
          companyId,
          regime: "MOROCCO_STANDARD",
          currency: "MAD",
          weeklyHours: STANDARD_WEEKLY_HOURS,
          monthlyHours: monthlyHoursFromWeekly(STANDARD_WEEKLY_HOURS),
          workingDaysPerMonth: 26,
          cnssEnabled: true,
          amoEnabled: true,
          irEnabled: true,
          cimrEnabled: false,
          defaultCnssDeclaredDays: 26
        },
        include: { company: { select: { id: true, name: true } } }
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error("Erreur GET /payroll-config:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour créer une configuration
router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    console.log("POST /payroll-config - companyId:", companyId);
    
    const config = await prisma.payrollConfig.create({
      data: { companyId, ...req.body },
      include: { company: { select: { id: true, name: true } } }
    });
    res.status(201).json(config);
  } catch (error) {
    console.error("Erreur POST /payroll-config:", error);
    res.status(400).json({ error: error.message });
  }
});

// Route pour mettre à jour la configuration
router.put("/", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    console.log("PUT /payroll-config - companyId:", companyId);
    
    const existing = await prisma.payrollConfig.findUnique({ 
      where: { companyId } 
    });
    
    if (!existing) {
      return res.status(404).json({ error: "Configuration non trouvée" });
    }
    
    const config = await prisma.payrollConfig.update({
      where: { id: existing.id },
      data: req.body,
      include: { company: { select: { id: true, name: true } } }
    });
    res.json(config);
  } catch (error) {
    console.error("Erreur PUT /payroll-config:", error);
    res.status(400).json({ error: error.message });
  }
});

// Route UPSERT
router.post("/upsert", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    console.log("UPSERT /payroll-config - companyId:", companyId);
    
    const config = await prisma.payrollConfig.upsert({
      where: { companyId },
      update: req.body,
      create: { companyId, ...req.body },
      include: { company: { select: { id: true, name: true } } }
    });
    res.json(config);
  } catch (error) {
    console.error("Erreur UPSERT /payroll-config:", error);
    res.status(400).json({ error: error.message });
  }
});

// Routes pour SUPER ADMIN - voir toutes les configs
router.get("/all", requireSuperAdmin, async (req, res) => {
  try {
    console.log("GET /payroll-config/all - Super Admin");
    
    const configs = await prisma.payrollConfig.findMany({
      include: { 
        company: { 
          select: { 
            id: true, 
            name: true, 
            status: true 
          } 
        } 
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(configs);
  } catch (error) {
    console.error("Erreur GET /payroll-config/all:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer une config par ID (super admin)
router.get("/:id", requireSuperAdmin, async (req, res) => {
  try {
    console.log("GET /payroll-config/:id - id:", req.params.id);
    
    const config = await prisma.payrollConfig.findUnique({
      where: { id: req.params.id },
      include: { company: { select: { id: true, name: true } } }
    });
    
    if (!config) {
      return res.status(404).json({ error: "Configuration non trouvée" });
    }
    res.json(config);
  } catch (error) {
    console.error("Erreur GET /payroll-config/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour modifier une config par ID (super admin)
router.put("/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("PUT /payroll-config/:id - id:", id);
    
    const config = await prisma.payrollConfig.update({
      where: { id },
      data: req.body,
      include: { company: { select: { id: true, name: true } } }
    });
    res.json(config);
  } catch (error) {
    console.error("Erreur PUT /payroll-config/:id:", error);
    res.status(400).json({ error: error.message });
  }
});

// Route pour supprimer une config (super admin)
router.delete("/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("DELETE /payroll-config/:id - id:", id);
    
    await prisma.payrollConfig.delete({ where: { id } });
    res.json({ message: "Configuration supprimée avec succès" });
  } catch (error) {
    console.error("Erreur DELETE /payroll-config/:id:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;