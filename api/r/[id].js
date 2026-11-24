const { getSupabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing QR id');
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('qr_redirects')
      .select('destination_url')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).send('QR destination not found');
    await db.from('qr_scans').insert({
      redirect_id: id,
      user_agent: req.headers['user-agent'] || null,
      ip_hash: null
    });
    return res.redirect(302, data.destination_url);
  } catch (error) {
    console.error('Redirect error:', error);
    return res.status(500).send('Unable to redirect');
  }
};
