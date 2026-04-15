import * as attendanceService from "../services/attendanceService.js";

const getCompanyContext = (req) =>
  req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN'
    ? undefined
    : req.user.companyId;

const resolveCompanyId = (req) => {
  if (req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN') {
    if (!req.body?.companyId) {
      throw { status: 400, message: 'Le super admin doit sélectionner une entreprise.' };
    }
    return req.body.companyId;
  }
  return req.user.companyId;
};

export const createAttendance = async (req, res) => {
  try {
    res.status(201).json(await attendanceService.createAttendance({ ...req.body, companyId: resolveCompanyId(req) }));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getAttendances = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    res.json(await attendanceService.getAttendances(companyId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    res.json(await attendanceService.getAttendanceById(req.params.id, companyId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getAttendanceByEmployee = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    res.json(await attendanceService.getAttendanceByEmployee(req.params.employeeId, companyId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    res.json(await attendanceService.updateAttendance(req.params.id, req.body, companyId));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    await attendanceService.deleteAttendance(req.params.id, companyId);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};