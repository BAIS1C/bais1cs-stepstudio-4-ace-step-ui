import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

export interface EncoderInfo {
  encoder: string;        // e.g. 'h264_nvenc', 'h264_qsv', 'h264_amf', 'libx264'
  label: string;          // Human-readable label
  gpu: string | null;     // GPU name from nvidia-smi or null
  hardware: boolean;      // Whether this is a hardware encoder
}

const IS_WINDOWS = process.platform === 'win32';

// Priority-ordered list of encoders to probe
const ENCODER_CHAIN: { id: string; label: string; hardware: boolean }[] = [
  { id: 'h264_nvenc',  label: 'NVIDIA NVENC',    hardware: true },
  { id: 'h264_qsv',   label: 'Intel QuickSync',  hardware: true },
  { id: 'h264_amf',   label: 'AMD AMF',           hardware: true },
  { id: 'libx264',    label: 'x264 (Software)',    hardware: false },
];

/**
 * Check if ffmpeg is installed and available
 */
function ffmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of available encoders from ffmpeg
 */
function getAvailableEncoders(): string[] {
  try {
    const output = execSync('ffmpeg -hide_banner -encoders', {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    }).toString();
    return output.split('\n')
      .filter(line => line.trim().startsWith('V'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[1] || '';
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get NVIDIA GPU name via nvidia-smi
 */
function getNvidiaGpuName(): string | null {
  try {
    const output = execSync('nvidia-smi --query-gpu=name --format=csv,noheader,nounits', {
      stdio: 'pipe',
      timeout: 5000,
    }).toString().trim();
    return output.split('\n')[0] || null;
  } catch {
    return null;
  }
}

/**
 * Validate that an encoder actually works by doing a tiny test encode.
 * On Windows, `-f null -` can behave unpredictably through Node's execSync,
 * so we write to a real temp file and clean up after.
 */
function testEncoder(encoder: string): boolean {
  const tempOut = path.join(os.tmpdir(), `strands-encoder-test-${encoder}.mp4`);

  try {
    // Clean up any leftover from previous run
    try { fs.unlinkSync(tempOut); } catch { /* ignore */ }

    // Build command — write to real temp file instead of null sink
    // Use 256x256 minimum — Blackwell (RTX 50xx) NVENC rejects anything below ~128x128
    const gpuFlag = encoder.includes('nvenc') ? '-gpu 0' : '';
    const cmd = `ffmpeg -y -hide_banner -loglevel error -f lavfi -i color=black:s=256x256:d=0.1:rate=30 -frames:v 3 -c:v ${encoder} ${gpuFlag} "${tempOut}"`;

    console.log(`[GPU Detect] Test cmd: ${cmd}`);

    execSync(cmd, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
      // On Windows, run through cmd.exe explicitly
      shell: IS_WINDOWS ? 'cmd.exe' : '/bin/sh',
    });

    // Verify the file was actually created and has content
    if (fs.existsSync(tempOut)) {
      const stats = fs.statSync(tempOut);
      console.log(`[GPU Detect] ${encoder}: test output ${stats.size} bytes`);
      fs.unlinkSync(tempOut);
      return stats.size > 0;
    }

    return false;
  } catch (err: unknown) {
    // Clean up temp file on failure
    try { fs.unlinkSync(tempOut); } catch { /* ignore */ }

    // Log the actual FFmpeg error
    if (err && typeof err === 'object') {
      const errObj = err as Record<string, unknown>;

      // stderr usually has the real error from FFmpeg
      if ('stderr' in errObj && errObj.stderr) {
        const stderr = errObj.stderr.toString().trim();
        if (stderr) {
          console.log(`[GPU Detect] ${encoder} stderr: ${stderr}`);
        }
      }

      // stdout (where 2>&1 would have gone)
      if ('stdout' in errObj && errObj.stdout) {
        const stdout = errObj.stdout.toString().trim();
        if (stdout) {
          console.log(`[GPU Detect] ${encoder} stdout: ${stdout}`);
        }
      }

      // Node's error message (e.g., exit code)
      if ('message' in errObj && errObj.message) {
        const msg = String(errObj.message);
        // Only log the first line — the full message includes stdout/stderr again
        const firstLine = msg.split('\n')[0];
        console.log(`[GPU Detect] ${encoder} error: ${firstLine}`);
      }
    }

    return false;
  }
}

/**
 * Detect the best available encoder on this system.
 * Walks the priority chain, validates each candidate actually works,
 * and returns the first one that passes.
 */
export function detectEncoder(): EncoderInfo {
  if (!ffmpegAvailable()) {
    throw new Error('FFmpeg is not installed or not in PATH. Install FFmpeg with NVENC support to use GPU encoding.');
  }

  const availableEncoders = getAvailableEncoders();
  const gpuName = getNvidiaGpuName();

  console.log(`[GPU Detect] Platform: ${process.platform} (${IS_WINDOWS ? 'Windows' : 'Unix'})`);
  console.log('[GPU Detect] Available encoders:', availableEncoders.length);
  console.log('[GPU Detect] NVIDIA GPU:', gpuName || 'not detected');

  for (const candidate of ENCODER_CHAIN) {
    if (!availableEncoders.includes(candidate.id)) {
      console.log(`[GPU Detect] ${candidate.id}: not compiled into ffmpeg, skipping`);
      continue;
    }

    console.log(`[GPU Detect] ${candidate.id}: found in ffmpeg, testing...`);

    if (testEncoder(candidate.id)) {
      console.log(`[GPU Detect] ${candidate.id}: PASSED`);
      return {
        encoder: candidate.id,
        label: candidate.label,
        gpu: candidate.hardware ? gpuName : null,
        hardware: candidate.hardware,
      };
    } else {
      console.log(`[GPU Detect] ${candidate.id}: FAILED, trying next`);
    }
  }

  throw new Error('No working H.264 encoder found. Ensure FFmpeg is built with at least libx264 support.');
}

/**
 * Get all available encoders (for /capabilities endpoint)
 */
export function getAllEncoders(): { id: string; label: string; available: boolean; working: boolean }[] {
  const availableEncoders = getAvailableEncoders();

  return ENCODER_CHAIN.map(candidate => {
    const available = availableEncoders.includes(candidate.id);
    return {
      id: candidate.id,
      label: candidate.label,
      available,
      working: available ? testEncoder(candidate.id) : false,
    };
  });
}
