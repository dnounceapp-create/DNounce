'use client';

export default function MyRecordsPage(props: any) {
  const { userid } = props.params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">My Records</h1>
      <p className="text-gray-700">
        Welcome to your dashboard, <span className="font-mono">{userid}</span>.
      </p>

      {/* Example content */}
      <div className="mt-8 space-y-4">
        <div className="p-4 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold">Record 1</h2>
          <p className="text-sm text-gray-500">Details about this record go here.</p>
        </div>

        <div className="p-4 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold">Record 2</h2>
          <p className="text-sm text-gray-500">Details about this record go here.</p>
        </div>
      </div>
    </div>
  );
}