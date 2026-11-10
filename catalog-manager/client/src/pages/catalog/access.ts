export type AccessRequest = {
  id: string;
  table: string;
  requester: string;
  grantee: string;
  granteeType: string;
  privilege: string;
  reason: string;
  status: string;
  createdAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
};
export type AccessGrant = { principal: string; privilege: string; source: string; isApp: boolean; removable: boolean };
export type TableAccess = {
  me: string;
  owner: string | null;
  canManage: boolean;
  hasAccess: boolean;
  requests: AccessRequest[];
  pending: AccessRequest[];
  grants: AccessGrant[];
};

export const MAX_TEXT = 500;
export const samePerson = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};
export const SOURCE_LABEL: Record<string, string> = {
  table: 'This data product',
  schema: 'Whole schema',
  catalog: 'Whole catalog',
};

// Same text for every viewer and on the server render, whatever the browser's time zone.
export function formatWhen(value: string | null | undefined) {
  if (!value) return '';
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? value : `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export const principalLabel = (grant: AccessGrant) =>
  grant.isApp ? 'Catalog Manager app (service principal)' : grant.principal;
