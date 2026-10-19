import { aiProviders, aiSkills, aiSession, aiOverview, startAI, cancelAI, resetAI, aiBusy, stopAIService } from './ai.ts';
import { readNotes, saveNotes } from './review.ts';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { activeProjectId, appendScene, createProject, deleteProject, listProjects, projectDir, readProject, saveTimeline, selectProject, validId } from './projects.ts';
import { listScenes, readScene, saveScene, listVersions, readVersion } from './scenes.ts';
import { listExports, pickFolder, startRender } from './render.ts';
import { cancelJob, listJobs } from './jobs.ts';
import { listOutros, saveOutro } from './outro.ts';
async function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error('Request too large');
  }
  return JSON.parse(body || '{}');
}
function json(res: ServerResponse, value: unknown) {
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value));
}
export function studioApiPlugin(): Plugin {
  return {
    name: 'studio-api',
    configureServer(server) {
      server.httpServer?.once('close', stopAIService);
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        try {
          const route = url.pathname, method = req.method;
          if (method === 'GET' && route === '/api/active-project') return json(res, readProject(activeProjectId()));
          if (method === 'GET' && route === '/api/projects') return json(res, { projects: listProjects().map(p => ({ ...p, active: p.id === activeProjectId() })) });
          if (route.startsWith('/api/ai/')) {
            const host = req.headers.host || '';
            const origin = req.headers.origin;
            if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) || (origin && origin !== `http://${host}` && origin !== `https://${host}`)) throw new Error('AI API chỉ nhận yêu cầu từ Studio trên máy này.');
            if (method === 'POST' && !req.headers['content-type']?.startsWith('application/json')) throw new Error('Expected application/json');
          }
          if (method === 'GET' && route === '/api/ai/providers') return json(res, { providers: aiProviders(), skills: aiSkills(), concurrency: 4 });
          if (method === 'GET' && route === '/api/ai/overview') return json(res, { sessions: aiOverview() });
          if (method === 'POST' && route === '/api/pick-folder') return json(res, { path: await pickFolder() });
          if (method === 'GET' && route === '/api/outros') return json(res, { outros: listOutros() });
          if (method === 'POST' && route === '/api/outro-upload') return json(res, { success: true, ...(await saveOutro(url.searchParams.get('name'), req)) });
          const data = method === 'POST' ? await readBody(req) : {};
          if (method === 'POST' && route === '/api/projects/switch') { selectProject(data.id); return json(res, { success: true, active: data.id }); }
          if (method === 'POST' && route === '/api/projects/new') return json(res, { success: true, project: createProject(data) });
          if (method === 'POST' && route === '/api/projects/delete') {
            const id = validId(data.id);
            if (aiBusy(id)) throw new Error('Dừng tác vụ AI trước khi xoá dự án.');
            if (listJobs(id).some(job => job.status === 'running')) throw new Error('Dừng xuất video trước khi xóa dự án.');
            return json(res, deleteProject(id));
          }
          const projectId = validId(method === 'POST' ? data.projectId : url.searchParams.get('projectId'));
          projectDir(projectId);
          if (method === 'GET' && route === '/api/ai/session') return json(res, { session: aiSession(projectId) });
          if (method === 'POST' && route === '/api/ai/start') return json(res, { session: startAI(projectId, data) });
          if (method === 'POST' && route === '/api/ai/cancel') return json(res, { session: cancelAI(projectId) });
          if (method === 'POST' && route === '/api/ai/reset') return json(res, { session: resetAI(projectId) });
          if (method === 'GET' && route === '/api/review-notes') return json(res, { notes: readNotes(projectId) });
          if (method === 'POST' && route === '/api/review-notes') return json(res, { notes: saveNotes(projectId, data.notes) });
          if (method === 'GET' && route === '/api/project') return json(res, readProject(projectId));
          if (method === 'GET' && route === '/api/scenes') return json(res, { scenes: listScenes(projectId) });
          if (method === 'GET' && route === '/api/scene-code') {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end(readScene(projectId, url.searchParams.get('id')));
          }
          if (method === 'POST' && route === '/api/save-scene') {
            const id = validId(data.id); await saveScene(projectId, id, data.code);
            if (data.addToTimeline) appendScene(projectId, id, Number(data.duration ?? 5));
            return json(res, { success: true, id });
          }
          if (method === 'GET' && route === '/api/scene-versions') return json(res, { versions: listVersions(projectId, validId(url.searchParams.get('id'))) });
          if (method === 'POST' && route === '/api/restore-scene') {
            const id = validId(data.id);
            const code = readVersion(projectId, id, data.version);
            await saveScene(projectId, id, code);
            return json(res, { success: true, code });
          }
          if (method === 'POST' && route === '/api/timeline') { saveTimeline(projectId, data.timeline); return json(res, { success: true }); }
          if (method === 'POST' && route === '/api/export') return json(res, startRender(projectId, data, `http://localhost:${(server.httpServer?.address() as { port: number } | null)?.port || 5173}`));
          if (method === 'GET' && route === '/api/exports') return json(res, { projectId, exports: listExports(projectId) });
          if (method === 'GET' && route === '/api/jobs') return json(res, { projectId, jobs: listJobs(projectId).filter(job => job.kind === 'render') });
          if (method === 'POST' && route === '/api/jobs/cancel') { cancelJob(projectId, data.id); return json(res, { success: true }); }
          res.statusCode = 404; json(res, { error: 'Unknown endpoint' });
        } catch (error: any) {
          res.statusCode = 400; json(res, { error: error.message });
        }
      });
    },
  };
}
