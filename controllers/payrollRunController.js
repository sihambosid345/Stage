import * as runService from "../services/payrollRunService.js";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createRun = async (req, res) => {
  try {
    const { companyId, payrollPeriodId, ...data } = req.body;

    console.log('📥 Création PayrollRun - Données reçues:', req.body);

    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';

    // Super Admin peut spécifier un companyId dans le body
    // Admin normal utilise toujours req.user.companyId
    let finalCompanyId = isSuperAdmin
      ? (companyId || req.user?.companyId)
      : req.user?.companyId;

    if (!finalCompanyId) {
      console.log('⚠️ companyId manquant, récupération depuis la période...');

      if (!payrollPeriodId) {
        return res.status(400).json({
          error: 'payrollPeriodId est requis quand companyId n\'est pas fourni'
        });
      }

      const period = await prisma.payrollPeriod.findUnique({
        where: { id: payrollPeriodId }
      });

      if (!period) {
        return res.status(404).json({ error: 'Période de paie introuvable' });
      }

      if (!period.companyId) {
        return res.status(400).json({
          error: 'Cette période n\'est pas associée à une entreprise'
        });
      }

      finalCompanyId = period.companyId;
      console.log('✅ CompanyId récupéré depuis la période:', finalCompanyId);
    }

    if (!finalCompanyId) {
      return res.status(400).json({
        error: 'Impossible de déterminer l\'entreprise. companyId requis.'
      });
    }

    const payload = {
      ...data,
      companyId: finalCompanyId,
      payrollPeriodId,
    };

    console.log('📦 Payload final:', payload);

    const result = await runService.createRun(payload);
    console.log('✅ PayrollRun créé avec succès:', result.id);

    res.status(201).json(result);

  } catch (error) {
    console.error('❌ Erreur création PayrollRun:', error);
    res.status(error.status || 400).json({
      error: error.message || 'Erreur lors de la création de l\'exécution'
    });
  }
};

export const getRuns = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';

    // SUPER_ADMIN : peut filtrer par ?companyId= ou voir tous les runs
    // Admin/User  : limité à leur propre entreprise
    const companyId = isSuperAdmin
      ? (req.query.companyId || null)
      : (req.user?.companyId || null);

    console.log('📋 Récupération PayrollRuns - isSuperAdmin:', isSuperAdmin, '- companyId:', companyId);

    const runs = await runService.getRuns(companyId);
    console.log('✅ PayrollRuns récupérés:', runs.length);
    res.json(runs);
  } catch (error) {
    console.error('❌ Erreur récupération PayrollRuns:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getRun = async (req, res) => {
  try {
    console.log('🔍 Récupération PayrollRun:', req.params.id);
    const run = await runService.getRunById(req.params.id);

    if (!run) {
      return res.status(404).json({ error: 'Exécution de paie introuvable' });
    }

    // Non-superadmin ne peut voir que les runs de son entreprise
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && run.companyId !== req.user?.companyId) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    console.log('✅ PayrollRun trouvé:', run.id);
    res.json(run);
  } catch (error) {
    console.error('❌ Erreur récupération PayrollRun:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getRunsByPeriod = async (req, res) => {
  try {
    const { periodId } = req.params;
    console.log('📅 Récupération PayrollRuns pour la période:', periodId);

    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return res.status(404).json({ error: 'Période de paie introuvable' });
    }

    const runs = await runService.getRunsByPeriod(periodId);
    console.log('✅ PayrollRuns trouvés:', runs.length);
    res.json(runs);
  } catch (error) {
    console.error('❌ Erreur récupération PayrollRuns par période:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateRun = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('📝 Mise à jour PayrollRun:', id, updateData);

    const existingRun = await runService.getRunById(id);
    if (!existingRun) {
      return res.status(404).json({ error: 'Exécution de paie introuvable' });
    }

    // Non-superadmin ne peut modifier que les runs de son entreprise
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && existingRun.companyId !== req.user?.companyId) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    if (updateData.payrollPeriodId && !updateData.companyId) {
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: updateData.payrollPeriodId }
      });

      if (period && period.companyId) {
        updateData.companyId = period.companyId;
        console.log('✅ CompanyId mis à jour depuis la nouvelle période:', period.companyId);
      }
    }

    const result = await runService.updateRun(id, updateData);
    console.log('✅ PayrollRun mis à jour:', result.id);

    res.json(result);
  } catch (error) {
    console.error('❌ Erreur mise à jour PayrollRun:', error);
    res.status(error.status || 400).json({
      error: error.message || 'Erreur lors de la mise à jour'
    });
  }
};

export const deleteRun = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Suppression PayrollRun:', id);

    const existingRun = await runService.getRunById(id);
    if (!existingRun) {
      return res.status(404).json({ error: 'Exécution de paie introuvable' });
    }

    // Non-superadmin ne peut supprimer que les runs de son entreprise
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && existingRun.companyId !== req.user?.companyId) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await runService.deleteRun(id);
    console.log('✅ PayrollRun supprimé:', id);

    res.json({ message: "Exécution de paie supprimée avec succès" });
  } catch (error) {
    console.error('❌ Erreur suppression PayrollRun:', error);
    res.status(error.status || 400).json({
      error: error.message || 'Erreur lors de la suppression'
    });
  }
};