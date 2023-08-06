import { useState, useEffect, useRef } from "react";

import { localMidnightDateFromString, interpolate, monthsRange, monthStartAndEnd, formatDate, RequestPool } from "utils/utils";
import { LoadingResult, isResult } from "utils/utils";

type BasePuzzleData = {
    puzzle_id: string;
    print_date: string;
    solved: boolean;
    percent_filled: number;

    calcs: undefined;
    firsts: undefined;
}

type SolvedPuzzleData = {
    puzzle_id: string;
    print_date: string;

    firsts: {
        checked?: number;
        solved: number;
    }
    percent_filled: number;
    solved: true;
    calcs: {
        secondsSpentSolving: number;
    }

}

type UnsolvedPuzzleData = {
    puzzle_id: string;
    print_date: string;

    solved: false;
    percent_filled: number;
    firsts?: {
        checked?: number;
    }
    calcs?: {};
}

type PuzzleData = BasePuzzleData | SolvedPuzzleData | UnsolvedPuzzleData;
type LoadedPuzzleData = SolvedPuzzleData | UnsolvedPuzzleData;


class Puzzle<S extends LoadedPuzzleData> {
    data: S;

    constructor(data: S) {
        this.data = data;
    }

    blob() {
        try {
            return {
                id: this.id(),
                date: this.date(),
                day: this.day(),
                attempted: this.attempted(),
                solved: this.solved(),
                cleanlySolved: this.cleanlySolved(),
                solveTime: this.solveTime(),
                solveDate: this.solveDate(),
            };
        } catch(e) {
            throw new Error("failed to extract data: " + JSON.stringify(this.data));
        }
    }

    id() {
        return this.data.puzzle_id;
    }

    date() {
        return this.data.print_date;
    }

    day() {
        return localMidnightDateFromString(this.data.print_date).getDay();
    }

    attempted() {
        return this.data.firsts !== undefined;
    }

    solved(): this is Puzzle<SolvedPuzzleData> {
        return this.data.solved;
    }

    cleanlySolved() {
        return this.solved() && this.data.firsts?.checked === undefined;
    }

    solveTime(): number | null {
        // Sanitize NYT data problems
        if (this.solved() && this.data.calcs?.secondsSpentSolving !== undefined) {
            return this.data.calcs?.secondsSpentSolving;
        }
        return null;
    }

    solveDate(): string | null {
        if (this.solved()) {
            return formatDate(new Date(this.data.firsts.solved * 1000));
        }
        return null;
    }
}

const ARCHIVE_URL = "/api/archive?userId={userId}&userCookie={userCookie}&startDate={startDate}&endDate={endDate}";
const PUZZLE_URL = "/api/puzzle?userId={userId}&userCookie={userCookie}&puzzleId={puzzleId}";

export function useDataLoader(userId: string, userCookie: string, startDate: Date, endDate: Date): [any, boolean, string] {
    const [result, setResult] = useState({});
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState("");

    const data = useRef<Record<string, LoadingResult<PuzzleData>>>({});

    useEffect(() => {
        const [startYear, startMonth] = [startDate.getFullYear(), startDate.getMonth()];
        const [currentYear, currentMonth] = [endDate.getFullYear(), endDate.getMonth()];
        const months = monthsRange(startYear, startMonth, currentYear, currentMonth);

        const shouldFetch = months.some(([year, month]) => {
            const monthStr = formatDate(new Date(year, month, 1));
            return data.current[monthStr] === undefined;
        });

        if (shouldFetch) {
            setLoaded(false);
            fetch();
        }
    });

    function fetch() {
        const [startYear, startMonth] = [startDate.getFullYear(), startDate.getMonth()];
        const [currentYear, currentMonth] = [endDate.getFullYear(), endDate.getMonth()];
        const months = monthsRange(startYear, startMonth, currentYear, currentMonth);

        const monthDataRequestPool = new RequestPool<{ results: PuzzleData[] }>(
            50,
            (numCompleted, numTotal) => {
                setProgress(`${numCompleted} of ${numTotal} months loaded`);
            },
        );

        months.forEach(yearAndMonth => {
            const [year, month] = yearAndMonth;
            const date = new Date(year, month, 1)
            const dateStr = formatDate(date);
            // If we already have data for the 1st day of the month, assume we have everything.
            if (data.current[dateStr] === undefined) {
                data.current[dateStr] = "loading";
                monthDataRequestPool.addRequest(() => fetchMonth(year, month));
            }
        });
        monthDataRequestPool.start();
        monthDataRequestPool.poll().then(results => {
            results.filter(result => result.results !== null).forEach(result => processMonthData(result));
            setProgress("loading puzzles");
            fetchPuzzles();
        });
    }

    function fetchMonth(year: number, month: number) {
        const [monthStart, monthEnd] = monthStartAndEnd(year, month);
        return window.fetch(
            interpolate(ARCHIVE_URL, {
                userId: userId,
                userCookie: userCookie,
                startDate: formatDate(monthStart),
                endDate: formatDate(monthEnd),
            })
        )
            .then(response => response.json());
    }

    function processMonthData(monthResult: { results: PuzzleData[] }) {
        monthResult.results.forEach(puzzleData => {
            data.current[puzzleData.print_date] = puzzleData;
        });
    }

    function fetchPuzzles() {
        const puzzleRequestPool = new RequestPool<[string, PuzzleData]>(
            50,
            (numCompleted, numTotal) => {
                setProgress(`${numCompleted} of ${numTotal} puzzles loaded`)
            },
        )
        Object.keys(data.current).forEach(puzzleDate => {
            // Optimization: Skip fetching puzzles if they haven't been filled out at all.
            // Should work fine with the Puzzle class but may wrongly classify puzzles
            // as unattempted (if attempted but not filled out at all)
            //
            // Also skip loading if it looks like we've loaded puzzle-level data already
            //
            // Also handle a weird edge case for data where the puzzle is solved but 0% filled by always loading
            // data for solved puzzles.
            const puzzleData = data.current[puzzleDate];
            if (
                isResult(puzzleData) &&
                (puzzleData.solved || puzzleData.percent_filled !== 0) &&
                puzzleData.calcs === undefined
            ) {
                puzzleRequestPool.addRequest(() => fetchPuzzle(puzzleDate));
            }
        });

        puzzleRequestPool.start();
        puzzleRequestPool.poll().then(results => {
            results.forEach(result => {
                const [puzzleDate, solveData] = result;
                const puzzleData = data.current[puzzleDate];
                if (isResult(puzzleData)) {
                    puzzleData.calcs = solveData.calcs;
                    puzzleData.firsts = solveData.firsts;
                }
            });

            const processedData = Object.values(data.current)
                .filter(isResult)
                .map(puzzleData => new Puzzle(puzzleData as LoadedPuzzleData).blob());

            setLoaded(true);
            setResult(processedData);
        });
    }

    function fetchPuzzle(puzzleDate: string): Promise<[string, PuzzleData]> {
        const puzzleData = data.current[puzzleDate] as PuzzleData;
        const puzzleId = puzzleData.puzzle_id;
        return window.fetch(
            interpolate(PUZZLE_URL, {
                puzzleId: puzzleId,
                userId: userId,
                userCookie: userCookie,
            })
        )
            .then(response => response.json())
            .then(json => [puzzleDate, json]);
    }

    return [result, loaded, progress];
}

