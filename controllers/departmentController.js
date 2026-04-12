import * as departmentService from "../services/departmentService.js";

export const createDepartment = async (req, res) => {
  try {
    const data = { ...req.body, companyId: req.user.companyId };
    res.status(201).json(await departmentService.createDepartment(data));
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getDepartments = async (req, res) => {
  try { res.json(await departmentService.getDepartments(req.user.companyId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getDepartment = async (req, res) => {
  try { res.json(await departmentService.getDepartmentById(req.params.id, req.user.companyId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateDepartment = async (req, res) => {
  try { res.json(await departmentService.updateDepartment(req.params.id, req.body, req.user.companyId)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteDepartment = async (req, res) => {
  try { await departmentService.deleteDepartment(req.params.id, req.user.companyId); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};