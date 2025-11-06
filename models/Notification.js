import pool from '../database/connection.js'

export class Notification {
  static async getAll(filters = {}) {
    try {
      let query = 'SELECT * FROM notifications'
      const conditions = []
      const params = []

      if (filters.type) {
        conditions.push('type = ?')
        params.push(filters.type)
      }

      if (filters.unread === 'true') {
        conditions.push('read_status = ?')
        params.push(false)
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
      
      // Get unread count
      const [unreadCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE read_status = ?',
        [false]
      )

      return {
        data: rows.map(row => ({
          ...row,
          hasAction: Boolean(row.has_action),
          read: Boolean(row.read_status),
          timestamp: this.formatTimestamp(row.created_at),
        })),
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
      return {
        ...row,
        hasAction: Boolean(row.has_action),
        read: Boolean(row.read_status),
        timestamp: this.formatTimestamp(row.created_at),
      }
    } catch (error) {
      throw new Error(`Failed to fetch notification: ${error.message}`)
    }
  }

  static async markAsRead(id) {
    try {
      await pool.execute(
        'UPDATE notifications SET read_status = ? WHERE id = ?',
        [true, id]
      )

      return await this.getById(id)
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }

  static async markAllAsRead() {
    try {
      const [result] = await pool.execute(
        'UPDATE notifications SET read_status = ? WHERE read_status = ?',
        [true, false]
      )

      return result.affectedRows
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`)
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

