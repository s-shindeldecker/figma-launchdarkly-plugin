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
                ? variants.map((variant, index) => {
                    // Create value object with metadata and unique identifier
                    const value = {
                        _metadata: {
                            enabled: true,
                            variant: index,
                            name: variant.name,
                            id: `variant-${index}-${Date.now()}`
                        },
                        // Add a unique identifier to ensure distinct values
                        variantId: `variant-${index}-${Date.now()}`
                    };

                    // Add variant properties if they exist
                    if (variant.properties) {
                        Object.keys(variant.properties).forEach(propKey => {
                            value[propKey] = variant.properties[propKey];
                        });
                    }

                    return {
                        value: value,
                        name: variant.name
                    };
                })
                : [{ 
                    value: { 
                        _metadata: {
                            enabled: true,
                            variant: 0,
                            name: 'Control',
                            id: `control-${Date.now()}`
                        },
                        variantId: `control-${Date.now()}`
                    }, 
                    name: 'Control' 
                }];

            // If we only have one variation, add an "Off" variation
            if (variations.length === 1) {
                variations.push({
                    value: { 
                        _metadata: {
                            enabled: false,
                            variant: 1,
                            name: 'Off',
                            id: `off-${Date.now()}`
                        },
                        variantId: `off-${Date.now()}`
                    },
                    name: 'Off'
                });
            }

            const requestBody = {
                key: sanitizedKey,
                name: name,
                description: description,
                variations,
                offVariation: variations.length - 1,
                on: true,
                tags: ['figma-export'],
                // Specify that this is a JSON flag
                kind: 'json'
            };

            console.log('Request body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`${this.baseUrl}/flags`, {
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
                const errorMessage = responseData.message || response.statusText;
                console.error('Error creating feature flag:', errorMessage);
                
                // Send error to UI
                figma.ui.postMessage({
                    type: 'debug',
                    level: 'error',
                    message: `Failed to create feature flag: ${errorMessage}`
                });
                
                figma.ui.postMessage({
                    type: 'api-error',
                    message: `Failed to create feature flag: ${errorMessage}`
                });
                
                throw new Error(errorMessage);
            }

            // Send success message to UI
            figma.ui.postMessage({
                type: 'debug',
                level: 'success',
                message: `Successfully created feature flag: ${name}`
            });

            return responseData;
        } catch (error) {
            console.error('Error creating feature flag:', error);
            console.error('Error stack:', error.stack);
            
            // Send error to UI
            figma.ui.postMessage({
                type: 'debug',
                level: 'error',
                message: `Error creating feature flag: ${error.message}`
            });
            
            figma.ui.postMessage({
                type: 'api-error',
                message: `Error creating feature flag: ${error.message}`
            });
            
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
                name: name,
                description: description,
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

// Add these functions at the top level
async function loadConfig() {
  try {
    const config = await figma.clientStorage.getAsync('launchdarkly-config');
    figma.ui.postMessage({
      type: 'config-loaded',
      config: config || {}
    });
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

async function saveConfig(config) {
  try {
    await figma.clientStorage.setAsync('launchdarkly-config', config);
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

async function fetchProjects(apiKey) {
    try {
        console.log('Fetching projects from LaunchDarkly...');
        
        // Add retry logic
        let retries = 3;
        let lastError = null;
        
        while (retries > 0) {
            try {
                const response = await fetch('http://localhost:3002/api/projects', {
                    method: 'GET',
                    headers: {
                        'Authorization': apiKey,
                        'Content-Type': 'application/json',
                        'Origin': 'https://www.figma.com'
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to fetch projects: ${errorData.message || response.statusText}`);
                }

                const data = await response.json();
                console.log('Projects loaded successfully:', data);
                
                figma.ui.postMessage({
                    type: 'projects-loaded',
                    data: { projects: data.items }
                });
                
                // If successful, break out of retry loop
                return;
            } catch (error) {
                console.error(`Attempt ${4 - retries} failed:`, error);
                lastError = error;
                retries--;
                
                if (retries > 0) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
                }
            }
        }
        
        // If we get here, all retries failed
        throw lastError;
    } catch (error) {
        console.error('Error fetching projects:', error);
        figma.ui.postMessage({
            type: 'debug',
            level: 'error',
            message: `Error fetching projects: ${error.message}`
        });
        
        // Show error in UI
        figma.ui.postMessage({
            type: 'api-error',
            message: `Failed to load projects: ${error.message}`
        });
    }
}

async function fetchEnvironments(apiKey, projectKey) {
    try {
        console.log('Fetching environments from LaunchDarkly...');
        
        // Add retry logic
        let retries = 3;
        let lastError = null;
        
        while (retries > 0) {
            try {
                const response = await fetch(`http://localhost:3002/api/projects/${projectKey}/environments`, {
                    method: 'GET',
                    headers: {
                        'Authorization': apiKey,
                        'Content-Type': 'application/json',
                        'Origin': 'https://www.figma.com'
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to fetch environments: ${errorData.message || response.statusText}`);
                }

                const data = await response.json();
                console.log('Environments loaded successfully:', data);
                
                figma.ui.postMessage({
                    type: 'environments-loaded',
                    data: { environments: data.items }
                });
                
                // If successful, break out of retry loop
                return;
            } catch (error) {
                console.error(`Attempt ${4 - retries} failed:`, error);
                lastError = error;
                retries--;
                
                if (retries > 0) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
                }
            }
        }
        
        // If we get here, all retries failed
        throw lastError;
    } catch (error) {
        console.error('Error fetching environments:', error);
        figma.ui.postMessage({
            type: 'debug',
            level: 'error',
            message: `Error fetching environments: ${error.message}`
        });
        
        // Show error in UI
        figma.ui.postMessage({
            type: 'api-error',
            message: `Failed to load environments: ${error.message}`
        });
    }
}

// Update the message handler
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'load-config') {
    await loadConfig();
  }
  
  if (msg.type === 'save-config') {
    await saveConfig(msg.config);
  }
  
  if (msg.type === 'fetch-projects') {
    await fetchProjects(msg.config.apiKey);
  }
  
  if (msg.type === 'fetch-environments') {
    await fetchEnvironments(msg.config.apiKey, msg.config.projectKey);
  }
  
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

      figma.ui.postMessage({
        type: 'debug',
        level: 'info',
        message: `Processing ${selection.length} selected items...`
      });

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

      figma.ui.postMessage({
        type: 'debug',
        level: 'info',
        message: `Found ${allComponents.length} components to process`
      });

      if (allComponents.length === 0) {
        figma.ui.postMessage({
          type: 'debug',
          level: 'error',
          message: 'No valid components found in selection'
        });
        figma.notify('Please select at least one component or component set.');
        return;
      }

      // Check if we're selecting a variant instead of the main component
      const hasVariantSelection = selection.some(node => 
        node.type === 'COMPONENT' && 
        node.parent && 
        node.parent.type === 'COMPONENT_SET'
      );

      if (hasVariantSelection) {
        figma.ui.postMessage({
          type: 'debug',
          level: 'warning',
          message: 'Variant selected instead of main component'
        });
        figma.ui.postMessage({
          type: 'show-confirmation',
          data: {
            message: 'You have selected a variant instead of the main component. Please select the main component set to export all variants.',
            details: 'To export all variants:\n1. Select the main component from your Assets panel\n2. Click Export to LaunchDarkly'
          }
        });
        return;
      }

      // Prepare export preview
      figma.ui.postMessage({
        type: 'debug',
        level: 'info',
        message: 'Preparing export preview...'
      });

      const exportPreview = allComponents.map(component => {
        if (component.type === 'COMPONENT_SET') {
          const variants = component.children || [];
          return {
            type: 'component-set',
            name: component.name,
            variants: variants.map(variant => {
              // Extract variant name from properties
              let variantName = '';
              if (variant.variantProperties) {
                const firstProperty = Object.entries(variant.variantProperties)[0];
                if (firstProperty) {
                  // Remove "Property=" prefix and clean up the name
                  variantName = firstProperty[1]
                    .replace(/^Property=/, '')
                    .replace(/^[0-9]+=/, '') // Remove any leading numbers and equals
                    .trim();
                }
              }
              
              // If no variant name was found, use a default based on index
              if (!variantName) {
                variantName = variant === variants[0] ? 'Default' : `Variant${variants.indexOf(variant)}`;
              }
              
              return {
                name: variantName,
                description: variant.description || `Variant of ${component.name}`
              };
            }),
            metrics: [{
              name: `${component.name} - Conversion`,
              description: `Conversion metric for ${component.name} experiment`
            }]
          };
        } else {
          return {
            type: 'single-component',
            name: component.name,
            description: component.description || `Single component: ${component.name}`,
            metrics: [{
              name: `${component.name} - Conversion`,
              description: `Conversion metric for ${component.name}`
            }]
          };
        }
      });

      figma.ui.postMessage({
        type: 'debug',
        level: 'info',
        message: 'Showing export preview for confirmation'
      });

      // Show preview and get confirmation
      figma.ui.postMessage({
        type: 'show-export-preview',
        data: {
          preview: exportPreview,
          message: 'The following will be created in LaunchDarkly:'
        }
      });

      // Wait for user confirmation before proceeding
      figma.ui.onmessage = async (msg) => {
        if (msg.type === 'confirm-export') {
          const selectedMetrics = msg.selectedMetrics || [];
          const selectedFlags = msg.selectedFlags || [];
          
          figma.ui.postMessage({
            type: 'debug',
            level: 'info',
            message: `Selected metrics: ${selectedMetrics.join(', ')}`
          });
          
          figma.ui.postMessage({
            type: 'debug',
            level: 'info',
            message: `Selected flags: ${selectedFlags.join(', ')}`
          });
          
          // Create metrics first
          const metricResults = [];
          for (const component of allComponents) {
            const metrics = getMetricsForComponent(component);
            for (const metric of metrics) {
              if (selectedMetrics.includes(metric.name)) {
                try {
                  const result = await createMetric(metric);
                  metricResults.push(result);
                } catch (error) {
                  console.error('Error creating metric:', error);
                  figma.notify(`Failed to create metric: ${metric.name}`, { error: true });
                }
              }
            }
          }

          // Then create feature flags (only if selected)
          for (const component of allComponents) {
            if (selectedFlags.includes(component.name)) {
              try {
                const result = await createFeatureFlag(component);
                console.log('Feature flag created:', result);
                figma.notify(`Successfully created feature flag: ${component.name}`);
              } catch (error) {
                console.error('Error creating feature flag:', error);
                figma.notify(`Failed to create feature flag: ${component.name}`, { error: true });
              }
            } else {
              figma.ui.postMessage({
                type: 'debug',
                level: 'info',
                message: `Skipping feature flag creation for: ${component.name} (not selected)`
              });
            }
          }

          // Send export complete message
          figma.ui.postMessage({
            type: 'export-complete',
            data: {
              metrics: metricResults,
              flags: selectedFlags
            }
          });
          
          figma.notify('Export completed');
        } else if (msg.type === 'cancel-export') {
          figma.ui.postMessage({
            type: 'debug',
            level: 'info',
            message: 'Export cancelled by user'
          });
          figma.notify('Export cancelled');
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      figma.ui.postMessage({
        type: 'debug',
        level: 'error',
        message: `Error processing components: ${errorMessage}`
      });
      figma.notify('Error processing components: ' + errorMessage);
    }
  }
};

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

// Function to create a metric
async function createMetric(metric) {
  try {
    const apiKey = (await figma.clientStorage.getAsync('launchdarkly-config')).apiKey;
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    const service = new LaunchDarklyService(apiKey);
    
    figma.ui.postMessage({
      type: 'debug',
      level: 'info',
      message: `Creating metric: ${metric.name}`
    });
    
    const result = await service.createMetric(
      metric.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      metric.name,
      metric.description || `Metric for ${metric.name}`
    );
    
    figma.ui.postMessage({
      type: 'debug',
      level: 'success',
      message: `Successfully created metric: ${metric.name}`
    });
    
    return result;
  } catch (error) {
    figma.ui.postMessage({
      type: 'debug',
      level: 'error',
      message: `Error creating metric: ${error.message}`
    });
    throw error;
  }
}

// Function to create a feature flag
async function createFeatureFlag(component) {
  try {
    const apiKey = (await figma.clientStorage.getAsync('launchdarkly-config')).apiKey;
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    const service = new LaunchDarklyService(apiKey);
    
    figma.ui.postMessage({
      type: 'debug',
      level: 'info',
      message: `Creating feature flag for component: ${component.name}`
    });
    
    let variants = [];
    if (component.type === 'COMPONENT_SET') {
      variants = component.children.map(variant => {
        // Extract variant name from properties
        let variantName = '';
        if (variant.variantProperties) {
          const firstProperty = Object.entries(variant.variantProperties)[0];
          if (firstProperty) {
            // Remove "Property=" prefix and clean up the name
            variantName = firstProperty[1]
              .replace(/^Property=/, '')
              .replace(/^[0-9]+=/, '') // Remove any leading numbers and equals
              .trim();
          }
        }
        
        // If no variant name was found, use a default based on index
        if (!variantName) {
          variantName = variant === component.children[0] ? 'Default' : `Variant${component.children.indexOf(variant)}`;
        }
        
        return {
          name: variantName,
          description: variant.description || `Variant of ${component.name}`,
          properties: variant.variantProperties || {}
        };
      });
    } else {
      // Single component, create a default variant
      variants = [{
        name: 'Default',
        description: component.description || `Default variant of ${component.name}`,
        properties: {}
      }];
    }
    
    // Generate code for the feature flag
    const code = generateFeatureFlagCode(component.name, variants);
    
    // Send the component data to the UI
    figma.ui.postMessage({
      type: 'process-component',
      data: {
        name: component.name,
        variants: variants,
        code: code
      }
    });
    
    // Create the feature flag
    const result = await service.createFeatureFlag(
      component.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      component.name,
      component.description || `Feature flag for ${component.name}`,
      variants
    );
    
    figma.ui.postMessage({
      type: 'debug',
      level: 'success',
      message: `Successfully created feature flag: ${component.name}`
    });
    
    return result;
  } catch (error) {
    figma.ui.postMessage({
      type: 'debug',
      level: 'error',
      message: `Error creating feature flag: ${error.message}`
    });
    throw error;
  }
}

// Function to get metrics for a component
function getMetricsForComponent(component) {
  const metrics = [];
  
  // Add a conversion metric
  metrics.push({
    name: `${component.name} - Conversion`,
    description: `Conversion metric for ${component.name}`
  });
  
  // If it's a component set, add metrics for each variant
  if (component.type === 'COMPONENT_SET' && component.children) {
    component.children.forEach(variant => {
      // Extract variant name from properties
      let variantName = '';
      if (variant.variantProperties) {
        const firstProperty = Object.entries(variant.variantProperties)[0];
        if (firstProperty) {
          // Remove "Property=" prefix and clean up the name
          variantName = firstProperty[1]
            .replace(/^Property=/, '')
            .replace(/^[0-9]+=/, '') // Remove any leading numbers and equals
            .trim();
        }
      }
      
      // If no variant name was found, use a default based on index
      if (!variantName) {
        variantName = variant === component.children[0] ? 'Default' : `Variant${component.children.indexOf(variant)}`;
      }
      
      metrics.push({
        name: `${component.name} - ${variantName} Interaction`,
        description: `Interaction metric for ${variantName} variant of ${component.name}`
      });
    });
  }
  
  return metrics;
}
