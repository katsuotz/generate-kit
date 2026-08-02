import { describe, expect, it } from 'vitest';
import { generateCv, escapeLatex } from './generator';
import { blankCv, newEntry, validateCv } from './model';
import { fingerprintCv } from './storage';

describe('CV model and generation', () => {
  it('requires identity and a contact method', () => {
    const data = blankCv();
    expect(validateCv(data).map((error) => error.path)).toEqual([
      'identity.fullName',
      'identity.email'
    ]);
  });

  it('rejects a filled invalid email address', () => {
    const data = blankCv();
    data.identity.fullName = 'Ada';
    data.identity.email = 'not-an-email';
    expect(validateCv(data)).toContainEqual(
      expect.objectContaining({ path: 'identity.email', message: 'Use a valid email address.' })
    );
  });

  it('escapes user-controlled LaTeX and omits empty sections in fixed order', () => {
    const data = blankCv();
    data.identity.fullName = 'Ada & {Co}';
    data.identity.email = 'ada@example.com';
    data.summary = 'Builds #1 systems.';
    const skill = newEntry('skills');
    skill.category = 'Languages';
    skill.skills = 'TypeScript';
    data.skills.push(skill);
    const source = generateCv(data, undefined, new Date('2026-07-23T00:00:00Z'));
    expect(source).toContain('\\documentclass[10pt,letterpaper]{article}');
    expect(source).toContain('top=2cm,bottom=2cm,left=2cm,right=2cm,footskip=1cm');
    expect(source).toContain('\\definecolor{primaryColor}{RGB}{0,0,0}');
    expect(source).toContain('\\fontsize{28pt}{28pt}');
    expect(source).toContain('\\newenvironment{onecolentry}');
    expect(source).toContain('\\newenvironment{twocolentry}');
    expect(source).toContain('Ada \\& \\{Co\\}');
    expect(source).toContain('Builds \\#1 systems.');
    expect(source).toContain('\\section{Summary}');
    expect(source).toContain('\\section{Skills}');
    expect(source).not.toContain('\\section{Experience}');
    expect(source.indexOf('Summary')).toBeLessThan(source.indexOf('Skills'));
    expect(escapeLatex('\\input{x}')).not.toContain('\\input');
  });

  it('escapes URL content without allowing commands', () => {
    const data = blankCv();
    data.identity.fullName = 'Ada';
    data.identity.email = 'ada@example.com';
    data.identity.profiles.push({
      id: 'p1',
      type: 'website',
      label: 'A&B',
      url: 'https://example.com/a_b?x=1&y=2'
    });
    const source = generateCv(data, undefined, new Date('2026-07-23T00:00:00Z'));
    expect(source).toContain('https://example.com/a\\_b?x=1\\&y=2');
    expect(source).toContain('A\\&B');
  });

  it('fingerprints structured data deterministically', () => {
    const data = blankCv();
    expect(fingerprintCv(data)).toBe(fingerprintCv(structuredClone(data)));
  });
});
