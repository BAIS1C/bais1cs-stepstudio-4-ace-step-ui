/**
 * Seed Script — Import Strands Official Soundtrack into StepStudio
 *
 * Copies the MP3s from the Strands demo site soundtrack folder into
 * StepStudio's audio directory and inserts them into the SQLite DB
 * as public, featured songs under a "StrandsNation" artist account.
 *
 * Safe to run multiple times — skips if the user/songs already exist.
 *
 * Usage:
 *   npx tsx server/scripts/seed-strands-soundtrack.ts
 *   — OR —
 *   npm run seed:strands
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Paths ──
const DB_PATH = path.join(__dirname, '../data/acestep.db');
const AUDIO_DIR = path.join(__dirname, '../public/audio');
const STRANDS_AUDIO_SUBDIR = 'strands-soundtrack';
const TARGET_DIR = path.join(AUDIO_DIR, STRANDS_AUDIO_SUBDIR);

// Source: the Strands demo site soundtrack folder
// Works when both repos sit under the same "Project Ace" parent
// Also tries the Strands project folder structure
const POSSIBLE_SOURCES = [
  // From server/scripts/ → up 4 levels to mnt/ → into Project Strands
  path.join(__dirname, '../../../../Project Strands/Strands Demo Site/public/audio/soundtrack'),
  // If both repos sit directly next to each other
  path.join(__dirname, '../../../Strands Demo Site/public/audio/soundtrack'),
  // Fallback: explicit Windows path (adjust if needed)
  'C:\\Users\\MAG MSI\\Project Strands\\Strands Demo Site\\public\\audio\\soundtrack',
];

// ── Track metadata (from the Strands playlist.ts with real ID3 data) ──
const TRACKS = [
  { file: 'Aaah-Hole.mp3', title: 'Aaah-Hole (K.A.R.R.S ARABESQUE PROG MIX)', style: 'progressive, arabesque, electronic', duration: 155 },
  { file: 'Dash Dot.mp3', title: 'Dot dot dot! (National Lumpinis Squeak Mix)', style: 'glitch, experimental, electronic', duration: 171 },
  { file: 'Hack the Lie.mp3', title: 'Hack the Lie (NIN Compoop mix)', style: 'industrial, dark electronic, cyberpunk', duration: 213 },
  { file: 'Nation.mp3', title: 'Dot dot dot! (Looks Eastern Euro I like Mix)', style: 'eastern european, electronic, dark', duration: 226 },
  { file: 'Noisy Nation (dash dot mix).mp3', title: 'Noisy Nation (Dot Dot Dash Mix)', style: 'noise, glitch, experimental', duration: 178 },
  { file: 'Nya Nya Strands Bed Remix.mp3', title: 'Nya Nya Strands Bed Remix', style: 'ambient, bed music, atmospheric', duration: 166 },
  { file: 'Strands Drift Away.mp3', title: 'Drift Away (Dawns Fender Bender Mix)', style: 'ambient, dreamy, downtempo', duration: 213 },
  { file: 'Strands Investigation Bed.mp3', title: 'Strands Investigation Bed', style: 'cinematic, tension, investigation', duration: 198 },
  { file: 'Strands The Game (Scatty mcMuffin Mix) - Spaceman The DJ.mp3', title: 'XYZ (Scatty XYZ miix)', style: 'electronic, game music, energetic', duration: 148 },
  { file: 'Strands Theme (XG Tweak Something Aint Wuxia Mix).mp3', title: 'XG Tweak Something Aint Wuxia', style: 'wuxia, cinematic, electronic', duration: 202 },
  { file: 'StrandsnationXYZ (Spelling Bee Mix).mp3', title: 'StrandsnationXYZ (Spelling Bee Mix)', style: 'electronic, playful, experimental', duration: 186 },
  { file: 'StrandsnationXYZ (Synthwave Morse Mix).mp3', title: 'Yeah! (Ron Hubbard was a Badass Mix)', style: 'synthwave, morse code, retro', duration: 195 },
  { file: 'Together (Remix).mp3', title: 'Together (Prog Remix)', style: 'progressive, uplifting, electronic', duration: 210 },
  { file: 'Wakawakawaka Phonky.mp3', title: 'Wakawakawaka Phonky', style: 'phonk, bass, energetic', duration: 214 },
  { file: 'who is god and why did yu do this.mp3', title: 'Strands Theme (Run it Mother f&cker Mix)', style: 'electropunk, aggressive, theme', duration: 228 },
];

const ARTIST_ID = 'strands-official';
const ARTIST_USERNAME = 'StrandsNation';
const PLAYLIST_NAME = 'Strands Official Soundtrack';

// ── Main ──
function main() {
  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║  SEED: Strands Soundtrack → StepStudio   ║');
  console.log('  ╚══════════════════════════════════════════╝\n');

  // 1. Find source directory
  let sourceDir: string | null = null;
  for (const candidate of POSSIBLE_SOURCES) {
    if (fs.existsSync(candidate)) {
      sourceDir = candidate;
      break;
    }
  }

  if (!sourceDir) {
    console.error('  [ERROR] Could not find Strands soundtrack folder.');
    console.error('  Searched:');
    POSSIBLE_SOURCES.forEach(p => console.error(`    - ${p}`));
    console.error('\n  Please set STRANDS_SOUNDTRACK_DIR env var to the correct path.');
    process.exit(1);
  }

  // Allow env override
  sourceDir = process.env.STRANDS_SOUNDTRACK_DIR || sourceDir;
  console.log(`  Source:  ${sourceDir}`);
  console.log(`  Target:  ${TARGET_DIR}`);
  console.log(`  DB:      ${DB_PATH}\n`);

  // 2. Open DB
  if (!fs.existsSync(DB_PATH)) {
    console.error('  [ERROR] Database not found. Start the server once first to create it.');
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 3. Create or verify the StrandsNation user
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(ARTIST_ID) as any;
  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (id, username, bio, is_admin, created_at, updated_at)
      VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(ARTIST_ID, ARTIST_USERNAME, 'Official StrandsNation soundtrack. All tracks generated with ACE-Step.');
    console.log(`  [+] Created user: ${ARTIST_USERNAME}`);
  } else {
    console.log(`  [=] User ${ARTIST_USERNAME} already exists`);
  }

  // 4. Copy audio files
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  let copiedCount = 0;
  let skippedCount = 0;

  for (const track of TRACKS) {
    const src = path.join(sourceDir, track.file);
    const dst = path.join(TARGET_DIR, track.file);

    if (!fs.existsSync(src)) {
      console.log(`  [!] Missing source: ${track.file} — skipping`);
      continue;
    }

    if (fs.existsSync(dst)) {
      // Check if sizes match — skip if identical
      const srcStat = fs.statSync(src);
      const dstStat = fs.statSync(dst);
      if (srcStat.size === dstStat.size) {
        skippedCount++;
        continue;
      }
    }

    fs.copyFileSync(src, dst);
    copiedCount++;
  }

  console.log(`  [+] Audio: ${copiedCount} copied, ${skippedCount} already present\n`);

  // 5. Insert songs into DB
  const insertSong = db.prepare(`
    INSERT OR IGNORE INTO songs (id, user_id, title, style, audio_url, duration, tags, is_public, is_featured, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))
  `);

  let insertedCount = 0;
  const songIds: string[] = [];

  const insertMany = db.transaction(() => {
    for (const track of TRACKS) {
      const audioPath = `/audio/${STRANDS_AUDIO_SUBDIR}/${track.file}`;
      // Deterministic ID based on filename so re-runs don't duplicate
      const songId = `strands-ost-${track.file.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
      songIds.push(songId);

      const existing = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId) as any;
      if (existing) continue;

      const tags = JSON.stringify(['strands', 'official', 'soundtrack', ...track.style.split(', ')]);
      insertSong.run(songId, ARTIST_ID, track.title, track.style, audioPath, track.duration, tags);
      insertedCount++;
    }
  });

  insertMany();
  console.log(`  [+] Songs: ${insertedCount} inserted, ${songIds.length - insertedCount} already exist`);

  // 6. Create the playlist
  const playlistId = 'strands-official-soundtrack';
  const existingPlaylist = db.prepare('SELECT id FROM playlists WHERE id = ?').get(playlistId) as any;

  if (!existingPlaylist) {
    db.prepare(`
      INSERT INTO playlists (id, user_id, name, description, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(playlistId, ARTIST_ID, PLAYLIST_NAME, 'The official StrandsNation game soundtrack — all tracks generated with ACE-Step AI music.');

    // Add songs to playlist
    const insertPlaylistSong = db.prepare(`
      INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position, added_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    const addToPlaylist = db.transaction(() => {
      songIds.forEach((songId, idx) => {
        insertPlaylistSong.run(playlistId, songId, idx);
      });
    });

    addToPlaylist();
    console.log(`  [+] Playlist: "${PLAYLIST_NAME}" created with ${songIds.length} tracks`);
  } else {
    console.log(`  [=] Playlist "${PLAYLIST_NAME}" already exists`);
  }

  // 7. Done
  db.close();

  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║  SEED COMPLETE                            ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log(`\n  ${ARTIST_USERNAME} library now has ${songIds.length} tracks.`);
  console.log('  They\'ll appear as featured, public songs in StepStudio.\n');
}

main();
