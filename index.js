import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { postsRouter } from './routes/posts.js'
import { providersRouter } from './routes/providers.js'
import { notificationsRouter } from './routes/notifications.js'
import { profileRouter } from './routes/profile.js'
import { categoriesRouter } from './routes/categories.js'
import { authRouter } from './routes/auth.js'
import { messagesRouter } from './routes/messages.js'
import { uploadRouter } from './routes/upload.js'
import initializeDatabase from './database/init.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://aricwilliamst.com',
  'http://aricwilliamst.com'
]

const envOriginsRaw = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
]
  .map(origin => origin?.trim())
  .filter(Boolean)

const normalizeOrigin = (origin) => {
  try {
    const url = new URL(origin)
    return `${url.protocol}//${url.host}`
  } catch {
    return origin
  }
}

const envOrigins = envOriginsRaw.flatMap(origin => {
  const normalized = normalizeOrigin(origin)
  return normalized === origin ? [origin] : [origin, normalized]
})

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])]

console.log('🌐 CORS allowed origins:', allowedOrigins.join(', ') || '(none)')

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true)
    }

    console.log(`❌ CORS blocked origin: ${origin}`)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With']
}))

// Ensure JSON responses for all API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  next()
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  next()
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/posts', postsRouter)
app.use('/api/providers', providersRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/profile', profileRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/upload', uploadRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Work Phase API is running' })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Work Phase API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      posts: '/api/posts',
      providers: '/api/providers',
      notifications: '/api/notifications',
      profile: '/api/profile',
      categories: '/api/categories'
    }
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database schema (non-blocking - server will start even if this fails)
    initializeDatabase()
      .then(() => {
        console.log('✅ Database initialized')
      })
      .catch((error) => {
        console.error('⚠️  Database initialization failed:', error.message)
        console.log('⚠️  Server will continue but some features may not work')
      })
    
    // Start server regardless of database initialization
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Work Phase API server running on port ${PORT}`)
      console.log('📚 API Documentation available at /api/health')
      console.log(`🗄️  Database: ${process.env.DB_DATABASE || 'not configured'} on ${process.env.DB_HOST || 'not configured'}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

