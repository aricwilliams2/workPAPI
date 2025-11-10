import pool from '../database/connection.js'

export class Notification {
  static async getAll(filters = {}) {
    try {
      let query = 'SELECT * FROM notifications'
      const conditions = []
      const params = []

      // Filter by recipient username (user-specific notifications)
      if (filters.recipientUsername) {
        conditions.push('(recipient_username = ? OR recipient_username IS NULL)')
        params.push(filters.recipientUsername)
      }

      if (filters.type) {
        conditions.push('type = ?')
        params.push(filters.type)
      }

      if (filters.unread === 'true') {
        conditions.push('is_read = ?')
        params.push(0) // is_read is TINYINT(1), 0 = false, 1 = true
      }

      query += conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
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
      
      // Get unread count for the recipient
      let unreadQuery = 'SELECT COUNT(*) as count FROM notifications WHERE is_read = ?'
      const unreadParams = [0] // is_read is TINYINT(1), 0 = false (unread), 1 = true (read)
      
      if (filters.recipientUsername) {
        unreadQuery += ' AND (recipient_username = ? OR recipient_username IS NULL)'
        unreadParams.push(filters.recipientUsername)
      }
      
      const [unreadCount] = await pool.execute(unreadQuery, unreadParams)

      return {
        data: rows.map(row => {
          // Parse metadata if it's a JSON string
          let metadata = null
          try {
            if (row.metadata) {
              metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
            }
          } catch (e) {
            console.warn('⚠️ Could not parse metadata JSON:', e.message)
            metadata = null
          }
          
          return {
            ...row,
            // Map database columns to expected format
            username: row.user_id || row.username || 'Unknown', // Try user_id first, fallback to username
            message: row.content || row.message || '', // content is the actual column name
            avatar: metadata?.avatar || row.avatar || null, // avatar might be in metadata
            hasAction: Boolean(metadata?.hasAction || row.has_action || false),
            read: Boolean(row.is_read || false), // is_read is the actual column name
            timestamp: this.formatTimestamp(row.created_at),
            metadata: metadata, // Also include parsed metadata
          }
        }),
        unreadCount: unreadCount[0].count,
      }
    } catch (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }
  }

  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE id = ?',
        [id]
      )

      if (rows.length === 0) {
        return null
      }

      const row = rows[0]
      
      // Parse metadata if it's a JSON string
      let metadata = null
      try {
        if (row.metadata) {
          metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        }
      } catch (e) {
        console.warn('⚠️ Could not parse metadata JSON:', e.message)
        metadata = null
      }
      
      return {
        ...row,
        // Map database columns to expected format
        username: row.user_id || row.username || 'Unknown',
        message: row.content || row.message || '',
        avatar: metadata?.avatar || row.avatar || null,
        hasAction: Boolean(metadata?.hasAction || row.has_action || false),
        read: Boolean(row.is_read || false),
        timestamp: this.formatTimestamp(row.created_at),
        metadata: metadata,
      }
    } catch (error) {
      throw new Error(`Failed to fetch notification: ${error.message}`)
    }
  }

  static async markAsRead(id) {
    try {
      await pool.execute(
        'UPDATE notifications SET is_read = ? WHERE id = ?',
        [1, id] // is_read is TINYINT(1), 1 = true (read)
      )

      return await this.getById(id)
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }

  static async markAllAsRead(recipientUsername = null) {
    try {
      let query = 'UPDATE notifications SET is_read = ? WHERE is_read = ?'
      const params = [1, 0] // is_read is TINYINT(1), 1 = true (read), 0 = false (unread)
      
      if (recipientUsername) {
        query += ' AND (recipient_username = ? OR recipient_username IS NULL)'
        params.push(recipientUsername)
      }
      
      const [result] = await pool.execute(query, params)

      return result.affectedRows
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`)
    }
  }

  static async create(notificationData) {
    try {
      const {
        recipientUsername,
        username,
        avatar,
        message,
        type,
        hasAction = false,
        postId = null,
        relatedId = null,
      } = notificationData

      // Generate ID for notifications table (VARCHAR(36))
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Map 'message' type to 'mention' since ENUM doesn't include 'message'
      // ENUM values: 'like', 'comment', 'follow', 'review', 'mention', 'system'
      const mappedType = type === 'message' ? 'mention' : type

      // Map to actual table structure
      // Table has: user_id, content, metadata (JSON), related_post_id, is_read
      // We need to get user_id from username
      let userId = null
      if (username) {
        try {
          const [users] = await pool.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [username]
          )
          if (users.length > 0) {
            userId = users[0].id
          }
        } catch (e) {
          console.warn('⚠️ Could not get user_id for username:', username, e.message)
        }
      }

      // Build metadata JSON
      const metadata = {
        ...(avatar && { avatar }),
        ...(hasAction && { hasAction: true }),
        ...(message && { originalMessage: message }),
        ...(type === 'message' && { originalType: 'message' }) // Store original type in metadata
      }

      const [result] = await pool.execute(
        `INSERT INTO notifications 
         (id, user_id, type, content, recipient_username, related_post_id, post_id, metadata, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId, // Generated ID
          userId || username, // Use user_id if found, otherwise fallback to username
          mappedType, // Use mapped type (message -> mention)
          message,
          recipientUsername,
          postId || relatedId, // Use postId or relatedId for related_post_id
          postId, // Store in post_id column too
          JSON.stringify(metadata),
          0 // is_read = 0 (unread)
        ]
      )

      return await this.getById(notificationId)
    } catch (error) {
      console.error('❌ Error creating notification:', error.message)
      console.error('❌ Notification data:', notificationData)
      throw new Error(`Failed to create notification: ${error.message}`)
    }
  }

  static async delete(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM notifications WHERE id = ?',
        [id]
      )

      return result.affectedRows > 0
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`)
    }
  }

  static formatTimestamp(date) {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffMs = now - notificationDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return notificationDate.toLocaleDateString()
  }
}

