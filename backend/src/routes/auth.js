const router = require('express').Router();
const bcrypt = require('bcryptjs');
const users = require('../data/users');
const leads = require('../data/leads');
const events = require('../data/events');
const stageHistoryData = require('../data/stageHistory');
const { signToken, requireAuth, optionalAuth } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  ...(user.role === 'salesperson'
    ? {
        skills: user.skills || '',
        territory: user.territory || '',
      }
    : {
        company: user.company || '',
        industry: user.industry || '',
        companySize: user.companySize || '',
        location: user.location || '',
      }),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      role,
      company,
      industry,
      companySize,
      location,
      skills,
      territory,
    } = req.body || {};

    // 1. Role validation
    if (!role || (role !== 'customer' && role !== 'salesperson')) {
      return res.status(400).json({ message: 'Invalid role. Must be Customer or Salesperson' });
    }

    // 2. Name validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full Name is required' });
    }

    // 3. Email validation
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // 4. Duplicate email check
    const existing = users.findByEmail ? users.findByEmail(cleanEmail) : users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // 5. Phone validation
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // 6. Password validation
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // 7. Role specific validation
    if (role === 'salesperson') {
      if (!skills || !skills.trim()) {
        return res.status(400).json({ message: 'Skills are required for salesperson accounts' });
      }
      if (!territory || !territory.trim()) {
        return res.status(400).json({ message: 'Territory is required for salesperson accounts' });
      }
    }
    // Customer registration fields ONLY: Full Name, Email, Phone, Password, Confirm Password.
    // Do not ask for company, deal values, or sales info.

    // 8. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 9. Generate ID and create new user record
    const maxId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
    const newUser = {
      id: maxId + 1,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password: hashedPassword,
      role,
      ...(role === 'salesperson'
        ? {
            skills: skills.trim(),
            territory: territory.trim(),
          }
        : {
            company: (company || 'Personal Account').trim(),
            industry: (industry || 'Consumer Electronics').trim(),
            companySize: (companySize || '1-10').trim(),
            location: (location || 'Online').trim(),
          }),
      createdAt: new Date().toISOString(),
    };

    // 10. Store user
    if (typeof users.addUser === 'function') {
      users.addUser(newUser);
    } else {
      users.push(newUser);
    }

    // 11. If Customer, automatically create a Lead record in the backend
    let lead = null;
    if (role === 'customer') {
      lead = leads.createCustomerLead({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        company: (company || 'Personal Account').trim(),
        industry: (industry || 'Consumer Electronics').trim(),
        companySize: (companySize || '1-10').trim(),
        location: (location || 'Online').trim(),
      });

      // Automatically create LEAD_REGISTERED event
      events.addEvent({
        leadId: lead.id,
        customerId: String(newUser.id),
        eventType: 'LEAD_REGISTERED',
        description: `Customer account registered: ${newUser.name} (${newUser.company || 'Enterprise'})`,
        metadata: {
          customerId: newUser.id,
          email: newUser.email,
          company: newUser.company,
          industry: newUser.industry,
        },
        createdBy: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      });

      // Initial Stage Record (Module 7: New stage)
      stageHistoryData.addRecord({
        leadId: lead.id,
        oldStage: null,
        newStage: 'New',
        reason: 'Initial stage assigned upon customer registration',
        timestamp: lead.createdAt || new Date().toISOString(),
      });
    }

    // 12. Generate JWT token and return user & lead
    const token = signToken(newUser);
    return res.status(201).json({
      token,
      user: publicUser(newUser),
      lead,
      message: 'Registration successful',
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = users.findByEmail ? users.findByEmail(cleanEmail) : users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare with bcrypt hash or legacy plaintext fallback
    const isMatch = await bcrypt.compare(password, user.password).catch(() => false) || user.password === password;
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role} account` });
    }

    if (user.role === 'customer') {
      const customerLead = leads.findByCustomerId(user.id) || leads.findByEmail(user.email);
      events.addEvent({
        leadId: customerLead ? customerLead.id : null,
        customerId: String(user.id),
        eventType: 'LOGIN',
        description: `Customer signed into account portal: ${user.name}`,
        metadata: { customerId: user.id, email: user.email },
        createdBy: { id: user.id, name: user.name, email: user.email },
      });
    }

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = users.findById ? users.findById(req.auth.id) : users.find((u) => u.id === req.auth.id);
  user ? res.json({ user: publicUser(user) }) : res.status(404).json({ message: 'Not found' });
});

// POST /api/auth/logout
router.post('/logout', optionalAuth, (req, res) => {
  try {
    if (req.auth && req.auth.role === 'customer') {
      const customerLead = leads.findByCustomerId(req.auth.id);
      events.addEvent({
        leadId: customerLead ? customerLead.id : null,
        customerId: String(req.auth.id),
        eventType: 'LOGOUT',
        description: `Customer signed out of account session`,
        metadata: { customerId: req.auth.id },
      });
    }
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.json({ message: 'Logged out' });
  }
});

module.exports = router;
