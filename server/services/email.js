const nodemailer = require('nodemailer');
const { db } = require('../db');

function getEmailTransporter() {
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key LIKE 'smtp_%'`).all();
  const conf = {};
  for (const r of rows) conf[r.key] = r.value;

  if (!conf.smtp_host || !conf.smtp_user || !conf.smtp_pass) {
    return null;
  }

  const port = parseInt(conf.smtp_port, 10) || 587;
  const isSecure = conf.smtp_secure === 'true' || port === 465;

  return {
    transporter: nodemailer.createTransport({
      host: conf.smtp_host,
      port: port,
      secure: isSecure,
      auth: {
        user: conf.smtp_user,
        pass: conf.smtp_pass
      },
      tls: {
        rejectUnauthorized: false
      }
    }),
    from: conf.smtp_from || conf.smtp_user
  };
}

// Send Test Email
async function sendTestEmail(recipientEmail) {
  const emailClient = getEmailTransporter();
  if (!emailClient) {
    throw new Error('SMTP is not fully configured. Please provide SMTP Host, User and App Password in Settings.');
  }

  const mailOptions = {
    from: emailClient.from,
    to: recipientEmail,
    subject: '✅ SMTP Email Test - Connected Successfully',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 30px auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background: #ecfdf5; color: #059669; font-size: 24px;">✓</div>
          <h2 style="margin: 12px 0 4px 0; color: #0f172a; font-size: 20px;">SMTP Test Successful</h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Your email configuration is working and ready to send member invoices.</p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          Sent from Flat Management System
        </div>
      </div>
    `
  };

  return emailClient.transporter.sendMail(mailOptions);
}

