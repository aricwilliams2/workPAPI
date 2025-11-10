import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { postsRouter } from './routes/posts.js'
import { providersRouter } from './routes/providers.js'
import { notificationsRouter } from './routes/notifications.js'
import { profileRouter } from './routes/profile.js'
import { categoriesRouter } from './routes/categories.js'
import { debugRouter } from './routes/debug.js'
import { uploadRouter } from './routes/upload.js'
import initializeDatabase from './database/init.js'
import { Router } from 'express'
import pool from './database/connection.js'
import { authRouter } from './routes/auth.js'
import { messagesRouter } from './routes/messages.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
// CORS configuration - allow both localhost (development) and production URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean) // Remove any undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true)
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // For development, allow localhost on any port
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With']
}))

// Body parser for JSON (but not for multipart/form-data which multer handles)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Don't set Content-Type for upload and images endpoints - let multer handle multipart/form-data, images serve binary
app.use('/api', (req, res, next) => {
  if (!req.path.startsWith('/upload') && !req.path.startsWith('/images/')) {
    res.setHeader('Content-Type', 'application/json')
  }
  next()
})

// Serve uploaded files
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  // Only log headers for debugging if needed (comment out in production)
  // console.log('Headers:', JSON.stringify(req.headers, null, 2))
  next()
})

// Routes
console.log('🔧 Mounting routes...')
// Mount auth router first
app.use('/api/auth', authRouter)
console.log('✅ Auth router mounted at /api/auth')
app.use('/api/posts', postsRouter)
app.use('/api/providers', providersRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/profile', profileRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/debug', debugRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/messages', messagesRouter)
console.log('✅ Messages router mounted at /api/messages')

// Image serving route - create a separate router for /api/images/:id
const imagesRouter = Router()

imagesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const [rows] = await pool.execute(
      'SELECT image_data, mime_type, file_size FROM post_images WHERE id = ?',
      [id]
    )
    
    if (rows.length === 0 || !rows[0].image_data) {
      return res.status(404).json({ error: 'Image not found' })
    }
    
    const imageData = rows[0].image_data
    const mimeType = rows[0].mime_type || 'image/jpeg'
    
    // Set appropriate headers
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', imageData.length)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
    
    // Send the image data
    res.send(imageData)
  } catch (error) {
    console.error('❌ Error serving image:', error)
    res.status(500).json({ error: 'Failed to serve image' })
  }
})

app.use('/api/images', imagesRouter)

// Video serving route - create a separate router for /api/videos/:id
const videosRouter = Router()

videosRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const [rows] = await pool.execute(
      'SELECT video_data, mime_type, file_size FROM post_videos WHERE id = ?',
      [id]
    )
    
    if (rows.length === 0 || !rows[0].video_data) {
      return res.status(404).json({ error: 'Video not found' })
    }
    
    const videoData = rows[0].video_data
    const mimeType = rows[0].mime_type || 'video/mp4'
    
    // Set appropriate headers
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', videoData.length)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
    res.setHeader('Accept-Ranges', 'bytes') // Support video seeking
    
    // Send the video data
    res.send(videoData)
  } catch (error) {
    console.error('❌ Error serving video:', error)
    res.status(500).json({ error: 'Failed to serve video' })
  }
})

app.use('/api/videos', videosRouter)

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
      auth: '/api/auth',
      posts: '/api/posts',
      providers: '/api/providers',
      notifications: '/api/notifications',
      profile: '/api/profile',
      categories: '/api/categories',
      messages: '/api/messages'
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

// 404 handler - log what route was requested
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`)
  console.log(`   Path: ${req.path}`)
  console.log(`   Base URL: ${req.baseUrl}`)
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  })
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
    app.listen(PORT, () => {
      console.log(`🚀 Work Phase API server running on http://localhost:${PORT}`)
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api/health`)
      console.log(`🗄️  Database: ${process.env.DB_DATABASE} on ${process.env.DB_HOST}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

