import * as itemService from "../services/payrollItemService.js";

export const createItem = async (req, res) => {
  try {
    console.log("📥 Contrôleur createItem:", JSON.stringify(req.body, null, 2));
    const result = await itemService.createItem(req.body);
    console.log("✅ PayrollItem créé:", result.id);
    res.status(201).json(result);
  } catch (error) {
    console.error("❌ Erreur création:", error);
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getItems = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";

    // SUPER_ADMIN : peut passer ?companyId= ou voir tous les items
    // Admin / User : limité à leur propre entreprise
    const companyId = isSuperAdmin
      ? (req.query.companyId || null)
      : (req.user?.companyId || null);

    const items = await itemService.getItems(companyId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getItem = async (req, res) => {
  try {
    const item = await itemService.getItemById(req.params.id);

    // Sécurité : non-superadmin ne peut voir que ses propres items
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin && item.companyId !== req.user?.companyId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    res.json(item);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getItemsByRun = async (req, res) => {
  try {
    const items = await itemService.getItemsByRun(req.params.runId);
    res.json(items);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getItemsByEmployee = async (req, res) => {
  try {
    const items = await itemService.getItemsByEmployee(req.params.employeeId);
    res.json(items);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const result = await itemService.updateItem(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    await itemService.deleteItem(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};