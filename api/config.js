// Vercel Serverless Function
// Replaces the local Python server's /config endpoint.
// Environment variables (SUPABASE_URL, SUPABASE_KEY) must be set
// in the Vercel project dashboard under Settings > Environment Variables.

module.exports = function handler(req, res) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';

    res.status(200).json({
        SUPABASE_URL: supabaseUrl,
        SUPABASE_KEY: supabaseKey,
    });
};
