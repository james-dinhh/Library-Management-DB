import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mysqlPool } from '../db/mysql.js';

const router = Router();

function signToken(user) {
    return jwt.sign(
        { id: user.user_id, role: user.role, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
}

/**
 * POST /auth/register
 * body: { name, email, password }
 * role is forced to 'reader' for public registration.
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, password are required' });
        }

        const [exists] = await mysqlPool.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );
        if (exists.length) return res.status(409).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 10);
        const [result] = await mysqlPool.execute(
            `INSERT INTO users (name, email, role, password)
       VALUES (?, ?, 'reader', ?)`,
            [name, email, hash]
        );

        const [rows] = await mysqlPool.execute('SELECT * FROM users WHERE user_id = ?', [
            result.insertId
        ]);
        const user = rows[0];
        const token = signToken(user);
        return res.status(201).json({
            token,
            user: { id: user.user_id, name: user.name, email: user.email, role: user.role }
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

/**
 * POST /auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const [rows] = await mysqlPool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const token = signToken(user);
        return res.json({
            token,
            user: { id: user.user_id, name: user.name, email: user.email, role: user.role }
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

/**
 * GET /auth/me
 * Returns the current user from the token
 */
router.get('/me', async (req, res) => {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Optionally refresh user data from DB:
        const [rows] = await mysqlPool.execute(
            'SELECT user_id, name, email, role FROM users WHERE user_id = ?',
            [decoded.id]
        );
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'User no longer exists' });
        return res.json({ user: { id: user.user_id, name: user.name, email: user.email, role: user.role } });
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});

export default router;