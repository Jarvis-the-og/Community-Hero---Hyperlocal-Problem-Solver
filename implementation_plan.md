# Restructuring & Polishing Plan: Kolkata Municipal Corporation Pilot

This plan outlines the final restructuring phase to transform the platform into a production-ready pilot for the Kolkata Municipal Corporation (KMC) while maintaining a city-agnostic architecture.

## Proposed Changes

### Part 1 & 2: Deployment Identity & Centralized Configuration
- **Centralized Config**: Create a new file `shared/config/deployment.json` (or `.ts`) that stores the active city's configuration.
  - **Contents**: City Name (Kolkata), State (West Bengal), Authority (Kolkata Municipal Corporation), Map Center (lat/lng for Kolkata), Default Zoom, Default Radius, Departments, and Wards.
- **Branding**: Update the UI to proudly display the KMC pilot identity.
  - Apply to landing page, login page, admin dashboards, browser metadata, and empty states.
  - Replace generic "Community Hero" references with "Community Hero - Pilot Deployment for Kolkata Municipal Corporation" where appropriate.

### Part 3: Map Experience Refinement
- **Location Permission Handling**:
  - Update `HomePage.tsx` to handle geolocation states explicitly.
  - **Granted**: Center on user, filter issues strictly within 2km, and show "X issues within 2 km".
  - **Denied**: Fallback gracefully to "Showing public issues across Kolkata", centering the map on the default Kolkata config coordinates, and providing a ward/locality dropdown search.

### Part 4 & 5: Kolkata Dataset & Municipal Structure
- **Seed Script Overhaul** (`server/scripts/seedProductionDemoData.js`):
  - Completely rewrite dummy data to use authentic Kolkata locations (Park Street, Salt Lake Sector V, Gariahat, Behala, Esplanade, etc.).
  - Replace all generic street names (Main Street, generic road) with realistic Kolkata scenarios (e.g., Waterlogging near Gariahat crossing, Pothole on EM Bypass).
- **Municipal Departments**:
  - Standardize the departments in `shared/config/deployment.json` to match actual KMC departments: `Roads Department`, `Water Supply Department`, `Solid Waste Management`, `Street Lighting`, `Drainage`, `Parks & Gardens`, `Public Health`.
  - Ensure users and seed data correctly map to these updated names (e.g., removing "Garbage Department" in favor of "Solid Waste Management").

### Part 6: Analytics & Dashboard Updates
- Update the Admin and Department dashboards to dynamically read wards and localities from the centralized deployment config, removing any generic fallback logic.

### Part 7: Legacy Gemini Cleanup
- **Service Renaming**: Rename `server/services/gemini` to `server/services/ai`.
- **Code Audit**: Search and replace all references to `gemini` in variable names, imports, caches, governance logs, and prompts.
- **Environment Variables**: Remove `ENABLE_GEMINI` and `GEMINI_API_KEY` from `.env`, `.env.example`, and `server/config/index.js`, fully standardizing on `ENABLE_AI` and `GROQ_API_KEY`.

### Part 8 & 9: Global Consistency & Non-Kolkata Data Removal
- Search the entire repository for stray references to Delhi, Mumbai, Chennai, Bangalore, or Springfield.
- Update `README.md` and `API.MD` to reflect the Kolkata deployment and Groq AI integrations.

### Part 10: Performance Integrity
- Ensure the restructuring does not bypass the existing governance wrapper (`withGovernedRequest`), maintaining all rate limits, caching, and token quotas for the AI service.

---

## Verification Plan

### Automated Checks
- Run `npm run seed` to verify the new Kolkata dataset inserts successfully.
- Run global repository searches (`grep`) for "gemini", "delhi", "mumbai" to guarantee 0 hits.

### Manual Verification
- **Landing Page**: Verify map fallback states (location allowed vs denied).
- **Admin Dashboard**: Verify the analytics map to the new KMC departments and Kolkata wards.
- **File Structure**: Verify `services/gemini` is entirely gone and replaced by `services/ai`.
