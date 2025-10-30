"use client";
import { useEffect, useState } from "react";

type Props = {
  recordId: string;
  role: "subject" | "contributor" | "voter" | "citizen";
  userId: string;     // the owner folder under role
  path: string;       // full storage path, server will re-check anyway
};

export default function AttachmentPreview({ recordId, role, userId, path }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string>("");

  useEffect(() => {
    let revoked = false;
    (async () => {
      const url = new URL("/api/attachments/preview", window.location.origin);
      url.searchParams.set("recordId", recordId);
      url.searchParams.set("role", role);
      url.searchParams.set("userId", userId);
      url.searchParams.set("path", path);

      const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      if (!res.ok) return;

      const ct = res.headers.get("content-type") || "";
      setMime(ct);

      const blob = await res.blob();
      if (revoked) return;
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    })();

    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [recordId, role, userId, path]);

  if (!blobUrl) return <div className="text-sm text-gray-500">Loading preview…</div>;

  if (mime.startsWith("image/")) {
    return (
      <div className="relative">
        <img
          src={blobUrl}
          alt="Attachment"
          className="max-h-96 rounded-lg object-contain"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
        {/* optional watermark overlay
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-20 text-2xl font-bold">
          DNounce
        </div> */}
      </div>
    );
  }

  if (mime === "application/pdf") {
    return (
      <iframe
        src={blobUrl}
        className="w-full h-[70vh] rounded-lg"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }

  if (mime.startsWith("video/")) {
    return (
      <video
        src={blobUrl}
        className="w-full rounded-lg"
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }

  if (mime.startsWith("audio/")) {
    return (
      <audio
        src={blobUrl}
        controls
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }

  // Fallback: render filename only (docx/xlsx etc. have no safe inline viewer without third parties)
  return (
    <div className="text-sm text-gray-600">
      Preview not available for this file type.
    </div>
  );
}
