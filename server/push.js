const webpush = require('web-push');
const { db } = require('./db');

// VAPID keys for Lock Screen & Banner Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BP8ye2qHro41LkfXwX0Ldul7hU85AOlmf1gYTqMDFsEXPx74DiY0foQwlBGGmRpUxjQ94LgzUrS3bXjtxVq1i6Y';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '3TcsBGOTZXheeziV-jCEL5XuO1mpFGPxLB-xcKx_Xwg';
const VAPID_SUBJECT = 'mailto:admin@flatmanagement.app';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('✅ Web Push VAPID configured for Lock Screen & Banner Alerts');
} catch (err) {
  console.warn('⚠️ Web Push VAPID configuration error:', err.message);
}

// Send Web Push notification to mobile devices (Lock Screen, Notification Center, Banner)
async function sendPushNotification(target = { target_type: 'all' }, payload = {}) {
  try {
    let query = 'SELECT * FROM push_subscriptions WHERE 1=1';
    const params = [];

    if (target.target_type === 'member') {
      query += ' AND user_type = "member"';
      if (target.target_id) {
        query += ' AND user_id = ?';
        params.push(target.target_id);
      }
    } else if (target.target_type === 'admin') {
      query += ' AND user_type = "admin"';
      if (target.target_id) {
        query += ' AND user_id = ?';
        params.push(target.target_id);
      }
    }

    const subscriptions = db.prepare(query).all(...params);
    if (!subscriptions || subscriptions.length === 0) return 0;

    const pushPayload = JSON.stringify({
      title: payload.title || 'Flat Management Alert',
      body: payload.message || payload.body || 'You have a new update in the flat management system.',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: payload.tag || 'flat-alert-' + Date.now(),
      url: payload.url || '/',
      timestamp: Date.now()
    });

    const pushOptions = {
      urgency: 'high', // Delivers immediately on Lock Screen and triggers banner popup
      TTL: 86400 // 24 hours
    };

    let sentCount = 0;
    const deleteStmt = db.prepare('DELETE FROM push_subscriptions WHERE id = ?');

    await Promise.all(subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload, pushOptions);
        sentCount++;
      } catch (err) {
        // If subscription is expired or unsubscribed, remove from DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          deleteStmt.run(sub.id);
        } else {
          console.warn('Web push delivery warning:', err.statusCode, err.message);
        }
      }
    }));

    return sentCount;
  } catch (err) {
    console.error('sendPushNotification error:', err.message);
    return 0;
  }
}

module.exports = {
  VAPID_PUBLIC_KEY,
  sendPushNotification
};
