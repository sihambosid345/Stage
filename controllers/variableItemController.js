import * as variableService from "../services/variableItemService.js";

const isSuperAdmin = (req) => req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";

const companyFilter = (req) => (isSuperAdmin(req) ? undefined : req.user.companyId);

export const createVariableItem = async (req, res) => {
  try { 
    const companyId = companyFilter(req);
    const createdById = req.user?.id;
    const result = await variableService.createVariableItem({ ...req.body, companyId, createdById });
    res.status(201).json(result); 
  }
  catch (error) { 
    res.status(error.status || 400).json({ error: error.message }); 
  }
};

export const getVariableItems = async (req, res) => {
  try { 
    const items = await variableService.getVariableItems(companyFilter(req));
    res.json(items); 
  }
  catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
};

export const getVariableItem = async (req, res) => {
  try { 
    const item = await variableService.getVariableItemById(req.params.id, companyFilter(req));
    res.json(item); 
  }
  catch (error) { 
    res.status(error.status || 500).json({ error: error.message }); 
  }
};

export const getVariableItemsByEmployee = async (req, res) => {
  try { 
    const items = await variableService.getVariableItemsByEmployee(req.params.employeeId, companyFilter(req));
    res.json(items); 
  }
  catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
};

export const updateVariableItem = async (req, res) => {
  try { 
    const updated = await variableService.updateVariableItem(req.params.id, req.body, companyFilter(req));
    res.json(updated); 
  }
  catch (error) { 
    res.status(error.status || 400).json({ error: error.message }); 
  }
};

export const deleteVariableItem = async (req, res) => {
  try { 
    await variableService.deleteVariableItem(req.params.id, companyFilter(req));
    res.json({ message: "Deleted" }); 
  }
  catch (error) { 
    res.status(error.status || 400).json({ error: error.message }); 
  }
};