// Simple email capture fix - add this to the live server.js

// Email capture endpoint
app.get('/api/auth/capture-email', async (req, res) => {
    try {
        const authToken = req.headers.authorization?.replace('Bearer ', '') || req.query.authToken;
        
        if (!authToken || !authTokens.has(authToken)) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        // Get user profile using Google OAuth2 API
        const oauth2 = google.oauth2({ version: 'v2', auth: googleSheetsService.auth });
        const response = await oauth2.userinfo.get();
        
        const userEmail = response.data.email;
        
        // Update the auth token entry with email
        const tokenData = authTokens.get(authToken);
        if (tokenData) {
            tokenData.email = userEmail;
            authTokens.set(authToken, tokenData);
        }
        
        res.json({ 
            success: true, 
            email: userEmail,
            message: 'Email captured successfully' 
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
