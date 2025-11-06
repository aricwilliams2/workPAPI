import { Router } from 'express'
import { Auth } from '../models/Auth.js'
import { authenticateToken } from '../middleware/auth.js'

export const authRouter = Router()

console.log('✅ Auth router created')

// Test route to verify auth router is working
authRouter.get('/test', (req, res) => {
  console.log('✅ Test route hit!')
  res.json({ message: 'Auth router is working!' })
})

// POST /api/auth/signup - Register a new user
authRouter.post('/signup', async (req, res) => {
  console.log('📝 Signup route hit!')
  console.log('📋 Request body:', req.body)
  try {
    const { username, email, password, displayName, accountType, businessCategory } = req.body

    console.log('📋 Parsed data:', { username, email, hasPassword: !!password, displayName, accountType })

    if (!username || !email || !password) {
      console.log('❌ Missing required fields')
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      })
    }

    console.log('✅ Calling Auth.signup...')
    const result = await Auth.signup({
      username,
      email,
      password,
      displayName,
      accountType,
      businessCategory
    })

    console.log('✅ Signup successful, returning result')
    res.status(201).json(result)
  } catch (error) {
    console.error('❌ Signup route error:', error)
    console.error('❌ Error stack:', error.stack)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/auth/login - Login user
authRouter.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!password || (!username && !email)) {
      return res.status(400).json({
        success: false,
        error: 'Username/email and password are required'
      })
    }

    const result = await Auth.login({ username, email, password })

    res.json(result)
  } catch (error) {
    console.error('❌ Login route error:', error)
    res.status(401).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/auth/verify - Verify token and get current user
authRouter.get('/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    })
  } catch (error) {
    console.error('❌ Verify route error:', error)
    res.status(401).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/auth/me - Get current user (same as verify)
authRouter.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    })
  } catch (error) {
    console.error('❌ Me route error:', error)
    res.status(401).json({
      success: false,
      error: error.message
    })
  }
})

