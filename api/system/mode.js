import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    let mode = process.env.SYSTEM_MODE || 'normal';
    try {
      const configPath = path.join(process.cwd(), 'system-config.json');
      if (fs.existsSync(configPath)) {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (raw && raw.mode) mode = raw.mode;
      }
    } catch {}

    return res.status(200).json({
      success: true,
      mode
    });
  } catch (error) {
    console.error("API ERROR (/api/system/mode):", error);
    return res.status(500).json({
      success: false,
      mode: "normal",
      error: error.message || "Unknown server error"
    });
  }
}
