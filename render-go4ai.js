import { bootstrap } from './packages/cli/dist/context.js';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

async function renderGo4AiVideo() {
  console.log('🚀 Starting GO4AI smoke test video render...');
  const projectRoot = resolve(process.cwd());
  const ctx = await bootstrap({ cwd: projectRoot });

  console.log('📁 Creating project: GO4AI Smoke Test');
  const project = await ctx.orchestrator.create({
    name: 'GO4AI Smoke Test',
    intent: 'Render GO4AI Enterprise AI Transformation video',
    preferences: { aspect: '16:9' },
  });

  console.log(`📌 Using template: frame-liquid-bg-hero`);
  await ctx.orchestrator.setTemplate(project.id, 'frame-liquid-bg-hero');

  console.log('✏️ Setting variables (Title: GO4AI, Subtitle: Enterprise AI Transformation)...');
  await ctx.orchestrator.setVariables(project.id, {
    headline: 'GO4AI',
    subheadline: 'Enterprise AI Transformation',
    cta: 'AI Transformation',
    duration_sec: 6,
  });

  console.log('🎨 Rendering Preview HTML...');
  const { htmlPath } = await ctx.orchestrator.renderPreviewHtml(project.id);
  console.log(`✓ Preview HTML ready at: ${htmlPath}`);

  console.log('🎬 Exporting MP4 video...');
  const startTime = Date.now();
  const { project: rendered, outputPath } = await ctx.orchestrator.exportMp4({
    projectId: project.id,
    onProgress: (pct, stage) => {
      console.log(`  └ [${pct}%] ${stage}`);
    },
  });

  const renderTimeSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 RENDER COMPLETE in ${renderTimeSec}s!`);
  console.log(`Output MP4 File: ${outputPath}`);
  console.log(`File Exists: ${existsSync(outputPath)}`);
}

renderGo4AiVideo().catch((err) => {
  console.error('❌ Error during render:', err);
  process.exit(1);
});
