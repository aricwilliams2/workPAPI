-- Work Phase Database Schema

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  business_name VARCHAR(200),
  is_pro BOOLEAN DEFAULT FALSE,
  profile_image TEXT,
  images JSON,
  rating DECIMAL(3, 2) DEFAULT 0,
  recommendations INT DEFAULT 0,
  description TEXT,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  category_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_category (category_id),
  INDEX idx_created_at (created_at)
);

-- Post images table - stores images as BLOB linked to posts
CREATE TABLE IF NOT EXISTS post_images (
  id VARCHAR(255) PRIMARY KEY,
  post_id INT NOT NULL,
  image_url VARCHAR(500),
  image_data MEDIUMBLOB,
  mime_type VARCHAR(100),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id)
);

-- Post videos table - stores videos linked to posts
CREATE TABLE IF NOT EXISTS post_videos (
  id VARCHAR(255) PRIMARY KEY,
  post_id INT NOT NULL,
  video_url VARCHAR(500),
  video_data MEDIUMBLOB,
  mime_type VARCHAR(100),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id)
);

-- Post tags table - stores tags for posts
CREATE TABLE IF NOT EXISTS post_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_tag (tag)
);

-- Post likes table - tracks which users liked which posts
CREATE TABLE IF NOT EXISTS post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Note: Foreign key references post_details(id) in actual database
  -- If post_details table exists, use: FOREIGN KEY (post_id) REFERENCES post_details(id) ON DELETE CASCADE
  -- Otherwise, remove foreign key constraint if tables are separate
  UNIQUE KEY unique_like (post_id, user_id),
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
);

-- Comments table - stores comments on posts
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  username VARCHAR(100) NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
);

-- Service providers table
CREATE TABLE IF NOT EXISTS service_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image TEXT,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INT DEFAULT 0,
  distance VARCHAR(50),
  trusted_by INT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  services JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_rating (rating)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  avatar TEXT,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  has_action BOOLEAN DEFAULT FALSE,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_read_status (read_status),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
);

-- Users table - for authentication
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  profile_image TEXT,
  account_type ENUM('personal', 'business') DEFAULT 'personal',
  business_category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
);

-- Profile table
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  business_name VARCHAR(200),
  tagline VARCHAR(200),
  description TEXT,
  website VARCHAR(255),
  profile_image TEXT,
  posts_count INT DEFAULT 0,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Profile services table
CREATE TABLE IF NOT EXISTS profile_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  price VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_profile_id (profile_id)
);

-- Insert default categories
INSERT IGNORE INTO categories (id, name) VALUES
('all', 'All'),
('carpenters', 'Carpenters'),
('electricians', 'Electricians'),
('plumbers', 'Plumbers'),
('painters', 'Painters'),
('landscapers', 'Landscapers'),
('roofers', 'Roofers');

