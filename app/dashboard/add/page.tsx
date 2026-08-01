// app/dashboard/add/page.tsx
import { Card, CardBody, PageHeader } from "@/components/ui/primitives";
import { MonitorForm } from "@/components/monitor-form";

export default function AddPage() {
  return (
    <>
      <PageHeader
        title="Add monitor"
        description="Create a new HTTP, TCP or SSL check."
      />
      <div className="max-w-2xl">
        <Card>
          <CardBody>
            <MonitorForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}