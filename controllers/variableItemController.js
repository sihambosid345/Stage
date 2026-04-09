import * as variableService from "../services/variableItemService.js";

export const createVariableItem = async (req, res) => {
  try { res.status(201).json(await variableService.createVariableItem(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getVariableItems = async (req, res) => {
  try { res.json(await variableService.getVariableItems()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getVariableItem = async (req, res) => {
  try { res.json(await variableService.getVariableItemById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getVariableItemsByEmployee = async (req, res) => {
  try { res.json(await variableService.getVariableItemsByEmployee(req.params.employeeId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateVariableItem = async (req, res) => {
  try { res.json(await variableService.updateVariableItem(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteVariableItem = async (req, res) => {
  try { await variableService.deleteVariableItem(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};