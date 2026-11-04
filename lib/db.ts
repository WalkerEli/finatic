import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// In a real production app, you would use environment variables for the database path
const DB_PATH = path.join(process.cwd(), 'finatic_database.db');

export async function getDb() {
    return open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
}
