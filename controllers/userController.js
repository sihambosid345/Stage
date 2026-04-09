// ========== userController.js ==========
import * as userService from "../services/userService.js";

export const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};
export const getUsers = async (req, res) => {
  try { res.json(await userService.getUsers()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getUser = async (req, res) => {
  try { res.json(await userService.getUserById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateUser = async (req, res) => {
  try { res.json(await userService.updateUser(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteUser = async (req, res) => {
  try { await userService.deleteUser(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};