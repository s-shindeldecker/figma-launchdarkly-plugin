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
