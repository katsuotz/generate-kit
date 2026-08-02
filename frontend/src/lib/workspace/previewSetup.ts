import { BackendPreviewAdapter } from '$lib/preview/backendPreviewAdapter';
import { PreviewController, type PreviewState } from './previewController';

export async function setupPreview(
  adapter: BackendPreviewAdapter,
  initialSource: string,
  onChange: (state: PreviewState) => void
) {
  await adapter.initialize(initialSource);
  const controller = new PreviewController(adapter, onChange);
  if (initialSource) await controller.compile(initialSource);
  return controller;
}
