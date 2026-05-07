import * as periodService from "../services/payrollPeriodService.js";

export const createPeriod = async (req, res) => {
  try { res.status(201).json(await periodService.createPeriod(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getPeriods = async (req, res) => {
  try { res.json(await periodService.getPeriods()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getPeriod = async (req, res) => {
  try { res.json(await periodService.getPeriodById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updatePeriod = async (req, res) => {
  try { res.json(await periodService.updatePeriod(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deletePeriod = async (req, res) => {
  try { await periodService.deletePeriod(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};