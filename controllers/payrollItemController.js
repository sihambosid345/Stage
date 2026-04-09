import * as itemService from "../services/payrollItemService.js";

export const createItem = async (req, res) => {
  try { res.status(201).json(await itemService.createItem(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getItems = async (req, res) => {
  try { res.json(await itemService.getItems()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getItem = async (req, res) => {
  try { res.json(await itemService.getItemById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getItemsByRun = async (req, res) => {
  try { res.json(await itemService.getItemsByRun(req.params.runId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getItemsByEmployee = async (req, res) => {
  try { res.json(await itemService.getItemsByEmployee(req.params.employeeId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateItem = async (req, res) => {
  try { res.json(await itemService.updateItem(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteItem = async (req, res) => {
  try { await itemService.deleteItem(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};