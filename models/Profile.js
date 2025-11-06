import pool from '../database/connection.js'

export class Profile {
  static async get(username) {
    try {
      if (!username) {
        throw new Error('Username is required')
      }

      // Get user data from users table
      const [users] = await pool.execute(
        `SELECT id, username, email, display_name, profile_image, account_type, business_category, created_at
         FROM users WHERE username = ?`,
        [username]
      )

      if (users.length === 0) {
        return null
      }

      const user = users[0]

      // Get profile data from profiles table (if it exists)
      const [profiles] = await pool.execute(
        'SELECT * FROM profiles WHERE username = ?',
        [username]
      )

      // Calculate actual posts count from post_details
      const [postCounts] = await pool.execute(
        `SELECT COUNT(*) as count FROM post_details WHERE username = ?`,
        [username]
      )
      const postsCount = postCounts[0]?.count || 0

      // Get followers and following counts (if we have a followers table, otherwise use defaults)
      // For now, we'll use the profiles table values or defaults
      const followersCount = profiles.length > 0 ? (profiles[0].followers_count || 0) : 0
      const followingCount = profiles.length > 0 ? (profiles[0].following_count || 0) : 0

      // Calculate average rating from post_ratings
      const [ratingData] = await pool.execute(
        `SELECT AVG(pr.rating) as avg_rating, COUNT(*) as rating_count
         FROM post_ratings pr
         INNER JOIN post_details pd ON CAST(pr.post_id AS CHAR) = CAST(pd.id AS CHAR)
         WHERE pd.username = ?`,
        [username]
      )
      const rating = ratingData[0]?.avg_rating ? parseFloat(ratingData[0].avg_rating) : 0
      const ratingCount = ratingData[0]?.rating_count || 0

      // Merge user data with profile data
      const profileData = profiles.length > 0 ? profiles[0] : {}
      
      // Get services (if profile exists)
      let services = []
      if (profileData.id) {
        const [serviceRows] = await pool.execute(
          'SELECT * FROM profile_services WHERE profile_id = ? ORDER BY created_at DESC',
          [profileData.id]
        )
        services = serviceRows.map(service => ({
          id: service.id,
          title: service.title,
          price: service.price,
          description: service.description,
        }))
      }

      // Build the response object
      return {
        username: user.username,
        businessName: profileData.business_name || user.display_name || user.username,
        tagline: profileData.tagline || '',
        description: profileData.description || '',
        website: profileData.website || '',
        profileImage: profileData.profile_image || user.profile_image || null,
        posts: postsCount,
        followers: followersCount,
        following: followingCount,
        rating: rating,
        ratingCount: ratingCount,
        accountType: user.account_type || 'personal',
        businessCategory: user.business_category || profileData.business_category || null,
        services: services,
      }
    } catch (error) {
      console.error('❌ Profile.get error:', error)
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }
  }

  static async update(username, updates) {
    try {
      const allowedFields = {
        'business_name': 'businessName',
        'tagline': 'tagline',
        'description': 'description',
        'website': 'website',
        'profile_image': 'profileImage',
        'display_name': 'displayName',
      }

      const updateFields = []
      const values = []
      const userUpdateFields = []
      const userValues = []

      Object.keys(updates).forEach(key => {
        const dbField = allowedFields[key] || key
        if (dbField === 'profileImage' || dbField === 'profile_image') {
          // Update both users and profiles tables
          userUpdateFields.push('profile_image = ?')
          userValues.push(updates[key])
          updateFields.push('profile_image = ?')
          values.push(updates[key])
        } else if (dbField === 'displayName' || dbField === 'display_name') {
          // Update users table
          userUpdateFields.push('display_name = ?')
          userValues.push(updates[key])
        } else if (allowedFields[key]) {
          // Update profiles table
          updateFields.push(`${dbField === 'businessName' ? 'business_name' : dbField} = ?`)
          values.push(updates[key])
        }
      })

      // Update users table if needed
      if (userUpdateFields.length > 0) {
        userValues.push(username)
        await pool.execute(
          `UPDATE users SET ${userUpdateFields.join(', ')} WHERE username = ?`,
          userValues
        )
      }

      // Update profiles table if needed
      if (updateFields.length > 0) {
        values.push(username)
        await pool.execute(
          `UPDATE profiles SET ${updateFields.join(', ')} WHERE username = ?`,
          values
        )
      }

      // If no updates, just return current profile
      if (updateFields.length === 0 && userUpdateFields.length === 0) {
        return await this.get(username)
      }

      return await this.get(username)
    } catch (error) {
      console.error('❌ Profile.update error:', error)
      throw new Error(`Failed to update profile: ${error.message}`)
    }
  }

