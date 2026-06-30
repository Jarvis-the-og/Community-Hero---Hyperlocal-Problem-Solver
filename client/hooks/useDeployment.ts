/**
 * Deployment configuration accessor for client components.
 *
 * Re-exports the centralized deployment config and provides a React hook
 * for consistent access across the application. If the deployment config
 * ever needs to become async (e.g., fetched from an API), only this
 * file needs to change — all consumers use the hook.
 */

import { deployment } from '../../shared/config/deployment';
import type { DeploymentConfig, LocalityConfig } from '../../shared/config/deployment';

export type { DeploymentConfig, LocalityConfig };

/** Direct access to the static deployment config (for non-component code) */
export { deployment };

/** React hook — preferred way for components to access deployment config */
export function useDeployment(): DeploymentConfig {
  return deployment;
}
