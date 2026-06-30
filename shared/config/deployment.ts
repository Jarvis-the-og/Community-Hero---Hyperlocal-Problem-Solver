/**
 * Centralized deployment configuration.
 *
 * To deploy Community Hero for a different city, modify ONLY this file.
 * All business logic, components, and services read from this configuration
 * so no other code changes are required for a new deployment.
 */

export interface LocalityConfig {
  name: string;
  lat: number;
  lng: number;
}

export interface DeploymentConfig {
  /** Display name of the city */
  city: string;
  /** State or province */
  state: string;
  /** Full name of the municipal authority */
  authorityName: string;
  /** Short name / acronym */
  authorityShortName: string;
  /** Default map center coordinates */
  mapCenter: { lat: number; lng: number };
  /** Default map zoom level */
  defaultZoom: number;
  /** Default radius in km for nearby issue queries */
  defaultRadiusKm: number;
  /** Canonical department names used across the platform */
  departments: string[];
  /** Municipal wards */
  wards: string[];
  /** Known localities with coordinates for zero-API-call map recentering */
  localities: LocalityConfig[];
  /** Department alias map for AI classification normalization */
  departmentAliases: Record<string, string>;
}

// ─── Current Deployment: Kolkata Municipal Corporation ────────────────────────

export const deployment: DeploymentConfig = {
  city: 'Kolkata',
  state: 'West Bengal',
  authorityName: 'Kolkata Municipal Corporation',
  authorityShortName: 'KMC',

  mapCenter: { lat: 22.5726, lng: 88.3639 },
  defaultZoom: 12,
  defaultRadiusKm: 2,

  departments: [
    'Roads Department',
    'Water Supply Department',
    'Solid Waste Management',
    'Street Lighting',
    'Drainage',
    'Parks & Gardens',
    'Public Health',
  ],

  wards: [
    'Ward 1 – Cossipore', 'Ward 2 – Chitpur', 'Ward 3 – Jorasanko',
    'Ward 4 – Shyambazar', 'Ward 5 – Hatibagan', 'Ward 6 – Bagbazar',
    'Ward 7 – Pathuriaghata', 'Ward 8 – College Street', 'Ward 9 – Bowbazar',
    'Ward 10 – Taltala', 'Ward 11 – Park Street', 'Ward 12 – Esplanade',
    'Ward 13 – Bhowanipore', 'Ward 14 – Kalighat', 'Ward 15 – Gariahat',
    'Ward 16 – Jadavpur', 'Ward 17 – Dhakuria', 'Ward 18 – Tollygunge',
    'Ward 19 – Behala', 'Ward 20 – Barisha', 'Ward 21 – Alipore',
    'Ward 22 – Khidirpur', 'Ward 23 – Watgunge', 'Ward 24 – Rajabazar',
    'Ward 25 – Maniktala', 'Ward 26 – Belgachia', 'Ward 27 – Dum Dum',
    'Ward 28 – Lake Town', 'Ward 29 – Salt Lake', 'Ward 30 – New Town',
  ],

  localities: [
    { name: 'Park Street', lat: 22.5510, lng: 88.3517 },
    { name: 'Salt Lake Sector V', lat: 22.5726, lng: 88.4312 },
    { name: 'Gariahat', lat: 22.5194, lng: 88.3691 },
    { name: 'Behala', lat: 22.4980, lng: 88.3110 },
    { name: 'Esplanade', lat: 22.5636, lng: 88.3520 },
    { name: 'Shyambazar', lat: 22.5950, lng: 88.3740 },
    { name: 'New Town', lat: 22.5920, lng: 88.4840 },
    { name: 'Rajarhat', lat: 22.6100, lng: 88.5020 },
    { name: 'EM Bypass', lat: 22.5150, lng: 88.3940 },
    { name: 'Jadavpur', lat: 22.4990, lng: 88.3710 },
    { name: 'Dum Dum', lat: 22.6230, lng: 88.4140 },
    { name: 'College Street', lat: 22.5770, lng: 88.3620 },
    { name: 'Prince Anwar Shah Road', lat: 22.5010, lng: 88.3780 },
    { name: 'Howrah Bridge', lat: 22.5851, lng: 88.3468 },
    { name: 'Tollygunge', lat: 22.5000, lng: 88.3500 },
    { name: 'Kalighat', lat: 22.5230, lng: 88.3440 },
    { name: 'Ballygunge', lat: 22.5290, lng: 88.3650 },
    { name: 'Lake Town', lat: 22.5987, lng: 88.3982 },
    { name: 'Alipore', lat: 22.5330, lng: 88.3390 },
    { name: 'Sealdah', lat: 22.5680, lng: 88.3690 },
  ],

  departmentAliases: {
    'public works': 'Roads Department',
    'road': 'Roads Department',
    'roads': 'Roads Department',
    'water': 'Water Supply Department',
    'water board': 'Water Supply Department',
    'sanitation': 'Solid Waste Management',
    'garbage': 'Solid Waste Management',
    'waste': 'Solid Waste Management',
    'electrical': 'Street Lighting',
    'electricity': 'Street Lighting',
    'lighting': 'Street Lighting',
    'drain': 'Drainage',
    'sewer': 'Drainage',
    'parks': 'Parks & Gardens',
    'parks & recreation': 'Parks & Gardens',
    'parks and recreation': 'Parks & Gardens',
    'health': 'Public Health',
  },
};
