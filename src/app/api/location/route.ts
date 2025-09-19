import { NextResponse } from "next/server";

const LOCATIONIQ_KEY = process.env.LOCATIONIQ_KEY;
const IPINFO_KEY = process.env.IPINFO_KEY;

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// State abbreviation mapping
const STATE_ABBREVIATIONS: { [key: string]: string } = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY'
};

// Function to abbreviate state names
function abbreviateState(stateName: string): string {
  if (!stateName) return '';
  
  const lowerState = stateName.toLowerCase().trim();
  return STATE_ABBREVIATIONS[lowerState] || stateName;
}

export async function GET(req: Request) {
  try {
    if (!LOCATIONIQ_KEY) {
      console.error("❌ Missing LocationIQ API key");
      return NextResponse.json(
        { error: "Missing LocationIQ API key" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input");

    if (!input || input.trim().length < 2) {
      console.warn("⚠️ No input provided or too short");
      return NextResponse.json({ predictions: [] });
    }

    // 1. Get approximate user location from ipinfo.io
    let userLat = 40.73061; // fallback: NYC
    let userLon = -73.935242;
    try {
      const ipinfoRes = await fetch(
        `https://ipinfo.io/json?token=${IPINFO_KEY}`
      );
      if (ipinfoRes.ok) {
        const ipinfo = await ipinfoRes.json();
        if (ipinfo.loc) {
          const [lat, lon] = ipinfo.loc.split(",").map(Number);
          userLat = lat;
          userLon = lon;
        }
      }
      console.log("📍 User location (from IP):", userLat, userLon);
    } catch (err) {
      console.error("⚠️ Failed to fetch IP location:", err);
    }

    // 2. Call LocationIQ Autocomplete WITH radius and bias parameters
    const locRes = await fetch(
      `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
        input
      )}&limit=20&dedupe=1&countrycodes=us&tag=place:city,place:town,place:village,place:suburb,place:neighbourhood`
    );

    if (!locRes.ok) {
      const text = await locRes.text();
      console.error("❌ LocationIQ API error:", text);
      return NextResponse.json(
        { error: "LocationIQ API error", details: text },
        { status: 500 }
      );
    }

    const locData = await locRes.json();
    console.log("🌍 Raw LocationIQ results:", locData);

    // 3. Filter, calculate distances, and sort
    const refined = locData
      .filter((p: any) => {
        // Only include specific place types
        const validTypes = ["city", "town", "village", "suburb", "neighbourhood"];
        return validTypes.includes(p.type) && p.lat && p.lon;
      })
      .map((p: any) => {
        const addr = p.address || {};
        const name = p.display_place || addr.name || "";
        
        if (!name.toLowerCase().startsWith(input.toLowerCase())) {
          return null; // Skip results that don't start with the input
        }

        // Calculate distance from user
        const distance = haversine(
          userLat,
          userLon,
          parseFloat(p.lat),
          parseFloat(p.lon)
        );

        // Skip results too far away (beyond 500km)
        if (distance > 500) {
          return null;
        }

        // Abbreviate state name if it's a US state
        const abbreviatedState = addr.country === "United States of America" 
          ? abbreviateState(addr.state)
          : addr.state;

        // Create a unique key for deduplication (name + state)
        const uniqueKey = `${name.toLowerCase()}-${abbreviatedState.toLowerCase()}`;

        return {
          name,
          state: addr.state || "",
          abbreviatedState,
          country: addr.country || "",
          lat: parseFloat(p.lat),
          lon: parseFloat(p.lon),
          distance,
          uniqueKey // Add unique identifier for deduplication
        };
      })
      .filter(Boolean) // Remove null entries
      // Remove duplicates based on uniqueKey
      .filter((p: any, index: number, array: any[]) => {
        return array.findIndex(item => item.uniqueKey === p.uniqueKey) === index;
      })
      .sort((a: any, b: any) => a.distance - b.distance) // Sort by distance (closest first)
      .slice(0, 5) // Top 5 closest results
      .map((p: any) => {
        // Format the display text
        let displayText = p.name;
        if (p.abbreviatedState && p.country === "United States of America") {
          displayText += `, ${p.abbreviatedState}`;
        } else if (p.country) {
          displayText += `, ${p.country}`;
        }

        return {
          description: displayText,
          structured_formatting: {
            main_text: p.name,
            secondary_text: p.abbreviatedState && p.country === "United States of America" 
              ? p.abbreviatedState 
              : p.country || ""
          },
        };
      });

    console.log("✅ Final predictions:", refined);
    return NextResponse.json({ predictions: refined });
  } catch (err) {
    console.error("❌ Server error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}