import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { detectEncoder, EncoderInfo } from './detect-gpu.js';
import { createSession, writeAudio, startEncode, writeFrame, finishFrames, getSession, cleanupAll } from './encoder.js';
import { createHealthRouter } from './routes/health.js';
import { createDownloadRouter } from './routes/download.js';

const PORT = 9877;
const HOST = '127.0.0.1'; // Localhost only — never expose to network

// ── Detect GPU / Encoder on startup ──
console.log('');
console.log('  ╔══════════════════════════════════════════╗');
console.log('  ║   STRANDS VIDEO ENCODER                  ║');
console.log('  ║   Local GPU-accelerated video encoding    ║');
console.log('  ╚══════════════════════════════════════════╝');
console.log('');
console.log('[Startup] Detecting available encoders...');

let encoderInfo: EncoderInfo;

try {
  encoderInfo = detectEncoder();
  console.log('');
  console.log(`  ✓ Encoder:  ${encoderInfo.label} (${encoderInfo.encoder})`);
  if (encoderInfo.gpu) {
    console.log(`  ✓ GPU:      ${encoderInfo.gpu}`);
  }
  console.log(`  ✓ Hardware: ${encoderInfo.hardware ? 'YES' : 'NO (software fallback)'}`);
  console.log('');
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[Startup] FATAL: ${msg}`);
  console.error('[Startup] Cannot start encoder service. Exiting.');
  process.exit(1);
}

// ── Express App ──
const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Only allow localhost origins
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed — localhost only'));
    }
  },
}));

app.use(express.json());

// Routes
app.use(createHealthRouter(encoderInfo));
app.use(createDownloadRouter());

// ── HTTP Server + WebSocket ──
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/encode' });

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] New connection');

  let sessionId: string | null = null;
  let ffmpegProcess: ReturnType<typeof startEncode> | null = null;

  ws.on('message', (data: Buffer | string, isBinary: boolean) => {
    // ── Text messages: JSON commands ──
    if (!isBinary && typeof data !== 'object') {
      try {
        const msg = JSON.parse(data.toString());
        handleJsonMessage(ws, msg);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
      return;
    }

    // Handle Buffer that might be text (WebSocket quirk)
    if (Buffer.isBuffer(data)) {
      // Check if it's a JSON text message
      const str = data.toString('utf8', 0, Math.min(data.length, 20));
      if (str.startsWith('{') || str.startsWith('[')) {
        try {
          const msg = JSON.parse(data.toString());
          handleJsonMessage(ws, msg);
          return;
        } catch {
          // Not JSON — treat as binary frame data
        }
      }

      // ── Binary messages: frame data ──
      if (sessionId) {
        const backpressure = !writeFrame(sessionId, data);
        if (backpressure) {
          // Tell browser to slow down
          ws.send(JSON.stringify({ type: 'backpressure', slow: true }));
        }
      }
    }
  });

  function handleJsonMessage(ws: WebSocket, msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'init': {
        // Create session and start FFmpeg
        const fps = (msg.fps as number) || 30;
        const width = (msg.width as number) || 1920;
        const height = (msg.height as number) || 1080;
        const totalFrames = (msg.totalFrames as number) || 0;

        const session = createSession(encoderInfo.encoder, totalFrames);
        sessionId = session.id;

        console.log(`[WS] Session ${sessionId.slice(0, 8)}: init (${width}x${height} @ ${fps}fps, ~${totalFrames} frames, encoder: ${encoderInfo.encoder})`);

        ws.send(JSON.stringify({
          type: 'session',
          sessionId: session.id,
          encoder: encoderInfo.encoder,
          label: encoderInfo.label,
          hardware: encoderInfo.hardware,
        }));
        break;
      }

      case 'audio': {
        // Audio data arrives as base64
        if (sessionId && msg.data) {
          const audioBuffer = Buffer.from(msg.data as string, 'base64');
          writeAudio(sessionId, audioBuffer);
          ws.send(JSON.stringify({ type: 'audio_received' }));
        }
        break;
      }

      case 'start': {
        // Start the FFmpeg encode process — frames will be piped to stdin
        if (!sessionId) {
          ws.send(JSON.stringify({ type: 'error', message: 'No session initialized' }));
          return;
        }

        const fps = (msg.fps as number) || 30;
        const width = (msg.width as number) || 1920;
        const height = (msg.height as number) || 1080;

        ffmpegProcess = startEncode(sessionId, fps, width, height, (progress) => {
          ws.send(JSON.stringify({ type: 'progress', stage: 'encoding', progress }));
        });

        ws.send(JSON.stringify({ type: 'ready', message: 'Send frames now' }));
        break;
      }

      case 'end': {
        // All frames sent
        if (sessionId) {
          finishFrames(sessionId);
          ws.send(JSON.stringify({ type: 'finalizing' }));

          // Poll for completion
          const checkInterval = setInterval(() => {
            if (!sessionId) { clearInterval(checkInterval); return; }
            const session = getSession(sessionId);
            if (!session) { clearInterval(checkInterval); return; }

            if (session.stage === 'complete') {
              clearInterval(checkInterval);
              const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);
              ws.send(JSON.stringify({
                type: 'complete',
                sessionId: session.id,
                downloadUrl: `/download/${session.id}`,
                elapsed: parseFloat(elapsed),
                framesEncoded: session.framesReceived,
              }));
            } else if (session.stage === 'error') {
              clearInterval(checkInterval);
              ws.send(JSON.stringify({
                type: 'error',
                message: session.error || 'Encoding failed',
              }));
            }
          }, 250);
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown command: ${msg.type}` }));
    }
  }

  ws.on('close', () => {
    console.log(`[WS] Connection closed${sessionId ? ` (session ${sessionId.slice(0, 8)})` : ''}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
});

// ── Start Server ──
server.listen(PORT, HOST, () => {
  console.log(`[Server] Strands Video Encoder listening on http://${HOST}:${PORT}`);
  console.log(`[Server] Encoder: ${encoderInfo.label} (${encoderInfo.encoder})`);
  if (encoderInfo.gpu) {
    console.log(`[Server] GPU: ${encoderInfo.gpu}`);
  }
  console.log('');
});

// ── Graceful Shutdown ──
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Cleaning up...');
  cleanupAll();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Shutdown] Cleaning up...');
  cleanupAll();
  server.close();
  process.exit(0);
});
