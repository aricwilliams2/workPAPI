import pool from './connection.js'

// Seed service providers (adds providers even if some already exist)
async function seedProviders() {
  try {
    console.log('🌱 Adding service providers to database...')

    const providers = [
      {
        name: 'Master Carpentry',
        category: 'Carpenters',
        image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop',
        rating: 4.8,
        review_count: 132,
        distance: '0.8 miles away',
        location_lat: 40.7128,
        location_lng: -74.0060,
        services: JSON.stringify(['Custom Cabinetry', 'Built-In Shelving', 'Furniture']),
        trusted_by: 4,
      },
      {
        name: 'ElectriCity',
        category: 'Electricians',
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop',
        rating: 4.5,
        review_count: 98,
        distance: '1.2 miles away',
        location_lat: 40.7580,
        location_lng: -73.9855,
        services: JSON.stringify(['Panel Upgrades', 'Wiring', 'Installations']),
        trusted_by: 2,
      },
      {
        name: 'Pipe Masters',
        category: 'Plumbers',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
        rating: 4.7,
        review_count: 67,
        distance: '2.5 miles away',
        location_lat: 40.7282,
        location_lng: -73.9942,
        services: JSON.stringify(['Pipe Repair', 'Installations', 'Drain Cleaning']),
        trusted_by: null,
      },
      {
        name: 'Fresh Paint Co.',
        category: 'Painters',
        image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=300&fit=crop',
        rating: 4.9,
        review_count: 214,
        distance: '3.1 miles away',
        location_lat: 40.7505,
        location_lng: -73.9934,
        services: JSON.stringify(['Interior Painting', 'Exterior Painting', 'Staining']),
        trusted_by: 7,
      },
      {
        name: 'Green Thumb Landscaping',
        category: 'Landscapers',
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop',
        rating: 4.6,
        review_count: 89,
        distance: '1.5 miles away',
        location_lat: 40.7614,
        location_lng: -73.9776,
        services: JSON.stringify(['Lawn Care', 'Garden Design', 'Tree Trimming']),
        trusted_by: 3,
      },
      {
        name: 'Top Roof Solutions',
        category: 'Roofers',
        image: 'https://images.unsplash.com/photo-1514066558159-9c7bbc8b4d38?w=400&h=300&fit=crop',
        rating: 4.7,
        review_count: 156,
        distance: '2.8 miles away',
        location_lat: 40.7589,
        location_lng: -73.9851,
        services: JSON.stringify(['Roof Repair', 'Installation', 'Gutter Cleaning']),
        trusted_by: 5,
      },
      {
        name: 'Elite Electrical Services',
        category: 'Electricians',
        image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop',
        rating: 4.9,
        review_count: 187,
        distance: '0.5 miles away',
        location_lat: 40.7140,
        location_lng: -74.0050,
        services: JSON.stringify(['Emergency Repairs', 'Smart Home Installation', 'Lighting Design']),
        trusted_by: 12,
      },
      {
        name: 'Precision Carpentry Works',
        category: 'Carpenters',
        image: null, // No default placeholder image
        rating: 4.8,
        review_count: 203,
        distance: '1.8 miles away',
        location_lat: 40.7306,
        location_lng: -73.9903,
        services: JSON.stringify(['Deck Building', 'Custom Millwork', 'Restoration']),
        trusted_by: 8,
      },
      {
        name: 'Dependable Plumbing',
        category: 'Plumbers',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
        rating: 4.6,
        review_count: 124,
        distance: '1.3 miles away',
        location_lat: 40.7420,
        location_lng: -73.9876,
        services: JSON.stringify(['Water Heater Installation', 'Leak Detection', 'Bathroom Remodeling']),
        trusted_by: 6,
      },
      {
        name: 'Color Masters Painting',
        category: 'Painters',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
        rating: 4.7,
        review_count: 145,
        distance: '2.2 miles away',
        location_lat: 40.7559,
        location_lng: -73.9862,
        services: JSON.stringify(['Commercial Painting', 'Pressure Washing', 'Wallpaper Installation']),
        trusted_by: 4,
      },
    ]

    let addedCount = 0
    let skippedCount = 0

    for (const provider of providers) {
      try {
        // Check if provider already exists
        const [existing] = await pool.execute(
          'SELECT id FROM service_providers WHERE name = ? AND category = ?',
          [provider.name, provider.category]
        )

        if (existing.length > 0) {
          console.log(`⏭️  Skipping ${provider.name} (already exists)`)
          skippedCount++
          continue
        }

        await pool.execute(
          `INSERT INTO service_providers (name, category, image, rating, review_count, distance, location_lat, location_lng, services, trusted_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            provider.name,
            provider.category,
            provider.image,
            provider.rating,
            provider.review_count,
            provider.distance,
            provider.location_lat,
            provider.location_lng,
            provider.services,
            provider.trusted_by,
          ]
        )
        console.log(`✅ Added: ${provider.name}`)
        addedCount++
      } catch (error) {
        console.error(`❌ Error adding ${provider.name}:`, error.message)
      }
    }

    console.log(`\n✅ Complete! Added ${addedCount} providers, skipped ${skippedCount} existing ones.`)
    
    // Show total count
    const [result] = await pool.execute('SELECT COUNT(*) as count FROM service_providers')
    console.log(`📊 Total providers in database: ${result[0].count}`)
  } catch (error) {
    console.error('❌ Error seeding providers:', error)
    throw error
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seed-providers.js')) {
  seedProviders()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed failed:', error)
      process.exit(1)
    })
}

export default seedProviders

