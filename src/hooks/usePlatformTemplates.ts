import { useQuery } from "@tanstack/react-query";
import { listPlatformTemplates } from "@/services/templates";

export function usePlatformTemplates() {
  return useQuery({
    queryKey: ["platform-templates"],
    queryFn: listPlatformTemplates,
  });
}
