import * as runService from "../services/payrollRunService.js";

export const createRun = async (req, res) => {
  try { res.status(201).json(await runService.createRun(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getRuns = async (req, res) => {
  try { res.json(await runService.getRuns()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getRun = async (req, res) => {
  try { res.json(await runService.getRunById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getRunsByPeriod = async (req, res) => {
  try { res.json(await runService.getRunsByPeriod(req.params.periodId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateRun = async (req, res) => {
  try { res.json(await runService.updateRun(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteRun = async (req, res) => {
  try { await runService.deleteRun(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};