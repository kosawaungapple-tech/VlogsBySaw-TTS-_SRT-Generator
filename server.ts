import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { GoogleGenAI } from "@google/genai";

// Initialize Firebase Admin
const app = getApps().length 
  ? getApp() 
  : initializeApp({
      projectId: firebaseConfig.projectId,
    });

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

interface AuthenticatedRequest extends express.Request {
  user?: DecodedIdToken;
}

// Middleware to verify Firebase ID Token
const authenticate = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthenticated: Missing authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Error verifying Firebase ID token:', err);
    res.status(401).json({ error: 'Unauthenticated: Invalid token' });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is healthy", timestamp: new Date().toISOString() });
  });

  // Gemini Proxy Endpoint
  // This allows authorized users to access Gemini via this server.
  // It handles secure server-side API key management for admin keys.
  app.post("/api/gemini/proxy", authenticate, async (req, res) => {
    const { model, contents, config, apiKey: providedKey } = req.body;
    
    // Priority: 1. Key provided in body (Personal Key), 2. Admin Pool Keys from Firestore
    const apiKey = providedKey;
    
    if (!model) {
      return res.status(400).json({ error: "Model name is required" });
    }

    try {
      // If no personal key provided, we fetch and rotate through admin keys from Firestore
      if (!apiKey) {
        try {
          const adminChannelsSnapshot = await db.collection('admin_channels').get();
          const adminKeys = adminChannelsSnapshot.docs
            .map(doc => doc.data().key)
            .filter(key => !!key);

          if (adminKeys.length === 0) {
            // Fallback to environment variable if no firestore keys
            if (process.env.GEMINI_API_KEY) {
              adminKeys.push(process.env.GEMINI_API_KEY);
            } else {
              return res.status(400).json({ error: "No API Keys available. Please add one in settings." });
            }
          }

          let lastError = null;
          // Try up to 3 keys or all available (whichever is less) to avoid excessive retries
          const totalKeys = adminKeys.length;
          const maxAttempts = Math.min(totalKeys, 3);
          const startIndex = Math.floor(Math.random() * totalKeys);

          for (let i = 0; i < maxAttempts; i++) {
            const currentKey = adminKeys[(startIndex + i) % totalKeys];
            
            try {
              const ai = new GoogleGenAI({ apiKey: currentKey });
              console.log(`[Proxy] Requesting model: ${model} with Admin Pool Key (${i + 1}/${maxAttempts})`);
              
              const result = await ai.models.generateContent({
                model: model,
                contents,
                config
              });
              return res.json(result);
            } catch (err: unknown) {
              lastError = err as Error;
              const errorObj = err as { status?: number; statusCode?: number; response?: { status: number }; message?: string };
              const status = errorObj.status || errorObj.statusCode || (errorObj.response ? errorObj.response.status : 500);
              
              // If it's a rate limit or overloaded error, try the next key
              if (status === 429 || status === 503 || (errorObj.message && errorObj.message.includes('RESOURCES_EXHAUSTED'))) {
                console.warn(`[Proxy] Admin key failed (status ${status}), rotating...`);
                continue;
              }
              // For other errors (like invalid prompt), throw immediately
              throw err;
            }
          }
          
          if (lastError) throw lastError;
        } catch (dbErr) {
          console.error("[Proxy] Firestore/Rotation Error:", dbErr);
          throw dbErr;
        }
      } else {
        // PERSONAL KEY MODE
        const ai = new GoogleGenAI({ apiKey });
        console.log(`[Proxy] Requesting model: ${model} with Personal Key: ${apiKey.substring(0, 4)}...`);
        
        const result = await ai.models.generateContent({
          model: model,
          contents,
          config
        });
        return res.json(result);
      }
    } catch (error: unknown) {
      console.error("[Proxy] Gemini Error:", error);
      
      const err = error as { status?: number; statusCode?: number; response?: { status: number }; message?: string };
      
      // Extract status and message from the various error formats Gemini can return
      const status = err.status || err.statusCode || (err.response ? err.response.status : 500);
      const message = err.message || "Failed to call Gemini API";
      
      res.status(status).json({ 
        error: message,
        details: error
      });
    }
  });

  // Telegram Notification Endpoint
  app.post("/api/notify-activation", authenticate, async (req, res) => {
    const { email, displayName } = req.body;
    
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    // Try to get from Firestore if not in env
    try {
      const systemConfigDoc = await db.collection('system_config').doc('main').get();
      if (systemConfigDoc.exists) {
        const data = systemConfigDoc.data();
        if (data?.telegram_bot_token) botToken = data.telegram_bot_token;
        if (data?.telegram_chat_id) chatId = data.telegram_chat_id;
      }
    } catch (err) {
      console.error("Error fetching system config from Firestore:", err);
    }

    if (!botToken || !chatId) {
      console.warn("Telegram configuration missing. Skipping notification.");
      return res.status(200).json({ success: true, message: "Notification skipped (config missing)" });
    }

    const message = `🔔 *New Activation Request*\n\nUser: ${email}\nName: ${displayName}\nTime: ${new Date().toLocaleString()}`;
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Example protected route
  app.get("/api/user/profile", authenticate, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        res.json(userDoc.data());
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      res.status(500).json({ error: 'Internal server error' });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
