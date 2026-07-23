import type { CvData } from './model';
import { SECTION_ORDER } from './model';

export const MAX_SOURCE_BYTES = 512 * 1024;

export function escapeLatex(value: string): string {
  const escaped: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    $: '\\$',
    '&': '\\&',
    '#': '\\#',
    _: '\\_',
    '%': '\\%',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}'
  };
  return value
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 || character === '\n' || character === '\t';
    })
    .map((character) => escaped[character] ?? character)
    .join('');
}

export const escapeLatexUrl = (value: string) => escapeLatex(value.trim());
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
const highlights = (value: string) =>
  lines(value).length
    ? `\\begin{highlights}\n${lines(value)
        .map((line) => `\\item ${escapeLatex(line)}`)
        .join('\n')}\n\\end{highlights}`
    : '';
const dates = (start: string, end: string, current = false) =>
  [start, current ? 'Present' : end].filter(Boolean).map(escapeLatex).join(' -- ');
const onecol = (body: string) => `\\begin{onecolentry}\n${body}\n\\end{onecolentry}`;
const twocol = (date: string, body: string) =>
  `\\begin{twocolentry}{${date}}\n${body}\n\\end{twocolentry}`;
const section = (title: string, body: string) => (body ? `\\section{${title}}\n${body}\n` : '');
const iconFor = (type: string) =>
  ({ github: 'Github', linkedin: 'Linkedin', website: 'Globe', portfolio: 'Globe', x: 'Twitter' })[
    type.toLowerCase()
  ] ?? 'Link';

export interface CvTemplate {
  id: string;
  name: string;
  render(data: CvData, generatedAt: Date): string;
}

