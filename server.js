require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONT_ORIGIN || "http://localhost:4200" }));

// Conexión a MariaDB
const mysqlUri = process.env.MYSQL_URI;
const TABLE_USERS = process.env.TABLE_USERS;
const TABLE_GROUPS = process.env.TABLE_GROUPS;

// Conexión a la bd local
let db;
(async () => {
  try {
    db = await mysql.createConnection(mysqlUri);
    await db.ping();
    console.log("✅ Conectado a MariaDB");

    await createTablesIfNotExist();
  } catch (err) {
    console.error("❌ Error al conectar a MariaDB:", err.message);
    process.exit(1);
  }
})();

// Función para crear las tablas si no existen
async function createTablesIfNotExist() {
  // Tabla de grupos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`${TABLE_GROUPS}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_name VARCHAR(25) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Tabla de usuarios
  await db.execute(`
    CREATE TABLE IF NOT EXISTS \`${TABLE_USERS}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(30) NOT NULL,
      surname VARCHAR(80) NOT NULL,
      marks INT NOT NULL DEFAULT 0,
      group_id INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// Endopoint default
app.get("/", async (req, res) => {
  res.send("API FUNCIONANDO");
});

// Endpoint para recuperar todas los usuarios y grupos
app.get("/api/users-groups", async (req, res) => {
  try {
    // Consulta para recuperar todos los usuarios
    const [users] = await db.execute(`SELECT id, name, surname, marks, group_id FROM \`${TABLE_USERS}\` ORDER BY id ASC`);
    // Consulta para recuperar todos los grupos
    const [groups] = await db.execute(`SELECT id, group_name FROM \`${TABLE_GROUPS}\` ORDER BY id ASC`);
    // Devolver todas los usuarios y grupos
    res.status(200).json({ users: users, groups: groups });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Endpoint para añadir un nuevo usuario
app.post("/api/user", async (req, res) => {
  try {
    // Recuperar los campos para crear el usuario
    const { name, surname, marks, groupId } = req.body;
    // Verificar que vienen los datos
    if (!name || !surname || marks === undefined || !groupId) {
      return res.status(400).json({ message: "Falta alguno de los 4 campos requeridos" });
    }
    // Verificar que viene una nota válida
    if (!Number.isInteger(Number(marks))) {
      return res.status(400).json({ message: "La notado del usario tiene que ser un entero." });
    }

    // Consulta para crear el nuevo usuario
    const [userCreate] = await db.execute(
      `INSERT INTO \`${TABLE_USERS}\` (name, surname, marks, group_id) VALUES (?, ?, ?, ?)`,
      [name, surname, marks, groupId]
    );

    // Nueva usuario
    const newUser = {
      id: userCreate.insertId,
      name: name,
      surname: surname,
      marks: marks,
      group_id: groupId
    }
    
    // Mensaje de éxito
    res.status(201).json({ message: "Usuario creado correctamente", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Endpoint para añadir un nuevo grupo
app.post("/api/group", async (req, res) => {
  try {
    // Recuperar los campos para crear el grupo
    const { groupName } = req.body;
    // Verificar que viene el dato
    if (!groupName) {
      return res.status(400).json({ message: "Falta el campo requerido" });
    }

    // Consulta para crear el nuevo grupo
    const [groupCreate] = await db.execute(`INSERT INTO \`${TABLE_GROUPS}\` (group_name) VALUES (?)`, [groupName]);

    // Nueva grupo
    const newGroup = {
      id: groupCreate.insertId,
      group_name: groupName,
    }
    
    // Mensaje de éxito
    res.status(201).json({ message: "Grupo creado correctamente", group: newGroup });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Endpoint para actualizar la nota de un usuario
app.put("/api/user/:id/marks", async (req, res) => {
  try {
    // Recuperar los campos para actualizar
    const id = Number(req.params.id);
    const { marks } = req.body;
    // Verificar que vienen los datos
    if (!id) {
      return res.status(400).json({ message: "Falta el id para poder cambiar la nota" });
    }
    // Verificar que viene una nota válida
    if (marks === undefined || !Number.isInteger(Number(marks))) {
      return res.status(400).json({ message: "La notado del usario tiene que ser un entero." });
    }

    // Consulta para actualizar la nota del usuario
    const [userUpdate] = await db.execute(`UPDATE \`${TABLE_USERS}\` SET marks = ? WHERE id = ?`, [marks, id]);
    // Mensaje por si no se encontro el usuario a actualizar
    if (userUpdate.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado en la base de datos" });
    }
    
    // Mensaje de éxito
    res.status(200).json({ message: `La nota del usario cambio a: ${marks}`, user: { id } });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Endpoint para eliminar un usuario
app.delete("/api/user/:id", async (req, res) => {
  try {
    // Recuperar el id para eliminar
    const id = Number(req.params.id);
    // Verificar que viene el id
    if (!id) {
      return res.status(400).json({ message: "Falta el id para poder eliminar" });
    }

    // Consulta para eliminar un usuario
    const [userDelete] = await db.execute(`DELETE FROM \`${TABLE_USERS}\` WHERE id = ?`, [id]);
    // Mensaje por si no se encontrar el usuario a eliminar
    if (userDelete.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado en la base de datos" });
    }

    // Mensaje de éxito
    res.status(200).json({ message: "Usuario eliminada correctamente", user: { id } });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Arrancamos el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
);
