// Server Component — no 'use client'.
// generateStaticParams is required by static export for dynamic routes.
// Returning [] builds only the shell; the client fetches data at runtime.
import DepartmentIssueClient from './DepartmentIssueClient';
import { getIssueStaticParams } from '@/lib/staticRoutes';

export async function generateStaticParams() {
  return getIssueStaticParams();
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DepartmentIssueClient params={params} />;
}
