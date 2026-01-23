import { useState } from 'react';
import { XiansAgentTemplate } from '@/lib/xians/types';
import { EnhancedTemplate, EnhancedDeployment } from '../types';
import { getAgentIcon, getAgentColor } from '../utils/agent-helpers';
import { showErrorToast } from '@/lib/utils/error-handler';

export const useAgentTemplates = (deployedAgents: EnhancedDeployment[]) => {
  const [availableTemplates, setAvailableTemplates] = useState<EnhancedTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  const fetchTemplates = async () => {
    if (templatesLoaded) return;
    
    try {
      setIsLoadingTemplates(true);
      
      const templatesRes = await fetch('/api/agents/store');
      const templatesData = await templatesRes.json();
      
      if (!templatesRes.ok) {
        console.error('Failed to fetch templates:', templatesData);
        throw new Error(templatesData.message || 'Failed to fetch templates');
      }
      
      const allTemplates: XiansAgentTemplate[] = Array.isArray(templatesData) 
        ? templatesData 
        : Array.isArray(templatesData?.data)
        ? templatesData.data
        : [];
      
      console.log('Processed templates:', allTemplates);
      
      // Get deployed agent names (case-insensitive for comparison)
      const deployedAgentNames = new Set(
        deployedAgents.map(d => d.name.toLowerCase().trim())
      );
      
      console.log('Template agent names:', allTemplates.map(t => t.agent.name));
      
      // Filter templates to only show ones not yet deployed (by name comparison)
      const undeployedTemplates = allTemplates.filter(
        template => !deployedAgentNames.has(template.agent.name.toLowerCase().trim())
      );
      
      // Enhance templates with UI metadata
      const enhancedTemplates: EnhancedTemplate[] = undeployedTemplates.map(template => ({
        ...template,
        icon: getAgentIcon(template.agent.name, template.agent.summary, template.agent.description),
        color: getAgentColor(template.agent.name),
        workflowCount: template.definitions.length,
      }));
      
      setAvailableTemplates(enhancedTemplates);
      setTemplatesLoaded(true);
    } catch (err) {
      showErrorToast(err, 'Failed to load templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  return {
    availableTemplates,
    isLoadingTemplates,
    templatesLoaded,
    fetchTemplates
  };
};
