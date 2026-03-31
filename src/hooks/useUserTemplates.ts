import { useQuery } from "@tanstack/react-query";
import { listUserTemplates, type TemplateListScope } from "@/services/templates";

export function useUserTemplates(userId?: string, scope: TemplateListScope = "active") {
  return useQuery({
    queryKey: ["user-templates", userId, scope],
    queryFn: () => listUserTemplates(userId as string, scope),
    enabled: Boolean(userId),
  });
}
