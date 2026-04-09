import * as employeeService from "../services/employeeService.js";

export const createEmployee = async (req, res) => {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await employeeService.getEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const employee = await employeeService.getEmployeeById(String(req.params.id));
    res.json(employee);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const updated = await employeeService.updateEmployee(String(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    await employeeService.deleteEmployee(String(req.params.id));
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};