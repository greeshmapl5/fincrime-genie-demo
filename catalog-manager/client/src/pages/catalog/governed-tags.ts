export type TagKind = 'system' | 'governed' | 'free-form';
export type Tag = { key: string; value: string; kind: TagKind };
export type TagPolicy = { key: string; description: string; values: string[] };
export type TableTags = { table: Tag[]; columns: { column: string; tags: Tag[] }[] };
export type GovernedTagOptions = { table: TagPolicy[]; column: TagPolicy[] };

export const CERT_TAG = 'system.certification_status';
export const CLASS_PREFIX = 'class.';
export const KIND_LABEL: Record<TagKind, string> = { system: 'System', governed: 'Governed', 'free-form': 'Free-form' };

// Identifiers most likely in banking and AML data; listed first in the column picker.
const COMMON_CLASS_TAGS = [
  'class.name',
  'class.date_of_birth',
  'class.email_address',
  'class.phone_number',
  'class.street_address',
  'class.iban_code',
  'class.swift_code',
  'class.bank_number',
  'class.credit_card',
  'class.us_ssn',
  'class.passport',
  'class.ip_address',
  'class.location',
];

export function splitClassOptions(options: TagPolicy[]) {
  const common = COMMON_CLASS_TAGS.flatMap((key) => options.filter((o) => o.key === key));
  const other = options.filter((o) => !COMMON_CLASS_TAGS.includes(o.key));
  return { common, other };
}

export const tagText = ({ key, value }: { key: string; value: string }) => (value ? `${key} = ${value}` : key);
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
