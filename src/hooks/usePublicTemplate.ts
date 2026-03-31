import { useQuery } from "@tanstack/react-query";
import { getPublicTemplateBySlug } from "@/services/templates";

export function usePublicTemplate(slug?: string) {
  return useQuery({
    queryKey: ["public-template", slug],
    queryFn: () => getPublicTemplateBySlug(slug as string),
    enabled: Boolean(slug),
  });
}
