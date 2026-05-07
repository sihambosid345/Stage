import * as runService from "../services/payrollRunService.js";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createRun = async (req, res) => {
  try {
    const { companyId, payrollPeriodId, ...data } = req.body;
    
    console.log('📥 Création PayrollRun - Données reçues:', req.body);
    
    // ✅ Si companyId n'est pas fourni ou null, le récupérer depuis la période
    let finalCompanyId = companyId;
    
    if (!finalCompanyId) {
      console.log('⚠️ companyId manquant ou null, récupération depuis la période...');
      
      if (!payrollPeriodId) {
        return res.status(400).json({ 
          error: 'payrollPeriodId est requis quand companyId n\'est pas fourni' 
        });
      }
      
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: payrollPeriodId }
      });
      
      if (!period) {
        return res.status(404).json({ 
          error: 'Période de paie introuvable' 
        });
      }
      
      if (!period.companyId) {
        return res.status(400).json({ 
          error: 'Cette période n\'est pas associée à une entreprise' 
        });
      }
      
      finalCompanyId = period.companyId;
      console.log('✅ CompanyId récupéré depuis la période:', finalCompanyId);
    }
    
    // ✅ Vérification finale
    if (!finalCompanyId) {
      return res.status(400).json({ 
        error: 'Impossible de déterminer l\'entreprise. companyId requis.' 
      });
    }
    
    // ✅ Créer avec le bon companyId
    const payload = {
      ...data,
      companyId: finalCompanyId,  // Garanti non-null
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
    console.log('📋 Récupération de tous les PayrollRuns');
    const runs = await runService.getRuns();
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
    
    // ✅ Vérifier que la période existe
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
    
    // ✅ Vérifier que le PayrollRun existe
    const existingRun = await runService.getRunById(id);
    if (!existingRun) {
      return res.status(404).json({ error: 'Exécution de paie introuvable' });
    }
    
    // ✅ Si on change de période, vérifier le companyId
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
    
    // ✅ Vérifier que le PayrollRun existe
    const existingRun = await runService.getRunById(id);
    if (!existingRun) {
      return res.status(404).json({ error: 'Exécution de paie introuvable' });
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