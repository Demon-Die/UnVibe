import { ModulePageContent } from "./module-page-content";

export default async function ModulePage({ params }: { params: Promise<{ trackId: string; moduleId: string }> }) {
  const { trackId, moduleId } = await params;
  return <ModulePageContent trackId={trackId} moduleId={moduleId} />;
}
