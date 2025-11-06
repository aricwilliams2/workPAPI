import pool from '../database/connection.js'

export class Category {
  static async getAll() {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM categories ORDER BY id'
      )

      return rows
    } catch (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }
  }
}

