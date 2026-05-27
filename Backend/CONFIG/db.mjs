
const isTest = process.env.NODE_ENV === "test";

let db;

if (isTest) {

  db = {
    query: async () => [[]]
  };

} else {

  const mysql = await import("mysql2");

  const dbHost = process.env.MYSQLHOST || process.env.DB_HOST;
  const dbPort = Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3306;
  const dbUser = process.env.MYSQLUSER || process.env.DB_USER || "root";
  const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME;

  // Debug info (avoid printing password in logs)
  console.log("MySQL config:", { host: dbHost, port: dbPort, user: dbUser, database: dbName });

  db = mysql.default.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: dbName,
    charset: "utf8mb4",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0

  }).promise();

  console.log("Pool MySQL iniciado");

}

export default db;