import type { DocKey, LegalDoc } from './features/legal/documents';

export interface SiteInfo {
  name: string;
  tagline: string;
  product: string;
  owner: string;
  ownerUrl: string;
  /** Set VITE_CONTACT_EMAIL to show an email address; otherwise Contact links to the owner's GitHub. */
  contactEmail?: string;
  demoNotice: string;
  collected: { heading: string; items: string[] }[];
  uses: string[];
  sharing: string[];
  extraRules: string[];
  cookieName: string;
  storage: { key: string; purpose: string }[];
  footerWidth: string;
  columns: { title: string; links: { label: string; to: string }[] }[];
  extraDocs?: Partial<Record<DocKey, LegalDoc>>;
}

const OWNER = { owner: "M'hammed Mazin", ownerUrl: 'https://github.com/Mazine01', contactEmail: import.meta.env.VITE_CONTACT_EMAIL as string | undefined };

export const SITE: SiteInfo = {
  ...OWNER,
  name: 'Roster',
  tagline: 'Student records for registrar teams: find, update and export any record in seconds.',
  product: 'a student records system used by registrar staff',
  demoNotice: 'The public demo uses fictional students; no real student data is stored in it.',
  collected: [
    { heading: 'Staff accounts:', items: ['name and work email', 'a hashed password'] },
    { heading: 'Student records entered by staff:', items: ['name, student number, email and phone', 'date of birth, program, year, GPA and enrollment status'] },
  ],
  uses: ['to sign staff in and keep their session secure', 'to let staff search, update and export the records they manage', 'to keep a short undo window when a record is deleted'],
  sharing: ['Student records are visible only to signed-in staff accounts of the institution using Roster.', 'CSV exports are created on request by staff and downloaded to their own device.'],
  extraRules: ['enter student information you aren’t authorised to manage.'],
  cookieName: 'roster_session',
  storage: [],
  footerWidth: 'max-w-[1240px]',
  columns: [
    { title: 'Roster', links: [{ label: 'Students', to: '/' }, { label: 'Add a student', to: '/?new=1' }] },
    { title: 'Support', links: [{ label: 'Source code', to: 'https://github.com/Mazine01' }, { label: 'Report an issue', to: 'https://github.com/Mazine01' }] },
  ],
};
