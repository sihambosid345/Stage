// ========== userController.js ==========
import * as userService from "../services/userService.js";
import * as licenseService from "../services/licenseService.js";

export const createUser = async (req, res) => {
  try {
    const data = { ...req.body };
    const isSuperAdmin = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN';

    // Seul le super admin peut créer un utilisateur ADMIN
    if (data.role === 'ADMIN' && !isSuperAdmin) {
      const err = new Error('Seul le super admin peut créer un administrateur d\'entreprise.');
      err.status = 403;
      throw err;
    }

    if (isSuperAdmin) {
      if (data.role !== 'SUPER_ADMIN' && !data.companyId) {
        const err = new Error('Le super admin doit sélectionner une entreprise pour ce nouvel utilisateur.');
        err.status = 400;
        throw err;
      }
      if (data.role === 'SUPER_ADMIN') {
        data.companyId = null;
      }
    } else {
      data.companyId = req.user.companyId;
    }

    if (data.role !== 'SUPER_ADMIN') {
      await licenseService.enforceLicenseLimit(data.companyId, "users");
    }

    const user = await userService.createUser(data);
    res.status(201).json(user);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};
export const getUsers = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    res.json(await userService.getUsers(companyId));
  }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getUser = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    res.json(await userService.getUserById(req.params.id, companyId));
  }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateUser = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    res.json(await userService.updateUser(req.params.id, req.body, companyId));
  }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteUser = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    await userService.deleteUser(req.params.id, companyId);
    res.json({ message: "Deleted" });
  }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};