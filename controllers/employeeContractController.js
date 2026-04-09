import * as contractService from "../services/employeeContractService.js";

export const createContract = async (req, res) => {
  try { res.status(201).json(await contractService.createContract(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getContracts = async (req, res) => {
  try { res.json(await contractService.getContracts()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getContract = async (req, res) => {
  try { res.json(await contractService.getContractById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getContractsByEmployee = async (req, res) => {
  try { res.json(await contractService.getContractsByEmployee(req.params.employeeId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateContract = async (req, res) => {
  try { res.json(await contractService.updateContract(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteContract = async (req, res) => {
  try { await contractService.deleteContract(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};