export const defaultTemplate: CvTemplate = {
  id: 'editorial-v1',
  name: 'Editorial dossier',
  render(data, generatedAt) {
    const contacts = [
      data.identity.location &&
        `\\mbox{\\faMapMarker*\\hspace{0.13cm}${escapeLatex(data.identity.location)}}`,
      data.identity.email &&
        `\\mbox{\\href{mailto:${escapeLatexUrl(data.identity.email)}}{\\faEnvelope[regular]\\hspace{0.13cm}${escapeLatex(data.identity.email)}}}`,
      data.identity.phone &&
        `\\mbox{\\faPhone*\\hspace{0.13cm}${escapeLatex(data.identity.phone)}}`,
      ...data.identity.profiles
        .filter((profile) => profile.url)
        .map(
          (profile) =>
            `\\mbox{\\href{${escapeLatexUrl(profile.url)}}{\\fa${iconFor(profile.type)}\\hspace{0.13cm}${escapeLatex(profile.label || profile.type || profile.url)}}}`
        )
    ]
      .filter(Boolean)
      .join('\\kern 0.25cm\\AND\\kern 0.25cm');
    const rendered: Record<string, string> = {
      summary: data.summary.trim() ? onecol(escapeLatex(data.summary.trim())) : '',
      experience: data.experience
        .filter((entry) => entry.role || entry.organization)
        .map(
          (entry) =>
            `${twocol(dates(entry.start, entry.end, entry.current), `\\textbf{${escapeLatex(entry.role)}}, ${escapeLatex(entry.organization)}${entry.location ? ` -- ${escapeLatex(entry.location)}` : ''}`)}\n${entry.description ? onecol(escapeLatex(entry.description)) : ''}\n${entry.highlights ? onecol(highlights(entry.highlights)) : ''}\n${entry.tools ? onecol(`\\textit{Tools: ${escapeLatex(entry.tools)}}`) : ''}`
        )
        .join('\n'),
      achievements: data.achievements
        .filter((entry) => entry.title)
        .map(
          (entry) =>
            `${twocol(escapeLatex(entry.date), `\\textbf{${escapeLatex(entry.title)}}${entry.category ? ` -- ${escapeLatex(entry.category)}` : ''}`)}\n${entry.description ? onecol(escapeLatex(entry.description)) : ''}`
        )
        .join('\n'),
      skills: data.skills
        .filter((entry) => entry.category || entry.skills)
        .map((entry) =>
          onecol(`\\textbf{${escapeLatex(entry.category)}:} ${escapeLatex(entry.skills)}`)
        )
        .join('\n'),
      education: data.education
        .filter((entry) => entry.institution || entry.qualification)
        .map(
          (entry) =>
            `${twocol(dates(entry.start, entry.end), `\\textbf{${escapeLatex(entry.institution)}}, ${escapeLatex(entry.qualification)}${entry.location ? ` -- ${escapeLatex(entry.location)}` : ''}`)}${entry.gpa ? `\n${onecol(`GPA: ${escapeLatex(entry.gpa)}`)}` : ''}`
        )
        .join('\n'),
      certificates: data.certificates
        .filter((entry) => entry.name || entry.issuer)
        .map((entry) =>
          twocol(
            escapeLatex(entry.date),
            `\\textbf{${escapeLatex(entry.name)}}, ${escapeLatex(entry.issuer)}${entry.credentialUrl ? ` -- \\href{${escapeLatexUrl(entry.credentialUrl)}}{Credential}` : ''}`
          )
        )
        .join('\n'),
      projects: data.projects
        .filter((entry) => entry.name)
        .map(
          (entry) =>
            `${twocol(escapeLatex(entry.dates), `\\textbf{${escapeLatex(entry.name)}}${entry.role ? ` -- ${escapeLatex(entry.role)}` : ''}${entry.url ? ` -- \\href{${escapeLatexUrl(entry.url)}}{Project link}` : ''}`)}\n${entry.description ? onecol(escapeLatex(entry.description)) : ''}\n${entry.highlights ? onecol(highlights(entry.highlights)) : ''}\n${entry.tools ? onecol(`\\textit{Tools: ${escapeLatex(entry.tools)}}`) : ''}`
        )
        .join('\n')
    };
    const labels: Record<string, string> = {
      summary: 'Summary',
      experience: 'Experience',
      achievements: 'Achievements',
      skills: 'Skills',
      education: 'Education',
      certificates: 'Certificates',
      projects: 'Projects'
    };
    const generatedDate = generatedAt.toISOString().slice(0, 10);
    return `% CV_BUILDER_TEMPLATE:editorial-v1
\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=2cm,bottom=2cm,left=2cm,right=2cm,footskip=1cm]{geometry}
\\usepackage{titlesec,tabularx,array,enumitem,fontawesome5,amsmath,xcolor,hyperref,calc,bookmark,changepage,paracol,ifthen,needspace,fancyhdr}
\\usepackage{charter}
\\usepackage{fontspec}
\\IfFontExistsTF{Roboto}{\\setsansfont{Roboto}}{\\setsansfont{Arial}}
\\definecolor{primaryColor}{RGB}{0,0,0}
\\hypersetup{pdftitle={${escapeLatex(data.identity.fullName)} CV},pdfauthor={${escapeLatex(data.identity.fullName)}},pdfcreator={Marginalia CV Builder},colorlinks=true,urlcolor=primaryColor}
\\pagestyle{fancy}\\fancyhf{}\\renewcommand{\\headrulewidth}{0pt}\\fancyfoot[C]{\\small\\color{primaryColor}${escapeLatex(data.identity.fullName)} -- generated ${generatedDate} -- \\thepage}
\\setcounter{secnumdepth}{0}\\setlength{\\parindent}{0pt}\\setlength{\\columnsep}{0.15cm}
\\titleformat{\\section}{\\needspace{4\\baselineskip}\\bfseries\\large}{}{0pt}{}[\\vspace{1pt}\\titlerule]
\\titlespacing{\\section}{-1pt}{0.3cm}{0.2cm}
\\newenvironment{highlights}{\\begin{itemize}[topsep=0.10cm,parsep=0.10cm,partopsep=0pt,itemsep=0pt,leftmargin=0.4cm + 10pt]}{\\end{itemize}}
\\newenvironment{onecolentry}{\\begin{adjustwidth}{0cm}{0cm}}{\\end{adjustwidth}}
\\newenvironment{twocolentry}[1]{\\onecolentry\\def\\secondColumn{#1}\\setcolumnwidth{\\fill,4.5cm}\\begin{paracol}{2}}{\\switchcolumn\\raggedleft\\secondColumn\\end{paracol}\\endonecolentry}
\\newcommand{\\AND}{\\unskip\\cleaders\\copy\\ANDbox\\hskip\\wd\\ANDbox\\ignorespaces}\\newsavebox\\ANDbox\\sbox\\ANDbox{$|$}
\\begin{document}
\\begin{center}{\\fontsize{28pt}{28pt}\\selectfont\\bfseries ${escapeLatex(data.identity.fullName)}}\\par\\vspace{0.15cm}${data.identity.professionalTitles ? `{\\fontsize{12pt}{14pt}\\selectfont ${escapeLatex(data.identity.professionalTitles)}}\\par\\vspace{0.15cm}` : ''}{\\small ${contacts}}\\end{center}
\\vspace{0.2cm}
${SECTION_ORDER.map((id) => section(labels[id], rendered[id])).join('')}\\end{document}\n`;
  }
};

export const templates = [defaultTemplate] as const;
export function generateCv(
  data: CvData,
  templateId = defaultTemplate.id,
  generatedAt = new Date()
) {
  const template = templates.find((item) => item.id === templateId) ?? defaultTemplate;
  const source = template.render(data, generatedAt);
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES)
    throw new Error('Generated LaTeX exceeds the 512 KiB limit.');
  return source;
}
