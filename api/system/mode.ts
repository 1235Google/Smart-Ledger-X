export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    config: {
      mode: 'normal',
      reason: '',
      changedAt: new Date().toISOString(),
      changedBy: 'System',
      expectedEndAt: null,
      autoRestore: false,
      previousMode: 'normal'
    }
  });
}
