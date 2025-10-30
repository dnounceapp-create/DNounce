// src/components/AttachmentUploader.tsx
"use client";

import { useState } from "react";

export default function AttachmentUploader({ recordId }: { recordId: string }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("record_id", recordId);
    formData.append("file", file);

    const res = await fetch("/api/attachments/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setMessage(`❌ Error: ${data.error || "Upload failed"}`);
    } else {
      setMessage("✅ File uploaded successfully!");
      setFile(null);
      // optional: trigger refresh of preview list
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-white">
      <h3 className="font-semibold">Upload Attachment</h3>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full border p-2 rounded-md"
      />
      <button
        type="submit"
        disabled={!file || uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  );
}
