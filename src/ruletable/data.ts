import baseMakeupJson from '../../data/base_makeup.json';
import behaviorWarningsJson from '../../data/behavior_warnings.json';
import cleansingMethodsJson from '../../data/cleansing_methods.json';
import ingredientGroupsJson from '../../data/ingredient_groups.json';
import ingredientSynonymsJson from '../../data/ingredient_synonyms.json';
import productCategoriesJson from '../../data/product_categories.json';
import sensitivityPolicyJson from '../../data/sensitivity_policy.json';
import sunscreenTypesJson from '../../data/sunscreen_types.json';
import symptomsJson from '../../data/symptoms.json';
import timelinesJson from '../../data/timelines.json';
import type { JudgmentMode, Sensitivity, SensitivityPolicy, Timeline, Urgency } from './types';

export const ingredientGroups = ingredientGroupsJson as Array<{
  id: string;
  label: string;
  screen: 'skincare';
  judgment_mode: JudgmentMode;
  sensitivity_policy: SensitivityPolicy | null;
}>;

export const ingredientSynonyms = ingredientSynonymsJson as Record<
  string,
  { label: string; display_3: string[]; all: string[]; excluded?: string[] }
>;

export const cleansingMethods = cleansingMethodsJson as Array<{
  id: string;
  label: string;
  screen: 'cleansing';
  friction: number;
  removal_power: number;
  barrier_stripping: number;
  sensitivity_policy: SensitivityPolicy;
}>;

export const sunscreenTypes = sunscreenTypesJson as Array<{
  id: string;
  label: string;
  screen: 'outing';
  required_removal_power: number;
  removal_priority: number;
  sensitivity_policy: SensitivityPolicy;
  alternative?: string;
}>;

export const baseMakeup = baseMakeupJson as Array<{
  id: string;
  label: string;
  screen: 'outing';
  cleansing_burden: number;
  removal_priority: number;
  sensitivity_policy: SensitivityPolicy;
}>;

export const productCategories = productCategoriesJson as Array<{
  id: string;
  label: string;
  screen: 'skincare';
  timeline_id: string | null;
  sensitivity_policy?: SensitivityPolicy;
  alternative?: string;
}>;

export const behaviorWarnings = behaviorWarningsJson as Array<{
  id: string;
  screen: 'cleansing' | 'skincare' | 'common';
  text: string;
  from_d: number;
  to_d: number;
  judgment_mode: 'warning_text_only';
}>;

export const symptomDefinitions = symptomsJson as {
  section_a: Array<{
    id: string;
    label: string;
    description: string;
    expected_resolution_d: number;
  }>;
  section_b: Array<{ id: string; label: string; urgency: Urgency }>;
};

export const sensitivityPolicies = sensitivityPolicyJson as Record<
  SensitivityPolicy,
  Record<Sensitivity, number>
>;

export const timelines = timelinesJson as Timeline[];

export { baseMakeupJson, cleansingMethodsJson, sunscreenTypesJson };
