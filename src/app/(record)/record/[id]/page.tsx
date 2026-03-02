import RecordDetail from "@/components/record/RecordDetail";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecordDetail recordId={id} embedded={false} />;
}