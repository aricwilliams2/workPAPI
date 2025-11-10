import { Router } from 'express'
import { Message } from '../models/Message.js'
import { optionalAuth } from '../middleware/auth.js'
import pool from '../database/connection.js'

export const messagesRouter = Router()

// GET /api/messages/conversations - Get all conversations for authenticated user
messagesRouter.get('/conversations', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const conversations = await Message.getUserConversations(req.user.id)
    
    res.json({
      success: true,
      data: conversations
    })
  } catch (error) {
    console.error('❌ Get conversations error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/messages/conversation/:userId - Get conversation with a specific user (userId can be username or user_id)
messagesRouter.get('/conversation/:userId', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    // userId param might be a username, so look up user_id if needed
    let actualUserId = req.params.userId
    
    // If it looks like a username (not UUID format), find user_id
    if (!req.params.userId.includes('-') || req.params.userId.length < 30) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE username = ? LIMIT 1',
        [req.params.userId]
      )
      if (users.length > 0) {
        actualUserId = users[0].id
      }
    }

    const conversation = await Message.getConversation(req.user.id, actualUserId)
    
    if (!conversation) {
      return res.json({
        success: true,
        data: null
      })
    }

    res.json({
      success: true,
      data: conversation
    })
  } catch (error) {
    console.error('❌ Get conversation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/messages/:conversationId - Get messages for a conversation
messagesRouter.get('/:conversationId', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const { limit } = req.query
    const messages = await Message.getConversationMessages(
      req.params.conversationId,
      req.user.id,
      parseInt(limit) || 50
    )
    
    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('❌ Get messages error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/messages/send - Send a message
messagesRouter.post('/send', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.username) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const { recipientId, recipientUsername, messageText } = req.body

    if (!recipientId || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'recipientId and messageText are required'
      })
    }

    const message = await Message.send(
      req.user.id,
      req.user.username,
      recipientId,
      recipientUsername || recipientId, // Fallback to recipientId if username not provided
      messageText
    )
    
    // Create notification for recipient
    try {
      const { notifyMessage } = await import('../utils/notifications.js')
      // Get postId from request if provided (when messaging from a post)
      const postId = req.body.postId || null
      await notifyMessage(
        req.user.username,
        recipientUsername || recipientId,
        messageText,
        postId
      )
    } catch (notifError) {
      console.warn('⚠️ Could not create message notification:', notifError.message)
    }
    
    res.json({
      success: true,
      data: message
    })
  } catch (error) {
    console.error('❌ Send message error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/messages/unread/count - Get unread message count
messagesRouter.get('/unread/count', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const count = await Message.getUnreadCount(req.user.id)
    
    res.json({
      success: true,
      count: count
    })
  } catch (error) {
    console.error('❌ Get unread count error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

