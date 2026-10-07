export const CATEGORY_RENAMES: Record<string, string> = {
  'databaserecords': 'Your Data Health',
  'database records': 'Your Data Health',
  'backups': 'Your Backups',
  'backupsverified': 'Your Backups',
  'backups verified': 'Your Backups',
  'dependencies': 'App Components',
  'configchecks': 'Safety Settings',
  'config checks': 'Safety Settings',
  'authentication': 'Login Protection',
  'aes-256 crypto': 'Data Encryption',
  'login monitoring': 'Login Activity',
  'system health': 'App Performance'
};

export function renameCategory(cat: string): string {
  if (!cat) return cat;
  const lower = cat.toLowerCase().trim();
  return CATEGORY_RENAMES[lower] || cat;
}

export function translateDependencyName(packageName: string): string {
  const lower = packageName.toLowerCase();
  let category = 'App Component';
  if (lower.includes('auth') || lower.includes('jwt') || lower.includes('simplewebauthn')) {
    category = 'Login Security Tool';
  } else if (lower.includes('firebase') || lower.includes('supabase') || lower.includes('pg') || lower.includes('sql') || lower.includes('database') || lower.includes('firestore')) {
    category = 'Data Connection Tool';
  } else if (lower.includes('tailwind') || lower.includes('motion') || lower.includes('lucide') || lower.includes('canvas') || lower.includes('three')) {
    category = 'App Design & Animation Tool';
  } else if (lower.includes('lodash') || lower.includes('date-fns') || lower.includes('uuid') || lower.includes('clsx') || lower.includes('papaparse')) {
    category = 'Utility Library';
  }
  return `${category} (${packageName})`;
}

export function translateBackupName(backupId: string): string {
  try {
    if (backupId && backupId.includes('_')) {
      const parts = backupId.split('_');
      const timestampPart = parts[1];
      if (!isNaN(Number(timestampPart))) {
        const d = new Date(Number(timestampPart));
        if (!isNaN(d.getTime())) {
          return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        }
      }
      return parts[1].replace(/-/g, ' ');
    }
  } catch (e) {}
  return 'Recent Backup Archive';
}

export interface PlainFinding {
  title: string;
  explanation: string;
  actionType: 'user' | 'developer' | 'info';
  actionText: string;
}

export function translateFinding(finding: { checkId?: string; category?: string; title?: string; description?: string; remediation?: string }): PlainFinding {
  const checkId = finding.checkId || '';
  const title = finding.title || '';
  const desc = finding.description || '';

  if (checkId === 'CHK_BACKUP_01' || title.toLowerCase().includes('backup')) {
    return {
      title: 'A recent backup may be incomplete or unverified',
      explanation: 'We could not fully verify that your recent backup archive saved correctly or has an active automated schedule.',
      actionType: 'user',
      actionText: 'Go to Cloud Sync settings and run a new backup now.'
    };
  }

  if (title.toLowerCase().includes('lodash') || title.toLowerCase().includes('dependency') || desc.toLowerCase().includes('cve') || finding.category === 'Dependency') {
    return {
      title: 'An app component needs updating',
      explanation: 'One of the software libraries used by the application has an older version with a known security weakness. This is a technical maintenance item.',
      actionType: 'developer',
      actionText: 'Forward this report to your developer for package updating.'
    };
  }

  if (title.toLowerCase().includes('csp') || title.toLowerCase().includes('header') || title.toLowerCase().includes('config') || title.toLowerCase().includes('cors')) {
    return {
      title: 'A technical server safety setting is missing',
      explanation: 'A server security header or configuration was flagged as missing. This is a minor item and does not put your personal data at immediate risk.',
      actionType: 'developer',
      actionText: 'Forward this report to your developer to update server configurations.'
    };
  }

  return {
    title: finding.title || 'Security inspection note',
    explanation: finding.description || 'A technical setting was reviewed and flagged for attention.',
    actionType: 'info',
    actionText: 'Contact support if you have questions about this finding.'
  };
}
