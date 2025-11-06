import { Router } from 'express'
import { uploadSingle } from '../middleware/upload.js'
import multer from 'multer'
import pool from '../database/connection.js'
import fs from 'fs'

export const uploadRouter = Router()

// Test route to verify upload router is working
uploadRouter.get('/test', (req, res) => {
  res.json({ success: true, message: 'Upload router is working', endpoint: 'POST /api/upload' })
})

// POST /api/upload - Upload a single media file (image or video)
uploadRouter.post('/', (req, res, next) => {
  console.log('📤 UPLOAD ROUTE HIT - POST /api/upload')
  console.log('📋 Content-Type:', req.headers['content-type'])
  
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
    
    // If we get here, multer processed successfully
    try {
      if (!req.file) {
        console.error('❌ No file in request after multer processing')
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Please send a file with field name "media"'
        })
      }

      console.log('✅ File uploaded:', req.file.filename)
      console.log('📋 File details:', {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      })

      // Read file as buffer for BLOB storage
      const fileBuffer = fs.readFileSync(req.file.path)
      
      // Store in database as BLOB
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      try {
        // Check if BLOB columns exist
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'post_images' 
          AND COLUMN_NAME = 'image_data'
        `)
        
        if (columns.length === 0) {
          console.warn('⚠️ BLOB column does not exist, running migration...')
          // Try to add the column
          try {
            await pool.execute(`
              ALTER TABLE post_images 
              ADD COLUMN image_data MEDIUMBLOB,
              ADD COLUMN mime_type VARCHAR(100),
              ADD COLUMN file_size INT
            `)
            console.log('✅ BLOB columns added')
          } catch (migError) {
            console.error('❌ Migration failed:', migError.message)
            throw new Error('BLOB columns not available')
          }
        }
        
        // Insert into post_images table with BLOB
        console.log('📝 Attempting to insert BLOB, size:', fileBuffer.length, 'bytes')
        console.log('📝 Buffer type:', typeof fileBuffer, 'Is Buffer:', Buffer.isBuffer(fileBuffer))
        
        // Ensure we're using a Buffer (not string)
        const blobBuffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
        
        await pool.execute(
          `INSERT INTO post_images (id, image_url, image_data, mime_type, file_size) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            imageId,
            `/uploads/${req.file.filename}`, // Keep URL for backward compatibility
            blobBuffer, // BLOB data - must be Buffer
            req.file.mimetype,
            req.file.size
          ]
        )
        
        console.log('✅ BLOB insert query executed')
        
        console.log('✅ Image stored as BLOB in database with ID:', imageId)
        
        // Verify BLOB was stored
        const [verify] = await pool.execute(
          'SELECT image_data IS NOT NULL as has_blob FROM post_images WHERE id = ?',
          [imageId]
        )
        
        if (verify.length > 0 && verify[0].has_blob) {
          console.log('✅ BLOB verified in database')
        } else {
          throw new Error('BLOB was not stored correctly')
        }
        
        // Return the database ID instead of file URL
        const fileUrl = `/api/images/${imageId}`
        
        res.json({
          success: true,
          data: {
            id: imageId,
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: req.file.mimetype.startsWith('image/') ? 'image' : 'video',
            storedAsBlob: true
          }
        })
      } catch (dbError) {
        console.error('❌ Database storage error:', dbError.message)
        console.error('❌ Error stack:', dbError.stack)
        // Fallback to file URL if BLOB storage fails
        const fileUrl = `/uploads/${req.file.filename}`
        res.json({
          success: true,
          data: {
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type: req.file.mimetype.startsWith('image/') ? 'image' : 'video',
            storedAsBlob: false,
            warning: `Stored as file, BLOB storage failed: ${dbError.message}`
          }
        })
      }
    } catch (error) {
      console.error('❌ Upload processing error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Upload failed'
      })
    }
  })
})

// Note: Image serving route (/api/images/:id) is now in server/index.js
// to avoid route conflicts with /api/upload

// Error handling middleware for multer errors
uploadRouter.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer error:', error)
    return res.status(400).json({
      success: false,
      error: error.message || 'File upload error'
    })
  }
  if (error) {
    console.error('❌ Upload route error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    })
  }
  next()
})
