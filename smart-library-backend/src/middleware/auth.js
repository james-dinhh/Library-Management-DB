import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function authorizeRole(...allowed) {
    return (req, res, next) => {
        if (!req.user?.role) return res.status(401).json({ error: 'Unauthenticated' });
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return next();
    };
}
