import { Auth } from '../models/Auth.js'

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      })
    }

    const result = await Auth.verifyToken(token)
    req.user = result.user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    })
  }
}

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const result = await Auth.verifyToken(token)
      req.user = result.user
    }
    next()
  } catch (error) {
    // Continue without authentication if token is invalid
    next()
  }
}


