const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.doctor = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = authenticate;
