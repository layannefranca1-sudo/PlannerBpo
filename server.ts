import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Admin User Management Routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("usuarios")
        .select("*");
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    const { nome, codigo, senha } = req.body;
    try {
      // Check for duplicate code
      const { data: usuarioExistente } = await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("codigo", codigo)
        .maybeSingle();

      if (usuarioExistente) {
        return res.status(400).json({ error: "Já existe um usuário com este código" });
      }

      // Map codigo to internal email
      const emailFicticio = `${codigo}@plannerbpo.com`;

      // 1. Create user in Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailFicticio,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, codigo }
      });

      if (authError) throw authError;

      // 2. Create user in usuarios table
      const { error: dbError } = await supabaseAdmin
        .from("usuarios")
        .insert({
          user_id: authData.user.id,
          nome,
          codigo
        });

      if (dbError) throw dbError;

      res.json({ success: true, user: authData.user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // 1. Delete from Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) throw authError;

      // 2. Delete from usuarios table (should be handled by cascade if set up, but let's be explicit)
      const { error: dbError } = await supabaseAdmin
        .from("usuarios")
        .delete()
        .eq("user_id", id);
      
      if (dbError) throw dbError;

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('CRITICAL: Failed to start server:', err);
});
