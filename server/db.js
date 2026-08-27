import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Inicializar Tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cost REAL,
    price REAL,
    category TEXT,
    logbook JSON
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT NOT NULL,
    items JSON,
    totalCost REAL,
    totalRevenue REAL,
    approvedRevenue REAL,
    maintenance JSON
  );

  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY,
    order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config JSON,
    created_at TEXT NOT NULL
  );
`);

// Migración simple por si la tabla budgets ya existía sin la columna name o maintenance
try {
  db.prepare('ALTER TABLE budgets ADD COLUMN name TEXT').run();
} catch (e) {
  // Ignorar si ya existe
}

try {
  db.prepare('ALTER TABLE budgets ADD COLUMN maintenance JSON').run();
} catch (e) {
  // Ignorar si ya existe
}

// Migración para Multi-Workspace
try {
  db.prepare('ALTER TABLE budgets ADD COLUMN workspace_id TEXT').run();
  
  // Asignar los presupuestos existentes a un workspace "default" (opcional si hay registros previos)
  const defaultWorkspaceId = 'default_workspace';
  const workspaceExists = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(defaultWorkspaceId);
  if (!workspaceExists) {
    db.prepare('INSERT INTO workspaces (id, name, config, created_at) VALUES (?, ?, ?, ?)').run(
      defaultWorkspaceId, 
      'Mi Negocio', 
      '{}', 
      new Date().toISOString()
    );
  }
  db.prepare('UPDATE budgets SET workspace_id = ? WHERE workspace_id IS NULL').run(defaultWorkspaceId);
} catch (e) {
  // Ignorar si ya existe la columna
}

export default db;
