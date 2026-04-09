import * as payslipService from "../services/payslipService.js";

export const createPayslip = async (req, res) => {
  try { res.status(201).json(await payslipService.createPayslip(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getPayslips = async (req, res) => {
  try { res.json(await payslipService.getPayslips()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getPayslip = async (req, res) => {
  try { res.json(await payslipService.getPayslipById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getPayslipsByEmployee = async (req, res) => {
  try { res.json(await payslipService.getPayslipsByEmployee(req.params.employeeId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getPayslipsByPeriod = async (req, res) => {
  try { res.json(await payslipService.getPayslipsByPeriod(req.params.periodId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updatePayslip = async (req, res) => {
  try { res.json(await payslipService.updatePayslip(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deletePayslip = async (req, res) => {
  try { await payslipService.deletePayslip(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};