import { notFound } from "next/navigation";

/** Unknown `/app/*` paths render the segment `not-found.tsx` (not ModuleRouter). */
export default function AppCatchAllPage() {
  notFound();
}
