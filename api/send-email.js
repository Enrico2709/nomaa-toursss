
const nodemailer = require('nodemailer');
const sanitizeHtml = require('sanitize-html');

// Email templates
const templates = {
  admin: (data) => `
    <h2>New Booking Received</h2>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone}</p>
    <p><strong>Tour:</strong> ${data.tourName}</p>
    <p><strong>Date:</strong> ${data.date}</p>
    <p><strong>Price:</strong> $${data.tourPrice}</p>
    <hr>
    <p>This booking was submitted via the NOMAA Tours website.</p>
  `,
  customer: (data) => `
    <h2>Thank You for Booking with NOMAA Tours!</h2>
    <p>Hi ${data.name},</p>
    <p>We're excited to confirm your booking for the <strong>${data.tourName}</strong>.</p>
    <p><strong>Date:</strong> ${data.date}</p>
    <p><strong>Price:</strong> $${data.tourPrice}</p>
    <p>We’ll be in touch soon with more details. If you have any questions, feel free to reply to this email.</p>
    <br>
    <p>Warm regards,</p>
    <p><strong>The NOMAA Tours Team</strong></p>
    <p><a href="https://nomaa-toursss.vercel.app" target="_blank">Visit our website</a></p>
  `
};

module.exports = async (req, res) => {
  try {
    // CORS handling
    const allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS || '[]');
    if (allowedOrigins.includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Input validation and sanitization
    const { name, email, phone, date, tourName, tourPrice } = req.body;
    const cleanData = {
      name: sanitizeHtml(name || '', { allowedTags: [], allowedAttributes: {} }),
      email: sanitizeHtml(email || '', { allowedTags: [], allowedAttributes: {} }),
      phone: sanitizeHtml(phone || '', { allowedTags: [], allowedAttributes: {} }),
      date: sanitizeHtml(date || '', { allowedTags: [], allowedAttributes: {} }),
      tourName: sanitizeHtml(tourName || '', { allowedTags: [], allowedAttributes: {} }),
      tourPrice: sanitizeHtml(tourPrice || '', { allowedTags: [], allowedAttributes: {} })
    };

    // Validate required fields
    if (Object.values(cleanData).some(v => !v.trim())) {
      return res.status(400).json({ 
        error: 'All fields are required',
        received: cleanData
      });
    }

    // Email configuration
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.NODE_ENV === 'production',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify connection
    await transporter.verify();

    // Send emails
    await Promise.all([
      transporter.sendMail({
        from: `"NOMAA Tours" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Booking: ${cleanData.tourName}`,
        html: templates.admin(cleanData)
      }),
      transporter.sendMail({
        from: `"NOMAA Tours" <${process.env.EMAIL_USER}>`,
        to: cleanData.email,
        subject: `Your ${cleanData.tourName} Booking Confirmation`,
        html: templates.customer(cleanData)
      })
    ]);

    return res.status(200).json({ 
      success: true,
      message: 'Thank you! Your booking request has been received.'
    });

  } catch (error) {
    console.error('Error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ 
      error: status === 429 ? 
        'Too many requests, please try again later' : 
        'An error occurred processing your request',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};
