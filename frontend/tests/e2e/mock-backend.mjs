import { createServer } from 'node:http';

const port = 18733;
const documents = new Map();
const jobs = new Map();
let sequence = 0;

function id(prefix) {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

function makePdf() {
  const stream = 'BT\n/F1 24 Tf\n72 720 Td\n(Backend compiled CV) Tj\nET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

const pdf = makePdf();

function json(response, status, value) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  });
  response.end(JSON.stringify(value));
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Origin': '*'
    });
    response.end();
    return;
  }
  if (request.method === 'GET' && path === '/') {
    json(response, 200, { status: 'ok' });
    return;
  }
  if (request.method === 'POST' && path === '/api/v1/sessions/anonymous') {
    json(response, 201, {
      session_id: id('session'),
      token: 'e2e-token',
      expires_at: '2099-01-01T00:00:00Z'
    });
    return;
  }
  if (request.method === 'POST' && path === '/api/v1/projects') {
    json(response, 201, { id: id('project'), name: (await body(request)).name });
    return;
  }

  const projectDocuments = path.match(/^\/api\/v1\/projects\/([^/]+)\/documents$/);
  if (request.method === 'POST' && projectDocuments) {
    const input = await body(request);
    const document = {
      id: id('document'),
      project_id: projectDocuments[1],
      name: input.name,
      revision_id: id('revision'),
      revision_number: 1,
      source: input.source
    };
    documents.set(document.id, document);
    json(response, 201, document);
    return;
  }

  const documentPath = path.match(/^\/api\/v1\/documents\/([^/]+)$/);
  if (documentPath && request.method === 'GET') {
    const document = documents.get(documentPath[1]);
    json(response, document ? 200 : 404, document ?? { code: 'not_found', message: 'Not found' });
    return;
  }
  if (documentPath && request.method === 'PUT') {
    const document = documents.get(documentPath[1]);
    if (!document) {
      json(response, 404, { code: 'not_found', message: 'Not found' });
      return;
    }
    const input = await body(request);
    const updated = {
      ...document,
      source: input.source,
      revision_id: id('revision'),
      revision_number: document.revision_number + 1
    };
    documents.set(updated.id, updated);
    json(response, 200, updated);
    return;
  }

  const compilePath = path.match(/^\/api\/v1\/documents\/([^/]+)\/compile$/);
  if (compilePath && request.method === 'POST') {
    const document = documents.get(compilePath[1]);
    const input = await body(request);
    const failed = document?.source.includes('E2E COMPILE FAILURE');
    const job = {
      id: id('job'),
      revision_id: input.revision_id,
      profile: input.profile,
      status: failed ? 'failed' : 'succeeded',
      diagnostics: failed
        ? [
            {
              severity: 'error',
              code: 'E2E_FAILURE',
              message: 'Fixture compiler rejected this source.',
              file: 'cv.tex',
              line: 1,
              column: 1
            }
          ]
        : [],
      artifact: failed
        ? null
        : {
            id: id('artifact'),
            media_type: 'application/pdf',
            bytes: pdf.byteLength,
            page_count: 1
          }
    };
    jobs.set(job.id, job);
    json(response, 202, job);
    return;
  }

  const jobPath = path.match(/^\/api\/v1\/compile-jobs\/([^/]+)$/);
  if (jobPath && request.method === 'GET') {
    const job = jobs.get(jobPath[1]);
    json(response, job ? 200 : 404, job ?? { code: 'not_found', message: 'Not found' });
    return;
  }
  if (jobPath && request.method === 'DELETE') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
    response.end();
    return;
  }

  if (request.method === 'GET' && /^\/api\/v1\/artifacts\/[^/]+$/.test(path)) {
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Length': pdf.byteLength,
      'Content-Type': 'application/pdf'
    });
    response.end(pdf);
    return;
  }

  json(response, 404, { code: 'not_found', message: 'Not found' });
});

server.listen(port, '127.0.0.1');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
