import pool from '../database/connection.js'

export class Post {
  static async getAll(filters = {}) {
    try {
      let query = 'SELECT * FROM posts'
      const conditions = []
      const params = []

      if (filters.category && filters.category !== 'all') {
        conditions.push('category_id = ?')
        params.push(filters.category)
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }

      query += ' ORDER BY created_at DESC'

      if (filters.limit) {
        query += ' LIMIT ?'
        params.push(parseInt(filters.limit))
      }

      if (filters.offset) {
        query += ' OFFSET ?'
        params.push(parseInt(filters.offset))
      }

      const [rows] = await pool.execute(query, params)
      
      // Parse JSON fields
      return rows.map(row => ({
        ...row,
        images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
        isPro: Boolean(row.is_pro),
        businessName: row.business_name,
        category: row.category_id,
        timestamp: this.formatTimestamp(row.created_at),
      }))
    } catch (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }
  }

  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM posts WHERE id = ?',
        [id]
      )

      if (rows.length === 0) {
        return null
      }

      const row = rows[0]
      return {
        ...row,
        images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
        isPro: Boolean(row.is_pro),
        businessName: row.business_name,
        category: row.category_id,
        timestamp: this.formatTimestamp(row.created_at),
      }
    } catch (error) {
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

      const [result] = await pool.execute(
        `INSERT INTO posts (username, business_name, is_pro, profile_image, images, description, category_id, rating, recommendations, likes, comments, shares)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          username,
          businessName || username,
          isPro || false,
          profileImage || 'https://via.placeholder.com/100',
          JSON.stringify(Array.isArray(images) ? images : [images]),
          description,
          category || 'all',
          0,
          0,
          0,
          0,
          0,
        ]
      )

      return await this.getById(result.insertId)
    } catch (error) {
      throw new Error(`Failed to create post: ${error.message}`)
    }
  }

  static async like(id) {
    try {
      await pool.execute(
        'UPDATE posts SET likes = likes + 1 WHERE id = ?',
        [id]
      )

      return await this.getById(id)
    } catch (error) {
      throw new Error(`Failed to like post: ${error.message}`)
    }
  }

  static async delete(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM posts WHERE id = ?',
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

