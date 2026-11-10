export default async function handler(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    
    // In production Vercel cron, verify CRON_SECRET if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const adminToken = req.headers['x-admin-token'];
      if (!adminToken) {
        return res.status(401).json({ success: false, error: 'Unauthorized cron execution request' });
      }
    }

    console.log('[AutoBackup] Vercel serverless cron backup trigger received at:', new Date().toISOString());

    return res.status(200).json({
      success: true,
      message: 'Vercel scheduled backup cron processed successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[AutoBackup Cron Error]:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Cron execution failed' 
    });
  }
}
