import pool from '../database/connection.js'

export class Post {
  static async getAll(filters = {}) {
    try {
      // Try the complex query first, fallback to simple if joins fail
      let rows = []
      let query = ''
      let params = []
      
      try {
        // Complex query with joins - includes images, videos, likes, comments, tags, shares
        // Join with users table to get the current profile_image
        query = `
          SELECT 
            p.id,
            p.user_id,
            p.username,
            p.display_name as business_name,
            CASE WHEN p.account_type = 'business' THEN 1 ELSE 0 END as is_pro,
            COALESCE(u.profile_image, p.profile_image) as profile_image,
            p.caption as description,
            p.category,
            p.rating,
            0 as recommendations,
            COALESCE(p.likes_count, 0) as likes,
            0 as comments,
            COALESCE(p.shares_count, 0) as shares,
            p.created_at,
            p.updated_at,
            COALESCE(
              JSON_ARRAYAGG(
                DISTINCT CASE 
                  WHEN pi.image_data IS NOT NULL THEN CONCAT('/api/images/', pi.id)
                  WHEN pi.image_url IS NOT NULL THEN pi.image_url
                  ELSE NULL
                END
              ), 
              JSON_ARRAY()
            ) as images,
            p.likes,
            p.comments,
            p.shares
          FROM post_details p
          LEFT JOIN users u ON u.username = p.username
          LEFT JOIN post_images pi ON CAST(p.id AS CHAR) = CAST(pi.post_id AS CHAR)
        `
        
        const conditions = []
        params = []
        // Temporarily removed is_active filter to debug
        // conditions.push('p.is_active = 1')

        if (filters.category && filters.category !== 'all') {
          conditions.push('p.category_id = ?')
          params.push(filters.category)
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ')
        }
        query += ' GROUP BY p.id, p.user_id, p.username, p.display_name, u.profile_image, p.profile_image, p.caption, p.category, p.rating, p.likes_count, p.shares_count, p.created_at, p.updated_at'
        query += ' ORDER BY p.created_at DESC'

        if (filters.limit) {
          query += ' LIMIT ?'
          params.push(parseInt(filters.limit))
        }

        if (filters.offset) {
          query += ' OFFSET ?'
          params.push(parseInt(filters.offset))
        }

        const result = await pool.execute(query, params)
        rows = result[0]
        console.log('✅ Complex query succeeded')
      } catch (joinError) {
        console.warn('⚠️ Complex query failed, trying simple query:', joinError.message)
        console.warn('⚠️ Error details:', joinError.stack)
        // Fallback to simple query - still join with users to get current profile_image
        query = `SELECT 
          p.*,
          COALESCE(u.profile_image, p.profile_image) as profile_image
        FROM post_details p
        LEFT JOIN users u ON u.username = p.username`
        const conditions = []
        params = []

        // Don't filter by is_active initially - let's see all posts first
        if (filters.category && filters.category !== 'all') {
          conditions.push('p.category = ?')
          params.push(filters.category)
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ')
        }
        query += ' ORDER BY p.created_at DESC'

        if (filters.limit) {
          query += ' LIMIT ?'
          params.push(parseInt(filters.limit))
        }

        if (filters.offset) {
          query += ' OFFSET ?'
          params.push(parseInt(filters.offset))
        }

        console.log('🔍 Executing simple query:', query)
        console.log('📋 With params:', params)
        try {
          const result = await pool.execute(query, params)
          rows = result[0]
          console.log(`✅ Simple query returned ${rows.length} rows`)
          if (rows.length > 0) {
            console.log('📸 Sample images from first row:', rows[0].images)
          }
        } catch (queryError) {
          console.error('❌ Simple query also failed:', queryError.message)
          throw queryError
        }
      }
      
      // Ensure rows is an array
      if (!Array.isArray(rows)) {
        console.error('❌ rows is not an array:', typeof rows, rows)
        rows = []
      }
      
      console.log(`📊 Found ${rows.length} rows from database`)
      if (rows.length > 0) {
        console.log('📝 Sample row:', JSON.stringify(rows[0], null, 2))
        console.log('📸 Images from sample row:', rows[0].images, 'Type:', typeof rows[0].images)
      }
      
      // If no images from JOIN, fetch all related data for these posts separately
      const postIds = rows.map(row => row.id).filter(id => id != null)
      let imagesMap = {}
      let videosMap = {}
      let tagsMap = {}
      let likesMap = {}
      let commentsMap = {}
      let ratingsMap = {}
      
      if (postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',')
        const postIdStrings = postIds.map(String)
        
        // Fetch images
        try {
          const [imageRows] = await pool.execute(
            `SELECT 
              post_id,
              CASE 
                WHEN image_data IS NOT NULL THEN CONCAT('/api/images/', id)
                WHEN image_url IS NOT NULL THEN image_url
                ELSE NULL
              END as image_url
            FROM post_images 
            WHERE CAST(post_id AS CHAR) IN (${placeholders})`,
            postIdStrings
          )
          imageRows.forEach(img => {
            const postId = String(img.post_id)
            if (!imagesMap[postId]) imagesMap[postId] = []
            if (img.image_url) imagesMap[postId].push(img.image_url)
          })
          console.log(`✅ Fetched images for ${Object.keys(imagesMap).length} posts`)
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch images separately:', fetchError.message)
        }
        
        // Fetch videos
        try {
          const [videoRows] = await pool.execute(
            `SELECT 
              post_id,
              CASE 
                WHEN video_data IS NOT NULL THEN CONCAT('/api/videos/', id)
                WHEN video_url IS NOT NULL THEN video_url
                ELSE NULL
              END as video_url
            FROM post_videos 
            WHERE CAST(post_id AS CHAR) IN (${placeholders})`,
            postIdStrings
          )
          videoRows.forEach(vid => {
            const postId = String(vid.post_id)
            if (!videosMap[postId]) videosMap[postId] = []
            if (vid.video_url) videosMap[postId].push(vid.video_url)
          })
          console.log(`✅ Fetched videos for ${Object.keys(videosMap).length} posts`)
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch videos separately:', fetchError.message)
        }
        
        // Fetch tags
        try {
          const [tagRows] = await pool.execute(
            `SELECT post_id, tag FROM post_tags 
            WHERE CAST(post_id AS CHAR) IN (${placeholders})`,
            postIdStrings
          )
          tagRows.forEach(t => {
            const postId = String(t.post_id)
            if (!tagsMap[postId]) tagsMap[postId] = []
            if (t.tag) tagsMap[postId].push(t.tag)
          })
          console.log(`✅ Fetched tags for ${Object.keys(tagsMap).length} posts`)
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch tags separately:', fetchError.message)
        }
        
        // Fetch likes counts
        try {
          const [likeRows] = await pool.execute(
            `SELECT post_id, COUNT(*) as count FROM post_likes 
            WHERE CAST(post_id AS CHAR) IN (${placeholders})
            GROUP BY post_id`,
            postIdStrings
          )
          likeRows.forEach(l => {
            likesMap[String(l.post_id)] = parseInt(l.count) || 0
          })
          console.log(`✅ Fetched likes for ${Object.keys(likesMap).length} posts`)
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch likes separately:', fetchError.message)
        }
        
        // Fetch comments counts
        // Handle both string and numeric post IDs (database uses VARCHAR post_id)
        try {
          if (postIdStrings.length > 0) {
            const placeholders = postIdStrings.map(() => '?').join(',')
            // Query using string post IDs (comments.post_id is VARCHAR)
            const [commentRows] = await pool.execute(
              `SELECT post_id, COUNT(*) as count FROM comments 
              WHERE post_id IN (${placeholders}) AND is_active = 1
              GROUP BY post_id`,
              postIdStrings
            )
            commentRows.forEach(c => {
              const postIdStr = String(c.post_id)
              // Directly map using string post ID
              if (postIdStrings.includes(postIdStr)) {
                commentsMap[postIdStr] = parseInt(c.count) || 0
              }
            })
            console.log(`✅ Fetched comments for ${Object.keys(commentsMap).length} posts`)
          }
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch comments separately:', fetchError.message)
        }
        
        // Fetch average ratings
        try {
          const [ratingRows] = await pool.execute(
            `SELECT post_id, AVG(rating) as avg_rating, COUNT(*) as count FROM post_ratings 
            WHERE CAST(post_id AS CHAR) IN (${placeholders})
            GROUP BY post_id`,
            postIdStrings
          )
          ratingRows.forEach(r => {
            ratingsMap[String(r.post_id)] = {
              avg: parseFloat(r.avg_rating) || 0,
              count: parseInt(r.count) || 0
            }
          })
          console.log(`✅ Fetched ratings for ${Object.keys(ratingsMap).length} posts`)
        } catch (fetchError) {
          console.warn('⚠️ Could not fetch ratings separately:', fetchError.message)
        }
      }
      
      // Transform database rows to match frontend expectations
      return rows.map((row, index) => {
        try {
          if (!row) {
            console.warn(`⚠️ Row ${index} is null or undefined`)
            return null
          }
          
          // Handle images - from post_images table (via JOIN) or fetch separately
          let images = []
          try {
            // If images came from JOIN (complex query), they'll be in row.images
            // If not (simple query), we need to fetch them separately
            if (row.images) {
              let parsedImages = []
              if (typeof row.images === 'string') {
                try {
                  parsedImages = JSON.parse(row.images)
                } catch (parseError) {
                  console.warn('⚠️ Error parsing images JSON string:', parseError)
                  parsedImages = []
                }
              } else if (Array.isArray(row.images)) {
                parsedImages = row.images
              } else {
                // If it's not an array or string, it might be an object - skip it
                console.warn('⚠️ Images is not an array or string:', typeof row.images, row.images)
                parsedImages = []
              }
              
              // Filter out null/undefined/empty and ensure all items are strings
              // If an item is an object, try to extract a URL from it
              images = parsedImages
                .filter(img => img !== null && img !== undefined && img !== '')
                .map(img => {
                  // If it's already a string, return as is
                  if (typeof img === 'string') {
                    return img
                  }
                  // If it's an object, try to extract URL
                  if (typeof img === 'object' && img !== null) {
                    // Try common object structures: {url}, {data}, {type, data}
                    const extractedUrl = img.url || img.data || img.imageUrl
                    if (extractedUrl && typeof extractedUrl === 'string') {
                      return extractedUrl
                    }
                    // If object has no valid URL, skip it
                    return null
                  }
                  // If it's a number or other type, try to convert to string
                  if (img !== null && img !== undefined) {
                    const str = String(img)
                    return str && str !== 'null' && str !== 'undefined' ? str : null
                  }
                  return null
                })
                .filter(img => img !== null && img !== undefined && img !== '' && typeof img === 'string')
            }
          } catch (e) {
            console.warn('⚠️ Error parsing images:', e)
            images = []
          }
          
          // Ensure images is always an array (even if empty)
          if (!Array.isArray(images)) {
            images = []
          }
          
          // If no images from JOIN, use images from separate fetch
          if (images.length === 0 && row.id && imagesMap[String(row.id)]) {
            images = imagesMap[String(row.id)]
            console.log(`✅ Using separately fetched images for post ${row.id}:`, images)
          }
          
          // Handle videos - from JOIN or separate fetch
          let videos = []
          try {
            if (row.videos) {
              if (typeof row.videos === 'string') {
                videos = JSON.parse(row.videos)
              } else if (Array.isArray(row.videos)) {
                videos = row.videos
              }
              videos = videos.filter(vid => vid && vid !== null && vid !== '')
            }
          } catch (e) {
            videos = []
          }
          // If no videos from JOIN, use from separate fetch
          if (videos.length === 0 && row.id && videosMap[String(row.id)]) {
            videos = videosMap[String(row.id)]
            console.log(`✅ Using separately fetched videos for post ${row.id}:`, videos)
          }
          
          // Handle tags - from JOIN or separate fetch
          let tags = []
          try {
            if (row.tags) {
              if (typeof row.tags === 'string') {
                tags = JSON.parse(row.tags)
              } else if (Array.isArray(row.tags)) {
                tags = row.tags
              }
              tags = tags.filter(tag => tag && tag !== null && tag !== '')
            }
          } catch (e) {
            tags = []
          }
          // If no tags from JOIN, use from separate fetch
          if (tags.length === 0 && row.id && tagsMap[String(row.id)]) {
            tags = tagsMap[String(row.id)]
            console.log(`✅ Using separately fetched tags for post ${row.id}:`, tags)
          }
          
          // If no images or videos, keep images as empty array
          // Frontend will handle displaying "No image available" placeholder
          if (!Array.isArray(images)) {
            images = []
          }
          if (!Array.isArray(videos)) {
            videos = []
          }
          if (!Array.isArray(tags)) {
            tags = []
          }
          
          // Get likes and comments counts from separate fetch or fallback to row values
          let likesCount = row.likes || row.likes_count || 0
          if (row.id && likesMap[String(row.id)] !== undefined) {
            likesCount = likesMap[String(row.id)]
          }
          
          let commentsCount = row.comments || 0
          if (row.id && commentsMap[String(row.id)] !== undefined) {
            commentsCount = commentsMap[String(row.id)]
          }

          const createdDate = row.created_at || row.createdAt || new Date()
          
          // Ensure all values are primitives, not objects
          const safeString = (value, fallback = '') => {
            if (value == null) return fallback
            if (typeof value === 'object') {
              console.warn('⚠️ Server: Converting object to string:', value)
              return fallback
            }
            return String(value)
          }

          const safeNumber = (value, fallback = 0) => {
            if (value == null) return fallback
            if (typeof value === 'object') {
              console.warn('⚠️ Server: Converting object to number:', value)
              return fallback
            }
            const num = Number(value)
            return isNaN(num) ? fallback : num
          }

          return {
            id: safeString(row.id || row.ID || `post-${index}`),
            user_id: safeString(row.user_id || row.userId || ''),
            username: safeString(row.username || 'unknown'),
            businessName: safeString(row.business_name || row.display_name || row.businessName || row.username || 'Business'),
            isPro: Boolean(row.is_pro || row.isPro || (row.account_type === 'business') || false),
            profileImage: safeString(row.profile_image || row.profileImage || 'https://via.placeholder.com/100'),
            images: Array.isArray(images) ? images : [],
            videos: Array.isArray(videos) ? videos : [],
            tags: Array.isArray(tags) ? tags : [],
            rating: (() => {
              // Use rating from post_ratings table if available, otherwise use row.rating
              if (row.id && ratingsMap[String(row.id)]) {
                return safeNumber(ratingsMap[String(row.id)].avg, 0)
              }
              return safeNumber(row.rating || 0, 0)
            })(),
            ratingCount: (() => {
              // Get rating count from post_ratings table if available
              if (row.id && ratingsMap[String(row.id)]) {
                return safeNumber(ratingsMap[String(row.id)].count, 0)
              }
              return 0
            })(),
            recommendations: safeNumber(row.recommendations || 0),
            description: safeString(row.caption || row.description || ''),
            likes: safeNumber(likesCount),
            comments: safeNumber(commentsCount),
            shares: safeNumber(row.shares || row.shares_count || 0),
            timestamp: safeString(Post.formatTimestamp(createdDate)),
            category: safeString(row.category || 'all'),
            createdAt: createdDate,
          }
        } catch (rowError) {
          console.error(`❌ Error processing row ${index}:`, rowError)
          console.error('Row data:', row)
          return null
        }
      }).filter(post => post !== null)
    } catch (error) {
      console.error('Post.getAll error:', error)
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }
  }

  static async getById(id) {
    try {
      // First, get the post itself - join with users to get current profile_image
      // Use CAST to ensure type-safe matching since post_details.id is VARCHAR
      const [postRows] = await pool.execute(
        `SELECT 
          p.id,
          p.user_id,
          p.username,
          p.display_name as business_name,
          CASE WHEN p.account_type = 'business' THEN 1 ELSE 0 END as is_pro,
          COALESCE(u.profile_image, p.profile_image) as profile_image,
          p.caption as description,
          p.category,
          p.rating,
          0 as recommendations,
          COALESCE(p.likes_count, 0) as likes,
          0 as comments,
          COALESCE(p.shares_count, 0) as shares,
          p.created_at,
          p.updated_at
        FROM post_details p
        LEFT JOIN users u ON u.username = p.username
        WHERE CAST(p.id AS CHAR) = CAST(? AS CHAR)`,
        [String(id)]
      )

      if (postRows.length === 0) {
        return null
      }

      const row = postRows[0]
      const postId = row.id
      
      // Fetch images separately with type-safe JOIN
      let images = []
      try {
        const [imageRows] = await pool.execute(
          `SELECT 
            CASE 
              WHEN image_data IS NOT NULL THEN CONCAT('/api/images/', id)
              WHEN image_url IS NOT NULL THEN image_url
              ELSE NULL
            END as image_url
          FROM post_images 
          WHERE CAST(post_id AS CHAR) = ?`,
          [String(postId)]
        )
        images = imageRows
          .map(img => img.image_url)
          .filter(url => url !== null && url !== undefined && url !== '')
      } catch (e) {
        console.warn('⚠️ Error fetching images:', e)
        images = []
      }
      
      // Fetch videos separately
      let videos = []
      try {
        const [videoRows] = await pool.execute(
          `SELECT 
            CASE 
              WHEN video_data IS NOT NULL THEN CONCAT('/api/videos/', id)
              WHEN video_url IS NOT NULL THEN video_url
              ELSE NULL
            END as video_url
          FROM post_videos 
          WHERE CAST(post_id AS CHAR) = ?`,
          [String(postId)]
        )
        videos = videoRows
          .map(vid => vid.video_url)
          .filter(url => url !== null && url !== undefined && url !== '')
      } catch (e) {
        console.warn('⚠️ Error fetching videos:', e)
        videos = []
      }
      
      // Fetch tags separately
      let tags = []
      try {
        const [tagRows] = await pool.execute(
          `SELECT tag FROM post_tags 
          WHERE CAST(post_id AS CHAR) = ?`,
          [String(postId)]
        )
        tags = tagRows
          .map(t => t.tag)
          .filter(tag => tag !== null && tag !== undefined && tag !== '')
      } catch (e) {
        console.warn('⚠️ Error fetching tags:', e)
        tags = []
      }
      
      // Fetch likes count separately
      let likesCount = row.likes || 0
      try {
        const [likeRows] = await pool.execute(
          `SELECT COUNT(*) as count FROM post_likes 
          WHERE CAST(post_id AS CHAR) = ?`,
          [String(postId)]
        )
        if (likeRows.length > 0) {
          likesCount = parseInt(likeRows[0].count) || row.likes || 0
        }
      } catch (e) {
        console.warn('⚠️ Error fetching likes:', e)
        // Use likes from posts table as fallback
      }
      
      // Fetch comments count separately
      let commentsCount = row.comments || 0
      try {
        const [commentRows] = await pool.execute(
          `SELECT COUNT(*) as count FROM comments 
          WHERE CAST(post_id AS CHAR) = ?`,
          [String(postId)]
        )
        if (commentRows.length > 0) {
          commentsCount = parseInt(commentRows[0].count) || row.comments || 0
        }
      } catch (e) {
        console.warn('⚠️ Error fetching comments:', e)
        // Use comments from posts table as fallback
      }
      
      // Fetch average rating from post_ratings table
      let avgRating = parseFloat(row.rating || 0) || 0
      let ratingCount = 0
      try {
        const [ratingRows] = await pool.execute(
          `SELECT AVG(rating) as avg_rating, COUNT(*) as count 
           FROM post_ratings 
           WHERE CAST(post_id AS CHAR) = ?`,
          [String(postId)]
        )
        if (ratingRows.length > 0 && ratingRows[0].avg_rating !== null) {
          avgRating = parseFloat(ratingRows[0].avg_rating) || 0
          ratingCount = parseInt(ratingRows[0].count) || 0
        }
      } catch (e) {
        console.warn('⚠️ Error fetching ratings:', e)
        // Use rating from post_details as fallback
      }

      return {
        id: String(row.id),
        user_id: String(row.user_id || ''),
        username: row.username || 'unknown',
        businessName: row.business_name || row.username || 'Business',
        isPro: Boolean(row.is_pro || false),
        profileImage: row.profile_image || 'https://via.placeholder.com/100',
        images: Array.isArray(images) ? images : [],
        videos: Array.isArray(videos) ? videos : [],
        tags: Array.isArray(tags) ? tags : [],
        rating: avgRating,
        ratingCount: ratingCount,
        recommendations: parseInt(row.recommendations || 0) || 0,
        description: row.description || row.caption || '',
        likes: likesCount,
        comments: commentsCount,
        shares: parseInt(row.shares || 0) || 0,
        timestamp: Post.formatTimestamp(row.created_at || new Date()),
        category: row.category || 'all',
        createdAt: row.created_at || new Date(),
      }
    } catch (error) {
      console.error('Post.getById error:', error)
      throw new Error(`Failed to fetch post: ${error.message}`)
    }
  }

  static async create(postData) {
    try {
      const {
        username,
        businessName,
        isPro,
        profileImage,
        images,
        description,
        category,
      } = postData

      console.log('📝 Post.create called with:', {
        username,
        businessName,
        isPro,
        hasImages: !!images,
        descriptionLength: description?.length,
        category
      })

      // Ensure images is an array
      let imagesArray = []
      if (images) {
        if (Array.isArray(images)) {
          imagesArray = images
        } else {
          imagesArray = [images]
        }
      }

      // Validate required fields
      if (!username || !description) {
        throw new Error('Username and description are required')
      }

      if (imagesArray.length === 0) {
        throw new Error('At least one image or video is required')
      }

      // Get or create user in users table
      let userId = null
      try {
        // Check if user exists
        const [userCheck] = await pool.execute(
          'SELECT id FROM users WHERE username = ? LIMIT 1',
          [username]
        )
        
        if (userCheck.length > 0) {
          userId = userCheck[0].id
          console.log('✅ Found existing user with ID:', userId)
        } else {
          // Create user if doesn't exist
          // Users table: id (varchar), username, email (required), password, display_name, account_type, business_category, phone, profile_image, bio
          // Use format like "user-123" to match existing pattern
          const timestamp = Date.now()
          const newUserId = `user-${timestamp}`
          
          console.log('📝 Attempting to create user with ID:', newUserId)
          try {
            const [userResult] = await pool.execute(
              `INSERT INTO users (id, username, email, password, display_name, profile_image, account_type) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                newUserId,
                username,
                `${username}@example.com`, // Generate email from username
                'temp_password', // Temporary password, should be hashed in production
                businessName || username,
                profileImage || 'https://via.placeholder.com/100',
                isPro ? 'business' : 'personal'
              ]
            )
            console.log('✅ User insert result:', userResult)
            userId = newUserId
            console.log('✅ Created user with ID:', userId)
            
            // Verify user was created - wait a moment for commit
            await new Promise(resolve => setTimeout(resolve, 200))
            const [verifyUser] = await pool.execute(
              'SELECT id FROM users WHERE id = ?',
              [userId]
            )
            console.log('🔍 User verification result:', verifyUser.length, 'rows found')
            if (verifyUser.length === 0) {
              console.error('❌ User verification failed - user not found')
              throw new Error('User creation verification failed - user not found after insert')
            }
            console.log('✅ User verified in database')
          } catch (userInsertError) {
            console.warn('⚠️ User insert failed:', userInsertError.message)
            // If duplicate, try to get existing user
            if (userInsertError.message.includes('Duplicate') || userInsertError.message.includes('PRIMARY')) {
              const [existingUser] = await pool.execute(
                'SELECT id FROM users WHERE username = ? LIMIT 1',
                [username]
              )
              if (existingUser.length > 0) {
                userId = existingUser[0].id
                console.log('✅ Found existing user after duplicate error:', userId)
              } else {
                throw new Error('Could not create or find user')
              }
            } else {
              throw userInsertError
            }
          }
        }
      } catch (userError) {
        console.error('❌ User creation/get failed:', userError.message)
        console.error('❌ User error stack:', userError.stack)
        // Don't throw here - let the post creation fail with a clearer error
        // But ensure userId is null so we don't proceed
        userId = null
        throw new Error(`Failed to get or create user: ${userError.message}`)
      }
      
      if (!userId) {
        console.error('❌ User ID is null after user creation/get attempt')
        throw new Error('User ID is required but could not be obtained')
      }
      
      console.log('✅ Using user ID for post:', userId)

      // Insert post into the actual posts table (not post_details VIEW)
      // Actual posts table structure: id (VARCHAR(36)), user_id (VARCHAR(36)), caption (TEXT), category (VARCHAR(100)), rating, shares_count, etc.
      // Generate a unique post ID
      const postId = `post-${Date.now()}-${Math.random().toString(36).substring(7)}`
      
      const insertQuery = `INSERT INTO posts (id, user_id, caption, category, rating, shares_count, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      
      const insertParams = [
        postId,
        userId || `user-${username}`, // Use user_id from users table
        description, // caption
        category || 'all', // category
        0, // rating
        0, // shares_count
        1  // is_active
      ]

      let result
      try {
        [result] = await pool.execute(insertQuery, insertParams)
        // postId is already set from the INSERT above (not auto-generated)
        console.log('✅ Post inserted with ID:', postId)
        
        // Insert images into post_images table
        // Note: If imageUrl is a database ID (starts with img_), we can link it
        // If it's a URL, we'll store it as URL (backward compatibility)
        if (imagesArray.length > 0) {
          for (const imageUrl of imagesArray) {
            try {
                // Check if it's a database image ID (from BLOB storage)
                if (imageUrl.includes('/api/images/')) {
                  const imageId = imageUrl.split('/api/images/')[1]
                  // Update existing image record to link to this post
                  // Convert postId to string since post_images.post_id is VARCHAR(36) in the actual database
                  const postIdStr = String(postId)
                  await pool.execute(
                    `UPDATE post_images SET post_id = ? WHERE id = ?`,
                    [postIdStr, imageId]
                  )
                  console.log('✅ Linked image from database:', imageId, 'to post:', postIdStr)
              } else {
                // Store as URL (backward compatibility or external URLs)
                // Convert postId to string since post_images.post_id is VARCHAR(36) in the actual database
                const postIdStr = String(postId)
                await pool.execute(
                  `INSERT INTO post_images (id, post_id, image_url) VALUES (?, ?, ?)`,
                  [String(Date.now() + Math.random()), postIdStr, imageUrl]
                )
                console.log('✅ Inserted image URL:', imageUrl, 'for post:', postIdStr)
              }
            } catch (imgError) {
              console.warn('⚠️ Could not insert image:', imgError.message)
            }
          }
        }
        
        // postId is already set from result.insertId above
      } catch (insertError) {
        console.error('❌ Post insert error:', insertError.message)
        throw insertError
      }

      console.log('✅ Post created with ID:', postId)
      
      // Try to get the post, but if it fails, return a basic structure
      try {
        return await this.getById(postId)
      } catch (getError) {
        console.warn('⚠️ Could not retrieve post after creation, returning basic structure:', getError.message)
        // Return a basic post structure
        return {
          id: postId,
          username: username,
          businessName: businessName || username,
          isPro: isPro || false,
          profileImage: profileImage || 'https://via.placeholder.com/100',
          images: imagesArray,
          rating: 0,
          recommendations: 0,
          description: description,
          likes: 0,
          comments: 0,
          shares: 0,
          timestamp: 'just now',
          category: category || 'all',
          createdAt: new Date()
        }
      }
    } catch (error) {
      console.error('❌ Post.create error:', error)
      throw new Error(`Failed to create post: ${error.message}`)
    }
  }

  static async like(id, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required to like a post')
      }

      // Convert post_id to string for type-safe comparison
      const postIdStr = String(id)
      const userIdStr = String(userId)

      // Check if the user already liked this post
      const [existingLikes] = await pool.execute(
        `SELECT id FROM post_likes 
         WHERE CAST(post_id AS CHAR) = ? AND user_id = ?`,
        [postIdStr, userIdStr]
      )

      if (existingLikes.length > 0) {
        // User already liked this post - unlike it
        await pool.execute(
          `DELETE FROM post_likes 
           WHERE CAST(post_id AS CHAR) = ? AND user_id = ?`,
          [postIdStr, userIdStr]
        )
        
        // Note: post_details is a VIEW, so we can't update likes_count directly
        // The likes count will be calculated from post_likes table when fetching posts
        
        console.log(`✅ User ${userIdStr} unliked post ${postIdStr}`)
      } else {
        // User hasn't liked this post - like it
        // Use post_id as string since post_likes.post_id is VARCHAR
        await pool.execute(
          `INSERT INTO post_likes (post_id, user_id) 
           VALUES (?, ?)`,
          [postIdStr, userIdStr]
        )
        
        // Note: post_details is a VIEW, so we can't update likes_count directly
        // The likes count will be calculated from post_likes table when fetching posts
        
        console.log(`✅ User ${userIdStr} liked post ${postIdStr}`)
        
        // Create notification for post owner (only when liking, not unliking)
        try {
          const { notifyPostLike } = await import('../utils/notifications.js')
          await notifyPostLike(id, userIdStr)
        } catch (notifError) {
          console.warn('⚠️ Could not create like notification:', notifError.message)
        }
      }

      // Return the updated post
      return await this.getById(id)
    } catch (error) {
      console.error('❌ Post.like error:', error)
      throw new Error(`Failed to like post: ${error.message}`)
    }
  }

  static async rate(id, userId, rating) {
    try {
      if (!userId) {
        throw new Error('User ID is required to rate a post')
      }

      if (rating < 0 || rating > 5) {
        throw new Error('Rating must be between 0 and 5')
      }

      // Convert post_id to string for type-safe comparison
      const postIdStr = String(id)
      const userIdStr = String(userId)
      const ratingValue = parseFloat(rating)

      // Check if the user already rated this post
      const [existingRatings] = await pool.execute(
        `SELECT id, rating FROM post_ratings 
         WHERE CAST(post_id AS CHAR) = ? AND user_id = ?`,
        [postIdStr, userIdStr]
      )

      if (existingRatings.length > 0) {
        // User already rated this post - update the rating
        await pool.execute(
          `UPDATE post_ratings 
           SET rating = ?, updated_at = CURRENT_TIMESTAMP
           WHERE CAST(post_id AS CHAR) = ? AND user_id = ?`,
          [ratingValue, postIdStr, userIdStr]
        )
        
        console.log(`✅ User ${userIdStr} updated rating for post ${postIdStr} to ${ratingValue}`)
        
        // Create notification for post owner (when rating is updated)
        try {
          const { notifyPostRating } = await import('../utils/notifications.js')
          const notification = await notifyPostRating(id, userIdStr, ratingValue)
          if (!notification) {
            console.log(`ℹ️ No notification created for rating update (may be user's own post)`)
          }
        } catch (notifError) {
          console.error('❌ Could not create rating notification:', notifError.message)
          console.error('❌ Notification error stack:', notifError.stack)
        }
      } else {
        // User hasn't rated this post - insert new rating
        // Use post_id as string to handle large IDs (like timestamps)
        await pool.execute(
          `INSERT INTO post_ratings (post_id, user_id, rating) 
           VALUES (?, ?, ?)`,
          [postIdStr, userIdStr, ratingValue]
        )
        
        console.log(`✅ User ${userIdStr} rated post ${postIdStr} with ${ratingValue}`)
        
        // Create notification for post owner (when rating is first created)
        try {
          const { notifyPostRating } = await import('../utils/notifications.js')
          const notification = await notifyPostRating(id, userIdStr, ratingValue)
          if (!notification) {
            console.log(`ℹ️ No notification created for rating (may be user's own post)`)
          }
        } catch (notifError) {
          console.error('❌ Could not create rating notification:', notifError.message)
          console.error('❌ Notification error stack:', notifError.stack)
        }
      }

      // Calculate average rating for this post
      const [ratingRows] = await pool.execute(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as count 
         FROM post_ratings 
         WHERE CAST(post_id AS CHAR) = ?`,
        [postIdStr]
      )

      const avgRating = ratingRows[0]?.avg_rating ? parseFloat(ratingRows[0].avg_rating).toFixed(2) : 0
      const ratingCount = ratingRows[0]?.count || 0

      console.log(`📊 Post ${postIdStr} average rating: ${avgRating} (${ratingCount} ratings)`)

      // Return the updated post with new average rating
      const post = await this.getById(id)
      if (post) {
        post.rating = parseFloat(avgRating)
        post.ratingCount = parseInt(ratingCount)
      }
      
      return post
    } catch (error) {
      console.error('❌ Post.rate error:', error)
      throw new Error(`Failed to rate post: ${error.message}`)
    }
  }

  static async addComment(postId, userId, username, commentText) {
    try {
      // Extract numeric post ID from string format if needed
      let numericPostId = postId
      if (typeof postId === 'string') {
        // If it's already a number string, use it
        if (/^\d+$/.test(postId)) {
          numericPostId = parseInt(postId, 10)
        } else {
          // If it's in format "post-123-abc", extract the number
          const match = postId.match(/post-(\d+)/)
          if (match) {
            numericPostId = parseInt(match[1], 10)
          } else {
            // Try to extract any number from the string
            const numMatch = postId.match(/(\d+)/)
            if (numMatch) {
              numericPostId = parseInt(numMatch[1], 10)
            } else {
              throw new Error(`Invalid post ID format: ${postId}`)
            }
          }
        }
      }

      // Verify post exists - try both string and numeric ID formats
      let postExists = false
      let actualPostId = postId // Keep original ID format
      
      // First try with original ID (string format)
      const [postRowsString] = await pool.execute(
        'SELECT id FROM posts WHERE id = ?',
        [postId]
      )
      
      if (postRowsString.length > 0) {
        postExists = true
        actualPostId = postId // Use string ID
      } else {
        // Try with numeric ID (in case posts table uses numeric IDs)
        const [postRowsNumeric] = await pool.execute(
          'SELECT id FROM posts WHERE id = ?',
          [numericPostId]
        )
        
        if (postRowsNumeric.length > 0) {
          postExists = true
          actualPostId = numericPostId // Use numeric ID
        }
      }

      if (!postExists) {
        console.log(`⚠️ Post not found with ID: ${postId} (tried as string) or ${numericPostId} (tried as numeric)`)
        return null
      }

      // Insert comment - use the actual post ID format that exists
      // Note: Actual table uses 'content' not 'comment_text', and doesn't have 'username' column
      // Generate ID for comments table (VARCHAR(36))
      const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      await pool.execute(
        `INSERT INTO comments (id, post_id, user_id, content, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [commentId, actualPostId, userId, commentText]
      )

      // Update post comments count - try both formats
      try {
        await pool.execute(
          `UPDATE posts SET comments = COALESCE(comments, 0) + 1 WHERE id = ?`,
          [actualPostId]
        )
      } catch (updateError) {
        console.warn('⚠️ Could not update post comments count:', updateError.message)
      }

      // Get the created comment
      const [commentRows] = await pool.execute(
        `SELECT c.*, u.username 
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ? AND c.user_id = ? AND c.content = ?
         ORDER BY c.created_at DESC LIMIT 1`,
        [actualPostId, userId, commentText]
      )

      if (commentRows.length > 0) {
        // Create notification for post owner
        try {
          const { notifyPostComment } = await import('../utils/notifications.js')
          await notifyPostComment(actualPostId, username, commentText)
        } catch (notifError) {
          console.warn('⚠️ Could not create comment notification:', notifError.message)
        }

        // Convert Buffer to string if needed
        const comment = commentRows[0]
        let contentStr = comment.content
        if (Buffer.isBuffer(contentStr)) {
          contentStr = contentStr.toString('utf8')
        } else if (typeof contentStr !== 'string') {
          contentStr = String(contentStr || '')
        }
        
        return {
          ...comment,
          content: contentStr,
          comment_text: contentStr // Also include comment_text for frontend compatibility
        }
      }

      return null
    } catch (error) {
      console.error('❌ Post.addComment error:', error)
      throw new Error(`Failed to add comment: ${error.message}`)
    }
  }

  static async getComments(postId) {
    try {
      // Extract numeric post ID from string format if needed
      let numericPostId = postId
      if (typeof postId === 'string') {
        if (/^\d+$/.test(postId)) {
          numericPostId = parseInt(postId, 10)
        } else {
          const match = postId.match(/post-(\d+)/)
          if (match) {
            numericPostId = parseInt(match[1], 10)
          } else {
            const numMatch = postId.match(/(\d+)/)
            if (numMatch) {
              numericPostId = parseInt(numMatch[1], 10)
            } else {
              throw new Error(`Invalid post ID format: ${postId}`)
            }
          }
        }
      }

      // Try both string and numeric post ID formats
      // Join with users table to get username since comments table doesn't have it
      let [commentRows] = await pool.execute(
        `SELECT c.*, u.username 
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ? AND c.is_active = 1
         ORDER BY c.created_at ASC`,
        [postId]
      )

      // If no results with string ID, try numeric
      if (commentRows.length === 0 && postId !== numericPostId) {
        [commentRows] = await pool.execute(
          `SELECT c.*, u.username 
           FROM comments c
           LEFT JOIN users u ON u.id = c.user_id
           WHERE c.post_id = ? AND c.is_active = 1
           ORDER BY c.created_at ASC`,
          [numericPostId]
        )
      }

      // Map database columns to frontend expected format
      return commentRows.map(comment => {
        // Convert Buffer to string if needed (TEXT fields come as Buffers)
        let contentStr = comment.content
        if (Buffer.isBuffer(contentStr)) {
          contentStr = contentStr.toString('utf8')
        } else if (typeof contentStr !== 'string') {
          contentStr = String(contentStr || '')
        }
        
        return {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          username: comment.username || 'unknown',
          comment_text: contentStr, // Map 'content' to 'comment_text' for frontend
          content: contentStr,
          created_at: comment.created_at,
          updated_at: comment.updated_at
        }
      })
    } catch (error) {
      console.error('❌ Post.getComments error:', error)
      throw new Error(`Failed to get comments: ${error.message}`)
    }
  }

  static async delete(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM post_details WHERE id = ?',
        [id]
      )

      return result.affectedRows > 0
    } catch (error) {
      throw new Error(`Failed to delete post: ${error.message}`)
    }
  }

  static formatTimestamp(date) {
    const now = new Date()
    const postDate = new Date(date)
    const diffMs = now - postDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return postDate.toLocaleDateString()
  }
}

