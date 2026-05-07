import * as itemService from "../services/payrollItemService.js";

export const createItem = async (req, res) => {
  try { 
    console.log('📥 Contrôleur createItem:', JSON.stringify(req.body, null, 2));
    const result = await itemService.createItem(req.body); 
    console.log('✅ PayrollItem créé:', result.id);
    res.status(201).json(result); 
  } catch (error) { 
    console.error('❌ Erreur création:', error);
    res.status(error.status || 400).json({ error: error.message }); 
  }
};

export const getItems = async (req, res) => {
  try { 
    const items = await itemService.getItems(); 
    res.json(items); 
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
};

export const getItem = async (req, res) => {
  try { 
    const item = await itemService.getItemById(req.params.id); 
    res.json(item); 
  } catch (error) { 
    res.status(error.status || 500).json({ error: error.message }); 
  }
};

export const getItemsByRun = async (req, res) => {
  try { 
    const items = await itemService.getItemsByRun(req.params.runId); 
    res.json(items); 
  } catch (error) { 
    res.status(error.status || 500).json({ error: error.message }); 
  }
};

export const getItemsByEmployee = async (req, res) => {
  try { 
    const items = await itemService.getItemsByEmployee(req.params.employeeId); 
    res.json(items); 
  } catch (error) { 
    res.status(error.status || 500).json({ error: error.message }); 
  }
};

export const updateItem = async (req, res) => {
  try { 
    const result = await itemService.updateItem(req.params.id, req.body); 
    res.json(result); 
  } catch (error) { 
    res.status(error.status || 400).json({ error: error.message }); 
  }
};

export const deleteItem = async (req, res) => {
  try { 
    await itemService.deleteItem(req.params.id); 
    res.json({ message: "Deleted" }); 
  } catch (error) { 
    res.status(error.status || 400).json({ error: error.message }); 
  }
};