// Send Formatted Monthly Invoice Email - Clean, Simple, and Readable
async function sendInvoiceEmail(member, invoiceData) {
  const emailClient = getEmailTransporter();
  if (!emailClient) {
    throw new Error('SMTP not configured. Super Admin must set SMTP credentials in Settings.');
  }

  if (!member.email) {
    throw new Error(`Member ${member.name} has no email address configured.`);
  }

  const settings = invoiceData.settings || {};
  const currency = settings.currency_symbol || 'Rs.';

  // Categorize specific bills for clear itemized summary
  let rentShare = 0;
  let elecShare = 0;
  let wifiShare = 0;
  let cookShare = 0;
  const otherItems = [];

  if (invoiceData.bills && invoiceData.bills.length > 0) {
    for (const b of invoiceData.bills) {
      const titleLower = (b.title || '').toLowerCase();
      const catLower = (b.category || '').toLowerCase();
      if (titleLower.includes('rent') || catLower === 'rent') {
        rentShare += b.amount;
      } else if (titleLower.includes('elec') || titleLower.includes('bijli')) {
        elecShare += b.amount;
      } else if (titleLower.includes('wifi') || titleLower.includes('net') || titleLower.includes('internet')) {
        wifiShare += b.amount;
      } else if (titleLower.includes('cook') || titleLower.includes('khansama') || titleLower.includes('maid')) {
        cookShare += b.amount;
      } else {
        otherItems.push(b);
      }
    }
  }

  // Format month name (e.g. October 2026)
  const [yearStr, monthStr] = (invoiceData.month || '').split('-');
  const monthObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const monthName = isNaN(monthObj.getTime()) ? invoiceData.month : monthObj.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Build clean breakdown rows
  const breakdownRows = [];

  if (rentShare > 0 || member.type === 'Inside') {
    breakdownRows.push({
      label: 'Room Rent',
      sub: member.room_name ? `Room: ${member.room_name}` : '',
      amount: rentShare
    });
  }

  if (elecShare > 0) {
    breakdownRows.push({ label: 'Electricity Bill', sub: 'Utility share', amount: elecShare });
  }

  if (wifiShare > 0) {
    breakdownRows.push({ label: 'WiFi Internet', sub: 'Monthly connection', amount: wifiShare });
  }

  if (cookShare > 0) {
    breakdownRows.push({ label: 'Cook Salary', sub: 'Monthly service', amount: cookShare });
  }

  for (const item of otherItems) {
    breakdownRows.push({ label: item.title, sub: item.category || 'Other expense', amount: item.amount });
  }

  if (invoiceData.priorArrears !== 0) {
    breakdownRows.push({
      label: 'Previous Dues (Arrears)',
      sub: 'Carried forward from past months',
      amount: invoiceData.priorArrears,
      highlight: true
    });
  }

  const breakdownHtml = breakdownRows.map(r => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
        <span style="font-weight: 600; color: #1e293b; font-size: 13.5px;">${r.label}</span>
        ${r.sub ? `<span style="display: block; font-size: 11px; color: #64748b; margin-top: 2px;">${r.sub}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle; font-weight: ${r.highlight ? '700' : '600'}; font-size: 13.5px; color: ${r.highlight ? '#b45309' : '#0f172a'}; font-family: monospace;">
        ${currency} ${Number(r.amount).toLocaleString()}
      </td>
    </tr>
  `).join('');

  const totalPayable = invoiceData.netMonthBillsBalance;

  // Clean, modern, distraction-free HTML email
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px 10px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- HEADER -->
        <div style="padding: 24px 28px; background: #0f172a; color: #ffffff;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8;">
            ${settings.flat_name || 'Flat Management'} &bull; Monthly Bill
          </div>
          <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">
            ${monthName} Statement
          </h1>
        </div>

        <div style="padding: 28px;">
          <!-- GREETING -->
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.5;">
            Hi <strong>${member.name}</strong>,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
            Here is your monthly flat bill breakdown for <strong>${monthName}</strong>. 
            <span style="color: #dc2626; font-weight: 600;">Please pay this as soon as possible.</span>
          </p>

          <!-- TOTAL AMOUNT HERO CARD -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">
              Total Amount Due
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace;">
              ${currency} ${Number(totalPayable).toLocaleString()}
            </div>
            <div style="font-size: 11.5px; color: #dc2626; font-weight: 600; margin-top: 4px;">
              Due as soon as possible
            </div>
          </div>

          <!-- BREAKDOWN LIST -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px;">
              Bill Breakdown
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              ${breakdownHtml}
              <tr>
                <td style="padding: 12px 0 0 0; font-weight: 700; color: #0f172a; font-size: 14px;">Total Payable:</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-weight: 800; color: #0f172a; font-size: 16px; font-family: monospace;">
                  ${currency} ${Number(totalPayable).toLocaleString()}
                </td>
              </tr>
            </table>
          </div>

          <!-- PAYMENT DETAILS (Clean & Direct) -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 16px 18px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 10px;">
              Payment Accounts
            </div>
            <div style="font-size: 12.5px; line-height: 1.8; color: #1e293b;">
              ${settings.bank_name ? `<div>&bull; <strong>${settings.bank_name}</strong>: <span style="font-family: monospace; font-weight: 700;">${settings.account_number}</span> (${settings.account_title})</div>` : ''}
              ${settings.jazzcash_number ? `<div>&bull; <strong>JazzCash</strong>: <span style="font-family: monospace; font-weight: 700;">${settings.jazzcash_number}</span> (${settings.jazzcash_title})</div>` : ''}
              ${settings.easypaisa_number ? `<div>&bull; <strong>Easypaisa</strong>: <span style="font-family: monospace; font-weight: 700;">${settings.easypaisa_number}</span> (${settings.easypaisa_title})</div>` : ''}
            </div>
          </div>

          <!-- MEMBER ID & INSTRUCTION -->
          <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
            After making payment, please upload your receipt in your member portal using ID: <strong style="color: #0f172a;">${member.unique_id}</strong>.
          </p>
        </div>

        <!-- FOOTER -->
        <div style="border-top: 1px solid #f1f5f9; padding: 16px 28px; background: #fafafa; text-align: center; font-size: 11px; color: #94a3b8;">
          Sent by ${settings.flat_name || 'Flat Management System'}. Questions? Please contact the admin.
        </div>

      </div>

    </body>
    </html>
  `;

  return emailClient.transporter.sendMail({
    from: emailClient.from,
    to: member.email,
    subject: `Flat Bill (${monthName}) - ${member.name} | ${currency} ${Number(totalPayable).toLocaleString()} Due`,
    html: html
  });
}

// Send Weekly Food Mess Reminder Email - Clean & Simple
async function sendFoodReminderEmail(member, foodData) {
  const emailClient = getEmailTransporter();
  if (!emailClient) {
    throw new Error('SMTP not configured. Super Admin must set SMTP credentials in Settings.');
  }

  if (!member.email) {
    throw new Error(`Member ${member.name} has no email address configured.`);
  }

  const settings = foodData.settings || {};
  const currency = settings.currency_symbol || 'Rs.';
  const amount = Number(foodData.food_balance || 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px 10px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #fde68a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- HEADER -->
        <div style="padding: 22px 26px; background: #92400e; color: #ffffff;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #fde68a;">
            Weekly Food Mess &bull; Settlement Reminder
          </div>
          <h1 style="margin: 6px 0 0 0; font-size: 19px; font-weight: 700; color: #ffffff;">
            Food Dues Notice
          </h1>
        </div>

        <div style="padding: 26px;">
          <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b;">
            Hi <strong>${member.name}</strong>,
          </p>
          <p style="margin: 0 0 18px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
            This is a friendly reminder for your weekly food grocery dues. 
            As groceries are purchased week-to-week, <strong style="color: #b45309;">please clear your food dues as soon as possible</strong>.
          </p>

          <!-- HERO BALANCE CARD -->
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 18px 20px; text-align: center; margin-bottom: 22px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #92400e;">
              Outstanding Food Dues
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #78350f; margin-top: 4px; font-family: monospace;">
              ${currency} ${amount.toLocaleString()}
            </div>
            ${foodData.weekTitle ? `<div style="font-size: 11px; color: #92400e; margin-top: 4px;">${foodData.weekTitle}</div>` : ''}
          </div>

          <!-- PAYMENT DETAILS -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 8px;">
              Payment Accounts
            </div>
            <div style="font-size: 12.5px; line-height: 1.8; color: #1e293b;">
              ${settings.bank_name ? `<div>&bull; <strong>${settings.bank_name}</strong>: <span style="font-family: monospace;">${settings.account_number}</span> (${settings.account_title})</div>` : ''}
              ${settings.jazzcash_number ? `<div>&bull; <strong>JazzCash</strong>: <span style="font-family: monospace;">${settings.jazzcash_number}</span> (${settings.jazzcash_title})</div>` : ''}
              ${settings.easypaisa_number ? `<div>&bull; <strong>Easypaisa</strong>: <span style="font-family: monospace;">${settings.easypaisa_number}</span> (${settings.easypaisa_title})</div>` : ''}
            </div>
          </div>

          <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
            Please select <strong>"Payment for Food Mess"</strong> when submitting your transaction proof in the member dashboard.
          </p>
        </div>

        <div style="border-top: 1px solid #fef3c7; padding: 14px 26px; background: #fffdf5; text-align: center; font-size: 11px; color: #a16207;">
          Sent by ${settings.flat_name || 'Flat Management System'}. Food dues are settled week-by-week.
        </div>

      </div>

    </body>
    </html>
  `;

  return emailClient.transporter.sendMail({
    from: emailClient.from,
    to: member.email,
    subject: `Food Mess Reminder - ${member.name} | ${currency} ${amount.toLocaleString()} Due`,
    html: html
  });
}

module.exports = {
  sendTestEmail,
  sendInvoiceEmail,
  sendFoodReminderEmail
};
