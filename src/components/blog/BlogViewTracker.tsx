'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function BlogViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    supabase.rpc('increment_blog_views', { post_slug: slug }).then(() => {});
  }, [slug]);
  return null;
}
