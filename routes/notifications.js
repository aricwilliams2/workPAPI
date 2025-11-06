import { Router } from 'express'
import { Notification } from '../models/Notification.js'

export const notificationsRouter = Router()

// GET /api/notifications - Get all notifications with optional filtering
notificationsRouter.get('/', async (req, res) => {
  try {
    const { type, unread, limit, offset } = req.query
    const filters = {}
    
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
    const notification = await Notification.getById(parseInt(req.params.id))
    
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
    const notification = await Notification.markAsRead(parseInt(req.params.id))
    
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
notificationsRouter.put('/read-all', async (req, res) => {
  try {
    const count = await Notification.markAllAsRead()

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
    const deleted = await Notification.delete(parseInt(req.params.id))
    
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

