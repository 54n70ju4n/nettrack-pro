import { useToast } from "@/components/ui/use-toast";

// Wraps an async mutation so failures surface a toast instead of failing
// silently. Usage: const run = useAction(); ... onClick={() => run(async () => {...})}
export function useAction() {
  const { toast } = useToast();
  return async (fn, errorTitle = "Error") => {
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: errorTitle,
        description: e?.message || "No se pudo completar la acción. Inténtalo de nuevo.",
      });
      return undefined;
    }
  };
}
