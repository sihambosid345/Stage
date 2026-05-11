import * as service from "../services/employeeRecurringItemService.js";

const isSuperAdmin = (req) => req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";

const resolveCompanyIdForWrite = (req) => {
  if (isSuperAdmin(req)) {
    if (!req.body?.companyId) throw { status: 400, message: "companyId is required for Super Admin" };
    return req.body.companyId;
  }
  return req.user.companyId;
};

const companyFilter = (req) => (isSuperAdmin(req) ? undefined : req.user.companyId);

export const createRecurringItem = async (req, res) => {
  try {
    const companyId = resolveCompanyIdForWrite(req);
    const createdById = req.user?.id;
    const item = await service.createRecurringItem({ ...req.body, companyId, createdById });
    res.status(201).json(item);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getRecurringItems = async (req, res) => {
  try {
    res.json(await service.getRecurringItems(companyFilter(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRecurringItem = async (req, res) => {
  try {
    res.json(await service.getRecurringItemById(req.params.id, companyFilter(req)));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getRecurringItemsByEmployee = async (req, res) => {
  try {
    res.json(await service.getRecurringItemsByEmployee(req.params.employeeId, companyFilter(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRecurringItem = async (req, res) => {
  try {
    res.json(await service.updateRecurringItem(req.params.id, req.body, companyFilter(req)));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteRecurringItem = async (req, res) => {
  try {
    await service.deleteRecurringItem(req.params.id, companyFilter(req));
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

