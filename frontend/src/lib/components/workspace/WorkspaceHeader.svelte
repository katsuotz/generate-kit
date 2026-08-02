<script lang="ts">
  import type { AuthUser } from '$lib/api';
  import { Button, TextField } from '../base';

  export let presentation: 'intake' | 'workspace';
  export let authUser: AuthUser | null;
  export let authOpen: boolean;
  export let authMode: 'login' | 'register';
  export let authEmail: string;
  export let authPassword: string;
  export let authName: string;
  export let authBusy: boolean;
  export let authNotice: string;
  export let proofStatus: 'idle' | 'loading' | 'success' | 'empty' | 'failure';
  export let dirty: boolean;
  export let hasGeneratedSource: boolean;
  export let advanced: boolean;
  export let rendering: boolean;
  export let controllerReady: boolean;
  export let onAuthMode: (mode: 'login' | 'register') => void;
  export let onAuthOpenChange: (open: boolean) => void;
  export let onEmailChange: (value: string) => void;
  export let onPasswordChange: (value: string) => void;
  export let onNameChange: (value: string) => void;
  export let onSubmitAuth: () => void;
  export let onLogout: () => void;
  export let onToggleAdvanced: () => void;
  export let onGenerate: () => void;

  $: statusLabel =
    proofStatus === 'loading'
      ? 'Setting proof'
      : dirty && hasGeneratedSource
        ? 'Proof outdated'
        : proofStatus === 'success'
          ? 'Proof ready'
          : 'Ready to start';
</script>

<header class="workspace-header">
  <div class="brand-lockup">
    <div class="brand-mark" aria-hidden="true">M</div>
    <div>
      <h1>Marginalia</h1>
      <p>{presentation === 'intake' ? 'CV builder' : 'Proof workspace'}</p>
    </div>
  </div>
  <div class="header-actions">
    <div class="account-controls">
      {#if authUser}
        <span class="account-label" title={authUser.email}>{authUser.email}</span>
        <Button variant="secondary" className="account-button" onClick={onLogout}>Log out</Button>
      {:else}
        <Button variant="secondary" className="account-button" onClick={() => onAuthMode('login')}>
          Log in
        </Button>
        <Button
          variant="secondary"
          className="account-button register-button"
          onClick={() => onAuthMode('register')}>
          Register
        </Button>
      {/if}
      {#if authOpen}
        <div
          class="account-panel"
          role="dialog"
          aria-label={authMode === 'login' ? 'Log in' : 'Create account'}>
          <div class="account-panel-heading">
            <div>
              <p class="panel-kicker">Optional account</p>
              <h2>{authMode === 'login' ? 'Welcome back' : 'Save your CV everywhere'}</h2>
            </div>
            <Button
              variant="text"
              className="close-button"
              aria-label="Close account form"
              onClick={() => onAuthOpenChange(false)}>
              ×
            </Button>
          </div>
          <p class="account-helper">Anonymous editing stays available without signing in.</p>
          <form on:submit|preventDefault={onSubmitAuth}>
            {#if authMode === 'register'}
              <TextField
                label="Name"
                value={authName}
                autocomplete="name"
                on:input={(event) => onNameChange((event.target as HTMLInputElement).value)} />
            {/if}
            <TextField
              label="Email"
              value={authEmail}
              type="email"
              autocomplete="email"
              required
              on:input={(event) => onEmailChange((event.target as HTMLInputElement).value)} />
            <TextField
              label="Password"
              value={authPassword}
              type="password"
              autocomplete={authMode === 'login' ? 'current-password' : 'new-password'}
              minlength="12"
              required
              on:input={(event) => onPasswordChange((event.target as HTMLInputElement).value)} />
            {#if authNotice}<p class="account-error" role="alert">{authNotice}</p>{/if}
            <Button variant="primary" className="account-submit" type="submit" disabled={authBusy}>
              {authBusy ? 'Working…' : authMode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>
          <Button
            variant="text"
            className="account-switch"
            onClick={() => onAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
          </Button>
        </div>
      {/if}
    </div>
    <span
      class="proof-status"
      class:is-loading={proofStatus === 'loading'}
      class:is-success={proofStatus === 'success' && !dirty}
      class:is-stale={dirty && hasGeneratedSource}
      class:is-failure={proofStatus === 'failure'}
      role="status">
      {statusLabel}
    </span>
    {#if presentation === 'workspace'}
      <Button
        variant="secondary"
        className="source-toggle"
        onClick={onToggleAdvanced}
        aria-pressed={advanced}>
        Source
      </Button>
    {/if}
    <Button
      variant="primary"
      className="generate-button"
      onClick={onGenerate}
      disabled={!controllerReady || rendering || proofStatus === 'loading'}>
      {rendering || proofStatus === 'loading' ? 'Generating…' : 'Generate CV'}
    </Button>
  </div>
</header>

<style>
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
  .account-controls {
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
  .brand-lockup p {
    margin: 0;
  }

  .brand-lockup h1 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .brand-lockup p,
  .panel-kicker,
  .proof-status,
  :global(label > span) {
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

  .account-controls {
    position: relative;
    gap: 7px;
  }

  :global(.account-button) {
    min-height: 32px;
    padding: 0 10px;
    font-size: 9px;
  }

  .account-label {
    max-width: 150px;
    overflow: hidden;
    color: var(--muted-ink);
    font-family: var(--mono);
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-panel {
    position: absolute;
    z-index: 10;
    top: calc(100% + 14px);
    right: 0;
    width: min(360px, calc(100vw - 32px));
    border: 1px solid var(--rule-strong);
    border-radius: 10px;
    padding: 20px;
    background: var(--surface);
    box-shadow: 0 18px 42px rgb(23 33 43 / 16%);
  }

  .account-panel-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  :global(.account-panel h2) {
    margin: 4px 0 0;
    font-size: 20px;
    letter-spacing: -0.03em;
  }

  .account-helper {
    margin: 10px 0 18px;
    color: var(--muted-ink);
    font-size: 12px;
    line-height: 1.45;
  }

  :global(.account-panel form) {
    display: grid;
    gap: 14px;
  }

  :global(.account-panel label > span) {
    display: block;
    margin-bottom: 6px;
  }

  :global(.account-submit) {
    width: 100%;
    margin-top: 3px;
  }

  .account-error {
    margin: 0;
    color: var(--danger);
    font-size: 12px;
    line-height: 1.4;
  }

  :global(.account-switch),
  :global(.close-button) {
    border: 0;
    background: transparent;
    color: var(--blue-dark);
    cursor: pointer;
  }

  :global(.account-switch) {
    margin-top: 15px;
    padding: 0;
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.04em;
  }

  :global(.account-switch:hover) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :global(.close-button) {
    width: 28px;
    height: 28px;
    color: var(--muted-ink);
    font-size: 22px;
    line-height: 1;
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

  @media (max-width: 900px) {
    .workspace-header {
      padding: 0 16px;
    }

    .proof-status {
      display: none;
    }
  }

  @media (max-width: 560px) {
    .header-actions {
      gap: 7px;
    }

    :global(.source-toggle),
    :global(.register-button),
    .account-label {
      display: none;
    }

    :global(.generate-button) {
      padding: 0 11px;
      font-size: 9px;
    }

    .account-panel {
      position: fixed;
      top: 68px;
      right: 16px;
    }
  }
</style>
