// Check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ message: 'Access denied. Admins only.' });
};

// Check if user is staff
const isStaff = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'staff') {
        return next();
    }
    res.status(403).json({ message: 'Access denied. Staff only.' });
};

// Check if user is student
const isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'student') {
        return next();
    }
    res.status(403).json({ message: 'Access denied. Students only.' });
};

// Allow staff OR admin (for shared management routes)
const isStaffOrAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'staff' || req.session.user.role === 'admin')) {
        return next();
    }
    res.status(403).json({ message: 'Access denied.' });
};

module.exports = { isAuthenticated, isAdmin, isStaff, isStudent, isStaffOrAdmin };