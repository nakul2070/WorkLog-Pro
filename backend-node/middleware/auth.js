const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Middleware to verify JWT token and attach user to request
 * Usage: router.get('/protected', requireAuth, controller)
 */
exports.requireAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please log in again.'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please log in again.'
        });
      }
      throw error;
    }

    // Fetch user from database to ensure they still exist and are active
    const [user] = await db.executeQuery(
      'SELECT id, employee_id, email, name, is_admin, is_project_manager, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'User not found or inactive.'
      });
    }

    // Attach user info to request object
    req.user = {
      id: user.id,
      employeeId: user.employee_id,
      email: user.email,
      name: user.name,
      isAdmin: !!user.is_admin,
      isProjectManager: !!user.is_project_manager
    };

    req.userId = user.id; // For backward compatibility

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error.'
    });
  }
};

/**
 * Middleware to verify user is an admin
 * Usage: router.post('/admin-only', requireAuth, requireAdmin, controller)
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required.'
    });
  }

  next();
};

/**
 * Middleware to verify user is a project manager
 * Usage: router.get('/pm-only', requireAuth, requireProjectManager, controller)
 */
exports.requireProjectManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  if (!req.user.isProjectManager) {
    return res.status(403).json({
      success: false,
      error: 'Project Manager access required.'
    });
  }

  next();
};

/**
 * Middleware to verify user is admin OR project manager
 * Usage: router.get('/manager-route', requireAuth, requireAdminOrPM, controller)
 */
exports.requireAdminOrPM = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  if (!req.user.isAdmin && !req.user.isProjectManager) {
    return res.status(403).json({
      success: false,
      error: 'Admin or Project Manager access required.'
    });
  }

  next();
};


