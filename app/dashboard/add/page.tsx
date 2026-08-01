// app/dashboard/add/page.tsx
import { Card, CardBody, PageHeader } from "@/components/ui/primitives";
import { MonitorForm } from "@/components/monitor-form";
import { ImportCsvForm } from "@/components/import-csv-form";
import { AddPageTabs } from "@/components/add-page-tabs";

export default function AddPage() {
  return (
    <>
      <PageHeader
        title="Add monitor"
        description="Create a single monitor manually, or bulk-import a CSV of domains."
      />
      <div className="max-w-2xl">
        <AddPageTabs />
      </div>
    </>
  );
}