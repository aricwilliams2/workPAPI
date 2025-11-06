import { Router } from 'express'
import { Notification } from '../models/Notification.js'
import { optionalAuth } from '../middleware/auth.js'

export const notificationsRouter = Router()

// GET /api/notifications - Get all notifications with optional filtering
notificationsRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, unread, limit, offset } = req.query
    const filters = {}
    
    // Filter by authenticated user's notifications
    if (req.user?.username) {
      filters.recipientUsername = req.user.username
    }
    
    if (type) filters.type = type
    if (unread) filters.unread = unread
    if (limit) filters.limit = limit
    if (offset) filters.offset = offset

    const result = await Notification.getAll(filters)

    res.json({
      success: true,
      data: result.data,
      total: result.data.length,
      unreadCount: result.unreadCount,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// GET /api/notifications/:id - Get a specific notification
notificationsRouter.get('/:id', async (req, res) => {
  try {
    // Use ID as string (not parseInt) since notifications use VARCHAR IDs
    const notification = await Notification.getById(req.params.id)
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      })
    }

    res.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// PUT /api/notifications/:id/read - Mark notification as read
notificationsRouter.put('/:id/read', async (req, res) => {
  try {
    // Use ID as string (not parseInt) since notifications use VARCHAR IDs
    const notification = await Notification.markAsRead(req.params.id)
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      })
    }

    res.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// PUT /api/notifications/read-all - Mark all notifications as read
notificationsRouter.put('/read-all', optionalAuth, async (req, res) => {
  try {
    const recipientUsername = req.user?.username || null
    const count = await Notification.markAllAsRead(recipientUsername)

    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: count,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// DELETE /api/notifications/:id - Delete a notification
notificationsRouter.delete('/:id', async (req, res) => {
  try {
    // Use ID as string (not parseInt) since notifications use VARCHAR IDs
    const deleted = await Notification.delete(req.params.id)
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      })
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

