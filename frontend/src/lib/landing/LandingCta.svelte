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

<style>
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

  @media (max-width: 700px) {
    .final-cta {
      width: calc(100% - 32px);
      align-items: flex-start;
      flex-direction: column;
      padding: 42px 28px;
    }
  }
</style>
