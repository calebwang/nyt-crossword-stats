import { NextResponse } from "next/server";
import { interpolate } from "utils/utils";

const ARCHIVE_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v3/{userId}/puzzles.json?publish_type=daily&sort_order=asc&sort_by=print_date&date_start={startDate}&date_end={endDate}";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const url = interpolate(ARCHIVE_URL, {
        userId: searchParams.get("userId") as string,
        startDate: searchParams.get("startDate") as string,
        endDate: searchParams.get("endDate") as string,
    });
    const headers = { "nyt-s": searchParams.get("userCookie") as string };
    const response = await fetch(url, { headers: headers });
    const jsonResponse = await response.json();

    return NextResponse.json(jsonResponse);
}
