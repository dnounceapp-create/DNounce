// src/app/api/attachments/upload/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const formData = await req.formData();
  const recordId = formData.get("record_id") as string;
  const file = formData.get("file") as File;
  if (!recordId || !file) return NextResponse.json({ error: "Missing record_id or file" }, { status: 400 });

  // 1️⃣ identify user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // 2️⃣ get their role in this record
  const { data: roles } = await supabase
    .from("record_roles")
    .select("role")
    .eq("record_id", recordId)
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!roles?.role) return NextResponse.json({ error: "User not assigned to this record" }, { status: 403 });
  const role = roles.role;

  // 3️⃣ prepare upload path
  const timestamp = Date.now();
  const ext = file.name.split(".").pop();
  const fileName = `${timestamp}-${file.name}`;
  const path = `attachments/${recordId}/${role}/${user.id}/${fileName}`;

  // 4️⃣ upload file to bucket
  const { error: uploadErr } = await supabase.storage.from("attachments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // 5️⃣ insert metadata into DB
  const { data: attachment, error: insertErr } = await supabase
    .from("record_attachments")
    .insert({
      record_id: recordId,
      role,
      owner_user_id: user.id,
      path,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json(attachment);
}
