import * as positionService from "../services/positionService.js";

export const createPosition = async (req, res) => {
  try {
    const position = await positionService.createPosition(req.body);
    res.status(201).json(position);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getPositions = async (req, res) => {
  try {
    // ✅ Filtrer selon l'entreprise de l'utilisateur connecté
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    
    let positions;
    if (isSuperAdmin) {
      // Super Admin voit tout
      positions = await positionService.getPositions();
    } else {
      // Utilisateur normal voit uniquement les postes de son entreprise
      positions = await positionService.getPositionsByCompany(companyId);
    }
    
    res.json(positions);
  } catch (error) {
    console.error('Error getting positions:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les postes par département
export const getPositionsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    console.log('📋 Fetching positions for department:', departmentId);
    
    // ✅ Vérifier que l'utilisateur a accès à ce département
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    
    let positions;
    if (isSuperAdmin) {
      positions = await positionService.getPositionsByDepartment(departmentId);
    } else {
      positions = await positionService.getPositionsByDepartmentAndCompany(departmentId, companyId);
    }
    
    console.log(`✅ Found ${positions.length} positions`);
    res.json(positions);
  } catch (error) {
    console.error('Error getting positions by department:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPosition = async (req, res) => {
  try {
    const position = await positionService.getPositionById(String(req.params.id));
    
    // ✅ Vérifier que l'utilisateur a accès à ce poste
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    
    if (!isSuperAdmin && position.companyId !== companyId) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    res.json(position);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updatePosition = async (req, res) => {
  try {
    // ✅ Vérifier que l'utilisateur a accès à ce poste
    const existingPosition = await positionService.getPositionById(String(req.params.id));
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    
    if (!isSuperAdmin && existingPosition.companyId !== companyId) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    const updated = await positionService.updatePosition(String(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deletePosition = async (req, res) => {
  try {
    // ✅ Vérifier que l'utilisateur a accès à ce poste
    const existingPosition = await positionService.getPositionById(String(req.params.id));
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    
    if (!isSuperAdmin && existingPosition.companyId !== companyId) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    await positionService.deletePosition(String(req.params.id));
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};