import * as contractService from "../services/employeeContractService.js";

const resolveCompanyId = (req) => {
  if (req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN') {
    if (!req.body?.companyId) {
      throw { status: 400, message: 'Le super admin doit sélectionner une entreprise.' };
    }
    return req.body.companyId;
  }
  return req.user.companyId;
};

export const createContract = async (req, res) => {
  try {
    res.status(201).json(await contractService.createContract({ ...req.body, companyId: resolveCompanyId(req) }));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};
const getCompanyContext = (req) =>
  req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN'
    ? undefined
    : req.user.companyId;

export const getContracts = async (req, res) => {
  try { res.json(await contractService.getContracts(getCompanyContext(req))); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getContract = async (req, res) => {
  try { res.json(await contractService.getContractById(req.params.id, getCompanyContext(req))); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getContractsByEmployee = async (req, res) => {
  try { res.json(await contractService.getContractsByEmployee(req.params.employeeId, getCompanyContext(req))); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const updateContract = async (req, res) => {
  try { res.json(await contractService.updateContract(req.params.id, req.body, getCompanyContext(req))); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteContract = async (req, res) => {
  try { await contractService.deleteContract(req.params.id, getCompanyContext(req)); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};