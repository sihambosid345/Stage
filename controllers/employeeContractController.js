import * as contractService from "../services/employeeContractService.js";

export const createContract = async (req, res) => {
  try { res.status(201).json(await contractService.createContract({ ...req.body, companyId: req.user.companyId })); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getContracts = async (req, res) => {
  try { res.json(await contractService.getContracts(req.user.companyId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getContract = async (req, res) => {
  try { res.json(await contractService.getContractById(req.params.id, req.user.companyId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getContractsByEmployee = async (req, res) => {
  try { res.json(await contractService.getContractsByEmployee(req.params.employeeId, req.user.companyId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const updateContract = async (req, res) => {
  try { res.json(await contractService.updateContract(req.params.id, req.body, req.user.companyId)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteContract = async (req, res) => {
  try { await contractService.deleteContract(req.params.id, req.user.companyId); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};