import pool from './connection.js'
import initializeDatabase from './init.js'

// Seed data for initial setup
async function seedDatabase() {
  try {
    // Initialize schema first
    await initializeDatabase()

    // Check if data already exists
    const [existingPosts] = await pool.execute('SELECT COUNT(*) as count FROM posts')
    const [existingProviders] = await pool.execute('SELECT COUNT(*) as count FROM service_providers')
    const [existingNotifications] = await pool.execute('SELECT COUNT(*) as count FROM notifications')
    const [existingProfiles] = await pool.execute('SELECT COUNT(*) as count FROM profiles')

    if (existingPosts[0].count > 0 || existingProviders[0].count > 0) {
      console.log('⚠️  Database already has data. Skipping seed.')
      return
    }

    console.log('🌱 Seeding database...')

    // Seed posts
    await pool.execute(
      `INSERT INTO posts (username, business_name, is_pro, profile_image, images, description, category_id, rating, recommendations, likes, comments, shares)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'carpenterJoe',
        'Downtown Workshop',
        true,
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop',
        JSON.stringify([]), // No default placeholder image
        'Just finished this beautiful custom cabinet installation for a client in Downtown. Solid oak with hand-carved details. Really proud of how the grain pattern came out!',
        'carpenters',
        4.8,
        243,
        156,
        23,
        12,
      ]
    )

    await pool.execute(
      `INSERT INTO posts (username, business_name, is_pro, profile_image, images, description, category_id, rating, recommendations, likes, comments, shares)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'electricPro',
        'ElectriCity Solutions',
        true,
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=100&h=100&fit=crop',
        JSON.stringify(['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop']),
        'Completed a full electrical panel upgrade today. Safety first! All wiring updated to code.',
        'electricians',
        4.7,
        189,
        98,
        15,
        8,
      ]
    )

    // Seed service providers
    await pool.execute(
      `INSERT INTO service_providers (name, category, image, rating, review_count, distance, location_lat, location_lng, services, trusted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Master Carpentry',
        'Carpenters',
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop',
        4.8,
        132,
        '0.8 miles away',
        40.7128,
        -74.0060,
        JSON.stringify(['Custom Cabinetry', 'Built-In Shelving', 'Furniture']),
        4,
      ]
    )

    await pool.execute(
      `INSERT INTO service_providers (name, category, image, rating, review_count, distance, location_lat, location_lng, services, trusted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'ElectriCity',
        'Electricians',
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop',
        4.5,
        98,
        '1.2 miles away',
        40.7580,
        -73.9855,
        JSON.stringify(['Panel Upgrades', 'Wiring', 'Installations']),
        2,
      ]
    )

    await pool.execute(
      `INSERT INTO service_providers (name, category, image, rating, review_count, distance, location_lat, location_lng, services)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Pipe Masters',
        'Plumbers',
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
        4.7,
        67,
        '2.5 miles away',
        40.7282,
        -73.9942,
        JSON.stringify(['Pipe Repair', 'Installations', 'Drain Cleaning']),
      ]
    )

    await pool.execute(
      `INSERT INTO service_providers (name, category, image, rating, review_count, distance, location_lat, location_lng, services, trusted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Fresh Paint Co.',
        'Painters',
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=300&fit=crop',
        4.9,
        214,
        '3.1 miles away',
        40.7505,
        -73.9934,
        JSON.stringify(['Interior Painting', 'Exterior Painting', 'Staining']),
        7,
      ]
    )

    // Seed notifications
    const notifications = [
      ['John Smith', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', 'liked your post about the cabinet installation.', 'like', false],
      ['Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', 'left a 5-star review on your kitchen renovation project.', 'review', false],
      ['Michael Wilson', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', 'recommended your services to their network of 245 contacts.', 'recommendation', true],
      ['ElectriCity', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=100&h=100&fit=crop', 'started following you.', 'follow', false],
      ['Jessica Brown', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', 'mentioned you in a comment: "Needed to redo my bathroom and @YourBusinessName did an amazing job!"', 'mention', false],
      ['Home Remodelers Association', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop', 'featured your business in their monthly spotlight of top local services.', 'feature', true],
    ]

    for (const [username, avatar, message, type, hasAction] of notifications) {
      await pool.execute(
        `INSERT INTO notifications (username, avatar, message, type, has_action, read_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username, avatar, message, type, hasAction, false]
      )
    }

    // Seed profile
    const [profileResult] = await pool.execute(
      `INSERT INTO profiles (username, business_name, tagline, description, website, profile_image, posts_count, followers_count, following_count, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'masterCarpentry',
        'Master Carpentry',
        'Woodworking & Custom Furniture',
        'Crafting fine custom furniture & cabinetry since 2010. Specializing in hardwood designs, built-ins, and complete home renovations. Based in Downtown.',
        'www.mastercarpentry.com',
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop',
        87,
        1452,
        324,
        4.9,
      ]
    )

    const profileId = profileResult.insertId

    // Seed profile services
    await pool.execute(
      `INSERT INTO profile_services (profile_id, title, price, description)
       VALUES (?, ?, ?, ?)`,
      [
        profileId,
        'Custom Cabinetry',
        'From $2,500',
        'Handcrafted kitchen, bathroom, or office cabinets made to your specifications with premium hardwoods and expert installation.',
      ]
    )

    await pool.execute(
      `INSERT INTO profile_services (profile_id, title, price, description)
       VALUES (?, ?, ?, ?)`,
      [
        profileId,
        'Built-In Shelving',
        'From $1,200',
        'Custom bookcases, entertainment centers, and storage solutions designed to maximize your space and match your interior style.',
      ]
    )

    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Run seed if called directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed failed:', error)
      process.exit(1)
    })
}

export default seedDatabase

