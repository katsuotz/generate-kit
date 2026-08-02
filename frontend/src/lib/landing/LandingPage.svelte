<script lang="ts">
  import { page } from '$app/stores';

  const pageTitle = 'Marginalia — Build the CV. See the proof.';
  const pageDescription =
    'Turn structured career facts into an exact LaTeX source file and a rendered CV proof.';
  const socialImagePath = '/templates/editorial-v1.webp';

  const templates = [
    {
      id: 'editorial-v1',
      name: 'Editorial dossier',
      description: 'A quiet, structured page for thoughtful work.',
      image: '/templates/editorial-v1.webp'
    },
    {
      id: 'compact-v1',
      name: 'Compact signal',
      description: 'A denser layout for broad experience.',
      image: '/templates/compact-v1.webp'
    },
    {
      id: 'modern-v1',
      name: 'Modern hierarchy',
      description: 'A contemporary layout with a stronger accent.',
      image: '/templates/modern-v1.webp'
    }
  ];

  $: siteOrigin = $page.url.origin;
  $: canonicalUrl = `${siteOrigin}/`;
  $: socialImageUrl = `${siteOrigin}${socialImagePath}`;
  $: structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Marginalia',
    url: canonicalUrl,
    description: pageDescription,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    featureList: ['Structured CV editing', 'Exact LaTeX source', 'Rendered PDF proof']
  };
  $: structuredDataMarkup = `<script type="application/ld+json">${JSON.stringify(structuredData)}\u003c/script>`;
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta name="author" content="Marginalia" />
  <meta
    name="robots"
    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta
    name="googlebot"
    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="application-name" content="Marginalia" />
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Marginalia" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={socialImageUrl} />
  <meta property="og:image:secure_url" content={socialImageUrl} />
  <meta property="og:image:type" content="image/webp" />
  <meta property="og:image:width" content="1020" />
  <meta property="og:image:height" content="1320" />
  <meta property="og:image:alt" content="Editorial CV template preview from Marginalia" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={pageDescription} />
  <meta name="twitter:image" content={socialImageUrl} />
  <meta name="twitter:image:alt" content="Editorial CV template preview from Marginalia" />
  {@html structuredDataMarkup}
  {#each templates as template}
    <link rel="preload" as="image" href={template.image} />
  {/each}
</svelte:head>

<!--
  THESIS: Marginalia is the CV builder that keeps the proof in view, refusing the usual promise-first landing page.
  OWN-WORLD: A cool-gray proofing desk, white paper surfaces, graphite ink, and one blue thread marking verified state.
  STORY: Visitors see facts become source become a rendered document, then open the builder to make their own.
  FIRST VIEWPORT: Branding and a compact navigation sit above a split hero: direct copy on the left, the annotated proof desk on the right.
  FORM: Grounded technical proof desk, structure 5, staging the mechanism as a connected three-stage work surface; seed 00ebc3ea.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->
<main class="landing">
  <div class="proof-thread" aria-hidden="true"></div>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Marginalia home">
      <span class="brand-mark">M</span>
      <span class="brand-name">Marginalia</span>
    </a>
    <nav class="site-nav" aria-label="Main navigation">
      <a href="#how-it-works">How it works</a>
      <a href="#templates">Templates</a>
      <a class="button button-primary" href="/app">
        Open builder <span aria-hidden="true">↗</span>
      </a>
    </nav>
  </header>

  <section class="hero section-frame" aria-labelledby="hero-title">
    <div class="hero-copy">
      <p class="eyebrow">
        <span class="eyebrow-dot" aria-hidden="true"></span>
        Structured CV → rendered proof
      </p>
      <h1 id="hero-title">
        Build the CV.
        <br />
        <span>See the proof.</span>
      </h1>
      <p class="hero-lede">
        Marginalia turns the messy middle of making a CV into a clear, inspectable desk: shape your
        facts, check the exact source, and leave with a document you can trust.
      </p>
      <div class="hero-actions">
        <a class="button button-primary button-large" href="/app">
          Start building <span aria-hidden="true">→</span>
        </a>
        <a class="text-link" href="#templates">
          See the templates <span aria-hidden="true">↓</span>
        </a>
      </div>
      <p class="hero-note">
        <span class="note-rule" aria-hidden="true"></span>
        No account required to start.
      </p>
    </div>

    <div class="desk-wrap">
      <div class="desk-label desk-label-top">
        <span>Proof desk / 01</span>
        <span>Live system</span>
      </div>
      <div
        class="proof-desk"
        role="img"
        aria-label="A CV moving from structured facts to exact LaTeX source to a rendered PDF proof">
        <div class="desk-stage facts-stage">
          <div class="stage-heading">
            <span class="stage-index">01</span>
            <strong>Structured facts</strong>
          </div>
          <div class="fact-list">
            <div class="fact-row">
              <span class="fact-key">name</span>
              <span>Ada Lovelace</span>
            </div>
            <div class="fact-row">
              <span class="fact-key">role</span>
              <span>Mathematical poet</span>
            </div>
            <div class="fact-row">
              <span class="fact-key">work</span>
              <span>Analytical engine</span>
            </div>
          </div>
          <div class="stage-status">
            <span class="status-dot" aria-hidden="true"></span>
            Ready to shape
          </div>
        </div>
        <div class="desk-connector" aria-hidden="true">
          <span></span>
          <b>→</b>
        </div>
        <div class="desk-stage source-stage">
          <div class="stage-heading">
            <span class="stage-index">02</span>
            <strong>Exact LaTeX</strong>
          </div>
          <pre aria-hidden="true"><code><span>\section</span>&#123;Summary&#125;
<i>A precise account of</i>
<i>the work you do.</i>

<span>\entry</span>&#123;Experience&#125;
  &#123;Analytical Engine&#125;</code></pre>
          <div class="source-meta">
            <span>XeLaTeX</span>
            <span>source.tex</span>
          </div>
        </div>
        <div class="desk-connector" aria-hidden="true">
          <span></span>
          <b>→</b>
        </div>
        <div class="desk-stage pdf-stage">
          <div class="stage-heading">
            <span class="stage-index">03</span>
            <strong>Rendered PDF</strong>
          </div>
          <div class="mini-paper">
            <div class="mini-paper-heading">
              <span></span>
              <span></span>
            </div>
            <div class="mini-paper-title"></div>
            <div class="mini-paper-columns">
              <div>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div>
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
          </div>
          <div class="stage-status proof-ready">
            <span class="status-dot" aria-hidden="true"></span>
            Proof ready
          </div>
        </div>
        <span class="desk-pin pin-one" aria-hidden="true"></span>
        <span class="desk-pin pin-two" aria-hidden="true"></span>
      </div>
      <div class="desk-label desk-label-bottom">
        <span>From intake to evidence</span>
        <span>01—03</span>
      </div>
    </div>
  </section>

  <section id="templates" class="templates section-frame" aria-labelledby="templates-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">
          <span class="eyebrow-dot" aria-hidden="true"></span>
          Choose your starting point
        </p>
        <h2 id="templates-title">
          Three templates.
          <br />
          <span>One honest output.</span>
        </h2>
      </div>
      <p>
        Each template is a real, compile-ready layout. Start with the one that fits your story and
        switch before you generate again.
      </p>
    </div>
    <div class="template-grid">
      {#each templates as template, index}
        <article class:template-featured={index === 0} class="template-card">
          <div class="template-image-wrap">
            <img
              src={template.image}
              alt={`${template.name} CV template preview`}
              width="612"
              height="792"
              loading="eager"
              fetchpriority="high"
              decoding="async" />
            <span class="template-index">0{index + 1}</span>
          </div>
          <div class="template-card-copy">
            <div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
            </div>
            <span class="template-arrow" aria-hidden="true">↗</span>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section id="how-it-works" class="workflow section-frame" aria-labelledby="workflow-title">
    <div class="workflow-intro">
      <p class="eyebrow">
        <span class="eyebrow-dot" aria-hidden="true"></span>
        The workflow
      </p>
      <h2 id="workflow-title">
        A clearer path
        <br />
        <span>to finished.</span>
      </h2>
    </div>
    <ol class="workflow-list">
      <li>
        <div class="workflow-marker" aria-hidden="true">01</div>
        <div>
          <h3>Collect the signal</h3>
          <p>
            Fill in the facts that matter, section by section. Your work stays editable and close at
            hand.
          </p>
        </div>
      </li>
      <li>
        <div class="workflow-marker" aria-hidden="true">02</div>
        <div>
          <h3>Inspect the source</h3>
          <p>
            Generate exact XeLaTeX, keep the source visible, and see compiler notes when something
            needs attention.
          </p>
        </div>
      </li>
      <li>
        <div class="workflow-marker" aria-hidden="true">03</div>
        <div>
          <h3>Take the proof</h3>
          <p>Review the rendered pages, then download the PDF and the source that produced it.</p>
        </div>
      </li>
    </ol>
  </section>

  <section class="final-cta section-frame" aria-labelledby="cta-title">
    <div class="cta-copy">
      <p class="eyebrow">
        <span class="eyebrow-dot" aria-hidden="true"></span>
        Ready when you are
      </p>
      <h2 id="cta-title">
        Make the next draft
        <br />
        <span>the one you can prove.</span>
      </h2>
    </div>
    <a class="button button-light button-large" href="/app">
      Start building <span aria-hidden="true">→</span>
    </a>
  </section>

  <footer class="site-footer section-frame">
    <a class="brand footer-brand" href="/" aria-label="Marginalia home">
      <span class="brand-mark">M</span>
      <span class="brand-name">Marginalia</span>
    </a>
    <p>Structured facts. Exact source. Rendered proof.</p>
  </footer>
</main>

<style>
  :global(html:has(.landing)),
  :global(body:has(.landing)) {
    background: var(--canvas);
  }

  :global(body:has(.landing)) {
    overflow: auto;
  }

  .landing {
    position: relative;
    overflow: hidden;
    color: var(--ink);
  }

  .proof-thread {
    position: absolute;
    z-index: 0;
    top: 415px;
    bottom: 175px;
    left: max(22px, calc((100vw - 1180px) / 2));
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent,
      var(--rule-strong) 9%,
      var(--rule-strong) 91%,
      transparent
    );
    opacity: 0.75;
  }

  .section-frame,
  .site-header {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 64px));
    margin: 0 auto;
  }

  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 88px;
    border-bottom: 1px solid var(--rule);
  }

  .brand,
  .site-nav,
  .hero-actions,
  .template-card-copy,
  .stage-heading,
  .stage-status,
  .desk-label,
  .source-meta,
  .site-footer {
    display: flex;
    align-items: center;
  }

  .brand {
    gap: 10px;
    color: var(--ink);
    text-decoration: none;
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

  .brand-name {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  .site-nav {
    gap: 28px;
  }

  .site-nav a:not(.button),
  .text-link {
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .site-nav a:not(.button):hover,
  .text-link:hover {
    color: var(--blue-dark);
  }

  .button {
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 0 16px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease,
      transform 180ms ease;
  }

  .button:hover {
    transform: translateY(-1px);
  }

  .button-primary {
    background: var(--blue);
    color: #fff;
  }

  .button-primary:hover {
    background: var(--blue-dark);
  }

  .button-light {
    background: var(--surface);
    color: var(--blue-dark);
  }

  .button-light:hover {
    background: var(--blue-soft);
  }

  .button-large {
    min-height: 48px;
    padding: 0 21px;
  }

  .hero {
    display: grid;
    min-height: 665px;
    grid-template-columns: minmax(310px, 0.84fr) minmax(0, 1.16fr);
    align-items: center;
    gap: clamp(40px, 7vw, 100px);
    padding-top: 72px;
    padding-bottom: 88px;
  }

  .hero-copy {
    max-width: 510px;
    padding-left: 36px;
  }

  .eyebrow,
  .desk-label,
  .stage-index,
  .template-index,
  .workflow-marker,
  .source-meta {
    color: var(--quiet-ink);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    line-height: 1.3;
    text-transform: uppercase;
  }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 22px;
  }

  .eyebrow-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--blue);
  }

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1,
  h2 {
    margin-bottom: 0;
    letter-spacing: -0.055em;
  }

  h1 {
    max-width: 560px;
    font-size: clamp(54px, 7vw, 94px);
    font-weight: 700;
    line-height: 0.93;
  }

  h1 span,
  h2 span {
    color: var(--blue);
  }

  .hero-lede {
    max-width: 47ch;
    margin: 28px 0 30px;
    color: var(--muted-ink);
    font-size: 16px;
    line-height: 1.65;
  }

  .hero-actions {
    flex-wrap: wrap;
    gap: 22px;
  }

  .text-link {
    display: inline-flex;
    gap: 9px;
    color: var(--blue-dark);
  }

  .hero-note {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 34px 0 0;
    color: var(--quiet-ink);
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .note-rule {
    width: 21px;
    height: 1px;
    background: var(--rule-strong);
  }

  .desk-wrap {
    position: relative;
    width: 100%;
    max-width: 650px;
    justify-self: end;
  }

  .desk-label {
    justify-content: space-between;
    padding: 0 2px 11px;
    border-bottom: 1px solid var(--rule-strong);
  }

  .desk-label-bottom {
    padding-top: 11px;
    padding-bottom: 0;
    border-top: 1px solid var(--rule-strong);
    border-bottom: 0;
  }

  .proof-desk {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 27px 1fr 27px 1fr;
    gap: 8px;
    align-items: stretch;
    padding: 24px 0;
  }

  .desk-stage {
    position: relative;
    display: grid;
    min-height: 310px;
    grid-template-rows: auto 1fr auto;
    gap: 22px;
    overflow: hidden;
    border: 1px solid var(--rule-strong);
    padding: 18px;
    background: var(--surface);
    box-shadow: 9px 9px 0 rgb(216 224 231 / 52%);
  }

  .source-stage {
    border-color: #99b7de;
    background: #f6f9fd;
    box-shadow: 9px 9px 0 rgb(151 181 222 / 38%);
  }

  .pdf-stage {
    background: #fbfcfd;
  }

  .stage-heading {
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 12px;
  }

  .stage-heading strong {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .stage-index {
    color: var(--blue);
    font-size: 9px;
  }

  .fact-list {
    align-self: center;
  }

  .fact-row {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 8px;
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
    font-size: 11px;
  }

  .fact-row:last-child {
    border-bottom: 0;
  }

  .fact-key {
    color: var(--quiet-ink);
    font-family: var(--mono);
    font-size: 9px;
    text-transform: uppercase;
  }

  .stage-status {
    gap: 7px;
    color: var(--quiet-ink);
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--blue);
  }

  .proof-ready .status-dot {
    background: var(--success);
  }

  .source-stage pre {
    align-self: center;
    margin: 0;
    color: #36495d;
    font-family: var(--mono);
    font-size: 9px;
    line-height: 1.8;
    white-space: pre-wrap;
  }

  .source-stage code span {
    color: var(--blue-dark);
  }

  .source-stage code i {
    color: var(--muted-ink);
    font-style: normal;
  }

  .source-meta {
    justify-content: space-between;
    color: var(--quiet-ink);
    font-size: 8px;
  }

  .mini-paper {
    display: grid;
    align-self: center;
    width: 82%;
    aspect-ratio: 0.77;
    margin: 0 auto;
    gap: 13px;
    border: 1px solid var(--rule);
    padding: 18px 13px;
    background: var(--surface);
    box-shadow: 0 9px 16px rgb(23 33 43 / 12%);
  }

  .mini-paper-heading {
    display: flex;
    justify-content: space-between;
  }

  .mini-paper-heading span:first-child {
    width: 35%;
    height: 4px;
    background: var(--ink);
  }

  .mini-paper-heading span:last-child {
    width: 22%;
    height: 3px;
    background: var(--rule-strong);
  }

  .mini-paper-title {
    width: 70%;
    height: 15px;
    background: var(--blue);
  }

  .mini-paper-columns {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 11px;
  }

  .mini-paper-columns div {
    display: grid;
    align-content: start;
    gap: 7px;
  }

  .mini-paper-columns i {
    display: block;
    height: 3px;
    background: var(--rule);
  }

  .mini-paper-columns div:first-child i:first-child {
    width: 92%;
    background: var(--ink);
  }

  .mini-paper-columns div:last-child i:first-child {
    width: 64%;
    background: var(--blue);
  }

  .desk-connector {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 7px;
    color: var(--blue);
  }

  .desk-connector span {
    width: 1px;
    height: 76px;
    background: var(--blue);
    opacity: 0.55;
  }

  .desk-connector b {
    font-size: 17px;
    font-weight: 400;
  }

  .desk-pin {
    position: absolute;
    width: 8px;
    height: 8px;
    border: 1px solid var(--blue);
    border-radius: 50%;
    background: var(--canvas);
  }

  .pin-one {
    top: 16px;
    left: 23%;
  }

  .pin-two {
    right: 13%;
    bottom: 16px;
  }

  .templates {
    padding-top: 76px;
    padding-bottom: 132px;
  }

  .section-heading {
    display: grid;
    grid-template-columns: 1fr 0.66fr;
    align-items: end;
    gap: 48px;
    padding-left: 36px;
  }

  .section-heading p:last-child {
    max-width: 38ch;
    margin: 0 0 4px;
    color: var(--muted-ink);
    font-size: 14px;
    line-height: 1.6;
  }

  h2 {
    font-size: clamp(42px, 5vw, 68px);
    font-weight: 700;
    line-height: 0.97;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-top: 52px;
  }

  .template-card {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .template-image-wrap {
    position: relative;
    display: grid;
    min-height: 360px;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--rule-strong);
    padding: 22px;
    background: #e1e7ed;
    transition:
      border-color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .template-card:hover .template-image-wrap {
    border-color: var(--blue);
    box-shadow: 7px 7px 0 rgb(151 181 222 / 35%);
    transform: translateY(-3px);
  }

  .template-image-wrap img {
    display: block;
    width: min(100%, 248px);
    height: auto;
    border: 1px solid rgb(23 33 43 / 10%);
    box-shadow: 0 12px 18px rgb(23 33 43 / 14%);
  }

  .template-index {
    position: absolute;
    top: 16px;
    left: 16px;
    color: var(--blue-dark);
  }

  .template-card-copy {
    justify-content: space-between;
    gap: 16px;
    border-top: 1px solid var(--rule-strong);
    padding-top: 14px;
  }

  .template-card-copy h3,
  .workflow-list h3 {
    margin: 0 0 5px;
    font-size: 17px;
    letter-spacing: -0.025em;
  }

  .template-card-copy p,
  .workflow-list p {
    max-width: 28ch;
    margin: 0;
    color: var(--muted-ink);
    font-size: 12px;
    line-height: 1.5;
  }

  .template-arrow {
    align-self: flex-start;
    color: var(--blue);
    font-size: 24px;
    line-height: 1;
  }

  .workflow {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: clamp(50px, 11vw, 170px);
    padding-bottom: 132px;
    padding-left: 36px;
  }

  .workflow-intro h2 {
    margin-top: 10px;
  }

  .workflow-list {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .workflow-list li {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 21px;
    padding: 0 0 27px;
  }

  .workflow-list li + li {
    padding-top: 27px;
    border-top: 1px solid var(--rule-strong);
  }

  .workflow-marker {
    color: var(--blue);
    line-height: 1.6;
  }

  .workflow-list h3 {
    font-size: 19px;
  }

  .workflow-list p {
    max-width: 49ch;
    font-size: 13px;
  }

  .final-cta {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 32px;
    padding: 60px 64px;
    background: var(--blue);
    color: #fff;
  }

  .final-cta .eyebrow {
    color: #fff;
  }

  .final-cta .eyebrow-dot {
    background: #fff;
  }

  .final-cta h2 {
    color: #fff;
    font-size: clamp(39px, 5vw, 67px);
  }

  .final-cta h2 span {
    color: #dceaff;
  }

  .site-footer {
    justify-content: space-between;
    min-height: 112px;
    gap: 24px;
    padding-top: 25px;
    padding-bottom: 25px;
  }

  .footer-brand {
    flex-shrink: 0;
  }

  .site-footer p {
    margin: 0;
    color: var(--quiet-ink);
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.06em;
    text-align: right;
    text-transform: uppercase;
  }

  a:focus-visible {
    outline: 2px solid var(--blue);
    outline-offset: 4px;
  }

  @media (max-width: 940px) {
    .hero {
      grid-template-columns: 1fr;
      gap: 62px;
      padding-top: 70px;
    }

    .hero-copy {
      max-width: 640px;
    }

    .desk-wrap {
      max-width: none;
    }

    .workflow {
      gap: 60px;
    }
  }

  @media (max-width: 700px) {
    .section-frame,
    .site-header {
      width: min(100% - 32px, 560px);
    }

    .site-header {
      min-height: 72px;
    }

    .site-nav {
      gap: 13px;
    }

    .site-nav a:not(.button) {
      display: none;
    }

    .site-nav .button {
      min-height: 34px;
      padding: 0 11px;
      font-size: 9px;
    }

    .hero {
      min-height: 0;
      padding-top: 62px;
      padding-bottom: 78px;
    }

    .hero-copy,
    .section-heading,
    .workflow {
      padding-left: 22px;
    }

    h1 {
      font-size: clamp(48px, 14vw, 76px);
    }

    .hero-lede {
      font-size: 15px;
    }

    .proof-desk {
      grid-template-columns: 1fr;
      gap: 0;
      padding: 18px 0;
    }

    .desk-stage {
      min-height: 210px;
      gap: 16px;
      padding: 15px;
    }

    .desk-connector {
      grid-template-columns: 1fr auto 1fr;
      gap: 9px;
      min-height: 30px;
    }

    .desk-connector span {
      width: 100%;
      height: 1px;
    }

    .desk-connector b {
      font-size: 16px;
    }

    .pin-one {
      top: 9px;
      left: 8%;
    }

    .pin-two {
      right: 8%;
      bottom: 9px;
    }

    .templates {
      padding-top: 55px;
      padding-bottom: 94px;
    }

    .section-heading,
    .workflow {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    h2 {
      font-size: clamp(41px, 12vw, 60px);
    }

    .template-grid {
      grid-template-columns: 1fr;
      gap: 44px;
      margin-top: 40px;
    }

    .template-image-wrap {
      min-height: 420px;
    }

    .template-image-wrap img {
      width: min(70%, 260px);
    }

    .workflow {
      padding-bottom: 94px;
    }

    .final-cta {
      width: calc(100% - 32px);
      align-items: flex-start;
      flex-direction: column;
      padding: 42px 28px;
    }

    .site-footer {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      min-height: 132px;
    }

    .site-footer p {
      text-align: left;
    }

    .proof-thread {
      top: 335px;
      bottom: 214px;
      left: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .button,
    .template-image-wrap {
      transition: none;
    }
  }
</style>
