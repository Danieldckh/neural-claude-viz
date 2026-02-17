#!/usr/bin/env npx tsx
// Run with: npx tsx bridge.ts --url https://neural-viz.proagrihub.com --key YOUR_KEY

import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Parse CLI args
const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const keyIndex = args.indexOf('--key');
const serverUrl = urlIndex !== -1 ? args[urlIndex + 1] : 'http://localhost:4800';
const apiKey = keyIndex !== -1 ? args[keyIndex + 1] : '';

// Track file read positions
const filePositions = new Map<string, number>();

// Watch ~/.claude/projects/ for .jsonl files
const watchPath = path.join(os.homedir(), '.claude', 'projects');

const watcher = chokidar.watch(path.join(watchPath, '**/*.jsonl'), {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200 }
});

watcher.on('change', async (filePath) => {
  // Read new content from last known position
  const lastPos = filePositions.get(filePath) || 0;
  const stat = fs.statSync(filePath);
  if (stat.size <= lastPos) return;

  const stream = fs.createReadStream(filePath, { start: lastPos, encoding: 'utf-8' });
  let buffer = '';
  
  for await (const chunk of stream) {
    buffer += chunk;
  }
  
  filePositions.set(filePath, stat.size);
  
  // Parse each new line as JSON
  const lines = buffer.split('\n').filter(l => l.trim());
  const messages = [];
  
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch { /* skip malformed */ }
  }
  
  if (messages.length === 0) return;
  
  // Extract session ID from file path
  const sessionId = path.basename(filePath, '.jsonl');
  
  // POST to remote server
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    await fetch(`${serverUrl}/api/bridge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId, messages }),
    });
    console.log(`[bridge] Sent ${messages.length} messages from ${sessionId}`);
  } catch (err) {
    console.error(`[bridge] Failed to POST:`, err);
  }
});

watcher.on('add', (filePath) => {
  // For new files, start tracking from end (don't replay history)
  const stat = fs.statSync(filePath);
  filePositions.set(filePath, stat.size);
  console.log(`[bridge] Watching new file: ${path.basename(filePath)}`);
});

console.log(`[bridge] Watching ${watchPath}`);
console.log(`[bridge] Posting to ${serverUrl}`);
