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
    origin: ['https://www.figma.com', 'http://localhost:3002', 'null'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin'],
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
async function makeLaunchDarklyRequest(endpoint, method, body, apiKey, options = {}) {
    try {
        console.log(`Making request to LaunchDarkly API: ${endpoint}`);
        console.log('Request body:', JSON.stringify(body, null, 2));

        const url = `https://app.launchdarkly.com/api/v2/${endpoint}`;
        console.log('Full URL:', url);

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': apiKey,
                'LD-API-Version': '20220603',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined,
            ...options
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

        const apiKey = req.headers.authorization;
        if (!apiKey) {
            throw new Error('API key is required');
        }

        const response = await makeLaunchDarklyRequest(
            `flags/${LAUNCHDARKLY_PROJECT_KEY}`,
            'POST',
            req.body,
            apiKey
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

        const apiKey = req.headers.authorization;
        if (!apiKey) {
            throw new Error('API key is required');
        }

        const response = await makeLaunchDarklyRequest(
            `metrics/${LAUNCHDARKLY_PROJECT_KEY}`,
            'POST',
            req.body,
            apiKey
        );
        res.json(response);
    } catch (error) {
        console.error('Error creating metric:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({ 
            error: error.message,
            type: error.constructor.name
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get projects endpoint
app.get('/api/projects', async (req, res) => {
    try {
        console.log('Received request to fetch projects');
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));

        const apiKey = req.headers.authorization;
        if (!apiKey) {
            throw new Error('API key is required');
        }

        // Add timeout to the request
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 10000); // 10 second timeout

        try {
            const response = await makeLaunchDarklyRequest(
                'projects',
                'GET',
                null,
                apiKey,
                { signal: controller.signal }
            );
            clearTimeout(timeout);

            // Transform the response to match UI expectations
            const transformedResponse = {
                items: response.items.map(project => ({
                    key: project.key,
                    name: project.name,
                    description: project.description || '',
                    tags: project.tags || []
                }))
            };

            res.json(transformedResponse);
        } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out while fetching projects');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error fetching projects:', error);
        console.error('Error stack:', error.stack);
        
        // Set appropriate status code based on error type
        const statusCode = error.message.includes('timed out') ? 504 : 500;
        
        res.status(statusCode).json({ 
            error: error.message,
            type: error.constructor.name
        });
    }
});

// Get environments endpoint
app.get('/api/projects/:projectKey/environments', async (req, res) => {
    try {
        console.log('Received request to fetch environments');
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        console.log('Project key:', req.params.projectKey);

        const apiKey = req.headers.authorization;
        if (!apiKey) {
            throw new Error('API key is required');
        }

        const response = await makeLaunchDarklyRequest(
            `projects/${req.params.projectKey}/environments`,
            'GET',
            null,
            apiKey
        );
        res.json(response);
    } catch (error) {
        console.error('Error fetching environments:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({ 
            error: error.message,
            type: error.constructor.name
        });
    }
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

// Create the server instance first
const server = app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] Server running at http://localhost:${port}`);
    console.log('LaunchDarkly configuration:');
    console.log('- API Key:', LAUNCHDARKLY_API_KEY);
    console.log('- Account ID:', LAUNCHDARKLY_ACCOUNT_ID);
    console.log('- Project Key:', LAUNCHDARKLY_PROJECT_KEY);
});

// Add process error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Stack:', err.stack);
    // Don't exit the process
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit the process
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
    console.log('Received SIGINT. Performing graceful shutdown...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}); 