const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3002;

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Origin:', req.headers.origin);
    next();
});

// Middleware
app.use(cors({
    origin: ['https://www.figma.com', 'https://app.launchdarkly.com', 'null'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'LD-API-Version', 'LD-Account-ID', 'Origin'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Add better error handling for CORS preflight
app.options('*', cors());

app.use(express.json());

// LaunchDarkly configuration
const LAUNCHDARKLY_API_KEY = 'api-1851c475-3074-43d7-9600-f62676028cc2';
const LAUNCHDARKLY_ACCOUNT_ID = '1851c475';
const LAUNCHDARKLY_PROJECT_KEY = 'launch-healthy';

// Helper function to make LaunchDarkly API calls
async function makeLaunchDarklyRequest(endpoint, method, body) {
    try {
        console.log(`Making request to LaunchDarkly API: ${endpoint}`);
        console.log('Request body:', JSON.stringify(body, null, 2));

        const url = `https://app.launchdarkly.com/api/v2/${endpoint}`;
        console.log('Full URL:', url);

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': LAUNCHDARKLY_API_KEY,
                'LD-API-Version': '20220603',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'LD-Account-ID': LAUNCHDARKLY_ACCOUNT_ID
            },
            body: body ? JSON.stringify(body) : undefined
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            // Check for duplicate flag error
            if (data.message && data.message.includes('already exists')) {
                throw new Error(`A feature flag with key "${body.key}" already exists. Please delete the existing flag or use a different key.`);
            }
            throw new Error(`LaunchDarkly API error: ${data.message || response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error('LaunchDarkly API request failed:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

// Root API endpoint
app.get('/api', (req, res) => {
    res.json({ 
        status: 'ok',
        endpoints: {
            flags: '/api/flags',
            metrics: '/api/metrics'
        }
    });
});

// Create feature flag endpoint
app.post('/api/flags', async (req, res) => {
    try {
        console.log('Received request to create feature flag');
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const response = await makeLaunchDarklyRequest(
            `flags/${LAUNCHDARKLY_PROJECT_KEY}`,
            'POST',
            req.body
        );
        res.json(response);
    } catch (error) {
        console.error('Error creating feature flag:', error);
        console.error('Error stack:', error.stack);
        
        // Set appropriate status code based on error type
        const statusCode = error.message.includes('already exists') ? 409 : 500;
        
        res.status(statusCode).json({ 
            error: error.message,
            type: error.constructor.name
        });
    }
});

// Create metric endpoint
app.post('/api/metrics', async (req, res) => {
    try {
        console.log('Received request to create metric');
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const response = await makeLaunchDarklyRequest(
            `metrics/${LAUNCHDARKLY_PROJECT_KEY}`,
            'POST',
            req.body
        );
        res.json(response);
    } catch (error) {
        console.error('Error creating metric:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: error.message,
            details: error.stack,
            type: error.constructor.name
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        stack: err.stack
    });
});

// Handle 404 errors
app.use((req, res) => {
    console.log(`[${new Date().toISOString()}] 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
    });
});

// Add process error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
});

app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] Server running at http://localhost:${port}`);
    console.log('LaunchDarkly configuration:');
    console.log('- API Key:', LAUNCHDARKLY_API_KEY);
    console.log('- Account ID:', LAUNCHDARKLY_ACCOUNT_ID);
    console.log('- Project Key:', LAUNCHDARKLY_PROJECT_KEY);
}); 