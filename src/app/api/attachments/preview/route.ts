import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Util: map simple content-types for common previews
const contentTypeByExt: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
};

function extFromPath(path: string) {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const recordId = url.searchParams.get("recordId");
  const role = url.searchParams.get("role"); // subject|contributor|voter|citizen
  const userId = url.searchParams.get("userId"); // the owner of the subfolder
  const path = url.searchParams.get("path");     // full storage path (server-validated)

  // Basic input checks
  if (!recordId || !role || !userId || !path) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // 1) Identify the current user (from your auth cookie/session)
  const cookieStore = cookies();
  const currentUserId = cookieStore.get("sb-user")?.value; // <-- replace with your auth helper

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Authorization: check that currentUserId is allowed to view this attachment
  // Implement your own checks here (examples):
  // - currentUserId is the contributor of recordId
  // - OR currentUserId is the subject of recordId
  // - OR currentUserId is an approved voter on recordId during voting window
  // - OR currentUserId has admin/mod role
  const allowed = await isUserAllowedToPreview({ currentUserId, recordId, role, userId });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) Download bytes server-side using service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only!
  );

  // Expecting path like: attachments/{recordId}/{role}/{userId}/{filename}
  // (You can also rebuild/validate the path server-side instead of trusting the query.)
  const { data, error } = await supabase.storage
    .from("attachments")
    .download(path);

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 4) Choose Content-Type + set headers to discourage download
  const ext = extFromPath(path);
  const contentType = contentTypeByExt[ext] ?? "application/octet-stream";

  return new NextResponse(data.stream(), {
    status: 200,
    headers: {
      // Render inline where possible, not as a download
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(path.split("/").pop()!)}"`,

      // Don’t cache or leak
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",

      // Harder to embed elsewhere
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "frame-ancestors 'self'; default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:;",

      // Optional: prevent cross-site requests (adjust to your needs)
      "Cross-Origin-Resource-Policy": "same-site",
    },
  });
}

// TODO: replace with your actual authorization logic (DB lookups)
async function isUserAllowedToPreview({
  currentUserId,
  recordId,
  role,
  userId,
}: {
  currentUserId: string;
  recordId: string;
  role: string;
  userId: string;
}) {
  // Example: user can preview if they are the subject/contributor/voter on this record,
  // or if they’re the owner of this file path (userId match),
  // or if they have a platform role that allows it.
  if (currentUserId === userId) return true;
  // ...check your records tables here...
  return false;
}
