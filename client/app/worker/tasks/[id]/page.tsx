import WorkerTaskClient from './WorkerTaskClient';
import { getIssueStaticParams } from '@/lib/staticRoutes';

export async function generateStaticParams() {
  return getIssueStaticParams();
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <WorkerTaskClient params={params} />;
}
