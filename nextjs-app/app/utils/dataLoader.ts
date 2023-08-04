import { useState, useEffect, useRef } from "react";
import { localMidnightDateFromString, interpolate, monthsRange, monthStartAndEnd, formatDate, RequestPool } from "app/utils/utils";

type PuzzleData = {
    puzzle_id: string;
    print_date: string;
    firsts?: {
        checked: number;
        solved: number;
    }
    solved: boolean;
    calcs?: {
        secondsSpentSolving: number; }
}

class Puzzle {
    data: PuzzleData;

    constructor(data: PuzzleData) {
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

    solved() {
        return this.data.solved;
    }

    cleanlySolved() {
        return this.solved() && this.data.firsts.checked === undefined;
    }

    solveTime(): number | null {
        // Sanitize NYT data problems
        if (this.solved() && this.data.calcs.secondsSpentSolving !== undefined) {
            return this.data.calcs.secondsSpentSolving;
        }
        return null;
    }

    solveDate(): number | null {
        if (this.solved()) {
            return formatDate(new Date(this.data.firsts.solved * 1000));
        }
        return null;
    }
}

const ARCHIVE_URL = "/api/archive?userId={userId}&userCookie={userCookie}&startDate={startDate}&endDate={endDate}";
const PUZZLE_URL = "/api/puzzle?userId={userId}&userCookie={userCookie}&puzzleId={puzzleId}";

export function useDataLoader(userId: string, userCookie: string, initialStartDate: Date, initialEndDate: Date) {
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [loaded, setLoaded] = useState(false);
    const [result, setResult] = useState({});
    const [progress, setProgress] = useState("");

    const data = useRef({});

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

        const monthDataRequestPool = new RequestPool(
            20,
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

    function fetchMonth(year, month) {
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

    function processMonthData(monthResult) {
        monthResult.results.forEach(puzzleData => {
            data.current[puzzleData.print_date] = puzzleData;
        });
    }

    function fetchPuzzles() {
        const puzzleRequestPool = new RequestPool(
            20,
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
            if (
                (data.current[puzzleDate].solved || data.current[puzzleDate].percent_filled !== 0) &&
                data.current[puzzleDate].calcs === undefined
            ) {
                puzzleRequestPool.addRequest(() => fetchPuzzle(puzzleDate));
            }
        });

        puzzleRequestPool.start();
        puzzleRequestPool.poll().then(results => {
            results.forEach(result => {
                const [puzzleDate, solveData] = result;
                data.current[puzzleDate].calcs = solveData.calcs;
                data.current[puzzleDate].firsts = solveData.firsts;
            });

            const processedData = Object.values(data.current).map(puzzleData => new Puzzle(puzzleData).blob());
            setLoaded(true);
            setResult(processedData);
        });
    }

    function fetchPuzzle(puzzleDate) {
        const puzzleId = data.current[puzzleDate].puzzle_id;
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

    return [result, loaded, progress, setStartDate, setEndDate];
}

