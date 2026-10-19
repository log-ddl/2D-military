import type { Plugin } from 'vite';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { listProjects, projectDir, repoRoot, projectsRoot } from './projects.ts';
export function projectAssets(): Plugin {
  return {
    name: 'project-assets',
    hotUpdate: {
      order: 'post',
      handler(context) {
        // Scene creation changes the glob registry, but must not reload the page
        // while a project/AI request is still awaiting its response. New scenes
        // load on demand; edits to existing scenes keep normal HMR.
        if (context.type !== 'update' && context.file.startsWith(projectsRoot + path.sep) && /[/\\]scenes[/\\].*\.ts$/.test(context.file)) return [];
      },
    },
    configureServer(server) {
      server.watcher.add(projectsRoot);
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith('/projects/')) req.url = `/@fs/${repoRoot}${req.url}`;
        next();
      });
    },
    writeBundle(options) {
      if (!options.dir) return;
      // Static preview includes project metadata and assets, never analysis environments or outputs.
      for (const project of listProjects()) {
        const source = projectDir(project.id), target = path.join(options.dir, 'projects', project.id);
        mkdirSync(target, { recursive: true });
        for (const name of ['project.json', 'timeline.json', 'assets', 'data']) {
          if (existsSync(path.join(source, name))) cpSync(path.join(source, name), path.join(target, name), { recursive: true });
        }
      }
    },
  };
}
