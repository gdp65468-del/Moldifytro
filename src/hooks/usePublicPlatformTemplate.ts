import { useQuery } from "@tanstack/react-query";
import { getPublicPlatformTemplateById } from "@/services/templates";

export function usePublicPlatformTemplate(platformTemplateId?: string) {
  return useQuery({
    queryKey: ["public-platform-template", platformTemplateId],
    queryFn: () => getPublicPlatformTemplateById(platformTemplateId as string),
    enabled: Boolean(platformTemplateId),
  });
}
