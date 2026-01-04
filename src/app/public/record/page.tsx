"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, User, MapPin, FileText, Star } from "lucide-react";
import Link from "next/link";

export default async function RecordPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recordId } = await params;

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecord() {
      try {
        const { data, error } = await supabase
          .from("records")
          .select(
            `
            id,
            created_at,
            rating,
            description,
            category,
            location,
            relationship,
            first_name,
            last_name,
            also_known_as,
            organization,
            subject:subjects (
              subject_uuid,
              name,
              nickname,
              organization,
              location
            ),
            attachments:record_attachments(
              path
            )
          `
          )
          .eq("id", recordId)
          .single();

        if (error || !data) {
          setError("Record not found");
        } else {
          setRecord(data);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load record.");
      }
      setLoading(false);
    }

    fetchRecord();
  }, [recordId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex items-center justify-center h-screen text-center">
        <div>
          <h1 className="text-xl font-semibold mb-3">{error}</h1>
          <Link
            href="/dashboard/records-submitted"
            className="text-blue-600 hover:underline"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const subject = record.subject;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Record Detail</h1>
      </div>

      {/* Subject Card */}
      <div className="border rounded-2xl p-5 shadow-sm bg-white">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">
          Subject Information
        </h2>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-gray-600" />
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-900">
              {subject?.name}
              {subject?.nickname && (
                <span className="text-gray-500 ml-1">({subject?.nickname})</span>
              )}
            </p>
            <p className="text-sm text-gray-600">
              {subject?.organization || "Independent"} •{" "}
              {subject?.location || "Unknown Location"}
            </p>

            <Link
              className="text-blue-600 hover:underline text-sm"
              href={`/subject/${subject?.subject_uuid}`}
            >
              View Subject Profile →
            </Link>
          </div>
        </div>
      </div>

      {/* Record Info */}
      <div className="border rounded-2xl p-5 shadow-md bg-white space-y-5">
        <h2 className="text-lg font-semibold text-gray-800">Submitted Record</h2>

        {/* Rating */}
        <div className="flex items-center gap-2 text-yellow-500">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star
              key={i}
              size={22}
              className={
                record.rating >= i + 1
                  ? "fill-current text-black"
                  : "text-gray-300"
              }
            />
          ))}
        </div>

        <div className="text-sm text-gray-600">
          <strong>Category:</strong> {record.category}
        </div>

        <div className="text-sm text-gray-600 flex gap-2 items-center">
          <MapPin className="w-4 h-4" />
          {record.location}
        </div>

        <div className="text-sm text-gray-600">
          <strong>Relationship:</strong> {record.relationship}
        </div>

        <div className="pt-3 border-t text-gray-800 whitespace-pre-wrap leading-relaxed">
          {record.description}
        </div>

        {/* Attachments */}
        {record.attachments?.length > 0 && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Attachments</h3>
            <ul className="space-y-2">
              {record.attachments.map((file: any, i: number) => {
                const publicUrl = supabase.storage
                  .from("attachments")
                  .getPublicUrl(file.path)?.data.publicUrl;

                return (
                  <li key={i}>
                    <a
                      href={publicUrl}
                      target="_blank"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {file.path.split("/").pop()}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="text-center pt-6">
        <Link
          href="/dashboard/records-submitted"
          className="text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
