import pool from '../database/connection.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export class Auth {
  static async signup(userData) {
    try {
      const { username, email, password, displayName, accountType = 'personal', businessCategory } = userData

      // Validate required fields
      if (!username || !email || !password) {
        throw new Error('Username, email, and password are required')
      }

      // Check if user already exists
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      )

      if (existingUsers.length > 0) {
        throw new Error('Username or email already exists')
      }

      // Hash password
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // Generate user ID
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Insert user
      await pool.execute(
        `INSERT INTO users (id, username, email, password_hash, display_name, account_type, business_category) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, email, passwordHash, displayName || username, accountType, businessCategory || null]
      )

      // Generate JWT token
      const token = jwt.sign(
        { userId, username, email, accountType },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      return {
        success: true,
        token,
        user: {
          id: userId,
          username,
          email,
          displayName: displayName || username,
          accountType,
          businessCategory
        }
      }
    } catch (error) {
      console.error('❌ Auth.signup error:', error)
      throw new Error(`Failed to sign up: ${error.message}`)
    }
  }

  static async login(credentials) {
    try {
      const { username, email, password } = credentials

      // Validate input
      if (!password || (!username && !email)) {
        throw new Error('Username/email and password are required')
      }

      // Find user by username or email
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
        [username || email, username || email]
      )

      if (users.length === 0) {
        throw new Error('Invalid credentials')
      }

      const user = users[0]

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash)
      if (!isPasswordValid) {
        throw new Error('Invalid credentials')
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          email: user.email,
          accountType: user.account_type 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name || user.username,
          profileImage: user.profile_image,
          accountType: user.account_type,
          businessCategory: user.business_category
        }
      }
    } catch (error) {
      console.error('❌ Auth.login error:', error)
      throw new Error(`Failed to login: ${error.message}`)
    }
  }

  static async verifyToken(token) {
    try {
      if (!token) {
        throw new Error('No token provided')
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token

      const decoded = jwt.verify(cleanToken, JWT_SECRET)

      // Get user from database
      const [users] = await pool.execute(
        'SELECT id, username, email, display_name, profile_image, account_type, business_category FROM users WHERE id = ? AND is_active = TRUE',
        [decoded.userId]
      )

      if (users.length === 0) {
        throw new Error('User not found')
      }

      const user = users[0]

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name || user.username,
          profileImage: user.profile_image,
          accountType: user.account_type,
          businessCategory: user.business_category
        }
      }
    } catch (error) {
      console.error('❌ Auth.verifyToken error:', error)
      throw new Error(`Invalid token: ${error.message}`)
    }
  }

  static async getUserById(userId) {
    try {
      const [users] = await pool.execute(
        'SELECT id, username, email, display_name, profile_image, account_type, business_category FROM users WHERE id = ? AND is_active = TRUE',
        [userId]
      )

      if (users.length === 0) {
        return null
      }

      const user = users[0]
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name || user.username,
        profileImage: user.profile_image,
        accountType: user.account_type,
        businessCategory: user.business_category
      }
    } catch (error) {
      console.error('❌ Auth.getUserById error:', error)
      throw new Error(`Failed to get user: ${error.message}`)
    }
  }
}


