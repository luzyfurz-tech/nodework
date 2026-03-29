import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { Ollama } from "ollama";
import { Client } from "ssh2";
import https from "https";
import http from "http";
import tls from "tls";

// Agent to ignore SSL errors for SEO scraper
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Helper for SSH execution
const execSsh = (config: any, command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        let output = '';
        stream.on('close', (code: number, signal: string) => {
          conn.end();
          if (code !== 0) reject(new Error(`Exit code ${code}`));
          else resolve(output);
        }).on('data', (data: any) => {
          output += data;
        }).stderr.on('data', (data: any) => {
          output += data;
        });
      });
    }).on('error', (err) => reject(err)).connect({
      host: config.host,
      port: parseInt(config.port) || 22,
      username: config.username,
      password: config.password
    });
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for all origins with more robust options
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.use(express.json());

  // Security Scan Endpoint
  app.post("/api/security/scan", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
      const protocol = targetUrl.protocol === 'https:' ? https : http;

      const scanResults: any = {
        url: targetUrl.href,
        headers: {},
        ssl: null,
        dns: null
      };

      // 1. Fetch Headers
      const headerPromise = new Promise((resolve) => {
        const request = protocol.get(targetUrl.href, { timeout: 5000 }, (response) => {
          scanResults.headers = response.headers;
          resolve(true);
        });
        request.on('error', () => resolve(false));
        request.on('timeout', () => {
          request.destroy();
          resolve(false);
        });
      });

      // 2. Check SSL (if https)
      const sslPromise = new Promise((resolve) => {
        if (targetUrl.protocol !== 'https:') return resolve(null);

        const socket = tls.connect(443, targetUrl.hostname, { servername: targetUrl.hostname }, () => {
          const cert = socket.getPeerCertificate();
          scanResults.ssl = {
            subject: cert.subject,
            issuer: cert.issuer,
            valid_from: cert.valid_from,
            valid_to: cert.valid_to,
            fingerprint: cert.fingerprint,
            bits: cert.bits
          };
          socket.end();
          resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.setTimeout(5000, () => {
          socket.destroy();
          resolve(false);
        });
      });

      await Promise.all([headerPromise, sslPromise]);

      res.json(scanResults);
    } catch (error: any) {
      console.error("Security Scan Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Agent Deployment Endpoint (SSH based)
  app.post("/api/agent/deploy", async (req, res) => {
    const { dockerfile, ssh } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });
    if (!ssh || !ssh.host) return res.status(400).json({ error: "SSH config required" });

    try {
      // 1. Create remote temp dir and Dockerfile
      const remoteTempDir = `/tmp/agent-${Date.now()}`;
      const escapedDockerfile = dockerfile.replace(/'/g, "'\\''");
      
      await execSsh(ssh, `mkdir -p ${remoteTempDir} && echo '${escapedDockerfile}' > ${remoteTempDir}/Dockerfile`);
      
      // 2. Build and Run
      const projectName = `agent-app-${Date.now()}`;
      await execSsh(ssh, `cd ${remoteTempDir} && docker build -t ${projectName} .`);
      const runOutput = await execSsh(ssh, `docker run -d -p 0:80 ${projectName}`);
      
      res.json({ 
        status: "Deployment successful", 
        containerId: runOutput.trim(),
        logs: "Container started via SSH" 
      });
    } catch (error: any) {
      console.error("SSH Deployment Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Agent Execution Endpoint (General SSH Commands)
  app.post("/api/agent/exec", async (req, res) => {
    const { command, ssh } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) return res.status(401).json({ error: "Unauthorized" });
    if (!ssh || !ssh.host) return res.status(400).json({ error: "SSH config required" });

    try {
      const output = await execSsh(ssh, command);
      res.json({ status: "Success", output });
    } catch (error: any) {
      console.error("SSH Exec Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Proxy for Ollama Tags (List Models)
  app.get("/api/models", async (req, res) => {
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) {
      return res.status(401).json({ error: "API Key required" });
    }

    try {
      const ollamaHost = process.env.OLLAMA_HOST || "https://ollama.com";
      const ollamaApiKey = process.env.OLLAMA_API_KEY || apiKey;

      const response = await fetch(`${ollamaHost}/api/tags`, {
        headers: {
          ...(ollamaApiKey ? { Authorization: `Bearer ${ollamaApiKey}` } : {}),
          'Content-Type': 'application/json',
          'Origin': '',
          'Referer': '',
        },
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // SEO Analysis Endpoint
  app.get("/api/seo/analyze", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL er påkrævet" });
    }

    try {
      const targetUrl = url.startsWith("http") ? url : `https://${url}`;
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // @ts-ignore - node fetch supports agent
        agent: targetUrl.startsWith('https') ? httpsAgent : undefined
      });
      
      if (!response.ok) throw new Error(`Kunne ikke hente siden: ${response.statusText}`);
      
      const html = await response.text();
      
      // Basic SEO extraction
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) || 
                        html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
      
      const h1Matches = [...html.matchAll(/<h1[\s\S]*?>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]*>?/gm, '').trim());
      const h2Matches = [...html.matchAll(/<h2[\s\S]*?>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]*>?/gm, '').trim());
      const h3Matches = [...html.matchAll(/<h3[\s\S]*?>([\s\S]*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]*>?/gm, '').trim());

      res.json({
        title: titleMatch ? titleMatch[1].trim() : "Ingen titel fundet",
        description: descMatch ? descMatch[1].trim() : "Ingen beskrivelse fundet",
        h1: h1Matches,
        h2: h2Matches,
        h3: h3Matches,
        url: targetUrl
      });
    } catch (error: any) {
      console.error("SEO Analysis Error:", error);
      res.status(500).json({ error: error.message || "Kunne ikke analysere siden" });
    }
  });

  // API Proxy for Ollama Chat (Streaming)
  app.post("/api/chat", async (req, res) => {
    const { model, messages, stream } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];

    if (!apiKey) {
      return res.status(401).json({ error: "API Key required" });
    }

    try {
      const ollamaHost = process.env.OLLAMA_HOST || "https://ollama.com";
      const ollamaApiKey = process.env.OLLAMA_API_KEY || apiKey;

      const ollama = new Ollama({
        host: ollamaHost,
        // Explicitly set headers to avoid passing through browser-specific headers like Origin
        headers: {
          ...(ollamaApiKey ? { Authorization: `Bearer ${ollamaApiKey}` } : {}),
          'Content-Type': 'application/json',
          'Origin': '',
          'Referer': '',
        },
      });

      if (stream) {
        const response = await ollama.chat({
          model,
          messages,
          stream: true,
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const part of response) {
          res.write(`data: ${JSON.stringify(part)}\n\n`);
        }
        res.end();
      } else {
        const response = await ollama.chat({
          model,
          messages,
          stream: false,
        });
        res.json(response);
      }
    } catch (error: any) {
      console.error("Ollama API Error:", error);
      res.status(error.status || 500).json({ error: error.message || "Internal Server Error" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
