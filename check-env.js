// Quick script to check environment variables
console.log('🔍 Environment Variable Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING');

// Check OAuth credentials specifically
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('❌ MISSING GOOGLE OAUTH CREDENTIALS');
    console.log('   Add these to Railway environment variables:');
    console.log('   GOOGLE_CLIENT_ID=<your_google_client_id>');
    console.log('   GOOGLE_CLIENT_SECRET=<your_google_client_secret>');
} else {
    console.log('✅ Google OAuth credentials found');
}
