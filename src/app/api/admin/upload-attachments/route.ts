import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const recordId = formData.get('recordId') as string;
    const files = formData.getAll('files') as File[];

    if (!recordId || files.length === 0) {
      return NextResponse.json({ success: true, uploaded: 0 });
    }

    let uploaded = 0;
    const insertErrors: string[] = [];
    for (const file of files) {
      const path = `records/${recordId}/mod_attachments/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('attachments')
        .upload(path, buffer, { contentType: file.type });

      if (!uploadErr) {
        const { data: recData } = await supabaseAdmin
          .from('records')
          .select('contributor_id')
          .eq('id', recordId)
          .maybeSingle();

        const { error: insertErr } = await supabaseAdmin.from('record_attachments').insert({
          record_id: recordId,
          contributor_id: recData?.contributor_id ?? null,
          path,
          mime_type: file.type,
          size_bytes: file.size,
          label: file.name,
        });
        if (insertErr) {
          insertErrors.push(insertErr.message);
        } else {
          uploaded++;
        }
      } else {
        console.error('storage upload error:', uploadErr.message);
      }
    }

    return NextResponse.json({ success: true, uploaded, insertErrors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
