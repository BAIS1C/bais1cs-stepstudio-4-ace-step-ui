import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface EncodeSession {
  id: string;
  tempDir: string;
  audioPath: string;
  outputPath: string;
  ffmpeg: ChildProcess | null;
  framesReceived: number;
  totalFrames: number;
  stage: 'receiving' | 'encoding' | 'complete' | 'error';
  encoder: string;
  startTime: number;
  error?: string;
}

const activeSessions = new Map<string, EncodeSession>();

// Cleanup completed files after 5 minutes
const CLEANUP_DELAY_MS = 5 * 60 * 1000;

/**
 * Create a new encode session
 */
export function createSession(encoder: string, totalFrames: number): EncodeSession {
  const id = uuidv4();
  const tempDir = path.join(os.tmpdir(), `strands-encode-${id}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const session: EncodeSession = {
    id,
    tempDir,
    audioPath: path.join(tempDir, 'audio.mp3'),
    outputPath: path.join(tempDir, 'output.mp4'),
    ffmpeg: null,
    framesReceived: 0,
    totalFrames,
    stage: 'receiving',
    encoder,
    startTime: Date.now(),
  };

  activeSessions.set(id, session);
  return session;
}

/**
 * Write audio data to the session temp directory
 */
export function writeAudio(sessionId: string, audioData: Buffer): void {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  fs.writeFileSync(session.audioPath, audioData);
  console.log(`[Encoder ${sessionId.slice(0, 8)}] Audio written: ${(audioData.length / 1024 / 1024).toFixed(1)}MB`);
}

/**
 * Start the FFmpeg encode process.
 * Returns a promise that resolves when encoding is complete.
 * Frames are piped to stdin as JPEG data.
 */
export function startEncode(
  sessionId: string,
  fps: number,
  width: number,
  height: number,
  onProgress: (progress: number) => void,
): { process: ChildProcess; stdinReady: boolean } {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  // NVENC preset args vary by encoder
  const encoderArgs = getEncoderArgs(session.encoder);

  const args = [
    '-y',
    // Input: piped JPEG frames
    '-f', 'image2pipe',
    '-framerate', String(fps),
    '-i', 'pipe:0',
    // Input: audio file
    '-i', session.audioPath,
    // Video encoder
    '-c:v', session.encoder,
    ...encoderArgs,
    '-pix_fmt', 'yuv420p',
    // Audio encoder
    '-c:a', 'aac',
    '-b:a', '192k',
    // Sync
    '-shortest',
    // Output
    session.outputPath,
  ];

  console.log(`[Encoder ${sessionId.slice(0, 8)}] Spawning FFmpeg: ffmpeg ${args.join(' ')}`);

  const ffmpeg = spawn('ffmpeg', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  session.ffmpeg = ffmpeg;
  session.stage = 'receiving';

  // Parse FFmpeg stderr for progress
  let lastProgressReport = 0;
  ffmpeg.stderr?.on('data', (data: Buffer) => {
    const line = data.toString();
    // Parse frame= progress lines
    const frameMatch = line.match(/frame=\s*(\d+)/);
    if (frameMatch) {
      const encodedFrames = parseInt(frameMatch[1]);
      const progress = Math.min(encodedFrames / session.totalFrames, 1);
      // Throttle progress reports to every 2%
      if (progress - lastProgressReport >= 0.02 || progress >= 1) {
        lastProgressReport = progress;
        onProgress(progress);
      }
    }
  });

  ffmpeg.on('close', (code) => {
    if (code === 0 && fs.existsSync(session.outputPath)) {
      const stats = fs.statSync(session.outputPath);
      const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);
      console.log(`[Encoder ${sessionId.slice(0, 8)}] Complete: ${(stats.size / 1024 / 1024).toFixed(1)}MB in ${elapsed}s`);
      session.stage = 'complete';
    } else {
      console.error(`[Encoder ${sessionId.slice(0, 8)}] FFmpeg exited with code ${code}`);
      session.stage = 'error';
      session.error = `FFmpeg exited with code ${code}`;
    }
  });

  ffmpeg.on('error', (err) => {
    console.error(`[Encoder ${sessionId.slice(0, 8)}] FFmpeg spawn error:`, err);
    session.stage = 'error';
    session.error = err.message;
  });

  return { process: ffmpeg, stdinReady: true };
}

/**
 * Write a JPEG frame to the FFmpeg stdin pipe
 */
export function writeFrame(sessionId: string, frameData: Buffer): boolean {
  const session = activeSessions.get(sessionId);
  if (!session || !session.ffmpeg || !session.ffmpeg.stdin) return false;

  try {
    const canWrite = session.ffmpeg.stdin.write(frameData);
    session.framesReceived++;
    return canWrite;
  } catch (err) {
    console.error(`[Encoder ${sessionId.slice(0, 8)}] Write frame error:`, err);
    return false;
  }
}

/**
 * Signal that all frames have been sent — close stdin to let FFmpeg finalize
 */
export function finishFrames(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (!session || !session.ffmpeg || !session.ffmpeg.stdin) return;

  console.log(`[Encoder ${sessionId.slice(0, 8)}] All ${session.framesReceived} frames received, closing stdin`);
  session.stage = 'encoding';
  session.ffmpeg.stdin.end();
}

/**
 * Get the output file path for download
 */
export function getOutputPath(sessionId: string): string | null {
  const session = activeSessions.get(sessionId);
  if (!session || session.stage !== 'complete') return null;
  if (!fs.existsSync(session.outputPath)) return null;
  return session.outputPath;
}

/**
 * Get session info
 */
export function getSession(sessionId: string): EncodeSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Schedule cleanup for a session
 */
export function scheduleCleanup(sessionId: string): void {
  setTimeout(() => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    try {
      fs.rmSync(session.tempDir, { recursive: true, force: true });
      console.log(`[Encoder ${sessionId.slice(0, 8)}] Cleaned up temp files`);
    } catch (err) {
      console.error(`[Encoder ${sessionId.slice(0, 8)}] Cleanup error:`, err);
    }

    activeSessions.delete(sessionId);
  }, CLEANUP_DELAY_MS);
}

/**
 * Cleanup all sessions on process exit
 */
export function cleanupAll(): void {
  for (const [id, session] of activeSessions) {
    try {
      if (session.ffmpeg && !session.ffmpeg.killed) {
        session.ffmpeg.kill('SIGTERM');
      }
      fs.rmSync(session.tempDir, { recursive: true, force: true });
    } catch {
      // Best effort
    }
  }
  activeSessions.clear();
}

/**
 * Get encoder-specific FFmpeg arguments
 */
function getEncoderArgs(encoder: string): string[] {
  switch (encoder) {
    case 'h264_nvenc':
      return [
        '-preset', 'p4',     // Balanced speed/quality
        '-tune', 'hq',       // Enable B-frames + lookahead
        '-b:v', '8M',        // 8 Mbps bitrate
        '-maxrate', '12M',
        '-bufsize', '16M',
        '-rc', 'vbr',        // Variable bitrate
      ];

    case 'h264_qsv':
      return [
        '-preset', 'medium',
        '-b:v', '8M',
        '-maxrate', '12M',
      ];

    case 'h264_amf':
      return [
        '-quality', 'balanced',
        '-b:v', '8M',
        '-maxrate', '12M',
      ];

    case 'libx264':
      return [
        '-preset', 'fast',
        '-crf', '20',         // Quality-based (ignore bitrate)
        '-movflags', '+faststart',
      ];

    default:
      return ['-b:v', '8M'];
  }
}
