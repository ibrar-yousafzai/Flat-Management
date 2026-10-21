const express = require('express');
const router = express.Router();
const { db, logAudit, createNotification } = require('../db');

// Get all rooms with current occupants and per-person rent
router.get('/', (req, res) => {
  try {
    const rooms = db.prepare(`SELECT * FROM rooms ORDER BY id ASC`).all();
    
    const enrichedRooms = rooms.map(room => {
      const occupants = db.prepare(`
        SELECT id, unique_id, name, email, whatsapp, join_date, status
        FROM members 
        WHERE room_id = ? AND status = 'Active' AND type = 'Inside'
        ORDER BY name ASC
      `).all(room.id);

      const occupantCount = occupants.length;
      const rentPerPerson = occupantCount > 0 ? Math.round((room.base_rent / occupantCount) * 100) / 100 : room.base_rent;

      return {
        ...room,
        occupants,
        occupant_count: occupantCount,
        rent_per_person: rentPerPerson
      };
    });

    res.json(enrichedRooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new room
router.post('/', (req, res) => {
  try {
    const { name, base_rent = 0, description = '', actor_name = 'Admin' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const info = db.prepare(`
      INSERT INTO rooms (name, base_rent, description)
      VALUES (?, ?, ?)
    `).run(name.trim(), Number(base_rent), description.trim());

    logAudit('admin', null, actor_name, 'Created Room', `Created ${name} with fixed rent Rs. ${base_rent}`);

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update room (rent or details)
// Future-proofing: Editing rent or details only affects future calculations. Past bill_splits already store fixed values.
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, base_rent, description, effective_month, actor_name = 'Admin' } = req.body;

    const currentRoom = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(id);
    if (!currentRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Save previous snapshot in room_history if effective_month is specified
    if (effective_month) {
      const currentOccupants = db.prepare(`SELECT id FROM members WHERE room_id = ? AND status = 'Active'`).all(id);
      db.prepare(`
        INSERT OR REPLACE INTO room_history (room_id, month, rent, assigned_members)
        VALUES (?, ?, ?, ?)
      `).run(id, effective_month, currentRoom.base_rent, JSON.stringify(currentOccupants.map(o => o.id)));
    }

    db.prepare(`
      UPDATE rooms 
      SET name = COALESCE(?, name),
          base_rent = COALESCE(?, base_rent),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      base_rent !== undefined ? Number(base_rent) : null,
      description !== undefined ? description.trim() : null,
      id
    );

    logAudit('admin', null, actor_name, 'Updated Room', `Updated ${currentRoom.name}: Rent set to Rs. ${base_rent || currentRoom.base_rent}`);

    createNotification({
      title: `Room Rent Updated: ${name || currentRoom.name}`,
      message: `Fixed room rent updated to Rs. ${Number(base_rent !== undefined ? base_rent : currentRoom.base_rent).toLocaleString()} / month.`,
      category: 'rent',
      target_type: 'all',
      actor_name: actor_name || req.user?.name || 'Admin',
      data: { room_id: id, base_rent: base_rent !== undefined ? base_rent : currentRoom.base_rent }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const room = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Set members in this room to have no room
    db.prepare(`UPDATE members SET room_id = NULL WHERE room_id = ?`).run(id);
    db.prepare(`DELETE FROM rooms WHERE id = ?`).run(id);

    logAudit('admin', null, req.body.actor_name || 'Admin', 'Deleted Room', `Deleted room ${room.name}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
