import { clientOperations } from '../src/database.js';

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const { search } = req.query;
        let clients;
        
        if (search) {
          const searchTerm = `%${search}%`;
          clients = clientOperations.search.all(searchTerm, searchTerm);
        } else {
          clients = clientOperations.getAll.all();
        }
        
        res.status(200).json(clients);
        break;

      case 'POST':
        const { name, phone } = req.body;
        
        if (!name || !phone) {
          return res.status(400).json({ error: 'Name and phone are required' });
        }

        try {
          const result = clientOperations.add.run(name, phone);
          const newClient = clientOperations.getById.get(result.lastInsertRowid);
          res.status(201).json(newClient);
        } catch (error) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ error: 'Phone number already exists' });
          } else {
            throw error;
          }
        }
        break;

      case 'PUT':
        const { id } = req.query;
        const { name: updateName, phone: updatePhone } = req.body;
        
        if (!id || !updateName || !updatePhone) {
          return res.status(400).json({ error: 'ID, name and phone are required' });
        }

        try {
          clientOperations.update.run(updateName, updatePhone, id);
          const updatedClient = clientOperations.getById.get(id);
          res.status(200).json(updatedClient);
        } catch (error) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ error: 'Phone number already exists' });
          } else {
            throw error;
          }
        }
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        
        if (!deleteId) {
          return res.status(400).json({ error: 'ID is required' });
        }

        clientOperations.delete.run(deleteId);
        res.status(200).json({ message: 'Client deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}