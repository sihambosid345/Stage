// ========== userController.js ==========
import * as userService from "../services/userService.js";
import * as licenseService from "../services/licenseService.js";
import * as auditLogService from "../services/auditLogService.js";

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
      if (!data.companyId) {
        const err = new Error('Le super admin doit sélectionner une entreprise pour ce nouvel utilisateur.');
        err.status = 400;
        throw err;
      }
    } else {
      data.companyId = req.user.companyId;
    }

    if (data.role !== 'SUPER_ADMIN') {
      await licenseService.enforceLicenseLimit(data.companyId, "users");
    }

    const user = await userService.createUser(data);
    await auditLogService.logAction({
      req,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: user.id,
      companyId: user.companyId,
      description: `Utilisateur ${user.email} créé`,
      metadata: { role: user.role }
    });
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
    const updated = await userService.updateUser(req.params.id, req.body, companyId);
    await auditLogService.logAction({
      req,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: updated.id,
      companyId: updated.companyId,
      description: `Utilisateur ${updated.email} modifié`,
      metadata: { changes: req.body }
    });
    res.json(updated);
  }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteUser = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    const targetUser = await userService.getUserById(req.params.id, companyId);
    await userService.deleteUser(req.params.id, companyId);
    await auditLogService.logAction({
      req,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: req.params.id,
      companyId: targetUser.companyId || companyId,
      description: `Utilisateur ${targetUser.email} supprimé`,
      metadata: { targetUserId: req.params.id }
    });
    res.json({ message: "Deleted" });
  }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};