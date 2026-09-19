import { getSystemConfig } from "../src/server/system-mode-service.js";

export default async function handler(req, res) {
  try {
    const config = getSystemConfig();
    return res.status(200).json({
      success: true,
      mode: config.mode || "production"
    });
  } catch (error) {
    console.error("API ERROR (/api/system/mode):", error);
    return res.status(500).json({
      success: false,
      mode: "production",
      error: error.message || "Unknown server error"
    });
  }
}
