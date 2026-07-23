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
  const inputClass =
    'w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-2 text-[17px] text-[var(--ink)] outline-none transition-colors placeholder:text-[#9a8f84] focus:border-[var(--copper)]';
  const textareaClass = `${inputClass} min-h-[92px] resize-y leading-[1.45]`;

  let data: CvData = blankCv();
  let templateId = templates[0].id;
  let activeSection: CvSectionId = 'summary';
  let mobilePane: 'form' | 'preview' = 'form';
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
  }}
/>

<main
  class="grid h-screen min-h-0 grid-rows-[74px_minmax(0,1fr)] bg-[#d7cfc3] bg-[image:var(--workspace-texture)] max-[900px]:grid-rows-[68px_46px_minmax(0,1fr)]"
>
  <header
    class="flex items-center justify-between border-b border-[var(--rule)] bg-[rgba(245,240,231,.92)] px-7 max-[900px]:px-4"
  >
    <div class="flex items-baseline gap-4">
      <h1 class="m-0 text-[27px] font-semibold tracking-[-.025em]">Marginalia</h1>
      <span
        class="font-mono text-[9px] uppercase tracking-[.18em] text-[#8b5d49] max-[560px]:hidden"
        >Career dossier</span
      >
    </div>
    <div class="flex items-center gap-2">
      <span class="font-mono text-[9px] uppercase tracking-[.1em] text-[#766b61] max-[650px]:hidden"
        >{state.status === 'loading'
          ? 'Setting proof…'
          : dirty && lastGeneratedSource
            ? 'Proof outdated'
            : state.status === 'success'
              ? 'Proof ready'
              : 'Not generated'}</span
      >
      <button
        class="border border-[#8a7568] px-3 py-2 font-mono text-[9px] uppercase tracking-[.1em] hover:bg-[#eee4d8]"
        type="button"
        on:click={toggleAdvanced}
        aria-pressed={advanced}>Source</button
      >
      <button
        class="bg-[var(--copper)] px-4 py-[10px] font-mono text-[10px] font-medium uppercase tracking-[.12em] text-white hover:bg-[var(--copper-dark)] disabled:opacity-50"
        type="button"
        on:click={generate}
        disabled={!controllerReady || state.status === 'loading'}>Generate CV</button
      >
    </div>
  </header>
  <nav
    class="hidden grid-cols-2 border-b border-[var(--rule)] bg-[#eee7dc] max-[900px]:grid"
    aria-label="Workspace view"
  >
    <button
      type="button"
      aria-pressed={mobilePane === 'form'}
      class:active-tab={mobilePane === 'form'}
      on:click={() => (mobilePane = 'form')}>Form</button
    >
    <button
      type="button"
      aria-pressed={mobilePane === 'preview'}
      class:active-tab={mobilePane === 'preview'}
      on:click={() => (mobilePane = 'preview')}>Preview</button
    >
  </nav>

  <div class="grid min-h-0 grid-cols-[minmax(520px,56%)_minmax(360px,44%)] max-[900px]:block">
    <section
      class={`grid min-h-0 grid-cols-[185px_minmax(0,1fr)] border-r border-[var(--rule)] bg-[rgba(246,241,233,.94)] max-[900px]:h-full max-[900px]:grid-cols-1 ${mobilePane !== 'form' ? 'max-[900px]:hidden' : ''}`}
      aria-label="CV form builder"
    >
      <nav
        class="border-r border-[var(--rule)] bg-[rgba(232,224,212,.55)] px-4 py-8 max-[900px]:hidden"
        aria-label="CV sections"
      >
        <p class="mb-5 px-2 font-mono text-[9px] uppercase tracking-[.16em] text-[#8a7769]">
          Dossier / 01—07
        </p>
        {#each SECTION_ORDER as section, index}
          <button
            type="button"
            on:click={() => (activeSection = section)}
            aria-current={activeSection === section ? 'step' : undefined}
            class="mb-1 flex w-full items-center justify-between border-l-2 px-3 py-3 text-left text-[16px] transition-colors"
            class:border-[var(--copper)]={activeSection === section}
            class:border-transparent={activeSection !== section}
            class:bg-[rgba(255,255,255,.45)]={activeSection === section}
          >
            <span>{labels[section]}</span><span class="font-mono text-[8px] text-[#8c7a6e]"
              >{sectionErrors(section)
                ? `!${sectionErrors(section)}`
                : String(index + 1).padStart(2, '0')}</span
            >
          </button>
        {/each}
      </nav>

      <div
        class="builder-scroll min-h-0 overflow-y-auto px-[clamp(24px,4vw,58px)] py-9"
        on:input={changed}
      >
        <div class="mx-auto max-w-[720px]">
          <p class="mb-2 font-mono text-[9px] uppercase tracking-[.17em] text-[var(--copper)]">
            Section {String(sectionIndex + 1).padStart(2, '0')} / 07
          </p>
          <h2
            class="mb-1 mt-0 text-[clamp(34px,4vw,48px)] font-medium leading-none tracking-[-.03em]"
          >
            {labels[activeSection]}
          </h2>
          <p class="mb-9 mt-2 text-[17px] italic text-[#776a60]">{descriptions[activeSection]}</p>
          {#if errors.length}
            <p
              class="mb-4 font-mono text-[9px] uppercase tracking-[.08em] text-[#923b2d]"
              role="alert"
            >
              {errors[0].message}
            </p>
          {/if}
          {#if notice}<p
              class="mb-7 border-l-2 border-[var(--copper)] bg-[#efe5d9] px-4 py-3 text-[14px]"
              role="status"
            >
              {notice}
            </p>{/if}

          {#if activeSection === 'summary'}
            <div class="grid grid-cols-2 gap-x-7 gap-y-6 max-[560px]:grid-cols-1">
              <label class="col-span-2 max-[560px]:col-span-1"
                ><span>Full name <b aria-hidden="true">*</b></span><input
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
                    : undefined}
                />{#if fieldError('identity.fullName')}<small
                    class="field-error"
                    id="identity-full-name-error">{fieldError('identity.fullName')}</small
                  >{/if}</label
              >
              <label
                ><span>Professional titles</span><input
                  class={inputClass}
                  bind:value={data.identity.professionalTitles}
                  placeholder="Design engineer · Researcher"
                /></label
              >
              <label
                ><span>Location</span><input
                  class={inputClass}
                  bind:value={data.identity.location}
                  autocomplete="address-level2"
                  placeholder="London, UK"
                /></label
              >
              <label
                ><span>Email</span><input
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
                    : undefined}
                />{#if fieldError('identity.email')}<small
                    class="field-error"
                    id="identity-email-error">{fieldError('identity.email')}</small
                  >{/if}</label
              >
              <label
                ><span>Phone</span><input
                  class={inputClass}
                  bind:value={data.identity.phone}
                  autocomplete="tel"
                  placeholder="+44 20 0000 0000"
                /></label
              >
              <label class="col-span-2 max-[560px]:col-span-1"
                ><span>Professional summary</span><textarea
                  class={textareaClass}
                  bind:value={data.summary}
                  placeholder="A concise account of the work you do and the value you create."
                ></textarea></label
              >
            </div>
            <div class="mt-9 border-t border-[var(--rule)] pt-6">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="m-0 text-xl">Profile links</h3>
                <button class="text-button" type="button" on:click={addProfile}>+ Add link</button>
              </div>
              {#each data.identity.profiles as profile, profileIndex (profile.id)}<div
                  class="entry-card grid grid-cols-[130px_1fr_1.5fr_auto] gap-3 max-[620px]:grid-cols-1"
                >
                  <label
                    ><span>Type</span><select
                      class={inputClass}
                      data-path={`profiles.${profile.id}.type`}
                      bind:value={profile.type}
                      ><option value="website">Website</option><option value="linkedin"
                        >LinkedIn</option
                      ><option value="github">GitHub</option><option value="portfolio"
                        >Portfolio</option
                      ><option value="x">X</option><option value="other">Other</option></select
                    ></label
                  ><label
                    ><span>Label</span><input
                      class={inputClass}
                      bind:value={profile.label}
                      placeholder="Portfolio"
                    /></label
                  ><label
                    ><span>URL</span><input
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
                        : undefined}
                    />{#if fieldError(`profiles.${profile.id}.url`)}<small
                        class="field-error"
                        id={`profile-${profile.id}-url-error`}
                        >{fieldError(`profiles.${profile.id}.url`)}</small
                      >{/if}</label
                  >
                  <div class="flex items-center">
                    <button
                      class="text-button"
                      type="button"
                      aria-label="Move profile link up"
                      disabled={profileIndex === 0}
                      on:click={() => moveProfile(profileIndex, -1)}>↑</button
                    >
                    <button
                      class="text-button"
                      type="button"
                      aria-label="Move profile link down"
                      disabled={profileIndex === data.identity.profiles.length - 1}
                      on:click={() => moveProfile(profileIndex, 1)}>↓</button
                    >
                    <button
                      class="remove-button"
                      type="button"
                      aria-label="Remove profile link"
                      on:click={() => removeProfile(profile.id)}>×</button
                    >
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
                  onRemove={() => remove('experience', entry.id)}
                />
                <div class="form-grid">
                  <Field
                    label="Role"
                    required
                    path={`experience.${entry.id}.role`}
                    error={fieldError(`experience.${entry.id}.role`)}
                    bind:value={entry.role}
                  /><Field
                    label="Organization"
                    required
                    path={`experience.${entry.id}.organization`}
                    error={fieldError(`experience.${entry.id}.organization`)}
                    bind:value={entry.organization}
                  /><Field label="Location" bind:value={entry.location} /><Field
                    label="Start date"
                    bind:value={entry.start}
                  /><Field label="End date" bind:value={entry.end} disabled={entry.current} /><label
                    class="check"
                    ><input type="checkbox" bind:checked={entry.current} /> Current role</label
                  ><Field wide multiline label="Description" bind:value={entry.description} /><Field
                    wide
                    multiline
                    label="Highlights (one per line)"
                    bind:value={entry.highlights}
                  /><Field wide label="Tools" bind:value={entry.tools} />
                </div>
              </article>{/each}<AddButton label="experience" onAdd={() => add('experience')} />
          {:else if activeSection === 'achievements'}
            {#each data.achievements as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.title || 'New achievement'}
                  {index}
                  total={data.achievements.length}
                  onMove={(d) => move('achievements', index, d)}
                  onRemove={() => remove('achievements', entry.id)}
                />
                <div class="form-grid">
                  <Field
                    label="Title"
                    required
                    path={`achievements.${entry.id}.title`}
                    error={fieldError(`achievements.${entry.id}.title`)}
                    bind:value={entry.title}
                  /><Field label="Category" bind:value={entry.category} /><Field
                    label="Date"
                    bind:value={entry.date}
                  /><Field
                    wide
                    multiline
                    label="Description"
                    required
                    path={`achievements.${entry.id}.description`}
                    error={fieldError(`achievements.${entry.id}.description`)}
                    bind:value={entry.description}
                  />
                </div>
              </article>{/each}<AddButton label="achievement" onAdd={() => add('achievements')} />
          {:else if activeSection === 'skills'}
            {#each data.skills as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.category || 'New skill category'}
                  {index}
                  total={data.skills.length}
                  onMove={(d) => move('skills', index, d)}
                  onRemove={() => remove('skills', entry.id)}
                />
                <div class="form-grid">
                  <Field
                    label="Category"
                    required
                    path={`skills.${entry.id}.category`}
                    error={fieldError(`skills.${entry.id}.category`)}
                    bind:value={entry.category}
                  /><Field
                    label="Skills"
                    required
                    path={`skills.${entry.id}.skills`}
                    error={fieldError(`skills.${entry.id}.skills`)}
                    bind:value={entry.skills}
                  />
                </div>
              </article>{/each}<AddButton label="skill category" onAdd={() => add('skills')} />
          {:else if activeSection === 'education'}
            {#each data.education as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.qualification || 'New education'}
                  {index}
                  total={data.education.length}
                  onMove={(d) => move('education', index, d)}
                  onRemove={() => remove('education', entry.id)}
                />
                <div class="form-grid">
                  <Field
                    label="Institution"
                    required
                    path={`education.${entry.id}.institution`}
                    error={fieldError(`education.${entry.id}.institution`)}
                    bind:value={entry.institution}
                  /><Field
                    label="Qualification"
                    required
                    path={`education.${entry.id}.qualification`}
                    error={fieldError(`education.${entry.id}.qualification`)}
                    bind:value={entry.qualification}
                  /><Field label="Location" bind:value={entry.location} /><Field
                    label="Start date"
                    bind:value={entry.start}
                  /><Field label="End date" bind:value={entry.end} /><Field
                    label="GPA"
                    bind:value={entry.gpa}
                  />
                </div>
              </article>{/each}<AddButton label="education" onAdd={() => add('education')} />
          {:else if activeSection === 'certificates'}
            {#each data.certificates as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.name || 'New certificate'}
                  {index}
                  total={data.certificates.length}
                  onMove={(d) => move('certificates', index, d)}
                  onRemove={() => remove('certificates', entry.id)}
                />
                <div class="form-grid">
                  <Field
                    label="Certificate"
                    required
                    path={`certificates.${entry.id}.name`}
                    error={fieldError(`certificates.${entry.id}.name`)}
                    bind:value={entry.name}
                  /><Field
                    label="Issuer"
                    required
                    path={`certificates.${entry.id}.issuer`}
                    error={fieldError(`certificates.${entry.id}.issuer`)}
                    bind:value={entry.issuer}
                  /><Field label="Date" bind:value={entry.date} /><Field
                    label="Credential URL"
                    type="url"
                    path={`certificates.${entry.id}.credentialUrl`}
                    error={fieldError(`certificates.${entry.id}.credentialUrl`)}
                    bind:value={entry.credentialUrl}
                  />
                </div>
              </article>{/each}<AddButton label="certificate" onAdd={() => add('certificates')} />
          {:else if activeSection === 'projects'}
            {#each data.projects as entry, index (entry.id)}<article class="entry-card">
                <EntryHead
                  title={entry.name || 'New project'}
                  {index}
                  total={data.projects.length}
                  onMove={(d) => move('projects', index, d)}
                  onRemove={() => remove('projects', entry.id)}
                />
                <div class="form-grid">
                  <Field
                    label="Project name"
                    required
                    path={`projects.${entry.id}.name`}
                    error={fieldError(`projects.${entry.id}.name`)}
                    bind:value={entry.name}
                  /><Field label="Role" bind:value={entry.role} /><Field
                    label="Dates"
                    bind:value={entry.dates}
                  /><Field
                    label="URL"
                    type="url"
                    path={`projects.${entry.id}.url`}
                    error={fieldError(`projects.${entry.id}.url`)}
                    bind:value={entry.url}
                  /><Field
                    wide
                    multiline
                    label="Description"
                    path={`projects.${entry.id}.description`}
                    required
                    error={fieldError(`projects.${entry.id}.description`)}
                    bind:value={entry.description}
                  /><Field
                    wide
                    multiline
                    label="Highlights (one per line)"
                    bind:value={entry.highlights}
                  /><Field wide label="Tools" bind:value={entry.tools} />
                </div>
              </article>{/each}<AddButton label="project" onAdd={() => add('projects')} />
          {/if}

          <footer
            class="mt-10 flex items-center justify-between border-t border-[var(--rule)] pt-5"
          >
            <button
              class="text-button"
              type="button"
              on:click={() => go(-1)}
              disabled={sectionIndex === 0}>← Previous</button
            ><span class="font-mono text-[9px] text-[#88796d]"
              >{sectionIndex + 1} / {SECTION_ORDER.length}</span
            ><button
              class="text-button"
              type="button"
              on:click={() => go(1)}
              disabled={sectionIndex === SECTION_ORDER.length - 1}>Next →</button
            >
          </footer>
        </div>
      </div>
    </section>

    <section
      class={`relative flex min-h-0 flex-col bg-[#c5bbae] max-[900px]:h-full ${mobilePane !== 'preview' ? 'max-[900px]:hidden' : ''}`}
      aria-label="Rendered preview"
    >
      {#if advanced}
        <div class="flex h-full min-h-0 flex-col bg-[#28231f] text-[#f0e8dc]">
          <div class="flex items-center justify-between border-b border-[#554a42] px-5 py-4">
            <div>
              <p class="m-0 font-mono text-[9px] uppercase tracking-[.15em] text-[#cf8a6b]">
                Advanced / generated
              </p>
              <h2 class="m-0 text-2xl">LaTeX source</h2>
            </div>
            <div class="flex gap-2">
              <button
                class="source-action"
                type="button"
                on:click={copySource}
                disabled={!lastGeneratedSource}>Copy</button
              ><button
                class="source-action"
                type="button"
                on:click={downloadText}
                disabled={!lastGeneratedSource}>Download .tex</button
              >
            </div>
          </div>
          <pre
            class="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-6 font-mono text-[11px] leading-[1.65]">{lastGeneratedSource ||
              'Generate your CV to inspect its exact LaTeX source.'}</pre>
        </div>
      {:else}
        <div
          class="flex items-center justify-between border-b border-[var(--rule)] bg-[rgba(238,231,220,.62)] px-5 py-3"
        >
          <div>
            <p class="m-0 font-mono text-[8px] uppercase tracking-[.15em] text-[#765443]">
              Output / proof
            </p>
            <span class="text-xl">Preview</span>
          </div>
          <div class="flex items-center gap-2">
            {#if state.lastSuccess && (dirty || state.status === 'failure')}<span
                class="border border-[#a77560] bg-[rgba(247,237,226,0.5)] px-2 py-[5px] font-mono text-[8px] font-medium uppercase leading-none tracking-[0.1em] text-[#81513d]"
                >Last successful proof</span
              >{/if}
            {#if state.lastSuccess?.representation === 'pdf'}<button
                class="text-button"
                type="button"
                on:click={downloadPdf}>Download PDF</button
              >{/if}
          </div>
        </div>
        <div class="min-h-0 flex-1">
          <PreviewPane
            {state}
            onDiagnosticSelect={() => {
              advanced = true;
            }}
          />
        </div>
      {/if}
    </section>
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
  :global(label > span),
  :global(.form-label) {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #75675d;
  }
  :global(.field-error) {
    display: block;
    margin-top: 5px;
    color: #9c352a;
    font-family: 'DM Mono', monospace;
    font-size: 9px;
  }
  :global(.entry-card) {
    margin-bottom: 18px;
    padding: 20px;
    border: 1px solid var(--rule);
    background: rgba(255, 255, 255, 0.35);
    box-shadow: 0 8px 22px rgba(60, 45, 35, 0.04);
  }
  :global(.form-grid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 26px;
  }
  :global(.text-button),
  :global(.source-action) {
    border: 0;
    background: transparent;
    padding: 7px 9px;
    color: var(--copper-dark);
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
  }
  :global(.text-button:disabled),
  :global(.source-action:disabled) {
    opacity: 0.35;
    cursor: default;
  }
  :global(.remove-button) {
    align-self: center;
    border: 0;
    background: transparent;
    color: #8c4e38;
    font-size: 25px;
    cursor: pointer;
  }
  :global(.source-action) {
    border: 1px solid #75665d;
    color: #f0e8dc;
  }
  :global(.check) {
    align-self: end;
    padding: 10px 0;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
  }
  .active-tab {
    border-bottom: 2px solid var(--copper);
    color: var(--copper-dark);
  }
  nav button {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  @media (max-width: 620px) {
    :global(.form-grid) {
      grid-template-columns: 1fr;
    }
  }
</style>
