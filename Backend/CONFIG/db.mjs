import dotenv from "dotenv";

dotenv.config();

const isTest = process.env.NODE_ENV === "test";

let db;

if (isTest) {

  db = {
    query: async () => [[]]
  };

} else {

  const mysql = await import("mysql2");

  db = mysql.default.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0

  }).promise();

  console.log("Pool MySQL iniciado");

}

export default db;