import { Router } from 'express'
import { Profile } from '../models/Profile.js'
import { authenticateToken, optionalAuth } from '../middleware/auth.js'
import { uploadSingle } from '../middleware/upload.js'
import multer from 'multer'
import pool from '../database/connection.js'
import fs from 'fs'

export const profileRouter = Router()

// GET /api/profile - Get profile data (uses authenticated user or query param)
profileRouter.get('/', optionalAuth, async (req, res) => {
  try {
    // Use authenticated user if available, otherwise use query param, otherwise return error
    const username = req.user?.username || req.query.username
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required. Please provide username in query or authenticate.',
      })
    }

    const profile = await Profile.get(username)
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      })
    }

    res.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    console.error('❌ Profile route error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// PUT /api/profile - Update profile data (requires authentication)
profileRouter.put('/', authenticateToken, async (req, res) => {
  try {
    const username = req.user?.username || req.query.username
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required. Please authenticate or provide username in query.',
      })
    }

    const updates = req.body
    
    const profile = await Profile.update(username, updates)

    res.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('❌ Profile update error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// GET /api/profile/services - Get profile services
profileRouter.get('/services', optionalAuth, async (req, res) => {
  try {
    const username = req.user?.username || req.query.username
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      })
    }

    const profile = await Profile.get(username)
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      })
    }

    res.json({
      success: true,
      data: profile.services || [],
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// POST /api/profile/services - Add a new service (requires authentication)
profileRouter.post('/services', authenticateToken, async (req, res) => {
  try {
    const { title, price, description } = req.body
    const username = req.user?.username || req.query.username

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required. Please authenticate.',
      })
    }

    if (!title || !price || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, price, description',
      })
    }

    const newService = await Profile.addService(username, {
      title,
      price,
      description,
    })

    res.status(201).json({
      success: true,
      data: newService,
    })
  } catch (error) {
    console.error('❌ Add service error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// PUT /api/profile/services/:id - Update a service
profileRouter.put('/services/:id', async (req, res) => {
  try {
    const { title, price, description } = req.body
    const updates = {}
    
    if (title) updates.title = title
    if (price) updates.price = price
    if (description) updates.description = description

    const service = await Profile.updateService(parseInt(req.params.id), updates)

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      })
    }

    res.json({
      success: true,
      data: service,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// DELETE /api/profile/services/:id - Delete a service
profileRouter.delete('/services/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Profile.deleteService(parseInt(req.params.id))

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      })
    }

    res.json({
      success: true,
      message: 'Service deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// GET /api/profile/posts - Get user's posts
profileRouter.get('/posts', optionalAuth, async (req, res) => {
  try {
    const username = req.user?.username || req.query.username
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      })
    }

    const limit = parseInt(req.query.limit) || 20
    const posts = await Profile.getPosts(username, limit)

    res.json({
      success: true,
      data: posts,
    })
  } catch (error) {
    console.error('❌ Get posts error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// POST /api/profile/upload-image - Upload profile image
profileRouter.post('/upload-image', authenticateToken, (req, res, next) => {
  console.log('📤 PROFILE IMAGE UPLOAD ROUTE HIT')
  
  // Use multer middleware
  uploadSingle(req, res, async (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err)
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload error'
        })
      }
      return res.status(500).json({
        success: false,
        error: err.message || 'Upload failed'
      })
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Please send a file with field name "media"'
        })
      }

      const username = req.user?.username
      if (!username) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }

      console.log('✅ File uploaded:', req.file.filename)

      // Read file as buffer for BLOB storage
      const fileBuffer = fs.readFileSync(req.file.path)
      
      // Store in post_images table as BLOB (same as regular image uploads)
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      try {
        // Insert into post_images table with BLOB
        const blobBuffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
        
        // For profile images, we need to store in post_images but post_id is required
        // We'll use a placeholder post_id (0) which might not have a foreign key constraint
        // If that fails, we'll store just the URL
        let imageUrl = `/api/images/${imageId}`
        
        try {
          // Try to insert with post_id = NULL (for profile images)
          await pool.execute(
            `INSERT INTO post_images (id, post_id, image_url, image_data, mime_type, file_size) 
             VALUES (?, NULL, ?, ?, ?, ?)`,
            [
              imageId,
              `/uploads/${req.file.filename}`, // Keep URL for backward compatibility
              blobBuffer, // BLOB data
              req.file.mimetype,
              req.file.size
            ]
          )
          console.log('✅ Profile image stored as BLOB in post_images table with ID:', imageId)
        } catch (postImageError) {
          // If post_id constraint fails, we'll store just the URL
          console.log('ℹ️ Could not store in post_images (constraint), storing URL only:', postImageError.message)
          imageUrl = `/uploads/${req.file.filename}`
        }
        
        // Update user's profile_image in users table
        await pool.execute(
          `UPDATE users SET profile_image = ? WHERE username = ?`,
          [imageUrl, username]
        )
        
        // Also update profiles table if it exists
        try {
          await pool.execute(
            `UPDATE profiles SET profile_image = ? WHERE username = ?`,
            [imageUrl, username]
          )
        } catch (profilesError) {
          // Profiles table might not exist for this user, that's okay
          console.log('ℹ️ Profiles table update skipped:', profilesError.message)
        }
        
        // Clean up uploaded file since we're storing in DB
        try {
          fs.unlinkSync(req.file.path)
        } catch (unlinkError) {
          console.warn('⚠️ Could not delete temp file:', unlinkError.message)
        }
        
        res.json({
          success: true,
          data: {
            id: imageId,
            url: imageUrl,
            profileImage: imageUrl,
            message: 'Profile image uploaded successfully'
          }
        })
      } catch (dbError) {
        console.error('❌ Database storage error:', dbError.message)
        // Fallback to file URL if BLOB storage fails
        const fileUrl = `/uploads/${req.file.filename}`
        
        await pool.execute(
          `UPDATE users SET profile_image = ? WHERE username = ?`,
          [fileUrl, username]
        )
        
        res.json({
          success: true,
          data: {
            url: fileUrl,
            profileImage: fileUrl,
            storedAsBlob: false,
            warning: `Stored as file, BLOB storage failed: ${dbError.message}`
          }
        })
      }
    } catch (error) {
      console.error('❌ Profile image upload error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Upload failed'
      })
    }
  })
})

