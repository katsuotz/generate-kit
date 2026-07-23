export type CvSectionId =
  | 'summary'
  | 'experience'
  | 'achievements'
  | 'skills'
  | 'education'
  | 'certificates'
  | 'projects';

export const SECTION_ORDER: CvSectionId[] = [
  'summary',
  'experience',
  'achievements',
  'skills',
  'education',
  'certificates',
  'projects'
];

export interface ProfileLink {
  id: string;
  type: string;
  label: string;
  url: string;
}
export interface Experience {
  id: string;
  role: string;
  organization: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  description: string;
  highlights: string;
  tools: string;
}
export interface Education {
  id: string;
  institution: string;
  qualification: string;
  location: string;
  start: string;
  end: string;
  gpa: string;
}
export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}
export interface SkillGroup {
  id: string;
  category: string;
  skills: string;
}
export interface Project {
  id: string;
  name: string;
  role: string;
  url: string;
  dates: string;
  description: string;
  highlights: string;
  tools: string;
}
export interface Achievement {
  id: string;
  title: string;
  category: string;
  date: string;
  description: string;
}

export interface CvData {
  identity: {
    fullName: string;
    professionalTitles: string;
    location: string;
    email: string;
    phone: string;
    profiles: ProfileLink[];
  };
  summary: string;
  experience: Experience[];
  achievements: Achievement[];
  skills: SkillGroup[];
  education: Education[];
  certificates: Certificate[];
  projects: Project[];
}

export interface CvValidationError {
  path: string;
  section: CvSectionId;
  message: string;
}

let counter = 0;
export const entryId = () => `cv-${Date.now().toString(36)}-${(++counter).toString(36)}`;

export const blankCv = (): CvData => ({
  identity: {
    fullName: '',
    professionalTitles: '',
    location: '',
    email: '',
    phone: '',
    profiles: []
  },
  summary: '',
  experience: [],
  achievements: [],
  skills: [],
  education: [],
  certificates: [],
  projects: []
});

export const newEntry = <S extends Exclude<CvSectionId, 'summary'>>(
  section: S
): CvData[S][number] => {
  const id = entryId();
  const entries = {
    experience: {
      id,
      role: '',
      organization: '',
      location: '',
      start: '',
      end: '',
      current: false,
      description: '',
      highlights: '',
      tools: ''
    },
    achievements: { id, title: '', category: '', date: '', description: '' },
    skills: { id, category: '', skills: '' },
    education: {
      id,
      institution: '',
      qualification: '',
      location: '',
      start: '',
      end: '',
      gpa: ''
    },
    certificates: { id, name: '', issuer: '', date: '', credentialUrl: '' },
    projects: {
      id,
      name: '',
      role: '',
      url: '',
      dates: '',
      description: '',
      highlights: '',
      tools: ''
    }
  };
  return entries[section] as CvData[S][number];
};

const present = (entry: object) =>
  Object.entries(entry).some(
    ([key, value]) => key !== 'id' && key !== 'current' && String(value).trim()
  );
const httpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export function validateCv(data: CvData): CvValidationError[] {
  const errors: CvValidationError[] = [];
  const add = (path: string, section: CvSectionId, message: string) =>
    errors.push({ path, section, message });
  if (!data.identity.fullName.trim()) add('identity.fullName', 'summary', 'Full name is required.');
  if (
    ![data.identity.email, data.identity.phone, ...data.identity.profiles.map((p) => p.url)].some(
      (v) => v.trim()
    )
  )
    add('identity.email', 'summary', 'Add at least one contact method.');
  if (data.identity.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.identity.email.trim()))
    add('identity.email', 'summary', 'Use a valid email address.');
  data.identity.profiles.forEach((profile) => {
    if (present(profile) && !profile.type.trim())
      add(`profiles.${profile.id}.type`, 'summary', 'Choose a profile type.');
    if (present(profile) && !profile.url.trim())
      add(`profiles.${profile.id}.url`, 'summary', 'Profile URL is required.');
    else if (profile.url.trim() && !httpUrl(profile.url))
      add(`profiles.${profile.id}.url`, 'summary', 'Use a valid http(s) URL.');
  });
  const required: Record<Exclude<CvSectionId, 'summary'>, string[]> = {
    experience: ['role', 'organization'],
    achievements: ['title', 'description'],
    skills: ['category', 'skills'],
    education: ['institution', 'qualification'],
    certificates: ['name', 'issuer'],
    projects: ['name', 'description']
  };
  for (const section of SECTION_ORDER.slice(1) as Exclude<CvSectionId, 'summary'>[]) {
    for (const entry of data[section] as unknown as Record<string, unknown>[]) {
      if (!present(entry)) continue;
      for (const field of required[section])
        if (!String(entry[field] ?? '').trim())
          add(
            `${section}.${entry.id}.${field}`,
            section,
            `${field[0].toUpperCase()}${field.slice(1)} is required.`
          );
      for (const field of ['url', 'credentialUrl']) {
        const value = String(entry[field] ?? '').trim();
        if (value && !httpUrl(value))
          add(`${section}.${entry.id}.${field}`, section, 'Use a valid http(s) URL.');
      }
    }
  }
  return errors;
}
