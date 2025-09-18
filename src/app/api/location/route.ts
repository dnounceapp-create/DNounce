import { NextResponse } from "next/server";

// Haversine formula to calculate distance between two coords in KM
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // radius of Earth in km
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in km
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input");

    if (!input) {
      return NextResponse.json({ predictions: [] });
    }

    // 1. Try to get user location from IP (ipinfo)
    let userLat: number | null = null;
    let userLng: number | null = null;

    try {
      const ipInfoRes = await fetch(
        `https://ipinfo.io/json?token=${process.env.IPINFO_TOKEN}`
      );
      const ipInfo = await ipInfoRes.json();

      if (ipInfo.loc) {
        [userLat, userLng] = ipInfo.loc.split(",").map(Number);
      }
    } catch (e) {
      console.warn("IP lookup failed, falling back to no bias");
    }

    // 2. Call LocationIQ autocomplete
    const locRes = await fetch(
      `https://api.locationiq.com/v1/autocomplete?key=${process.env.LOCATIONIQ_KEY}&q=${encodeURIComponent(
        input
      )}&limit=10`
    );
    const locData = await locRes.json();

    // 3. Refine + filter results
    let refined = locData.map((place: any) => {
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      let distance = null;

      if (userLat !== null && userLng !== null) {
        distance = haversine(userLat, userLng, lat, lon);
      }

      // Prefer neighborhood → fallback to city → fallback to town/state
      let main =
        place.address.neighbourhood ||
        place.address.suburb ||
        place.address.city ||
        place.address.town ||
        place.address.village;

      let state = place.address.state_code || place.address.state || "";

      return {
        id: place.place_id,
        name: `${main}, ${state}`,
        distance,
      };
    });

    // If we know user location → filter by 500km & sort by distance
    if (userLat !== null && userLng !== null) {
      refined = refined
        .filter((p: any) => p.name && p.distance !== null && p.distance < 500)
        .sort((a: any, b: any) => (a.distance ?? 0) - (b.distance ?? 0));
    } else {
      // Otherwise → just filter out bad names (no distance check)
      refined = refined.filter((p: any) => p.name);
    }

    return NextResponse.json({ predictions: refined });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}