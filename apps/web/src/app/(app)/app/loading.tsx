import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
