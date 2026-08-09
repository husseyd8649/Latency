import { PageHeader } from "@/components/ui/primitives";
import { AddPageTabs } from "@/components/add-page-tabs";
import { getRegions } from "@/app/dashboard/regions/actions";

export default async function AddPage() {
  const regions = await getRegions();

  const regionList = regions.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
  }));

  return (
    <>
      <PageHeader
        title="Add monitor"
        description="Create a single monitor manually, or bulk-import a CSV of domains."
      />
      <div className="max-w-2xl">
        <AddPageTabs regions={regionList} />
      </div>
    </>
  );
}