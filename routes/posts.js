import { Router } from 'express'
import { Post } from '../models/Post.js'
import { optionalAuth } from '../middleware/auth.js'

export const postsRouter = Router()

// Debug: Log all routes being registered
console.log('📋 Registering post routes...')
console.log('   - GET /')
console.log('   - POST /')
console.log('   - PUT /:id/like')
console.log('   - PUT /:id/rate')
console.log('   - POST /:id/comment')
console.log('   - GET /:id/comments')
console.log('   - GET /:id')
console.log('   - DELETE /:id')

// GET /api/posts - Get all posts with optional filtering
postsRouter.get('/', async (req, res) => {
  console.log('📝 POSTS ROUTE HIT - /api/posts')
  try {
    const { category, limit, offset } = req.query
    const filters = {}
    
    if (category) filters.category = category
    if (limit) filters.limit = limit
    if (offset) filters.offset = offset

    const posts = await Post.getAll(filters)
    
    console.log(`✅ Returning ${posts.length} posts`)
    res.setHeader('Content-Type', 'application/json')
    res.json({
      success: true,
      data: posts,
      total: posts.length,
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
    })
  } catch (error) {
    console.error('❌ Posts route error:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// POST /api/posts - Create a new post (uses authenticated user)
postsRouter.post('/', optionalAuth, async (req, res) => {
  console.log('📝 CREATE POST ROUTE HIT')
  console.log('📋 Request body:', req.body)
  console.log('👤 Authenticated user:', req.user?.username)
  
  try {
    // Use authenticated user's username if available, otherwise use request body
    const authenticatedUsername = req.user?.username
    
    const {
      username: bodyUsername,
      businessName,
      isPro,
      profileImage,
      images,
      video,
      description,
      category,
    } = req.body

    // Use authenticated username if available, otherwise fall back to body
    const username = authenticatedUsername || bodyUsername

    // Validate required fields
    if (!username || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: username, description',
      })
    }

    // If no images or video, return error
    if ((!images || (Array.isArray(images) && images.length === 0)) && !video) {
      return res.status(400).json({
        success: false,
        error: 'Missing media: either images or video is required',
      })
    }

    // Prepare images array - include video URL if present
    let mediaArray = []
    if (images && Array.isArray(images)) {
      mediaArray = images
    } else if (images) {
      mediaArray = [images]
    }
    
    // If video exists, add it to images array (posts table stores media in images field)
    if (video) {
      mediaArray.push(video)
    }

    // Use authenticated user's data if available
    const postData = {
      username, // Use authenticated username (prioritized) or fallback to body
      businessName: businessName || req.user?.displayName || username,
      isPro: isPro !== undefined ? isPro : (req.user?.accountType === 'business'),
      profileImage: profileImage || req.user?.profileImage || null,
      images: mediaArray,
      description,
      category,
    }
    
    console.log('📝 Final post data:', {
      username: postData.username,
      businessName: postData.businessName,
      isPro: postData.isPro,
      hasImages: postData.images.length > 0,
      descriptionLength: postData.description?.length
    })

    console.log('📝 Creating post with data:', {
      ...postData,
      images: postData.images.length,
      hasVideo: !!video
    })

    const newPost = await Post.create(postData)

    res.setHeader('Content-Type', 'application/json')
    res.status(201).json({
      success: true,
      data: newPost,
    })
  } catch (error) {
    console.error('❌ Create post error:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// PUT /api/posts/:id/like - Like/unlike a post
postsRouter.put('/:id/like', optionalAuth, async (req, res) => {
  try {
    // Use authenticated user if available, otherwise fallback to request body
    const userIdentifier = req.user?.id || req.user?.username || req.body.userId || req.body.username
    
    if (!userIdentifier) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login to like posts.',
      })
    }

    console.log(`👍 Like request for post ${req.params.id} by user ${userIdentifier}`)
    
    // Pass ID as string since post_details.id is VARCHAR
    const post = await Post.like(req.params.id, userIdentifier)
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      })
    }

    res.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('❌ Like route error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// PUT /api/posts/:id/rate - Rate a post (1-5 stars)
postsRouter.put('/:id/rate', optionalAuth, async (req, res) => {
  try {
    const { rating } = req.body
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      })
    }
    
    // Use authenticated user if available, otherwise fallback to request body
    const userIdentifier = req.user?.id || req.user?.username || req.body.userId || req.body.username
    
    if (!userIdentifier) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login to rate posts.',
      })
    }

    console.log(`⭐ Rate request for post ${req.params.id} by user ${userIdentifier} with rating ${rating}`)
    
    // Pass ID as string since post_details.id is VARCHAR
    const post = await Post.rate(req.params.id, userIdentifier, parseFloat(rating))
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      })
    }

    res.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('❌ Rate route error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// POST /api/posts/:id/comment - Add a comment to a post
// IMPORTANT: This route MUST come before GET /:id to avoid route conflicts
postsRouter.post('/:id/comment', optionalAuth, async (req, res) => {
  console.log(`💬 POST /api/posts/:id/comment route hit!`)
  console.log(`💬 Post ID: ${req.params.id}`)
  console.log(`💬 Request URL: ${req.originalUrl}`)
  console.log(`💬 Request path: ${req.path}`)
  console.log(`💬 Request method: ${req.method}`)
  console.log(`💬 Request body:`, req.body)
  try {
    const { commentText } = req.body
    
    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required',
      })
    }

    // Use authenticated user if available
    const userIdentifier = req.user?.id || req.user?.username
    const username = req.user?.username || req.body.username
    
    if (!userIdentifier || !username) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login to comment.',
      })
    }

    console.log(`💬 Comment request for post ${req.params.id} by user ${username}`)
    
    const comment = await Post.addComment(req.params.id, userIdentifier, username, commentText.trim())
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      })
    }

    res.json({
      success: true,
      data: comment,
    })
  } catch (error) {
    console.error('❌ Comment route error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// GET /api/posts/:id/comments - Get comments for a post
// IMPORTANT: This route MUST come before GET /:id to avoid route conflicts
postsRouter.get('/:id/comments', async (req, res) => {
  try {
    console.log(`💬 Get comments request for post ${req.params.id}`)
    const comments = await Post.getComments(req.params.id)
    
    res.json({
      success: true,
      data: comments,
    })
  } catch (error) {
    console.error('❌ Get comments error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// GET /api/posts/:id - Get a specific post
// IMPORTANT: This route MUST come after more specific routes like /:id/comments
postsRouter.get('/:id', async (req, res) => {
  try {
    // Pass ID as string since post_details.id is VARCHAR
    // MySQL will handle type conversion if needed
    const post = await Post.getById(req.params.id)
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      })
    }

    res.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('❌ Get post by ID error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// DELETE /api/posts/:id - Delete a post
postsRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await Post.delete(parseInt(req.params.id))
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      })
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

