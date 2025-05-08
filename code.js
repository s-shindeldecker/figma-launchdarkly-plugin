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
                    value: { enabled: true, variant: index },
                    name: variant.name || `Variation ${index + 1}`
                }))
                : [{ value: { enabled: true, variant: 0 }, name: 'On' }];

            // If we only have one variation, add an "Off" variation
            if (variations.length === 1) {
                variations.push({
                    value: { enabled: false, variant: 1 },
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
                    message: 'No components selected'
                });
                figma.notify('Please select at least one component. You can find these in your Assets panel (left sidebar).');
                return;
            }

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

            // Collect all components from the selection
            let allComponents = [];
            for (const node of selection) {
                if (node.type === 'FRAME') {
                    const frameComponents = findComponents(node);
                    allComponents = allComponents.concat(frameComponents);
                } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
                    allComponents.push(node);
                }
            }

            if (allComponents.length === 0) {
                figma.ui.postMessage({
                    type: 'debug',
                    level: 'error',
                    message: 'No valid components found in selection'
                });
                figma.notify('Please select at least one component or component set.');
                return;
            }

            figma.ui.postMessage({
                type: 'debug',
                level: 'info',
                message: `Found ${allComponents.length} components in selection`
            });

            // Process each component set
            for (const component of allComponents) {
                if (component.type === 'COMPONENT_SET') {
                    // Get all variants from the component set
                    const variants = component.children || [];
                    const baseName = component.name;
                    
                    // Prepare variants data with proper variant properties
                    const variantsData = variants.map(variant => {
                        // Get variant properties
                        const variantProperties = {};
                        if (variant.variantProperties) {
                            Object.entries(variant.variantProperties).forEach(([key, value]) => {
                                variantProperties[key] = value;
                            });
                        }
                        
                        // Create a user-friendly name for the variant
                        let variantName = variant.name;
                        
                        // If the name contains property values (e.g., "Property 1=Default"), clean it up
                        if (variantName.includes('=')) {
                            // Split by '=' and take the value part
                            const parts = variantName.split('=');
                            if (parts.length > 1) {
                                // Clean up the value part
                                variantName = parts[1]
                                    .replace(/^Default$/, 'Control') // Replace "Default" with "Control"
                                    .replace(/^Variant$/, 'Treatment') // Replace "Variant" with "Treatment"
                                    .replace(/^[A-Z]/, (match) => match.toLowerCase()) // Convert first letter to lowercase
                                    .replace(/\s+/g, '') // Remove spaces
                                    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
                                    .replace(/^([a-z])/, (match) => match.toUpperCase()); // Capitalize first letter
                            }
                        }
                        
                        // If the name is still not user-friendly, create one based on the index
                        if (!variantName || variantName === 'Default' || variantName === 'Variant') {
                            variantName = variant === variants[0] ? 'Control' : `Treatment${variants.indexOf(variant)}`;
                        }
                        
                        return {
                            name: variantName,
                            description: variant.description || `Variant of ${baseName}`,
                            properties: variantProperties
                        };
                    });

                    // Initialize LaunchDarkly service with config
                    const launchDarklyService = new LaunchDarklyService(msg.config.apiKey);

                    // Create a single feature flag with all variants
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'info',
                        message: `Creating feature flag for component set: ${baseName}`
                    });

                    const featureFlag = yield launchDarklyService.createFeatureFlag(
                        baseName,
                        baseName,
                        `Feature flag for ${baseName} component set`,
                        variantsData
                    );
                    
                    // Create a single metric for the feature flag
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'info',
                        message: `Creating metric for feature flag: ${baseName}`
                    });
                    yield launchDarklyService.createMetric(baseName, baseName);

                    // Generate code for the feature flag
                    const code = generateFeatureFlagCode(baseName, variantsData);
                    
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'success',
                        message: `Successfully exported component set to LaunchDarkly\nCreated feature flag "${baseName}" with ${variantsData.length} variations`
                    });

                    figma.notify(`Successfully exported "${baseName}" to LaunchDarkly`);

                    // Send to UI for display
                    figma.ui.postMessage({
                        type: 'process-component',
                        data: {
                            name: baseName,
                            variants: variantsData,
                            code: code
                        }
                    });
                } else {
                    // Handle single component (no variants)
                    const baseName = component.name;
                    const variantsData = [{
                        name: 'Default',
                        description: component.description || '',
                        properties: {}
                    }];

                    // Initialize LaunchDarkly service with config
                    const launchDarklyService = new LaunchDarklyService(msg.config.apiKey);

                    // Create feature flag
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'info',
                        message: `Creating feature flag for component: ${baseName}`
                    });

                    const featureFlag = yield launchDarklyService.createFeatureFlag(
                        baseName,
                        baseName,
                        `Feature flag for ${baseName} component`,
                        variantsData
                    );
                    
                    // Create metric
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'info',
                        message: `Creating metric for feature flag: ${baseName}`
                    });
                    yield launchDarklyService.createMetric(baseName, baseName);

                    // Generate code
                    const code = generateFeatureFlagCode(baseName, variantsData);
                    
                    figma.ui.postMessage({
                        type: 'debug',
                        level: 'success',
                        message: `Successfully exported component to LaunchDarkly\nCreated feature flag "${baseName}"`
                    });

                    figma.notify(`Successfully exported "${baseName}" to LaunchDarkly`);

                    // Send to UI
                    figma.ui.postMessage({
                        type: 'process-component',
                        data: {
                            name: baseName,
                            variants: variantsData,
                            code: code
                        }
                    });
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            figma.ui.postMessage({
                type: 'debug',
                level: 'error',
                message: `Error processing components: ${errorMessage}`
            });
            figma.notify('Error processing components: ' + errorMessage);
        }
    }
});

// Function to generate React code for the feature flag
function generateFeatureFlagCode(flagName, variants) {
    const sanitizedFlagName = flagName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const sanitizedVariants = variants.map(v => v.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    
    return `import React from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';

export const ${sanitizedFlagName} = () => {
    const ldClient = useLDClient();
    const [variation, setVariation] = React.useState(null);

    React.useEffect(() => {
        // Get the feature flag variation
        const flagValue = ldClient.variation('${sanitizedFlagName}', null);
        setVariation(flagValue);

        // Track the metric when the component is shown
        ldClient.track('${sanitizedFlagName}');

        // Listen for changes to the feature flag
        ldClient.on('change', (changes) => {
            if (changes['${sanitizedFlagName}']) {
                setVariation(changes['${sanitizedFlagName}'].current);
            }
        });
    }, [ldClient]);

    // Render the appropriate variant
    switch (variation) {
        ${variants.map((variant, index) => `
        case '${sanitizedVariants[index]}':
            return <${variant.name.replace(/[^a-zA-Z0-9]/g, '')} />;`).join('\n')}
        default:
            return null;
    }
};`;
}
