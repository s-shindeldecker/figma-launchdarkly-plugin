// Types
interface LaunchDarklyConfig {
  apiKey: string;
  projectKey: string;
  environment: string;
}

interface VariantData {
  name: string;
  description: string;
  properties: Record<string, any>;
}

interface PluginMessage {
  type: string;
  data?: {
    name: string;
    variants: Array<{
      name: string;
      description: string;
      properties: Record<string, any>;
    }>;
  };
  config?: {
    apiKey: string;
    projectKey: string;
    environment: string;
  };
}

interface FigmaComponent {
  type: string;
  name: string;
  description?: string;
  properties?: Record<string, any>;
  children?: FigmaComponent[];
}

// LaunchDarkly Service
class LaunchDarklyService {
  private config: LaunchDarklyConfig;

  constructor(config: LaunchDarklyConfig) {
    this.config = config;
  }

  async createFeatureFlag(componentName: string, variants: VariantData[]) {
    const flagKey = this.generateFlagKey(componentName);
    
    const response = await fetch(`https://app.launchdarkly.com/api/v2/flags/${this.config.projectKey}/${flagKey}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: componentName,
        description: `Feature flag for ${componentName} component`,
        variations: variants.map(variant => ({
          name: variant.name,
          description: variant.description,
          value: variant.properties
        })),
        defaults: {
          onVariation: 0,
          offVariation: 0
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create feature flag: ${response.statusText}`);
    }

    return response.json();
  }

  async createMetric(componentName: string, variantName: string) {
    const metricKey = this.generateMetricKey(componentName, variantName);
    
    const response = await fetch(`https://app.launchdarkly.com/api/v2/metrics/${this.config.projectKey}/${metricKey}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${componentName} - ${variantName} Interaction`,
        description: `Tracks interactions with ${variantName} variant of ${componentName}`,
        kind: 'custom',
        key: metricKey
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create metric: ${response.statusText}`);
    }

    return response.json();
  }

  private generateFlagKey(componentName: string): string {
    return componentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  private generateMetricKey(componentName: string, variantName: string): string {
    return `${this.generateFlagKey(componentName)}-${variantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-interaction`;
  }
}

// Main Plugin Code
figma.showUI(__html__, { width: 400, height: 600 });

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'export-to-launchdarkly') {
    try {
      const selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.notify('Please select a component or component set. You can find these in your Assets panel (left sidebar).');
        return;
      }

      const component = selection[0] as FigmaComponent;
      if (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET') {
        figma.notify('Please select a component or component set (with a diamond icon). You can find these in your Assets panel (left sidebar).');
        return;
      }

      // Get component properties
      const componentName = component.name;
      const variants = component.type === 'COMPONENT_SET' ? component.children || [] : [component];
      
      // Prepare variants data
      const variantsData = variants.map(variant => ({
        name: variant.name,
        description: variant.description || '',
        properties: variant.properties || {}
      }));

      // Send to UI for LaunchDarkly integration
      figma.ui.postMessage({
        type: 'process-component',
        data: {
          name: componentName,
          variants: variantsData
        }
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      figma.notify('Error processing component: ' + errorMessage);
    }
  }
}; 