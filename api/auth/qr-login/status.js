export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { sid } = req.query || {};
  return res.status(200).json({
    success: true,
    status: 'ACTIVE',
    sessionId: sid
  });
}
