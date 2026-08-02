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

<style>
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

  h1 {
    max-width: 560px;
    font-size: clamp(54px, 7vw, 94px);
    font-weight: 700;
    line-height: 0.93;
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
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .text-link:hover {
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
  }

  @media (max-width: 700px) {
    .hero {
      min-height: 0;
      padding-top: 62px;
      padding-bottom: 78px;
    }

    .hero-copy {
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
  }
</style>
