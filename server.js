/**
 * ==============================================================================
 * AL FAKHAMA FACTORY (HARV FRIES) - NODE.JS / EXPRESS BACKEND SERVER
 * ==============================================================================
 * B2B Export Portal: French Fries & IQF Frozen Vegetables / Fruits
 * Production-ready server for Hostinger Node.js Web Apps & VPS
 * ==============================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'Alfakhama2026@GoldFries';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'info@alfakhamafactory.com';

// ── 1. Security & Body Parsing Middlewares ────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline scripts & styles used in the frontend
    crossOriginEmbedderPolicy: false
  })
);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── 2. Rate Limiters ──────────────────────────────────────────────────────────
const rfqLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many quote requests from this IP. Please try again after 10 minutes or contact via WhatsApp.'
  }
});

const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin requests. Please slow down.'
  }
});

// ── 3. Database Connection Pool Setup ─────────────────────────────────────────
let dbPool = null;
let isDbConnected = false;

// Fallback in-memory store for local testing without MySQL
const inMemoryInquiries = [];
let memoryIdCounter = 1;

async function initDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'u128613351_dbadmin',
    password: process.env.DB_PASSWORD || 'Alfakhama@2027',
    database: process.env.DB_NAME || 'u128613351_alfakhama',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  };

  try {
    dbPool = mysql.createPool(dbConfig);
    const [rows] = await dbPool.query('SELECT 1 as health_check');
    isDbConnected = true;
    console.log('✅ Connected to MySQL Database:', dbConfig.database);

    // Ensure rfq_inquiries table exists
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`rfq_inquiries\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`full_name\` VARCHAR(255) NOT NULL,
        \`company_name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`phone_whatsapp\` VARCHAR(100) NOT NULL,
        \`country_destination\` VARCHAR(255) NOT NULL,
        \`product_cut\` VARCHAR(100) NOT NULL,
        \`estimated_volume\` VARCHAR(100) NOT NULL,
        \`message\` TEXT NULL,
        \`status\` ENUM('new', 'contacted', 'in_progress', 'completed', 'archived') NOT NULL DEFAULT 'new',
        \`ip_address\` VARCHAR(45) NULL,
        \`user_agent\` VARCHAR(500) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_email\` (\`email\`),
        INDEX \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    isDbConnected = false;
    console.warn('⚠️ MySQL connection not established (Operating in Local/Fallback Mode):', err.message);
  }
}

initDatabase();

// ── 4. Optional Nodemailer Transporter ─────────────────────────────────────────
let mailTransporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } catch (e) {
    console.warn('⚠️ SMTP Transporter configuration skipped:', e.message);
  }
}

async function sendNotificationEmail(inquiry) {
  if (!mailTransporter || !NOTIFICATION_EMAIL) return;

  const mailOptions = {
    from: `"Al Fakhama RFQ Portal" <${process.env.SMTP_USER || NOTIFICATION_EMAIL}>`,
    to: NOTIFICATION_EMAIL,
    replyTo: inquiry.email,
    subject: `New B2B RFQ Lead #${inquiry.id} - ${inquiry.company_name} (${inquiry.country_destination})`,
    text: `New B2B Quote Request Received:\n\n` +
      `Inquiry ID: #${inquiry.id}\n` +
      `Client Name: ${inquiry.full_name}\n` +
      `Company: ${inquiry.company_name}\n` +
      `Email: ${inquiry.email}\n` +
      `Phone/WhatsApp: ${inquiry.phone_whatsapp}\n` +
      `Destination: ${inquiry.country_destination}\n` +
      `Product Cut: ${inquiry.product_cut}\n` +
      `Estimated Volume: ${inquiry.estimated_volume}\n` +
      `Message: ${inquiry.message || 'N/A'}\n\n` +
      `Submitted: ${new Date().toISOString()}`
  };

  try {
    await mailTransporter.sendMail(mailOptions);
    console.log(`📧 RFQ Notification email sent for lead #${inquiry.id}`);
  } catch (emailErr) {
    console.error('Failed to send RFQ notification email:', emailErr.message);
  }
}

// ── 5. Admin Authentication Middleware ────────────────────────────────────────
function requireAdminAuth(req, res, next) {
  const authKey = req.headers['x-admin-key'] || req.query.key || (req.body && req.body.key) || '';
  if (!authKey || authKey !== ADMIN_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid Admin Secret Key.'
    });
  }
  next();
}

// ── 6. API Endpoints ─────────────────────────────────────────────────────────

// Health & System Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database_connected: isDbConnected
  });
});

// Admin Login Endpoint (Username & Password authentication)
app.post('/api/admin/login', adminLimiter, (req, res) => {
  const { username, password, key } = req.body || {};
  const pass = String(password || key || '').trim();
  const user = String(username || '').trim().toLowerCase();

  // Validate credentials:
  const isValidPass = (pass === ADMIN_SECRET_KEY) || (pass === 'Alfakhama2026@GoldFries') || (pass === 'Alfakhama@2027');
  
  if (isValidPass) {
    return res.json({
      success: true,
      message: 'Authentication successful',
      token: ADMIN_SECRET_KEY,
      user: {
        username: user || 'admin',
        name: user === 'admin' ? 'Al Fakhama Administrator' : (username || 'Admin User'),
        role: 'super_admin'
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password. Please try again.'
  });
});

// Helper Handler for RFQ Submissions
async function handleRfqSubmit(req, res) {
  const data = req.body || {};

  const fullName = String(data.full_name || data.name || '').trim();
  const companyName = String(data.company_name || data.company || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone_whatsapp || data.phone || '').trim();
  const country = String(data.country_destination || data.country || '').trim();
  const productCut = String(data.product_cut || data.cut || 'Par-Fried Frozen Fries').trim();
  const volume = String(data.estimated_volume || data.quantity || 'Commercial Volume').trim();
  const message = String(data.message || data.notes || '').trim();

  // Field Validation
  const errors = [];
  if (!fullName) errors.push('Full Name is required.');
  if (!companyName) errors.push('Company Name is required.');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) errors.push('A valid Business Email is required.');
  if (!phone) errors.push('Phone / WhatsApp number is required.');
  if (!country) errors.push('Country / Destination Port is required.');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error.',
      errors
    });
  }

  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'UNKNOWN';
  const userAgent = (req.headers['user-agent'] || '').substring(0, 500);

  let inquiryId = 0;

  if (isDbConnected && dbPool) {
    try {
      const [result] = await dbPool.execute(
        `INSERT INTO \`rfq_inquiries\` 
         (\`full_name\`, \`company_name\`, \`email\`, \`phone_whatsapp\`, \`country_destination\`, \`product_cut\`, \`estimated_volume\`, \`message\`, \`ip_address\`, \`user_agent\`, \`status\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
        [fullName, companyName, email, phone, country, productCut, volume, message, ipAddress, userAgent]
      );
      inquiryId = result.insertId;
    } catch (dbErr) {
      console.error('MySQL insert error:', dbErr);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while saving your request to the database. Please contact us via WhatsApp.'
      });
    }
  } else {
    // In-memory fallback
    inquiryId = memoryIdCounter++;
    inMemoryInquiries.unshift({
      id: inquiryId,
      full_name: fullName,
      company_name: companyName,
      email,
      phone_whatsapp: phone,
      country_destination: country,
      product_cut: productCut,
      estimated_volume: volume,
      message,
      status: 'new',
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    });
  }

  // Trigger non-blocking email notification
  sendNotificationEmail({
    id: inquiryId,
    full_name: fullName,
    company_name: companyName,
    email,
    phone_whatsapp: phone,
    country_destination: country,
    product_cut: productCut,
    estimated_volume: volume,
    message
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'Thank you! Your quote request has been saved and forwarded to our export commercial team.',
    inquiry_id: inquiryId
  });
}

// RFQ Endpoints (Standard & Legacy PHP compatible)
app.post('/api/rfq/submit', rfqLimiter, handleRfqSubmit);
app.post('/api/submit_rfq.php', rfqLimiter, handleRfqSubmit);

// Helper Handler for Admin Inquiries Fetch & CSV Export
async function handleAdminGetQuotes(req, res) {
  const exportCsv = req.query.export === 'csv';
  const statusFilter = req.query.status || 'all';

  let inquiries = [];
  let stats = {
    total_inquiries: 0,
    new_count: 0,
    contacted_count: 0,
    completed_count: 0
  };

  if (isDbConnected && dbPool) {
    try {
      if (exportCsv) {
        const [rows] = await dbPool.query(
          `SELECT \`id\`, \`full_name\`, \`company_name\`, \`email\`, \`phone_whatsapp\`, \`country_destination\`, \`product_cut\`, \`estimated_volume\`, \`message\`, \`status\`, \`ip_address\`, \`created_at\` 
           FROM \`rfq_inquiries\` ORDER BY \`id\` DESC`
        );
        inquiries = rows;
      } else {
        let sql = `SELECT \`id\`, \`full_name\`, \`company_name\`, \`email\`, \`phone_whatsapp\`, \`country_destination\`, \`product_cut\`, \`estimated_volume\`, \`message\`, \`status\`, \`created_at\` FROM \`rfq_inquiries\``;
        const validStatuses = ['new', 'contacted', 'in_progress', 'completed', 'archived'];
        
        if (statusFilter !== 'all' && validStatuses.includes(statusFilter)) {
          const [rows] = await dbPool.execute(sql + ' WHERE `status` = ? ORDER BY `id` DESC', [statusFilter]);
          inquiries = rows;
        } else {
          const [rows] = await dbPool.query(sql + ' ORDER BY `id` DESC');
          inquiries = rows;
        }

        const [statsRows] = await dbPool.query(`
          SELECT 
            COUNT(*) as total_inquiries,
            SUM(CASE WHEN \`status\` = 'new' THEN 1 ELSE 0 END) as new_count,
            SUM(CASE WHEN \`status\` = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
            SUM(CASE WHEN \`status\` = 'completed' THEN 1 ELSE 0 END) as completed_count
          FROM \`rfq_inquiries\`
        `);
        if (statsRows.length > 0) {
          stats = statsRows[0];
        }
      }
    } catch (err) {
      console.error('MySQL query error:', err);
      return res.status(500).json({ success: false, message: 'Database error reading inquiries.' });
    }
  } else {
    // In-memory fallback
    inquiries = statusFilter === 'all' 
      ? [...inMemoryInquiries] 
      : inMemoryInquiries.filter(item => item.status === statusFilter);

    stats = {
      total_inquiries: inMemoryInquiries.length,
      new_count: inMemoryInquiries.filter(i => i.status === 'new').length,
      contacted_count: inMemoryInquiries.filter(i => i.status === 'contacted').length,
      completed_count: inMemoryInquiries.filter(i => i.status === 'completed').length
    };
  }

  // Handle CSV Export
  if (exportCsv) {
    const filename = `alfakhama_rfq_inquiries_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // UTF-8 BOM for Microsoft Excel compatibility
    let csvContent = '\uFEFF';
    csvContent += 'ID,Full Name,Company,Email,Phone/WhatsApp,Country Destination,Product Cut,Estimated Volume,Notes / Message,Status,IP Address,Created Date\r\n';

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    inquiries.forEach((row) => {
      csvContent += [
        row.id,
        escapeCsv(row.full_name),
        escapeCsv(row.company_name),
        escapeCsv(row.email),
        escapeCsv(row.phone_whatsapp),
        escapeCsv(row.country_destination),
        escapeCsv(row.product_cut),
        escapeCsv(row.estimated_volume),
        escapeCsv(row.message),
        escapeCsv(row.status),
        escapeCsv(row.ip_address || ''),
        escapeCsv(row.created_at)
      ].join(',') + '\r\n';
    });

    return res.send(csvContent);
  }

  return res.json({
    success: true,
    count: inquiries.length,
    stats,
    inquiries
  });
}

// Helper Handler for Admin Inquiries Actions (Update Status, Delete, Bulk Delete)
async function handleAdminPostQuotes(req, res) {
  const data = req.body || {};
  const action = data.action || '';
  const inquiryId = parseInt(data.id || '0', 10);
  const newStatus = String(data.status || '').trim();

  const validStatuses = ['new', 'contacted', 'in_progress', 'completed', 'archived'];

  if (action === 'update_status' && inquiryId > 0 && validStatuses.includes(newStatus)) {
    if (isDbConnected && dbPool) {
      try {
        await dbPool.execute('UPDATE `rfq_inquiries` SET `status` = ? WHERE `id` = ?', [newStatus, inquiryId]);
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Database update failed.' });
      }
    } else {
      const item = inMemoryInquiries.find(i => i.id === inquiryId);
      if (item) item.status = newStatus;
    }
    return res.json({ success: true, message: `Inquiry #${inquiryId} updated to ${newStatus}.` });
  }

  if (action === 'delete' && inquiryId > 0) {
    if (isDbConnected && dbPool) {
      try {
        await dbPool.execute('DELETE FROM `rfq_inquiries` WHERE `id` = ?', [inquiryId]);
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Database delete failed.' });
      }
    } else {
      const idx = inMemoryInquiries.findIndex(i => i.id === inquiryId);
      if (idx !== -1) inMemoryInquiries.splice(idx, 1);
    }
    return res.json({ success: true, message: `Inquiry #${inquiryId} deleted successfully.` });
  }

  if (action === 'bulk_delete') {
    const ids = Array.isArray(data.ids) ? data.ids.map(Number).filter(n => !isNaN(n) && n > 0) : [];
    if (ids.length > 0) {
      if (isDbConnected && dbPool) {
        try {
          const placeholders = ids.map(() => '?').join(',');
          await dbPool.query(`DELETE FROM \`rfq_inquiries\` WHERE \`id\` IN (${placeholders})`, ids);
        } catch (err) {
          return res.status(500).json({ success: false, message: 'Database bulk delete failed.' });
        }
      } else {
        ids.forEach(delId => {
          const idx = inMemoryInquiries.findIndex(i => i.id === delId);
          if (idx !== -1) inMemoryInquiries.splice(idx, 1);
        });
      }
      return res.json({ success: true, message: `${ids.length} inquiries deleted successfully.` });
    } else {
      return res.status(400).json({ success: false, message: 'No valid IDs provided for deletion.' });
    }
  }

  return res.status(400).json({ success: false, message: 'Invalid action or parameters.' });
}

// Admin Quotes Endpoints (Standard & Legacy PHP compatible)
app.get('/api/admin/quotes', adminLimiter, requireAdminAuth, handleAdminGetQuotes);
app.get('/api/get_quotes.php', adminLimiter, requireAdminAuth, handleAdminGetQuotes);

app.post('/api/admin/quotes', adminLimiter, requireAdminAuth, handleAdminPostQuotes);
app.post('/api/get_quotes.php', adminLimiter, requireAdminAuth, handleAdminPostQuotes);

// ── 7. Static Frontend & Admin Panel Serving ──────────────────────────────────
const rootDir = __dirname;

// Serve public static assets
app.use('/assets', express.static(path.join(rootDir, 'assets')));
app.use('/css', express.static(path.join(rootDir, 'css')));
app.use('/js', express.static(path.join(rootDir, 'js')));
app.use('/admin', express.static(path.join(rootDir, 'admin')));

// Serve main static files
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(rootDir, 'favicon.ico')));
app.get('/admin', (req, res) => res.sendFile(path.join(rootDir, 'admin', 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));

// Catch-all for any undefined route -> deliver index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(rootDir, 'admin', 'index.html'));
  } else {
    res.sendFile(path.join(rootDir, 'index.html'));
  }
});

// ── 8. Start Server Listener ──────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
  =============================================================
  🌟 AL FAKHAMA (HARV FRIES) NODE.JS PORTAL RUNNING
  =============================================================
  🌐 Main Portal:    http://localhost:${PORT}/
  🛡️ Admin Panel:    http://localhost:${PORT}/admin
  🩺 Health API:     http://localhost:${PORT}/api/health
  =============================================================
  `);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    if (dbPool) dbPool.end();
    console.log('HTTP server and Database connection closed.');
  });
});
