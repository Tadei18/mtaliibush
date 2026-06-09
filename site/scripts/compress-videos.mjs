#!/usr/bin/env node
/**
 * Compress every clip in ../Reels/ for web use.
 *
 *  Outputs into site/public/video/ so they ship as static files
 *  (binaries don't belong in Astro's src/assets/ image pipeline).
 *
 *  For each input clip we produce:
 *    1. A poster frame  — 1080w JPG, quality ~85, lifted from the 1.5s mark.
 *    2. A web-friendly MP4 — H.264, CRF 26, slow preset, audio stripped, +faststart.
 *  Plus a one-off hero ambient loop (8s, smaller bitrate) generated from trip.mp4.
 *
 *  Run with: npm run videos:compress
 *  Set env FFMPEG_PATH to override the ffmpeg binary location.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(SITE_ROOT, '..');
const REELS_DIR = path.join(PROJECT_ROOT, 'Reels');
const OUT_DIR = path.join(SITE_ROOT, 'public', 'video');

const FFMPEG =
  process.env.FFMPEG_PATH ||
  'C:\\Users\\Njumwa\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';

// Map source filename → clean kebab-case slug used on the web
const REELS = [
  { src: 'trip.mp4', slug: 'trip' },
  { src: 'rooms.mp4', slug: 'rooms' },
  { src: 'mtalii.mp4', slug: 'mtalii' },
  { src: 'cath_1.mp4', slug: 'cath' },
  { src: 'models.mp4', slug: 'models' },
];

const HERO_AMBIENT = {
  source: 'trip.mp4',
  output: 'hero-ambient.mp4',
  startSeconds: 2,
  durationSeconds: 9,
  width: 720, // smaller — only used at low opacity behind the photograph
  crf: 30,
};

function run(args, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: quiet ? 'ignore' : ['ignore', 'inherit', 'inherit'] });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
}

function humanBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} kB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function makePoster(input, output) {
  await run([
    '-y',
    '-ss', '1.5',
    '-i', input,
    '-frames:v', '1',
    '-vf', "scale='min(1080,iw)':-2",
    '-q:v', '4',
    output,
  ]);
}

async function compressClip(input, output, { width = 1080, crf = 26 } = {}) {
  await run([
    '-y',
    '-i', input,
    '-vf', `scale='min(${width},iw)':-2`,
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.0',
    '-an',
    '-movflags', '+faststart',
    output,
  ]);
}

async function makeHeroAmbient(input, output) {
  await run([
    '-y',
    '-ss', String(HERO_AMBIENT.startSeconds),
    '-i', input,
    '-t', String(HERO_AMBIENT.durationSeconds),
    '-vf', `scale='min(${HERO_AMBIENT.width},iw)':-2`,
    '-c:v', 'libx264',
    '-crf', String(HERO_AMBIENT.crf),
    '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.0',
    '-an',
    '-movflags', '+faststart',
    output,
  ]);
}

async function main() {
  if (!existsSync(FFMPEG)) {
    console.error(`ffmpeg not found at: ${FFMPEG}\nSet FFMPEG_PATH to override.`);
    process.exit(1);
  }
  if (!existsSync(REELS_DIR)) {
    console.error(`Source folder not found: ${REELS_DIR}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const summary = [];

  for (const reel of REELS) {
    const input = path.join(REELS_DIR, reel.src);
    if (!existsSync(input)) {
      console.warn(`! Skipping ${reel.src} — not found`);
      continue;
    }
    const sourceBytes = statSync(input).size;
    const mp4Out = path.join(OUT_DIR, `${reel.slug}.mp4`);
    const posterOut = path.join(OUT_DIR, `${reel.slug}.jpg`);

    console.log(`\n→ ${reel.src}  (${humanBytes(sourceBytes)})`);
    console.log(`  · poster → ${path.relative(SITE_ROOT, posterOut)}`);
    await makePoster(input, posterOut);
    console.log(`  · video  → ${path.relative(SITE_ROOT, mp4Out)}`);
    await compressClip(input, mp4Out);

    const mp4Bytes = statSync(mp4Out).size;
    const posterBytes = statSync(posterOut).size;
    summary.push({
      slug: reel.slug,
      sourceBytes,
      mp4Bytes,
      posterBytes,
      flagged: mp4Bytes > 100 * 1024 ** 2,
    });
  }

  console.log('\n→ Hero ambient loop (from trip.mp4)');
  const ambientInput = path.join(REELS_DIR, HERO_AMBIENT.source);
  if (existsSync(ambientInput)) {
    const ambientOut = path.join(OUT_DIR, HERO_AMBIENT.output);
    const ambientPoster = path.join(OUT_DIR, 'hero-ambient.jpg');
    await makePoster(ambientInput, ambientPoster);
    await makeHeroAmbient(ambientInput, ambientOut);
    const bytes = statSync(ambientOut).size;
    summary.push({
      slug: 'hero-ambient',
      sourceBytes: statSync(ambientInput).size,
      mp4Bytes: bytes,
      posterBytes: statSync(ambientPoster).size,
      flagged: bytes > 100 * 1024 ** 2,
    });
  }

  console.log('\n--- Summary ---');
  for (const row of summary) {
    const compressionRatio = (row.mp4Bytes / row.sourceBytes) * 100;
    const flag = row.flagged ? '  ⚠ over 100 MB — consider CDN/Bunny/Cloudflare Stream' : '';
    console.log(
      `${row.slug.padEnd(14)}  mp4 ${humanBytes(row.mp4Bytes).padStart(9)}  ` +
        `(${compressionRatio.toFixed(1)}% of source)  poster ${humanBytes(row.posterBytes)}${flag}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
