import * as auditLogService from "../services/auditLogService.js";

export const createLog = async (req, res) => {
  try { res.status(201).json(await auditLogService.createLog(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getLogs = async (req, res) => {
  try { res.json(await auditLogService.getLogs()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getLog = async (req, res) => {
  try { res.json(await auditLogService.getLogById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getLogsByCompany = async (req, res) => {
  try { res.json(await auditLogService.getLogsByCompany(req.params.companyId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const deleteLog = async (req, res) => {
  try { await auditLogService.deleteLog(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};