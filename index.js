import express from "express";
import { config } from "dotenv";
import pg from "pg";

// Cargar variables de entorno
config();

const app = express();

// Verificar que la URL de la base de datos está definida
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL no está definida en el archivo .env.");
  process.exit(1); // Salir si no está definida la URL de la base de datos
}

// Configurar la conexión a la base de datos
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Usar SSL seguro
});

// Probar conexión inicial
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error conectando a la base de datos:", err.stack);
  } else {
    console.log("Conexión exitosa a la base de datos");
    release(); // Liberar cliente de conexión
  }
});

// Ruta principal
app.get("/", async (req, res) => {
  try {
    // Obtener las tablas de la base de datos
    const tableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    const tableResult = await pool.query(tableQuery);
    const tables = tableResult.rows.map((row) => row.table_name); // Extraer los nombres de las tablas

    // Obtener datos de cada tabla
    let tableDataHTML = "";
    for (const table of tables) {
      const dataQuery = `SELECT * FROM ${table} LIMIT 5`; // Obtener solo los primeros 5 registros de cada tabla
      const dataResult = await pool.query(dataQuery);

      // Generar tabla HTML para cada tabla
      tableDataHTML += `
        <h2>Tabla: ${table}</h2>
        <table border="1">
          <thead>
            <tr>
              ${dataResult.fields
                .map((field) => `<th>${field.name}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${dataResult.rows
              .map((row) => {
                return `<tr>${dataResult.fields
                  .map((field) => `<td>${row[field.name]}</td>`)
                  .join("")}</tr>`;
              })
              .join("")}
          </tbody>
        </table>
        <br/>
      `;
    }

    // Devolver el HTML con las tablas y sus datos
    return res.send(`
      <html>
        <head>
          <title>Tablas de Base de Datos</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 8px;
              text-align: left;
              border: 1px solid #ddd;
            }
            th {
              background-color: #f2f2f2;
            }
            h2 {
              color: #333;
            }
          </style>
        </head>
        <body>
          <h1>Tablas y sus Datos</h1>
          ${tableDataHTML}
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error obteniendo las tablas o los datos:", error);
    return res.status(500).send("Error obteniendo las tablas y datos.");
  }
});

// Configurar puerto y servidor
app.listen(3000, () => {
  console.log("Server on port", 3000);
});
