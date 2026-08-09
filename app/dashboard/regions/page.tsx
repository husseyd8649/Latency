import { getRegions } from "./actions";
import { PageHeader } from "@/components/ui/primitives";
import { CreateRegionModal } from "@/components/create-region-modal";
import { RegionCard } from "@/components/region-card";
import { MapPin } from "lucide-react";

export default async function RegionsPage() {
  const regions = await getRegions();

  return (
    <div>
      <PageHeader
        title="Regions"
        description="Group your monitors by geographic or logical region."
        actions={<CreateRegionModal />}
      />

      {regions.length === 0 ? (
        <div className="animate-fade-up rounded-xl border-2 border-dashed border-[var(--border)] py-16 text-center">
          <MapPin className="mx-auto h-12 w-12 text-[var(--text-subtle)]" />
          <h3 className="mt-4 text-base font-semibold text-[var(--text)]">
            No regions yet
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create a region to start grouping your monitors.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up">
          {regions.map((region) => (
            <RegionCard key={region.id} region={region} />
          ))}
        </div>
      )}
    </div>
  );
}