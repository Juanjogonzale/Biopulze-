import dotenv from "dotenv";

// DEBE SER LO PRIMERO ANTES DE CUALQUIER IMPORT
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CONFIGURACIONES
import "./CONFIG/db.mjs";

// CONTROLADORES
import { register, login, verificarRegistro, verificarLogin, reenviarCodigoRegistro, reenviarCodigoLogin, forgotPassword, resetPassword } from "./CONTROLLERS/authController.mjs";
import { crearEquipo, listarEquipos, actualizarEquipo, eliminarEquipo } from "./CONTROLLERS/equiposController.mjs";
import { getMe, updateProfile } from "./CONTROLLERS/userController.mjs";
import { listarHistorialEquipos } from "./CONTROLLERS/auditController.mjs";

// MIDDLEWARE
import { verificarToken } from "./middleware/authMiddleware.mjs";

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ===== RUTAS =====
app.post("/register", register);
app.post("/register/verify", verificarRegistro);
app.post("/register/resend-code", reenviarCodigoRegistro);
app.post("/login", login);
app.post("/login/verify", verificarLogin);
app.post("/login/resend-code", reenviarCodigoLogin);
app.post("/forgot-password", forgotPassword);
app.post("/reset-password", resetPassword);

app.get("/equipos", verificarToken, listarEquipos);
app.post("/equipos", verificarToken, crearEquipo);
app.put("/equipos/:id", verificarToken, actualizarEquipo);
app.delete("/equipos/:id", verificarToken, eliminarEquipo);

app.get("/me", verificarToken, getMe);
app.put("/user/profile", verificarToken, updateProfile);

app.get("/audit/equipos", verificarToken, listarHistorialEquipos);

app.get("/api/status", (req, res) => {
  res.json({ mensaje: "el Servidor BioPulse esta activo soci" });
});

app.use(express.static(path.join(__dirname, "..", "www")));

export { app };

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}