import * as departmentService from "../services/departmentService.js";

export const createDepartment = async (req, res) => {
  try {
    const department = await departmentService.createDepartment(req.body);
    res.status(201).json(department);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getDepartments();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDepartment = async (req, res) => {
  try {
    const department = await departmentService.getDepartmentById(String(req.params.id));
    res.json(department);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const updated = await departmentService.updateDepartment(String(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    await departmentService.deleteDepartment(String(req.params.id));
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};