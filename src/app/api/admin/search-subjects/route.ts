import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    if (!q || q.length < 2) return NextResponse.json({ users: [], externals: [] });

    const isPhone = /^\+?[\d\s\-().]{7,}$/.test(q);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q);

    let userRows: any[] = [];
    if (isPhone || isEmail) {
      const col = isPhone ? 'phone' : 'email';
      const { data } = await supabaseAdmin
        .from('user_accountdetails')
        .select('user_id, first_name, last_name, job_title, location, phone, email')
        .ilike(col, `%${q}%`)
        .limit(5);
      userRows = data ?? [];
    } else {
      const { data } = await supabaseAdmin
        .from('user_accountdetails')
        .select('user_id, first_name, last_name, job_title, location, phone, email')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(5);
      userRows = data ?? [];
    }

    const users = [];
    for (const u of userRows) {
      const { data: subj } = await supabaseAdmin
        .from('subjects')
        .select('subject_uuid, name, nickname, organization, location')
        .eq('owner_auth_user_id', u.user_id)
        .maybeSingle();
      if (subj) {
        users.push({
          kind: 'user',
          user_id: u.user_id,
          subject_uuid: subj.subject_uuid,
          name: subj.name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
          nickname: subj.nickname,
          organization: subj.organization,
          location: subj.location || u.location,
          phone: u.phone,
          email: u.email,
        });
      }
    }

    const { data: externals } = await supabaseAdmin
      .from('subjects')
      .select('subject_uuid, name, nickname, organization, location')
      .ilike('name', `%${q}%`)
      .is('owner_auth_user_id', null)
      .limit(5);

    return NextResponse.json({
      users,
      externals: (externals ?? []).map(s => ({
        kind: 'external',
        id: s.subject_uuid,
        name: s.name,
        nickname: s.nickname,
        organization: s.organization,
        location: s.location,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
