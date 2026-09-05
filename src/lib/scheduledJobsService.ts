import { auth } from './firebase';
import { 
  ScheduledJob, 
  ScheduledJobRun, 
  ScheduledJobsSummary 
} from '../types';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch (e) {
      // Non-blocking
    }
  }

  const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('smartledger_admin_token') : null;
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }

  return headers;
}

/**
 * Fetch all registered scheduled jobs and overall scheduler summary.
 */
export async function fetchScheduledJobs(): Promise<{
  jobs: ScheduledJob[];
  summary: ScheduledJobsSummary;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/admin/jobs', { headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch jobs (Status ${res.status})`);
  }

  const data = await res.json();
  return {
    jobs: data.jobs || [],
    summary: data.summary
  };
}

/**
 * Fetch authoritative execution history for a specific job or all jobs.
 */
export async function fetchJobHistory(jobId: string = 'all', limit: number = 50): Promise<ScheduledJobRun[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}/history?limit=${limit}`, { headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch job history (Status ${res.status})`);
  }

  const data = await res.json();
  return data.runs || [];
}

/**
 * Trigger manual execution of a background job.
 */
export async function runJobNow(jobId: string): Promise<{ success: boolean; run: ScheduledJobRun; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}/run`, {
    method: 'POST',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Execution failed (Status ${res.status})`);
  }

  return data;
}

/**
 * Retry a background job.
 */
export async function retryJobNow(jobId: string): Promise<{ success: boolean; run: ScheduledJobRun; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: 'POST',
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Retry failed (Status ${res.status})`);
  }

  return data;
}

/**
 * Toggle job enabled / disabled state.
 */
export async function toggleJobState(jobId: string, enabled: boolean): Promise<{ success: boolean; jobId: string; enabled: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}/toggle`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ enabled })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to toggle job state (Status ${res.status})`);
  }

  return data;
}
