const express = require('express');
const router = express.Router();
const { db, logAudit, createNotification } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// Get notifications for current authenticated user
router.get('/', (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isMember = user.user_type === 'member';
    const userId = Number(user.user_id);

    let notifications = [];
    if (isMember) {
      notifications = db.prepare(`
        SELECT n.*, 
               CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read
        FROM notifications n
        LEFT JOIN notification_reads nr 
          ON nr.notification_id = n.id AND nr.user_type = 'member' AND nr.user_id = ?
        WHERE n.target_type = 'all' 
           OR (n.target_type = 'member' AND (n.target_id = ? OR n.target_id IS NULL))
        ORDER BY n.created_at DESC
        LIMIT 40
      `).all(userId, userId);
    } else {
      // Admin sees notifications targeted to 'all', 'admin', or all recent notices
      notifications = db.prepare(`
        SELECT n.*, 
               CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read
        FROM notifications n
        LEFT JOIN notification_reads nr 
          ON nr.notification_id = n.id AND nr.user_type = 'admin' AND nr.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 40
      `).all(userId);
    }

    // Parse data JSON if present
    const parsed = notifications.map(n => {
      let data = null;
      if (n.data) {
        try { data = JSON.parse(n.data); } catch (e) {}
      }
      return { ...n, data };
    });

    const unreadCount = parsed.filter(n => n.is_read === 0).length;

    res.json({
      notifications: parsed,
      unread_count: unreadCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark one or all notifications as read
router.post('/mark-read', (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { notification_id, all = false } = req.body;
    const userType = user.user_type || 'member';
    const userId = Number(user.user_id);

    if (all) {
      // Find all unread notifications for this user and insert into notification_reads
      const unreadNotifs = db.prepare(`
        SELECT n.id 
        FROM notifications n
        LEFT JOIN notification_reads nr 
          ON nr.notification_id = n.id AND nr.user_type = ? AND nr.user_id = ?
        WHERE nr.id IS NULL
      `).all(userType, userId);

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO notification_reads (notification_id, user_type, user_id)
        VALUES (?, ?, ?)
      `);

      for (const n of unreadNotifs) {
        insertStmt.run(n.id, userType, userId);
      }

      return res.json({ success: true, marked: unreadNotifs.length });
    } else if (notification_id) {
      db.prepare(`
        INSERT OR IGNORE INTO notification_reads (notification_id, user_type, user_id)
        VALUES (?, ?, ?)
      `).run(Number(notification_id), userType, userId);

      return res.json({ success: true, marked: 1 });
    }

    res.status(400).json({ error: 'Provide notification_id or all: true' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin sends custom broadcast or targeted notification
router.post('/send', requireAdmin, (req, res) => {
  try {
    const { title, message, category = 'announcement', target_type = 'all', target_id = null } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const actorName = req.user?.name || 'Admin';
    const notifId = createNotification({
      title: title.trim(),
      message: message.trim(),
      category,
      target_type,
      target_id: target_id ? Number(target_id) : null,
      actor_name: actorName,
      data: { sent_by: req.user?.username }
    });

    logAudit('admin', req.user?.user_id, actorName, 'Sent Notification', `Title: "${title}", Target: ${target_type}`);

    res.json({ success: true, id: notifId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin deletes a notification
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare(`DELETE FROM notification_reads WHERE notification_id = ?`).run(id);
    db.prepare(`DELETE FROM notifications WHERE id = ?`).run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get VAPID Public Key for client push subscription
router.get('/vapid-public-key', (req, res) => {
  const { VAPID_PUBLIC_KEY } = require('../push');
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Save client device Push Subscription (Enables Lock Screen, Notification Center & Top Banner)
router.post('/subscribe-push', (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Valid push subscription object is required' });
    }

    const userType = user.user_type || 'member';
    const userId = Number(user.user_id);
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;
    const userAgent = req.headers['user-agent'] || '';

    db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (user_type, user_id, endpoint, p256dh, auth, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userType, userId, endpoint, p256dh, auth, userAgent);

    res.json({ success: true, message: 'Device subscribed for Lock Screen and Banner notifications' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unsubscribe device push
router.post('/unsubscribe-push', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(endpoint);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Instant Test Push to user's device (Triggers Lock Screen / Top Banner)
router.post('/test-push', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sendPushNotification } = require('../push');
    const sent = await sendPushNotification(
      { target_type: user.user_type, target_id: Number(user.user_id) },
      {
        title: '🔔 Lock Screen & Banner Alert Active',
        body: 'Flat Management notifications are now delivering to your lock screen, notification center & banner!',
        tag: 'flat-test-' + Date.now(),
        url: '/'
      }
    );

    res.json({ success: true, delivered_devices: sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
