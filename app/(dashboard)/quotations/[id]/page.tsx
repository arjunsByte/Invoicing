import { notFound } from "next/navigation";
import { getQuotationById, getCompanySettings } from "@/lib/db/data-store";
import { QuotationDetailView } from "@/components/quotations/quotation-detail-view";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quotation, companySettings] = await Promise.all([
    getQuotationById(id),
    getCompanySettings(),
  ]);

  if (!quotation) {
    notFound();
  }

  return (
    <QuotationDetailView
      quotation={quotation}
      companySettings={companySettings}
    />
  );
}
