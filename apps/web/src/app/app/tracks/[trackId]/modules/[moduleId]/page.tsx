"use client";

import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Badge } from "@/components/ui/badge";
import { ModulePlayer } from "@/components/features/module-player";
import { useModuleQuery } from "@/lib/mock-data/hooks";

export default function ModulePage({ params }: { params: { trackId: string; moduleId: string } }) {
  const { data, isLoading } = useModuleQuery(params.trackId, params.moduleId);

  if (isLoading || !data) return <LoadingPanel label="Loading module player" />;

  return (
    <>
      <PageHeader
        eyebrow={data.track.title}
        title={data.module.title}
        description={data.module.summary}
        action={
          <div className="flex flex-wrap gap-2">
            {data.module.concepts.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        }
      />
      <ModulePlayer
        module={data.module}
        annotations={data.annotations}
        quiz={data.quiz}
        diffLines={data.diffLines}
      />
    </>
  );
}
