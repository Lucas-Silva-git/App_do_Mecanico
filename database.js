import * as SQLite from "expo-sqlite";

let db;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("mecanico.db");
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS ordens (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        nome      TEXT    NOT NULL,
        modelo    TEXT    NOT NULL,
        placa     TEXT    NOT NULL,
        problema  TEXT    NOT NULL,
        status    TEXT    NOT NULL DEFAULT 'Aguardando',
        criado_em TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);
  }
  return db;
};

export const listarOrdens = async () => {
  const db = await getDB();
  return db.getAllAsync("SELECT * FROM ordens ORDER BY id DESC");
};

export const criarOrdem = async ({ nome, modelo, placa, problema, status }) => {
  const db = await getDB();
  const result = await db.runAsync(
    "INSERT INTO ordens (nome, modelo, placa, problema, status) VALUES (?, ?, ?, ?, ?)",
    [nome, modelo, placa, problema, status]
  );
  return result.lastInsertRowId;
};

export const atualizarOrdem = async ({ id, nome, modelo, placa, problema, status }) => {
  const db = await getDB();
  await db.runAsync(
    "UPDATE ordens SET nome=?, modelo=?, placa=?, problema=?, status=? WHERE id=?",
    [nome, modelo, placa, problema, status, id]
  );
};

export const deletarOrdem = async (id) => {
  const db = await getDB();
  await db.runAsync("DELETE FROM ordens WHERE id=?", [id]);
};
