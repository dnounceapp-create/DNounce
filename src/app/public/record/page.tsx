import Link from "next/link";

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function PublicRecordConfirmationPage({ searchParams }: PageProps) {
  const rawId = searchParams?.id;
  const recordId = Array.isArray(rawId) ? rawId[0] : rawId;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">✅ Record Submitted</h1>

        <p className="text-gray-700">
          Thanks — your record has been received and is being processed.
        </p>

        {recordId ? (
          <div className="pt-2">
            <Link
              href={`/public/record/${recordId}`}
              className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              View your record
            </Link>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            If you expected to view a specific record, make sure the link includes an id.
          </p>
        )}

        <div className="pt-4">
          <Link
            href="/"
            className="text-blue-600 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