  static async getServices(profileId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM profile_services WHERE profile_id = ? ORDER BY created_at DESC',
        [profileId]
      )

      return rows.map(service => ({
        id: service.id,
        title: service.title,
        price: service.price,
        description: service.description,
      }))
    } catch (error) {
      throw new Error(`Failed to fetch services: ${error.message}`)
    }
  }

  static async addService(username, serviceData) {
    try {
      // Get profile ID
      const [profiles] = await pool.execute(
        'SELECT id FROM profiles WHERE username = ?',
        [username]
      )

      if (profiles.length === 0) {
        throw new Error('Profile not found')
      }

      const profileId = profiles[0].id

      const [result] = await pool.execute(
        'INSERT INTO profile_services (profile_id, title, price, description) VALUES (?, ?, ?, ?)',
        [
          profileId,
          serviceData.title,
          serviceData.price,
          serviceData.description,
        ]
      )

      const [services] = await pool.execute(
        'SELECT * FROM profile_services WHERE id = ?',
        [result.insertId]
      )

      return services[0]
    } catch (error) {
      throw new Error(`Failed to add service: ${error.message}`)
    }
  }

  static async updateService(serviceId, updates) {
    try {
      const updateFields = []
      const values = []

      if (updates.title) {
        updateFields.push('title = ?')
        values.push(updates.title)
      }
      if (updates.price) {
        updateFields.push('price = ?')
        values.push(updates.price)
      }
      if (updates.description) {
        updateFields.push('description = ?')
        values.push(updates.description)
      }

      if (updateFields.length === 0) {
        const [services] = await pool.execute(
          'SELECT * FROM profile_services WHERE id = ?',
          [serviceId]
        )
        return services[0]
      }

      values.push(serviceId)

      await pool.execute(
        `UPDATE profile_services SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      )

      const [services] = await pool.execute(
        'SELECT * FROM profile_services WHERE id = ?',
        [serviceId]
      )

      return services[0]
    } catch (error) {
      throw new Error(`Failed to update service: ${error.message}`)
    }
  }

  static async deleteService(serviceId) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM profile_services WHERE id = ?',
        [serviceId]
      )

      return result.affectedRows > 0
    } catch (error) {
      throw new Error(`Failed to delete service: ${error.message}`)
    }
  }

  static async getPosts(username, limit = 20) {
    try {
      // Ensure limit is an integer and use it directly in the query (safe since we control the value)
      const limitInt = parseInt(limit, 10) || 20
      
      // Join with users table to get current profile_image
      const [posts] = await pool.execute(
        `SELECT 
          p.id,
          p.username,
          p.display_name as business_name,
          CASE WHEN p.account_type = 'business' THEN 1 ELSE 0 END as is_pro,
          COALESCE(u.profile_image, p.profile_image) as profile_image,
          p.caption as description,
          p.category,
          p.rating,
          COALESCE(p.likes_count, 0) as likes,
          COALESCE(p.shares_count, 0) as shares,
          p.created_at
        FROM post_details p
        LEFT JOIN users u ON u.username = p.username
        WHERE p.username = ?
        ORDER BY p.created_at DESC
        LIMIT ${limitInt}`,
        [username]
      )

      // Get images for each post
      for (const post of posts) {
        try {
          // Use CAST to handle type mismatch between post.id and post_images.post_id
          const [images] = await pool.execute(
            `SELECT id, image_url, image_data
             FROM post_images
             WHERE CAST(post_id AS CHAR) = CAST(? AS CHAR)
             LIMIT 1`,
            [post.id]
          )
          
          if (images.length > 0) {
            post.image = images[0].image_data 
              ? `/api/images/${images[0].id}`
              : (images[0].image_url || null)
          } else {
            post.image = null
          }
        } catch (imgError) {
          console.warn('⚠️ Error fetching image for post:', post.id, imgError.message)
          post.image = null
        }
      }

      console.log(`✅ Profile.getPosts: Found ${posts.length} posts for user ${username}`)
      return posts
    } catch (error) {
      console.error('❌ Profile.getPosts error:', error)
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }
  }
}

