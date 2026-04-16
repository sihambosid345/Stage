import * as attendanceService from "../services/attendanceService.js";

export const createAttendance = async (req, res) => {
  try { res.status(201).json(await attendanceService.createAttendance({ ...req.body, companyId: req.user.companyId })); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getAttendances = async (req, res) => {
  try { res.json(await attendanceService.getAttendances(req.user.companyId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getAttendance = async (req, res) => {
  try { res.json(await attendanceService.getAttendanceById(req.params.id, req.user.companyId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getAttendanceByEmployee = async (req, res) => {
  try { res.json(await attendanceService.getAttendanceByEmployee(req.params.employeeId, req.user.companyId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const updateAttendance = async (req, res) => {
  try { res.json(await attendanceService.updateAttendance(req.params.id, req.body, req.user.companyId)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteAttendance = async (req, res) => {
  try { await attendanceService.deleteAttendance(req.params.id, req.user.companyId); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};