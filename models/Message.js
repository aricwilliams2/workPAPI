import pool from '../database/connection.js'

export class Message {
  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(user1Id, user1Username, user2Id, user2Username) {
    try {
      // Ensure user1_id < user2_id for consistent conversation_id
      const [sortedUsers] = [user1Id, user2Id].sort()
      const [sortedUsernames] = [user1Username, user2Username].sort()
      
      // Try to find existing conversation
      const [conversations] = await pool.execute(
        `SELECT * FROM conversations 
         WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
        [user1Id, user2Id, user2Id, user1Id]
      )
      
      if (conversations.length > 0) {
        return conversations[0]
      }
      
      // Create new conversation
      const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(7)}`
      await pool.execute(
        `INSERT INTO conversations (id, user1_id, user1_username, user2_id, user2_username)
         VALUES (?, ?, ?, ?, ?)`,
        [conversationId, user1Id, user1Username, user2Id, user2Username]
      )
      
      const [newConversation] = await pool.execute(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId]
      )
      
      return newConversation[0]
    } catch (error) {
      throw new Error(`Failed to get or create conversation: ${error.message}`)
    }
  }

  /**
   * Send a message
   */
  static async send(senderId, senderUsername, recipientId, recipientUsername, messageText) {
    try {
      // Get recipient user_id if recipientId is a username
      let actualRecipientId = recipientId
      let actualRecipientUsername = recipientUsername || recipientId
      
      // If recipientId looks like a username (not UUID), find user_id
      if (!recipientId.includes('-') || recipientId.length < 30) {
        const [users] = await pool.execute(
          'SELECT id, username FROM users WHERE username = ? LIMIT 1',
          [recipientId]
        )
        if (users.length > 0) {
          actualRecipientId = users[0].id
          actualRecipientUsername = users[0].username
        }
      }
      
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        senderId, senderUsername, actualRecipientId, actualRecipientUsername
      )
      
      // Create message
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`
      await pool.execute(
        `INSERT INTO messages (id, conversation_id, sender_id, sender_username, recipient_id, recipient_username, message_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [messageId, conversation.id, senderId, senderUsername, actualRecipientId, actualRecipientUsername, messageText]
      )
      
      // Update conversation with latest message and increment unread count for recipient
      const isRecipientUser1 = conversation.user1_id === actualRecipientId
      await pool.execute(
        `UPDATE conversations 
         SET last_message_id = ?, last_message_text = ?, last_message_at = CURRENT_TIMESTAMP,
             ${isRecipientUser1 ? 'unread_count_user1' : 'unread_count_user2'} = ${isRecipientUser1 ? 'unread_count_user1' : 'unread_count_user2'} + 1
         WHERE id = ?`,
        [messageId, messageText.substring(0, 100), conversation.id]
      )
      
      // Get the created message
      const [messages] = await pool.execute(
        'SELECT * FROM messages WHERE id = ?',
        [messageId]
      )
      
      // Ensure message_text is a string, not a Buffer
      if (messages[0] && messages[0].message_text) {
        if (Buffer.isBuffer(messages[0].message_text)) {
          messages[0].message_text = messages[0].message_text.toString('utf8')
        } else if (typeof messages[0].message_text === 'object' && messages[0].message_text.type === 'Buffer') {
          // Handle case where it's already been serialized as {type: 'Buffer', data: [...]}
          messages[0].message_text = Buffer.from(messages[0].message_text.data).toString('utf8')
        }
      }
      
      return messages[0]
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`)
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(conversationId, userId, limit = 50) {
    try {
      // Ensure limit is a valid integer (MySQL LIMIT doesn't work well with placeholders in some versions)
      let limitValue = parseInt(limit, 10) || 50
      if (limitValue < 1 || isNaN(limitValue)) limitValue = 50
      if (limitValue > 1000) limitValue = 1000 // Cap at reasonable limit
      
      // Use limit directly in query string since we've validated it's a safe integer
      const [messages] = await pool.execute(
        `SELECT * FROM messages 
         WHERE conversation_id = ?
         ORDER BY created_at DESC
         LIMIT ${limitValue}`,
        [conversationId]
      )
      
      // Convert Buffer message_text to strings
      messages.forEach(msg => {
        if (msg.message_text) {
          if (Buffer.isBuffer(msg.message_text)) {
            msg.message_text = msg.message_text.toString('utf8')
          } else if (typeof msg.message_text === 'object' && msg.message_text.type === 'Buffer') {
            msg.message_text = Buffer.from(msg.message_text.data).toString('utf8')
          }
        }
      })
      
      // Mark messages as read for the recipient
      await pool.execute(
        `UPDATE messages SET is_read = TRUE 
         WHERE conversation_id = ? AND recipient_id = ? AND is_read = FALSE`,
        [conversationId, userId]
      )
      
      // Update conversation unread count
      await pool.execute(
        `UPDATE conversations 
         SET unread_count_user1 = 0, unread_count_user2 = 0
         WHERE id = ?`,
        [conversationId]
      )
      
      return messages.reverse() // Return in chronological order
    } catch (error) {
      throw new Error(`Failed to get conversation messages: ${error.message}`)
    }
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId) {
    try {
      const [conversations] = await pool.execute(
        `SELECT * FROM conversations 
         WHERE user1_id = ? OR user2_id = ?
         ORDER BY last_message_at DESC`,
        [userId, userId]
      )
      
      return conversations
    } catch (error) {
      throw new Error(`Failed to get user conversations: ${error.message}`)
    }
  }

  /**
   * Get conversation between two users
   */
  static async getConversation(user1Id, user2Id) {
    try {
      const [conversations] = await pool.execute(
        `SELECT * FROM conversations 
         WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
        [user1Id, user2Id, user2Id, user1Id]
      )
      
      return conversations.length > 0 ? conversations[0] : null
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error.message}`)
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId) {
    try {
      const [result] = await pool.execute(
        `SELECT COUNT(*) as count FROM messages 
         WHERE recipient_id = ? AND is_read = FALSE`,
        [userId]
      )
      
      return result[0].count || 0
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`)
    }
  }
}

