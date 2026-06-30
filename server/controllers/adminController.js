import { getAnalytics, getIssues } from '../services/issueService.js';
import { createCacheKey, withGovernedRequest } from '../services/governance/index.js';

export async function getAdminDashboard(req, res, next) {
  try {
    const dashboard = await withGovernedRequest({
      api: 'firestore',
      operation: 'admin_dashboard',
      cacheKey: createCacheKey('firestore:admin', { scope: 'global' }),
      cacheTtlMs: 60 * 1000,
      timeoutMs: 20_000,
      requestFn: async () => {
        const filters = {
          ward: req.query.ward,
          borough: req.query.borough,
          department: req.query.department,
          status: req.query.status,
          priority: req.query.priority,
        };
        const analytics = await getAnalytics(filters);
        const issues = await getIssues(filters);

        return {
          analytics,
          issues: issues.slice(0, 100),
          mapData: issues
            .filter((i) => i.location?.lat && i.location?.lng)
            .map((i) => ({
              id: i.id,
              lat: i.location.lat,
              lng: i.location.lng,
              priority: i.priority,
              status: i.status,
              department: i.department,
              borough: i.location?.borough || i.borough,
              ward: i.location?.ward || i.ward,
              category: i.category,
              title: i.title,
            })),
        };
      },
    });

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentRankings(req, res, next) {
  try {
    const analytics = await getAnalytics();
    const rankings = (analytics.departmentPerformance || [])
      .sort((a, b) => b.resolutionRate - a.resolutionRate)
      .map((dept, index) => ({ ...dept, rank: index + 1 }));

    res.json({ rankings });
  } catch (error) {
    next(error);
  }
}
