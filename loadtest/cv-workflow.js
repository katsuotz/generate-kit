import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:18732').replace(/\/+$/, '');
const TARGET_VUS = numberEnv('TARGET_VUS', 10);
const RAMP_UP = __ENV.RAMP_UP || '2m';
const STEADY = __ENV.STEADY || '5m';
const RAMP_DOWN = __ENV.RAMP_DOWN || '1m';
const THINK_TIME_SECONDS = numberEnv('THINK_TIME_SECONDS', 2);
const COMPILE = booleanEnv('COMPILE', true);
const ORIGIN = __ENV.ORIGIN || '';
const COMPILE_POLL_SECONDS = 1;
const COMPILE_MAX_WAIT_SECONDS = 60;

export const options = {
  stages: [
    { duration: RAMP_UP, target: TARGET_VUS },
    { duration: STEADY, target: TARGET_VUS },
    { duration: RAMP_DOWN, target: 0 },
  ],
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    workflow_success: ['rate>0.99'],
    workflow_duration: ['p(95)<45000'],
    bootstrap_success: ['rate>0.99'],
    ...(COMPILE
      ? {
          compile_success: ['rate>0.98'],
          compile_duration: ['p(95)<35000'],
        }
      : {}),
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export const workflowDuration = new Trend('workflow_duration', true);
export const workflowSuccess = new Rate('workflow_success');
export const bootstrapSuccess = new Rate('bootstrap_success');
export const compileDuration = new Trend('compile_duration', true);
export const compileSuccess = new Rate('compile_success');
export const workflowErrors = new Counter('workflow_errors');
export const compilePolls = new Counter('compile_polls');
export const artifactBytes = new Trend('artifact_bytes');

const cvData = {
  identity: {
    fullName: 'Load Test User',
    professionalTitles: 'Software Engineer',
    location: 'Remote',
    email: 'load-test@example.com',
  },
  summary: 'Builds reliable software systems.',
};

const terminalStatuses = new Set(['succeeded', 'failed', 'cancelled']);
let userState;
let bootstrapAttempted = false;

export default function () {
  if (!bootstrapAttempted) {
    bootstrapAttempted = true;
    userState = bootstrap();
    bootstrapSuccess.add(userState ? 1 : 0);
  }

  if (!userState) {
    workflowSuccess.add(0);
    sleep(Math.max(THINK_TIME_SECONDS, 1));
    return;
  }

  const startedAt = Date.now();
  const succeeded = runIteration(userState);
  workflowDuration.add(Date.now() - startedAt);
  workflowSuccess.add(succeeded ? 1 : 0);
  sleep(THINK_TIME_SECONDS);
}

function bootstrap() {
  const sessionResponse = request('POST', '/api/v1/sessions/anonymous', undefined, undefined, 'bootstrap_session', [200]);
  if (!sessionResponse) return null;
  const session = json(sessionResponse, 'bootstrap_session');
  if (!session?.token) return null;

  const token = session.token;
  const templatesResponse = request('GET', '/api/v1/cv/templates', undefined, token, 'bootstrap_templates', [200]);
  if (!templatesResponse) return null;
  const templates = json(templatesResponse, 'bootstrap_templates');
  const template = Array.isArray(templates) ? templates.find((item) => item.active) || templates[0] : null;
  if (!template?.id) {
    workflowErrors.add(1, { endpoint: 'bootstrap_templates' });
    return null;
  }

  const cvResponse = request(
    'POST',
    '/api/v1/cv/session',
    {
      schema_version: 1,
      template_id: template.id,
      data: cvData,
      expected_version: 0,
    },
    token,
    'bootstrap_cv_session',
    [201, 200],
  );
  if (!cvResponse) return null;
  const cvSession = json(cvResponse, 'bootstrap_cv_session');
  if (!cvSession?.project_id || !cvSession?.document_id || typeof cvSession.version !== 'number') {
    workflowErrors.add(1, { endpoint: 'bootstrap_cv_session' });
    return null;
  }

  const documentResponse = request(
    'GET',
    `/api/v1/documents/${cvSession.document_id}`,
    undefined,
    token,
    'bootstrap_document',
    [200],
  );
  if (!documentResponse) return null;
  const document = json(documentResponse, 'bootstrap_document');
  if (!document?.revision_id) {
    workflowErrors.add(1, { endpoint: 'bootstrap_document' });
    return null;
  }

  return {
    token,
    templateId: template.id,
    projectId: cvSession.project_id,
    documentId: cvSession.document_id,
    version: cvSession.version,
    revisionId: document.revision_id,
  };
}

function runIteration(state) {
  const renderResponse = request(
    'POST',
    '/api/v1/cv/render',
    { template_id: state.templateId, data: cvData },
    state.token,
    'render',
    [200],
  );
  if (!renderResponse) return false;
  const rendered = json(renderResponse, 'render');
  if (!rendered?.source || !rendered.generated_at || !rendered.template_id) {
    workflowErrors.add(1, { endpoint: 'render' });
    return false;
  }

  const cvResponse = request(
    'PUT',
    '/api/v1/cv/session',
    {
      project_id: state.projectId,
      document_id: state.documentId,
      schema_version: 1,
      template_id: rendered.template_id,
      generated_template_id: rendered.template_id,
      data: cvData,
      generated_source: rendered.source,
      generated_at: rendered.generated_at,
      fingerprint: `loadtest-${__VU}-${__ITER}`,
      expected_version: state.version,
    },
    state.token,
    'save_cv_session',
    [200],
  );
  if (!cvResponse) return false;
  const cvSession = json(cvResponse, 'save_cv_session');
  if (typeof cvSession?.version !== 'number') {
    workflowErrors.add(1, { endpoint: 'save_cv_session' });
    return false;
  }
  state.version = cvSession.version;

  const documentResponse = request(
    'PUT',
    `/api/v1/documents/${state.documentId}`,
    { source: rendered.source },
    state.token,
    'save_document',
    [200],
  );
  if (!documentResponse) return false;
  const document = json(documentResponse, 'save_document');
  if (!document?.revision_id) {
    workflowErrors.add(1, { endpoint: 'save_document' });
    return false;
  }
  state.revisionId = document.revision_id;

  if (!COMPILE) return true;
  return compileAndFetchArtifact(state);
}

function compileAndFetchArtifact(state) {
  const compileResponse = request(
    'POST',
    `/api/v1/documents/${state.documentId}/compile`,
    { revision_id: state.revisionId, profile: 'cv-xelatex' },
    state.token,
    'create_compile_job',
    [202],
  );
  if (!compileResponse) return false;
  const createdJob = json(compileResponse, 'create_compile_job');
  if (!createdJob?.id) {
    workflowErrors.add(1, { endpoint: 'create_compile_job' });
    return false;
  }

  const startedAt = Date.now();
  let job;
  do {
    const jobResponse = request(
      'GET',
      `/api/v1/compile-jobs/${createdJob.id}`,
      undefined,
      state.token,
      'poll_compile_job',
      [200],
    );
    compilePolls.add(1);
    if (!jobResponse) {
      compileDuration.add(Date.now() - startedAt);
      compileSuccess.add(0);
      return false;
    }
    job = json(jobResponse, 'poll_compile_job');
    if (!job?.status) {
      workflowErrors.add(1, { endpoint: 'poll_compile_job' });
      compileDuration.add(Date.now() - startedAt);
      compileSuccess.add(0);
      return false;
    }
    if (!terminalStatuses.has(job.status)) sleep(COMPILE_POLL_SECONDS);
  } while (!terminalStatuses.has(job.status) && Date.now() - startedAt < COMPILE_MAX_WAIT_SECONDS * 1000);

  if (!terminalStatuses.has(job.status)) {
    request(
      'DELETE',
      `/api/v1/compile-jobs/${createdJob.id}`,
      undefined,
      state.token,
      'cancel_compile_job',
      [204],
    );
  }

  const compileOk = job?.status === 'succeeded' && Boolean(job.artifact?.id);
  compileDuration.add(Date.now() - startedAt);
  if (!compileOk) {
    workflowErrors.add(1, { endpoint: 'compile' });
    compileSuccess.add(0);
    return false;
  }

  const artifactResponse = request(
    'GET',
    `/api/v1/artifacts/${job.artifact.id}`,
    undefined,
    state.token,
    'get_artifact',
    [200],
  );
  if (!artifactResponse) {
    compileSuccess.add(0);
    return false;
  }
  artifactBytes.add(artifactResponse.body ? artifactResponse.body.length : 0);
  compileSuccess.add(1);
  return true;
}

function request(method, path, body, token, endpoint, statuses) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ORIGIN) headers.Origin = ORIGIN;

  const response = http.request(
    method,
    `${BASE_URL}${path}`,
    body === undefined ? null : JSON.stringify(body),
    { headers, tags: { endpoint } },
  );
  const ok = check(response, {
    [`${endpoint} status`]: (res) => statuses.includes(res.status),
  });
  if (!ok) workflowErrors.add(1, { endpoint, status: String(response.status) });
  return ok ? response : null;
}

function json(response, endpoint) {
  try {
    return response.json();
  } catch (_) {
    workflowErrors.add(1, { endpoint });
    return null;
  }
}

function numberEnv(name, fallback) {
  const value = Number(__ENV[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function booleanEnv(name, fallback) {
  const value = __ENV[name];
  if (value === undefined) return fallback;
  return !['false', '0', 'no', 'off'].includes(value.toLowerCase());
}
