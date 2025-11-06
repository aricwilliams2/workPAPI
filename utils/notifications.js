// Helper functions to create notifications for various events
import { Notification } from '../models/Notification.js'
import pool from '../database/connection.js'

/**
 * Get user profile image from database
 */
async function getUserProfileImage(username) {
  try {
    const [users] = await pool.execute(
      'SELECT profile_image FROM users WHERE username = ?',
      [username]
    )
    return users.length > 0 ? users[0].profile_image : null
  } catch (error) {
    console.warn('⚠️ Error fetching profile image for', username, error.message)
    return null
  }
}

/**
 * Get post owner username from post_details
 */
async function getPostOwnerUsername(postId) {
  try {
    const postIdStr = String(postId)
    console.log(`🔍 Looking up post owner for postId: ${postIdStr}`)
    
    const [posts] = await pool.execute(
      'SELECT username FROM post_details WHERE CAST(id AS CHAR) = CAST(? AS CHAR)',
      [postIdStr]
    )
    
    console.log(`🔍 Found ${posts.length} post(s) for postId ${postIdStr}`)
    if (posts.length > 0) {
      console.log(`🔍 Post owner username: ${posts[0].username}`)
    }
    
    return posts.length > 0 ? posts[0].username : null
  } catch (error) {
    console.error('⚠️ Error fetching post owner for post', postId, error.message)
    console.error('⚠️ Error stack:', error.stack)
    return null
  }
}

/**
 * Create a notification when someone likes a post
 */
export async function notifyPostLike(postId, likerUsername) {
  try {
    const postOwner = await getPostOwnerUsername(postId)
    
    // Always notify, even if user likes their own post
    if (!postOwner) {
      return null
    }

    const avatar = await getUserProfileImage(likerUsername)
    
    await Notification.create({
      recipientUsername: postOwner,
      username: likerUsername,
      avatar: avatar || null,
      message: 'liked your post',
      type: 'like',
      hasAction: true,
      postId: String(postId),
      relatedId: null,
    })
    
    console.log(`✅ Created like notification for ${postOwner} from ${likerUsername}`)
  } catch (error) {
    console.error('❌ Error creating like notification:', error.message)
  }
}

/**
 * Create a notification when someone rates a post
 */
export async function notifyPostRating(postId, raterUsername, rating) {
  try {
    console.log(`🔔 notifyPostRating called: postId=${postId}, raterUsername=${raterUsername}, rating=${rating}`)
    
    const postOwner = await getPostOwnerUsername(postId)
    console.log(`🔔 Post owner lookup result: ${postOwner} for postId ${postId}`)
    
    // Always notify, even if user rates their own post
    if (!postOwner) {
      console.warn(`⚠️ No post owner found for post ${postId}, skipping notification`)
      return null
    }

    const avatar = await getUserProfileImage(raterUsername)
    console.log(`🔔 Creating notification: recipient=${postOwner}, rater=${raterUsername}, avatar=${avatar ? 'found' : 'not found'}`)
    
    const notification = await Notification.create({
      recipientUsername: postOwner,
      username: raterUsername,
      avatar: avatar || null,
      message: `rated your post ${rating} star${rating > 1 ? 's' : ''}`,
      type: 'review',
      hasAction: true,
      postId: String(postId),
      relatedId: String(rating),
    })
    
    console.log(`✅ Created rating notification for ${postOwner} from ${raterUsername}:`, notification?.id)
    return notification
  } catch (error) {
    console.error('❌ Error creating rating notification:', error.message)
    console.error('❌ Error stack:', error.stack)
    throw error
  }
}

/**
 * Create a notification when someone comments on a post
 */
export async function notifyPostComment(postId, commenterUsername, commentText) {
  try {
    const postOwner = await getPostOwnerUsername(postId)
    
    // Always notify, even if user comments on their own post
    if (!postOwner) {
      return null
    }

    const avatar = await getUserProfileImage(commenterUsername)
    const truncatedComment = commentText.length > 50 
      ? commentText.substring(0, 50) + '...' 
      : commentText
    
    await Notification.create({
      recipientUsername: postOwner,
      username: commenterUsername,
      avatar: avatar || null,
      message: `commented: "${truncatedComment}"`,
      type: 'comment',
      hasAction: true,
      postId: String(postId),
      relatedId: null,
    })
    
    console.log(`✅ Created comment notification for ${postOwner} from ${commenterUsername}`)
  } catch (error) {
    console.error('❌ Error creating comment notification:', error.message)
  }
}

/**
 * Create a notification when someone sends a message/conversation
 */
export async function notifyMessage(senderUsername, recipientUsername, messageText, postId = null) {
  try {
    // Always notify, even if user messages themselves
    if (!senderUsername || !recipientUsername) {
      return null
    }

    const avatar = await getUserProfileImage(senderUsername)
    const truncatedMessage = messageText.length > 50 
      ? messageText.substring(0, 50) + '...' 
      : messageText
    
    await Notification.create({
      recipientUsername: recipientUsername,
      username: senderUsername,
      avatar: avatar || null,
      message: `sent you a message: "${truncatedMessage}"`,
      type: 'message',
      hasAction: true,
      postId: postId ? String(postId) : null,
      relatedId: null,
    })
    
    console.log(`✅ Created message notification for ${recipientUsername} from ${senderUsername}`)
  } catch (error) {
    console.error('❌ Error creating message notification:', error.message)
  }
}

/**
 * Create a notification when someone follows a user
 */
export async function notifyFollow(followerUsername, followeeUsername) {
  try {
    if (!followerUsername || !followeeUsername || followerUsername === followeeUsername) {
      return null
    }

    const avatar = await getUserProfileImage(followerUsername)
    
    await Notification.create({
      recipientUsername: followeeUsername,
      username: followerUsername,
      avatar: avatar || null,
      message: 'started following you',
      type: 'follow',
      hasAction: false,
      postId: null,
      relatedId: null,
    })
    
    console.log(`✅ Created follow notification for ${followeeUsername} from ${followerUsername}`)
  } catch (error) {
    console.error('❌ Error creating follow notification:', error.message)
  }
}

