<script lang="ts">
  import { onMount } from 'svelte';
  import { BackendApiError, BackendClient } from '$lib/api/backendClient';
  import { generateCv, templates } from '$lib/cv/generator';
  import {
    blankCv,
    entryId,
    newEntry,
    SECTION_ORDER,
    validateCv,
    type CvData,
    type CvSectionId,
    type CvValidationError
  } from '$lib/cv/model';
  import { fingerprintCv, loadCvRecord, saveCvRecord } from '$lib/cv/storage';
  import { BackendPreviewAdapter } from '$lib/preview/backendPreviewAdapter';
  import { PreviewController, type PreviewState } from '$lib/workspace/previewController';
  import PreviewPane from './PreviewPane.svelte';
  import Field from './cv/Field.svelte';
  import EntryHead from './cv/EntryHead.svelte';
  import AddButton from './cv/AddButton.svelte';

  type EntrySection = Exclude<CvSectionId, 'summary'>;
  const labels: Record<CvSectionId, string> = {
    summary: 'Summary',
    experience: 'Experience',
    achievements: 'Achievements',
    skills: 'Skills',
    education: 'Education',
    certificates: 'Certificates',
    projects: 'Projects'
  };
  const descriptions: Record<CvSectionId, string> = {
    summary: 'The headline and human story.',
    experience: 'Roles, impact, and the tools behind it.',
    achievements: 'Recognition and measurable milestones.',
    skills: 'Capabilities grouped for quick reading.',
    education: 'Formal study and qualifications.',
    certificates: 'Credentials that support your practice.',
    projects: 'Selected work beyond your role history.'
  };
  const inputClass = 'cv-input';
  const textareaClass = 'cv-input cv-textarea';

  let data: CvData = blankCv();
  let templateId = templates[0].id;
  let activeSection: CvSectionId = 'summary';
  let mobilePane: 'form' | 'preview' = 'form';
  let presentation: 'intake' | 'workspace' = 'intake';
  let advanced = false;
  let lastGeneratedSource = '';
  let generatedFingerprint = '';
  let generatedAt: string | null = null;
  let errors: CvValidationError[] = [];
  let notice = '';
  let state: PreviewState = {
    status: 'idle',
    requestedSource: '',
    lastSuccess: null,
    diagnostics: []
  };
  const backendAdapter = new BackendPreviewAdapter(new BackendClient());
  let controller: PreviewController | null = null;
  let controllerReady = false;
  $: currentFingerprint = fingerprintCv(data);
  $: dirty = currentFingerprint !== generatedFingerprint;
  $: sectionIndex = SECTION_ORDER.indexOf(activeSection);

  function persist() {
    if (typeof localStorage === 'undefined') return true;
    return saveCvRecord(localStorage, {
      version: 1,
      data,
      templateId,
      lastGeneratedSource,
      generatedAt,
      fingerprint: generatedFingerprint
    });
  }
  function changed() {
    data = structuredClone(data);
    if (errors.length) errors = validateCv(data);
    notice = '';
    if (!persist()) notice = 'Autosave is unavailable; your edits still work in this tab.';
  }
  function add(section: EntrySection) {
    const next = structuredClone(data) as unknown as Record<
      EntrySection,
      Array<Record<string, unknown>>
    >;
    next[section].push(newEntry(section) as unknown as Record<string, unknown>);
    data = next as unknown as CvData;
    changed();
  }
  function remove(section: EntrySection, id: string) {
    const next = structuredClone(data) as unknown as Record<
      EntrySection,
      Array<Record<string, unknown>>
    >;
    next[section] = next[section].filter((entry) => entry.id !== id);
    data = next as unknown as CvData;
    changed();
  }
  function move(section: EntrySection, index: number, direction: -1 | 1) {
    const target = index + direction;
    const next = structuredClone(data) as unknown as Record<
      EntrySection,
      Array<Record<string, unknown>>
    >;
    if (target < 0 || target >= next[section].length) return;
    [next[section][index], next[section][target]] = [next[section][target], next[section][index]];
    data = next as unknown as CvData;
    changed();
  }
  function addProfile() {
    data.identity.profiles.push({ id: entryId(), type: 'website', label: '', url: '' });
    changed();
  }
  function removeProfile(id: string) {
    data.identity.profiles = data.identity.profiles.filter((profile) => profile.id !== id);
    changed();
  }
  function moveProfile(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= data.identity.profiles.length) return;
    [data.identity.profiles[index], data.identity.profiles[target]] = [
      data.identity.profiles[target],
      data.identity.profiles[index]
    ];
    changed();
  }
  const fieldError = (path: string) => errors.find((error) => error.path === path)?.message;
  const sectionErrors = (section: CvSectionId) =>
    errors.filter((error) => error.section === section).length;

  async function generate() {
    if (state.status === 'loading') return;
    if (!controllerReady || !controller) {
      notice = 'The preview workspace is still loading. Try Generate CV again in a moment.';
      return;
    }
    errors = validateCv(data);
    if (errors.length) {
      activeSection = errors[0].section;
      mobilePane = 'form';
      notice = 'Review the highlighted field before generating.';
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-path="${errors[0].path}"]`)?.focus()
      );
      return;
    }
    try {
      const date = new Date();
      lastGeneratedSource = generateCv(data, templateId, date);
      generatedAt = date.toISOString();
      generatedFingerprint = currentFingerprint;
      presentation = 'workspace';
      mobilePane = 'preview';
      const saved = persist();
      notice = saved
        ? 'Source generated. Setting the proof…'
        : 'Autosave is unavailable; setting the proof in this tab…';
      await controller.compile(lastGeneratedSource);
      notice =
        state.status === 'success'
          ? saved
            ? 'CV generated and proof ready.'
            : 'CV generated and proof ready; autosave remains unavailable.'
          : saved
            ? 'Source generated, but the proof could not be completed.'
            : 'Source generated in this tab, but autosave and proofing are unavailable.';
    } catch (error) {
      notice = error instanceof Error ? error.message : 'Could not generate the CV.';
    }
  }
  function downloadText() {
    if (!lastGeneratedSource) return;
    downloadBlob(
      new Blob([lastGeneratedSource], { type: 'application/x-tex' }),
      `${fileStem()}-cv.tex`
    );
  }
  function downloadPdf() {
    if (state.lastSuccess?.representation !== 'pdf') return;
    downloadBlob(
      new Blob([state.lastSuccess.data], { type: 'application/pdf' }),
      `${fileStem()}-cv.pdf`
    );
  }
  function downloadBlob(blob: Blob, name: string) {
    try {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch {
      notice = 'The download could not be started in this browser.';
    }
  }
  function fileStem() {
    return (
      data.identity.fullName
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'cv'
    );
  }
  async function copySource() {
    if (!lastGeneratedSource) return;
    try {
      await navigator.clipboard.writeText(lastGeneratedSource);
      notice = 'Exact LaTeX source copied.';
    } catch {
      notice = 'Clipboard access was denied. Download the .tex file instead.';
    }
  }
  function toggleAdvanced() {
    advanced = !advanced;
    if (advanced) mobilePane = 'preview';
  }
  function go(direction: -1 | 1) {
    activeSection =
      SECTION_ORDER[Math.max(0, Math.min(SECTION_ORDER.length - 1, sectionIndex + direction))];
    document.querySelector('.builder-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    let active = true;
    const saved = loadCvRecord(
      localStorage,
      () => (notice = 'Saved CV data could not be restored; a blank dossier was opened.')
    );
    if (saved) {
      data = saved.data;
      templateId = saved.templateId;
      lastGeneratedSource = saved.lastGeneratedSource;
      generatedAt = saved.generatedAt;
      generatedFingerprint = saved.fingerprint;
      if (saved.lastGeneratedSource) presentation = 'workspace';
    }
    void (async () => {
      try {
        await backendAdapter.initialize(lastGeneratedSource);
        if (!active) return;
        controller = new PreviewController(backendAdapter, (next) => (state = next));
        if (lastGeneratedSource) await controller.compile(lastGeneratedSource);
        controllerReady = true;
      } catch (error) {
        if (!active) return;
        controllerReady = false;
        state = {
          ...state,
          status: 'failure',
          diagnostics: [
            {
              severity: 'error',
              message:
                error instanceof BackendApiError
                  ? error.message
                  : 'The preview service could not be loaded.',
              line: 1,
              column: 1,
              code: 'BACKEND_UNAVAILABLE'
            }
          ]
        };
      }
    })();
    return () => {
      active = false;
      controller?.dispose();
      void backendAdapter?.cancel();
    };
  });
</script>

<svelte:window
  on:keydown={(event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (state.status !== 'loading') void generate();
    }
  }} />

<main class={`workspace-shell ${presentation === 'workspace' ? 'is-workspace' : 'is-intake'}`}>
  <header class="workspace-header">
    <div class="brand-lockup">
      <div class="brand-mark" aria-hidden="true">M</div>
      <div>
        <h1>Marginalia</h1>
        <p>{presentation === 'intake' ? 'CV builder' : 'Proof workspace'}</p>
      </div>
    </div>
    <div class="header-actions">
      <span
        class="proof-status"
        class:is-loading={state.status === 'loading'}
        class:is-success={state.status === 'success' && !dirty}
        class:is-stale={dirty && !!lastGeneratedSource}
        class:is-failure={state.status === 'failure'}
        role="status">
        {state.status === 'loading'
          ? 'Setting proof'
          : dirty && lastGeneratedSource
            ? 'Proof outdated'
            : state.status === 'success'
              ? 'Proof ready'
              : 'Ready to start'}
      </span>
      {#if presentation === 'workspace'}<button
          class="button button-secondary source-toggle"
          type="button"
          on:click={toggleAdvanced}
          aria-pressed={advanced}>
          Source
        </button>{/if}
      <button
        class="button button-primary generate-button"
        type="button"
        on:click={generate}
        disabled={!controllerReady || state.status === 'loading'}>
        {state.status === 'loading' ? 'Generating…' : 'Generate CV'}
      </button>
    </div>
  </header>
  {#if presentation === 'workspace'}<nav class="mobile-pane-nav" aria-label="Workspace view">
      <button
        type="button"
        aria-pressed={mobilePane === 'form'}
        class:active-tab={mobilePane === 'form'}
        on:click={() => (mobilePane = 'form')}>
        Form
      </button>
      <button
        type="button"
        aria-pressed={mobilePane === 'preview'}
        class:active-tab={mobilePane === 'preview'}
        on:click={() => (mobilePane = 'preview')}>
        Preview
        {#if state.diagnostics.length}<span class="tab-count">{state.diagnostics.length}</span>{/if}
      </button>
    </nav>{/if}

  <div class="workspace-content">
    <section
      class={`form-panel ${presentation === 'intake' ? 'intake-panel' : ''} ${mobilePane !== 'form' ? 'mobile-hidden' : ''}`}
      aria-label="CV form builder">
      <nav class="section-rail" aria-label="CV sections">
        <p class="rail-label">Your CV</p>
        {#each SECTION_ORDER as section, index}
          <button
            type="button"
            on:click={() => (activeSection = section)}
            aria-current={activeSection === section ? 'step' : undefined}
            class="section-nav-button"
            class:is-active={activeSection === section}
            class:has-error={sectionErrors(section) > 0}>
            <span>{labels[section]}</span>
            <span class="section-index">
              {sectionErrors(section)
                ? `!${sectionErrors(section)}`
                : String(index + 1).padStart(2, '0')}
            </span>
          </button>
        {/each}
      </nav>

      <div class="builder-scroll" on:input={changed}>
        <div class="form-content">
          <div class="form-heading">
            <p class="section-kicker">Section {sectionIndex + 1} of {SECTION_ORDER.length}</p>
            <h2>
              {presentation === 'intake' && activeSection === 'summary'
                ? 'Start with the essentials'
                : labels[activeSection]}
            </h2>
            <p>
              {presentation === 'intake' && activeSection === 'summary'
                ? 'Add the details that make your CV yours. You can fill the rest in as you go.'
                : descriptions[activeSection]}
            </p>
          </div>
          {#if presentation === 'intake' && activeSection === 'summary'}<div class="intake-guide">
              <span class="guide-mark" aria-hidden="true">1</span>
              <div>
                <strong>Start with the details employers need first.</strong>
                <span>
                  Fields marked <b aria-hidden="true">*</b>
                  are required. Add an email, phone number, or profile link so people can reach you.
                </span>
              </div>
            </div>{/if}
          {#if errors.length}
            <p class="form-alert" role="alert">
              <strong>Review this section.</strong>
              {errors[0].message}
            </p>
          {/if}
          {#if notice}<p class="notice" role="status">
              {notice}
            </p>{/if}

          {#if activeSection === 'summary'}
            <div class="grid grid-cols-2 gap-x-7 gap-y-6 max-[560px]:grid-cols-1">
              <label class="col-span-2 max-[560px]:col-span-1">
                <span>
                  Full name <b aria-hidden="true">*</b>
                </span>
                <input
                  class={inputClass}
                  id="identity-full-name"
                  data-path="identity.fullName"
                  bind:value={data.identity.fullName}
                  autocomplete="name"
                  placeholder="Ada Lovelace"
                  required
                  aria-required="true"
                  aria-invalid={fieldError('identity.fullName') ? 'true' : undefined}
                  aria-describedby={fieldError('identity.fullName')
                    ? 'identity-full-name-error'
                    : undefined}
                  aria-errormessage={fieldError('identity.fullName')
                    ? 'identity-full-name-error'
                    : undefined} />
                {#if fieldError('identity.fullName')}<small
                    class="field-error"
                    id="identity-full-name-error">
                    {fieldError('identity.fullName')}
                  </small>{/if}
              </label>
              <label>
                <span>Professional titles</span>
                <input
                  class={inputClass}
                  bind:value={data.identity.professionalTitles}
                  placeholder="Design engineer · Researcher" />
              </label>
              <label>
                <span>Location</span>
                <input
                  class={inputClass}
                  bind:value={data.identity.location}
                  autocomplete="address-level2"
                  placeholder="London, UK" />
              </label>
              <label>
                <span>Email</span>
                <input
                  class={inputClass}
                  id="identity-email"
                  data-path="identity.email"
                  bind:value={data.identity.email}
                  type="email"
                  autocomplete="email"
                  placeholder="ada@example.com"
                  required={!data.identity.phone.trim() &&
                    !data.identity.profiles.some((profile) => profile.url.trim())}
                  aria-required={!data.identity.phone.trim() &&
                    !data.identity.profiles.some((profile) => profile.url.trim())}
                  aria-invalid={fieldError('identity.email') ? 'true' : undefined}
                  aria-describedby={fieldError('identity.email')
                    ? 'identity-email-error'
                    : undefined}
                  aria-errormessage={fieldError('identity.email')
                    ? 'identity-email-error'
                    : undefined} />
                {#if fieldError('identity.email')}<small
                    class="field-error"
                    id="identity-email-error">
                    {fieldError('identity.email')}
                  </small>{/if}
              </label>
              <label>
                <span>Phone</span>
                <input
                  class={inputClass}
                  bind:value={data.identity.phone}
                  autocomplete="tel"
                  placeholder="+44 20 0000 0000" />
              </label>
              <label class="col-span-2 max-[560px]:col-span-1">
                <span>Professional summary</span>
                <textarea
                  class={textareaClass}
                  bind:value={data.summary}
                  placeholder="A concise account of the work you do and the value you create.">
                </textarea>
              </label>
            </div>
            <div class="mt-9 border-t border-[var(--rule)] pt-6">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="m-0 text-xl">Profile links</h3>
                <button class="text-button" type="button" on:click={addProfile}>+ Add link</button>
              </div>
              {#each data.identity.profiles as profile, profileIndex (profile.id)}<div
                  class="entry-card grid grid-cols-[130px_1fr_1.5fr_auto] gap-3 max-[620px]:grid-cols-1">
                  <label>
                    <span>Type</span>
                    <select
                      class={inputClass}
                      data-path={`profiles.${profile.id}.type`}
                      bind:value={profile.type}>
                      <option value="website">Website</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="github">GitHub</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="x">X</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label>
                    <span>Label</span>
                    <input class={inputClass} bind:value={profile.label} placeholder="Portfolio" />
                  </label>
                  <label>
                    <span>URL</span>
                    <input
                      class={inputClass}
                      id={`profile-${profile.id}-url`}
                      data-path={`profiles.${profile.id}.url`}
                      bind:value={profile.url}
                      type="url"
                      placeholder="https://…"
                      required
                      aria-required="true"
                      aria-invalid={fieldError(`profiles.${profile.id}.url`) ? 'true' : undefined}
                      aria-describedby={fieldError(`profiles.${profile.id}.url`)
                        ? `profile-${profile.id}-url-error`
                        : undefined}
                      aria-errormessage={fieldError(`profiles.${profile.id}.url`)
                        ? `profile-${profile.id}-url-error`
                        : undefined} />
                    {#if fieldError(`profiles.${profile.id}.url`)}<small
                        class="field-error"
                        id={`profile-${profile.id}-url-error`}>
                        {fieldError(`profiles.${profile.id}.url`)}
                      </small>{/if}
                  </label>
                  <div class="flex items-center">
                    <button
                      class="text-button"
                      type="button"
                      aria-label="Move profile link up"
                      disabled={profileIndex === 0}
                      on:click={() => moveProfile(profileIndex, -1)}>
                      ↑
                    </button>
                    <button
                      class="text-button"
                      type="button"
                      aria-label="Move profile link down"
                      disabled={profileIndex === data.identity.profiles.length - 1}
                      on:click={() => moveProfile(profileIndex, 1)}>
                      ↓
                    </button>
                    <button
                      class="remove-button"
                      type="button"
                      aria-label="Remove profile link"
                      on:click={() => removeProfile(profile.id)}>
                      ×
                    </button>
                  </div>
                </div>{/each}
            </div>
          {:else if activeSection === 'experience'}
            {#each data.experience as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.role || 'New experience'}
                  {index}
                  total={data.experience.length}
                  onMove={(d) => move('experience', index, d)}
                  onRemove={() => remove('experience', entry.id)} />
                <div class="form-grid">
                  <Field
                    label="Role"
                    required
                    path={`experience.${entry.id}.role`}
                    error={fieldError(`experience.${entry.id}.role`)}
                    bind:value={entry.role} /><Field
                    label="Organization"
                    required
                    path={`experience.${entry.id}.organization`}
                    error={fieldError(`experience.${entry.id}.organization`)}
                    bind:value={entry.organization} /><Field
                    label="Location"
                    bind:value={entry.location} /><Field
                    label="Start date"
                    bind:value={entry.start} /><Field
                    label="End date"
                    bind:value={entry.end}
                    disabled={entry.current} />
                  <label class="check">
                    <input type="checkbox" bind:checked={entry.current} />
                    Current role
                  </label>
                  <Field wide multiline label="Description" bind:value={entry.description} /><Field
                    wide
                    multiline
                    label="Highlights (one per line)"
                    bind:value={entry.highlights} /><Field
                    wide
                    label="Tools"
                    bind:value={entry.tools} />
                </div>
              </article>{/each}<AddButton label="experience" onAdd={() => add('experience')} />
          {:else if activeSection === 'achievements'}
            {#each data.achievements as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.title || 'New achievement'}
                  {index}
                  total={data.achievements.length}
                  onMove={(d) => move('achievements', index, d)}
                  onRemove={() => remove('achievements', entry.id)} />
                <div class="form-grid">
                  <Field
                    label="Title"
                    required
                    path={`achievements.${entry.id}.title`}
                    error={fieldError(`achievements.${entry.id}.title`)}
                    bind:value={entry.title} /><Field
                    label="Category"
                    bind:value={entry.category} /><Field
                    label="Date"
                    bind:value={entry.date} /><Field
                    wide
                    multiline
                    label="Description"
                    required
                    path={`achievements.${entry.id}.description`}
                    error={fieldError(`achievements.${entry.id}.description`)}
                    bind:value={entry.description} />
                </div>
              </article>{/each}<AddButton label="achievement" onAdd={() => add('achievements')} />
          {:else if activeSection === 'skills'}
            {#each data.skills as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.category || 'New skill category'}
                  {index}
                  total={data.skills.length}
                  onMove={(d) => move('skills', index, d)}
                  onRemove={() => remove('skills', entry.id)} />
                <div class="form-grid">
                  <Field
                    label="Category"
                    required
                    path={`skills.${entry.id}.category`}
                    error={fieldError(`skills.${entry.id}.category`)}
                    bind:value={entry.category} /><Field
                    label="Skills"
                    required
                    path={`skills.${entry.id}.skills`}
                    error={fieldError(`skills.${entry.id}.skills`)}
                    bind:value={entry.skills} />
                </div>
              </article>{/each}<AddButton label="skill category" onAdd={() => add('skills')} />
          {:else if activeSection === 'education'}
            {#each data.education as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.qualification || 'New education'}
                  {index}
                  total={data.education.length}
                  onMove={(d) => move('education', index, d)}
                  onRemove={() => remove('education', entry.id)} />
                <div class="form-grid">
                  <Field
                    label="Institution"
                    required
                    path={`education.${entry.id}.institution`}
                    error={fieldError(`education.${entry.id}.institution`)}
                    bind:value={entry.institution} /><Field
                    label="Qualification"
                    required
                    path={`education.${entry.id}.qualification`}
                    error={fieldError(`education.${entry.id}.qualification`)}
                    bind:value={entry.qualification} /><Field
                    label="Location"
                    bind:value={entry.location} /><Field
                    label="Start date"
                    bind:value={entry.start} /><Field
                    label="End date"
                    bind:value={entry.end} /><Field label="GPA" bind:value={entry.gpa} />
                </div>
              </article>{/each}<AddButton label="education" onAdd={() => add('education')} />
          {:else if activeSection === 'certificates'}
            {#each data.certificates as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.name || 'New certificate'}
                  {index}
                  total={data.certificates.length}
                  onMove={(d) => move('certificates', index, d)}
                  onRemove={() => remove('certificates', entry.id)} />
                <div class="form-grid">
                  <Field
                    label="Certificate"
                    required
                    path={`certificates.${entry.id}.name`}
                    error={fieldError(`certificates.${entry.id}.name`)}
                    bind:value={entry.name} /><Field
                    label="Issuer"
                    required
                    path={`certificates.${entry.id}.issuer`}
                    error={fieldError(`certificates.${entry.id}.issuer`)}
                    bind:value={entry.issuer} /><Field label="Date" bind:value={entry.date} /><Field
                    label="Credential URL"
                    type="url"
                    path={`certificates.${entry.id}.credentialUrl`}
                    error={fieldError(`certificates.${entry.id}.credentialUrl`)}
                    bind:value={entry.credentialUrl} />
                </div>
              </article>{/each}<AddButton label="certificate" onAdd={() => add('certificates')} />
          {:else if activeSection === 'projects'}
            {#each data.projects as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.name || 'New project'}
                  {index}
                  total={data.projects.length}
                  onMove={(d) => move('projects', index, d)}
                  onRemove={() => remove('projects', entry.id)} />
                <div class="form-grid">
                  <Field
                    label="Project name"
                    required
                    path={`projects.${entry.id}.name`}
                    error={fieldError(`projects.${entry.id}.name`)}
                    bind:value={entry.name} /><Field label="Role" bind:value={entry.role} /><Field
                    label="Dates"
                    bind:value={entry.dates} /><Field
                    label="URL"
                    type="url"
                    path={`projects.${entry.id}.url`}
                    error={fieldError(`projects.${entry.id}.url`)}
                    bind:value={entry.url} /><Field
                    wide
                    multiline
                    label="Description"
                    path={`projects.${entry.id}.description`}
                    required
                    error={fieldError(`projects.${entry.id}.description`)}
                    bind:value={entry.description} /><Field
                    wide
                    multiline
                    label="Highlights (one per line)"
                    bind:value={entry.highlights} /><Field
                    wide
                    label="Tools"
                    bind:value={entry.tools} />
                </div>
              </article>{/each}<AddButton label="project" onAdd={() => add('projects')} />
          {/if}

          <footer class="section-footer">
            <button
              class="text-button"
              type="button"
              on:click={() => go(-1)}
              disabled={sectionIndex === 0}>
              ← Previous
            </button>
            <span class="page-count">
              {sectionIndex + 1} / {SECTION_ORDER.length}
            </span>
            <button
              class="text-button"
              type="button"
              on:click={() => go(1)}
              disabled={sectionIndex === SECTION_ORDER.length - 1}>
              Next →
            </button>
          </footer>
        </div>
      </div>
    </section>

    {#if presentation === 'workspace'}<section
        class={`preview-panel ${mobilePane !== 'preview' ? 'mobile-hidden' : ''}`}
        aria-label="Rendered preview">
        {#if advanced}
          <div class="source-panel">
            <div class="source-header">
              <div>
                <p class="panel-kicker">Generated source</p>
                <h2>LaTeX source</h2>
              </div>
              <div class="source-actions">
                <button
                  class="source-action button button-secondary"
                  type="button"
                  on:click={copySource}
                  disabled={!lastGeneratedSource}>
                  Copy
                </button>
                <button
                  class="source-action button button-secondary"
                  type="button"
                  on:click={downloadText}
                  disabled={!lastGeneratedSource}>
                  Download .tex
                </button>
              </div>
            </div>
            <pre class="source-code">{lastGeneratedSource ||
                'Generate your CV to inspect its exact LaTeX source.'}</pre>
          </div>
        {:else}
          <div class="preview-header">
            <div>
              <p class="panel-kicker">Rendered proof</p>
              <h2>Preview</h2>
            </div>
            <div class="preview-actions">
              {#if state.lastSuccess && (dirty || state.status === 'failure')}<span
                  class="proof-badge is-stale">
                  Last successful proof
                </span>{/if}
              {#if state.lastSuccess?.representation === 'pdf'}<button
                  class="text-button"
                  type="button"
                  on:click={downloadPdf}>
                  Download PDF
                </button>{/if}
            </div>
          </div>
          <div class="min-h-0 flex-1">
            <PreviewPane
              {state}
              onDiagnosticSelect={() => {
                advanced = true;
              }} />
          </div>
        {/if}
      </section>{/if}
  </div>
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {state.status === 'loading'
      ? 'Preview rendering started.'
      : state.status === 'success'
        ? 'Preview rendering complete.'
        : state.status === 'failure'
          ? `Preview failed with ${state.diagnostics.length} diagnostic.`
          : ''}
  </div>
</main>

<style>
  :global(html) {
    background: var(--canvas);
  }

  .workspace-shell {
    display: grid;
    grid-template-rows: 72px minmax(0, 1fr);
    height: 100vh;
    min-height: 0;
    background: var(--canvas);
    color: var(--ink);
  }

  .workspace-shell.is-workspace {
    grid-template-rows: 72px minmax(0, 1fr);
  }

  .workspace-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 0 28px;
    border-bottom: 1px solid var(--rule);
    background: var(--surface);
  }

  .brand-lockup,
  .header-actions,
  .preview-actions,
  .source-actions {
    display: flex;
    align-items: center;
  }

  .brand-lockup {
    gap: 12px;
  }

  .brand-mark {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border: 1px solid var(--blue);
    color: var(--blue);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.05em;
  }

  .brand-lockup h1,
  .brand-lockup p,
  .form-heading h2,
  .form-heading p,
  .preview-header h2,
  .preview-header p,
  .source-header h2,
  .source-header p {
    margin: 0;
  }

  .brand-lockup h1 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .brand-lockup p,
  .panel-kicker,
  .section-kicker,
  .rail-label,
  .section-index,
  .page-count,
  .proof-status,
  :global(label > span),
  :global(.form-label) {
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.08em;
    line-height: 1.3;
    text-transform: uppercase;
  }

  .brand-lockup p {
    margin-top: 3px;
    color: var(--quiet-ink);
    font-size: 9px;
    letter-spacing: 0.12em;
  }

  .header-actions {
    gap: 12px;
  }

  .proof-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .proof-status::before {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--quiet-ink);
    content: '';
  }

  .proof-status.is-loading::before {
    background: var(--blue);
    animation: spin 0.8s linear infinite;
  }

  .proof-status.is-success::before {
    background: var(--success);
  }

  .proof-status.is-stale::before,
  .proof-status.is-failure::before {
    background: var(--danger);
  }

  .button {
    min-height: 36px;
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 0 14px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1;
    text-transform: uppercase;
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease,
      transform 180ms ease;
  }

  .button:disabled,
  :global(.text-button:disabled),
  :global(.source-action:disabled) {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .button-primary {
    background: var(--blue);
    color: #fff;
  }

  .button-primary:hover:not(:disabled) {
    background: var(--blue-dark);
    transform: translateY(-1px);
  }

  .button-secondary {
    border-color: var(--rule-strong);
    background: var(--surface);
    color: var(--ink);
  }

  .button-secondary:hover:not(:disabled) {
    border-color: var(--blue);
    color: var(--blue-dark);
  }

  .mobile-pane-nav {
    display: none;
    grid-template-columns: repeat(2, 1fr);
    border-bottom: 1px solid var(--rule);
    background: var(--surface-subtle);
  }

  .mobile-pane-nav button {
    position: relative;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .mobile-pane-nav button.active-tab {
    color: var(--blue-dark);
  }

  .mobile-pane-nav button.active-tab::after {
    position: absolute;
    right: 24%;
    bottom: -1px;
    left: 24%;
    height: 2px;
    background: var(--blue);
    content: '';
  }

  .tab-count {
    display: inline-grid;
    min-width: 17px;
    height: 17px;
    margin-left: 5px;
    place-items: center;
    border-radius: 50%;
    background: var(--danger);
    color: #fff;
    font-size: 9px;
  }

  .workspace-content {
    display: grid;
    min-height: 0;
    grid-template-columns: minmax(520px, 56%) minmax(360px, 44%);
  }

  .is-intake .workspace-content {
    grid-template-columns: minmax(0, 1fr);
  }

  .form-panel {
    display: grid;
    min-height: 0;
    grid-template-columns: 190px minmax(0, 1fr);
    border-right: 1px solid var(--rule);
    background: var(--surface);
  }

  .intake-panel .builder-scroll {
    background: var(--surface);
  }

  .section-rail {
    padding: 27px 14px;
    border-right: 1px solid var(--rule);
    background: var(--surface-subtle);
  }

  .rail-label {
    margin: 0 10px 15px;
    color: var(--quiet-ink);
    font-size: 9px;
  }

  .section-nav-button {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
    border: 0;
    border-radius: 6px;
    border-left: 2px solid transparent;
    padding: 11px 10px;
    background: transparent;
    color: var(--muted-ink);
    font-size: 14px;
    text-align: left;
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease;
  }

  .section-nav-button:hover {
    background: var(--surface);
    color: var(--ink);
  }

  .section-nav-button.is-active {
    border-left-color: var(--blue);
    background: var(--blue-soft);
    color: var(--blue-dark);
    font-weight: 650;
  }

  .section-nav-button.has-error .section-index {
    color: var(--danger);
  }

  .section-index {
    color: var(--quiet-ink);
    font-size: 9px;
  }

  .builder-scroll {
    min-height: 0;
    overflow-y: auto;
    padding: 44px clamp(28px, 5vw, 84px) 52px;
  }

  .form-content {
    width: min(100%, 760px);
    margin: 0 auto;
  }

  .form-heading {
    margin-bottom: 30px;
  }

  .section-kicker,
  .panel-kicker {
    margin-bottom: 10px !important;
    color: var(--blue-dark);
    font-size: 9px;
  }

  .form-heading h2 {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.08;
  }

  .form-heading p:not(.section-kicker) {
    max-width: 52ch;
    margin-top: 10px;
    color: var(--muted-ink);
    font-size: 16px;
    line-height: 1.5;
  }

  .intake-guide {
    display: flex;
    gap: 13px;
    margin-bottom: 28px;
    border: 1px solid #c9dafa;
    border-radius: 8px;
    padding: 14px 16px;
    background: var(--blue-soft);
    color: var(--blue-dark);
    animation: reveal 220ms ease-out both;
  }

  .guide-mark {
    display: grid;
    width: 22px;
    height: 22px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 50%;
    background: var(--blue);
    color: #fff;
    font-family: var(--mono);
    font-size: 10px;
  }

  .intake-guide strong,
  .intake-guide span {
    display: block;
  }

  .intake-guide strong {
    font-size: 13px;
  }

  .intake-guide span {
    margin-top: 3px;
    color: #315a91;
    font-size: 13px;
    line-height: 1.45;
  }

  .form-alert,
  .notice {
    margin: 0 0 24px;
    border: 1px solid var(--rule);
    border-radius: 7px;
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.45;
  }

  .form-alert {
    border-color: #efc3bf;
    background: var(--danger-soft);
    color: var(--danger);
  }

  .notice {
    background: var(--surface-subtle);
    color: var(--muted-ink);
  }

  :global(label > span),
  :global(.form-label) {
    display: block;
    margin-bottom: 7px;
    color: var(--muted-ink);
    font-size: 9px;
  }

  :global(label > span b) {
    color: var(--blue);
  }

  :global(.cv-input) {
    width: 100%;
    min-height: 42px;
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    padding: 9px 11px;
    background: var(--surface);
    color: var(--ink);
    font-size: 15px;
    line-height: 1.4;
    outline: none;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background-color 180ms ease;
  }

  :global(.cv-input::placeholder) {
    color: #8b98a4;
  }

  :global(.cv-input:focus) {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgb(23 105 210 / 14%);
  }

  :global(.cv-input:disabled) {
    background: var(--surface-subtle);
    color: var(--quiet-ink);
  }

  :global(.cv-textarea) {
    min-height: 96px;
    resize: vertical;
  }

  :global(.field-error) {
    display: block;
    margin-top: 6px;
    color: var(--danger);
    font-family: var(--mono);
    font-size: 10px;
    line-height: 1.4;
  }

  :global(.entry-card) {
    margin-bottom: 18px;
    border: 1px solid var(--rule);
    border-radius: 8px;
    padding: 18px;
    background: var(--surface-raised);
  }

  :global(.entry-head) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 12px;
  }

  :global(.entry-head h3) {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  :global(.add-button) {
    width: 100%;
    margin-bottom: 18px;
    border: 1px dashed var(--rule-strong);
    border-radius: 7px;
    padding: 13px 16px;
    background: transparent;
    color: var(--blue-dark);
    cursor: pointer;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  :global(.add-button:hover) {
    border-color: var(--blue);
    background: var(--blue-soft);
  }

  :global(.form-grid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 22px;
  }

  :global(.text-button),
  :global(.source-action) {
    border: 0;
    background: transparent;
    padding: 7px 8px;
    color: var(--blue-dark);
    cursor: pointer;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  :global(.text-button:hover),
  :global(.source-action:hover) {
    color: var(--blue);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :global(.remove-button) {
    align-self: center;
    border: 0;
    background: transparent;
    color: var(--danger);
    cursor: pointer;
    font-size: 22px;
  }

  :global(.source-action) {
    min-height: 34px;
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    color: var(--ink);
  }

  :global(.check) {
    align-self: end;
    padding: 10px 0;
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 10px;
  }

  .section-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 34px;
    border-top: 1px solid var(--rule);
    padding-top: 16px;
  }

  .page-count {
    color: var(--quiet-ink);
    font-size: 9px;
  }

  .preview-panel {
    display: flex;
    min-height: 0;
    flex-direction: column;
    background: #e5eaf0;
  }

  .preview-header,
  .source-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--rule);
    padding: 14px 20px;
    background: var(--surface-subtle);
  }

  .preview-header h2,
  .source-header h2 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .preview-actions,
  .source-actions {
    gap: 10px;
  }

  .proof-badge {
    border: 1px solid var(--rule-strong);
    border-radius: 5px;
    padding: 6px 8px;
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .proof-badge.is-stale {
    border-color: #e8c57f;
    background: var(--warning-soft);
    color: var(--warning);
  }

  .source-panel {
    display: flex;
    min-height: 0;
    flex-direction: column;
    background: #18222d;
    color: #f1f5f8;
  }

  .source-panel .source-header {
    border-color: #354554;
    background: #202d39;
  }

  .source-panel .panel-kicker {
    color: #9bbbe7;
  }

  .source-panel .source-header h2 {
    color: #fff;
  }

  .source-panel :global(.source-action) {
    border-color: #66798a;
    background: transparent;
    color: #e8f1ff;
  }

  .source-code {
    min-height: 0;
    flex: 1;
    margin: 0;
    overflow: auto;
    padding: 22px;
    color: #d5e2ee;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  :global(label > span),
  :global(.form-label) {
    font-family: var(--mono);
  }

  @media (max-width: 620px) {
    :global(.form-grid) {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .workspace-shell.is-workspace {
      grid-template-rows: 68px 44px minmax(0, 1fr);
    }

    .mobile-pane-nav {
      display: grid;
    }

    .mobile-hidden {
      display: none !important;
    }

    .workspace-content {
      display: block;
    }

    .form-panel {
      display: grid;
      height: 100%;
      grid-template-columns: 1fr;
      border-right: 0;
    }

    .section-rail {
      display: none;
    }

    .preview-panel {
      height: 100%;
    }

    .workspace-header {
      padding: 0 16px;
    }

    .builder-scroll {
      padding: 32px 24px 44px;
    }

    .form-content {
      width: min(100%, 700px);
    }

    .proof-status {
      display: none;
    }
  }

  @media (max-width: 560px) {
    .header-actions {
      gap: 7px;
    }

    .source-toggle {
      display: none;
    }

    .generate-button {
      padding: 0 11px;
      font-size: 9px;
    }

    .builder-scroll {
      padding: 28px 16px 36px;
    }

    .form-heading h2 {
      font-size: 30px;
    }

    .preview-header,
    .source-header {
      align-items: flex-start;
      flex-direction: column;
      padding: 13px 16px;
    }

    .preview-actions,
    .source-actions {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
