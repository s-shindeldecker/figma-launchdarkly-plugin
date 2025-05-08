"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// LaunchDarkly Service
class LaunchDarklyService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'http://localhost:3002/api';
    }

    // Add sanitization function
    sanitizeKey(name) {
        // Get current timestamp
        const timestamp = new Date().getTime();
        
        // Convert to lowercase and replace spaces and special characters with hyphens
        const baseKey = name
            .toLowerCase()
            .replace(/[^a-z0-9-_\.]/g, '-') // Replace any non-alphanumeric chars (except -_.) with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .replace(/^[^a-z0-9]/, 'x-'); // Ensure starts with alphanumeric by adding 'x-' if needed
            
        // Append timestamp to ensure uniqueness
        return `${baseKey}-${timestamp}`;
    }

    async createFeatureFlag(key, name, description, variants) {
        try {
            console.log('Creating feature flag with proxy server...');
            console.log('Input parameters:', { key, name, description, variants });

            // Sanitize the key
            const sanitizedKey = this.sanitizeKey(key);
            console.log('Sanitized key:', sanitizedKey);

            // Ensure variants is an array and has at least one item
            const variations = Array.isArray(variants) && variants.length > 0 
                ? variants.map((variant, index) => ({
                    value: variant.properties || { enabled: true },
                    name: variant.name || `Variation ${index + 1}`
                }))
                : [{ value: { enabled: true }, name: 'On' }];

            // If we only have one variation, add an "Off" variation
            if (variations.length === 1) {
                variations.push({
                    value: { enabled: false },
                    name: 'Off'
                });
            }

            const requestBody = {
                key: sanitizedKey,
                name,
                description,
                variations,
                offVariation: variations.length - 1, // Set the last variation as the "off" state
                on: true,
                tags: ['figma-export']
            };

            console.log('Request body:', JSON.stringify(requestBody, null, 2));
            console.log('Making request to:', `${this.baseUrl}/flags`);
            console.log('Request configuration:', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.apiKey,
                    'Origin': 'https://www.figma.com'
                },
                body: JSON.stringify(requestBody),
                credentials: 'include'
            });

            let response;
            try {
                response = await fetch(`${this.baseUrl}/flags`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': this.apiKey,
                        'Origin': 'https://www.figma.com'
                    },
                    body: JSON.stringify(requestBody),
                    credentials: 'include'
                });

                if (!response) {
                    throw new Error('No response received from server');
                }

                console.log('Response status:', response.status);
                if (response.headers) {
                    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
                }

                let responseData;
                try {
                    responseData = await response.json();
                    console.log('Response data:', JSON.stringify(responseData, null, 2));
                } catch (error) {
                    console.error('Error parsing response:', error);
                    throw new Error(`Failed to parse server response: ${error.message}`);
                }

                if (!response.ok) {
                    throw new Error(
                        `Failed to create feature flag: ${responseData.error || response.statusText}\n` +
                        `Details: ${responseData.details || 'No details available'}`
                    );
                }

                return responseData;
            } catch (error) {
                console.error('Network error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    cause: error.cause
                });
                throw new Error(`Network error: ${error.message}. Make sure the proxy server is running at ${this.baseUrl}`);
            }
        } catch (error) {
            console.error('Error creating feature flag:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    async createMetric(key, name, description) {
        try {
            console.log('Creating metric with proxy server...');
            console.log('Input parameters:', { key, name, description });

            // Sanitize the key
            const sanitizedKey = this.sanitizeKey(key);
            console.log('Sanitized key:', sanitizedKey);

            const requestBody = {
                key: sanitizedKey,
                name,
                description,
                kind: 'custom',
                eventKey: sanitizedKey,
                isNumeric: false,
                tags: ['figma-export']
            };

            console.log('Request body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`${this.baseUrl}/metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.apiKey,
                    'Origin': 'https://www.figma.com'
                },
                body: JSON.stringify(requestBody),
                credentials: 'include'
            });

            const responseData = await response.json();
            console.log('Response data:', JSON.stringify(responseData, null, 2));

            if (!response.ok) {
                throw new Error(
                    `Failed to create metric: ${responseData.error || response.statusText}\n` +
                    `Details: ${responseData.details || 'No details available'}`
                );
            }

            return responseData;
        } catch (error) {
            console.error('Error creating metric:', error);
            console.error('Error stack:', error.stack);
            throw new Error(`Failed to create metric: ${error.message}`);
        }
    }
}
// Main Plugin Code
figma.showUI(__html__, { width: 400, height: 600 });

figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'export-to-launchdarkly') {
        try {
            const selection = figma.currentPage.selection;
            if (selection.length === 0) {
                figma.ui.postMessage({
                    type: 'debug',
                    level: 'error',
                    message: 'No component selected'
                });
                figma.notify('Please select a component or component set. You can find these in your Assets panel (left sidebar).');
                return;
            }

            const selectedNode = selection[0];
            
            // Function to find components in a node
            const findComponents = (node) => {
                if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
                    return [node];
                }
                if ('children' in node) {
                    return node.children.flatMap(child => findComponents(child));
                }
                return [];
            };

            // If the selection is a frame, look for components inside it
            let components = [];
            if (selectedNode.type === 'FRAME') {
                components = findComponents(selectedNode);
                if (components.length === 0) {
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'error',
                        message: 'No components found in the selected frame'
                    });
                    figma.notify('No components found in the selected frame. Please select a component or component set directly.');
                    return;
                }
                figma.ui.postMessage({
                    type: 'debug',
                    level: 'info',
                    message: `Found ${components.length} components in the selected frame`
                });
            } else if (selectedNode.type === 'COMPONENT' || selectedNode.type === 'COMPONENT_SET') {
                components = [selectedNode];
            } else {
                figma.ui.postMessage({
                    type: 'debug',
                    level: 'error',
                    message: `Invalid selection type: ${selectedNode.type}. Please select a component, component set, or a frame containing components.`
                });
                figma.notify('Please select a component, component set, or a frame containing components.');
                return;
            }

            // Process each component
            for (const component of components) {
                const componentName = component.name;
                const variants = component.type === 'COMPONENT_SET' ? component.children || [] : [component];

                figma.ui.postMessage({
                    type: 'debug',
                    level: 'info',
                    message: `Processing component: ${componentName}\nType: ${component.type}\nVariants: ${variants.length}`
                });

                // Prepare variants data
                const variantsData = variants.map(variant => ({
                    name: variant.name,
                    description: variant.description || '',
                    properties: variant.properties || {}
                }));

                // Initialize LaunchDarkly service with config
                const launchDarklyService = new LaunchDarklyService(msg.config.apiKey);

                // Create feature flag
                figma.ui.postMessage({
                    type: 'debug',
                    level: 'info',
                    message: `Creating feature flag for component: ${componentName}`
                });

                const featureFlag = yield launchDarklyService.createFeatureFlag(
                    componentName,
                    componentName,
                    `Feature flag for ${componentName} component`,
                    variantsData
                );
                
                // Create metrics for each variant
                for (const variant of variantsData) {
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'info',
                        message: `Creating metric for variant: ${variant.name}`
                    });
                    yield launchDarklyService.createMetric(componentName, variant.name);
                }

                figma.ui.postMessage({
                    type: 'debug',
                    level: 'success',
                    message: `Successfully exported component "${componentName}" to LaunchDarkly\nCreated feature flag and ${variantsData.length} metrics`
                });

                figma.notify(`Successfully exported "${componentName}" to LaunchDarkly`);
            }

            // Send to UI for display
            figma.ui.postMessage({
                type: 'process-component',
                data: {
                    name: components[0].name,
                    variants: components[0].type === 'COMPONENT_SET' ? 
                        components[0].children.map(v => ({
                            name: v.name,
                            description: v.description || '',
                            properties: v.properties || {}
                        })) : 
                        [{
                            name: components[0].name,
                            description: components[0].description || '',
                            properties: components[0].properties || {}
                        }]
                }
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            figma.ui.postMessage({
                type: 'debug',
                level: 'error',
                message: `Error processing component: ${errorMessage}`
            });
            figma.notify('Error processing component: ' + errorMessage);
        }
    }
});
