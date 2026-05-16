import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";

export function useSiteConfig() {
  const { data: configs = [] } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
    staleTime: 60000,
  });

  const get = (key, fallback = "") => {
    const found = configs.find(c => c.key === key);
    return found ? found.value : fallback;
  };

  return { configs, get };
}