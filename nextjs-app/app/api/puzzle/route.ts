import { NextResponse } from "next/server"
import { interpolate } from "app/utils/utils";

const GAME_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v6/game/{puzzleId}.json"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const url = interpolate(GAME_URL, {
        puzzleId: searchParams.get("puzzleId")
    });
    const headers = { "nyt-s": searchParams.get("userCookie") };
    const response = await fetch(url, { headers: headers, cache: "force-cache" });
    const jsonResponse = await response.json();

    return NextResponse.json(jsonResponse);
}
