'use client';

export default function MyRecordsPage(props: any) {
  const { userid } = props.params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">My Records</h1>
      <p className="text-gray-700">
        Welcome to your dashboard, <span className="font-mono">{userid}</span>.
      </p>
    </div>
  );
}