import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    return NextResponse.json({ error: data.status }, { status: 400 });
  }

  return NextResponse.json({
    formatted: data.results[0].formatted_address,
    lat: data.results[0].geometry.location.lat,
    lng: data.results[0].geometry.location.lng,
  });
}