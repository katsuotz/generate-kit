<footer class="site-footer section-frame">
  <a class="brand footer-brand" href="/" aria-label="Marginalia home">
    <span class="brand-mark">M</span>
    <span class="brand-name">Marginalia</span>
  </a>
  <p>Structured facts. Exact source. Rendered proof.</p>
</footer>

<style>
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

  @media (max-width: 700px) {
    .site-footer {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      min-height: 132px;
    }

    .site-footer p {
      text-align: left;
    }
  }
</style>
