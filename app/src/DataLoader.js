import React from "react";
import { interpolate, monthsRange, monthStartAndEnd, formatDate, RequestPool } from "./utils.js";

class Puzzle {
    constructor(data) {
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
        // Sigh: When creating Dates from a string like "2020-01-01", the result is UTC midnight
        // but this may be a different day in the local timezone.
        return new Date(this.data.print_date).getUTCDay();
    }

    attempted() {
        return this.data.firsts !== undefined;
    }

    solved() {
        return this.data.solved;
    }

    cleanlySolved() {
        console.log(this.data);
        return this.solved() && this.data.firsts.checked === undefined;
    }

    solveTime() {
        if (this.solved()) {
            return this.data.calcs.secondsSpentSolving;
        }
        return -1;
    }

    solveDate() {
        if (this.solved()) {
            return formatDate(new Date(this.data.firsts.solved * 1000));
        }
        return -1;
    }
}

class DataLoader extends React.Component {

    static ARCHIVE_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v3/{uid}/puzzles.json?publish_type=daily&sort_order=asc&sort_by=print_date&date_start={start_date}&date_end={end_date}"
    static GAME_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v6/game/{gid}.json"

    constructor() {
        super();
        this.data = {};
        this.state = {
            loaded: false,
            data: {},
            progress: "",
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.numPendingRequests > 0 && this.state.numPendingRequests === 0) {
            this.setState({
                loaded: true,
            });
        }

        if (
            this.props.startDate.getTime() !== prevProps.startDate.getTime() ||
            this.props.endDate.getTime() !== prevProps.endDate.getTime()
        ) {
            this.setState({
                loaded: false,
            });
            this.fetch();
        }
    }

    componentDidMount() {
        this.fetch();
    }

    render() {
        if (this.state.loaded === false) {
            return "Loading " + this.state.progress;
        }

        return this.props.render(this.state.data);
    }

    fetch() {
        const [startYear, startMonth] = [this.props.startDate.getFullYear(), this.props.startDate.getMonth()];
        const [currentYear, currentMonth] = [this.props.endDate.getFullYear(), this.props.endDate.getMonth()];
        const months = monthsRange(startYear, startMonth, currentYear, currentMonth);

        const monthDataRequestPool = new RequestPool(
            20,
            (numCompleted, numTotal) => {
                this.setState({
                    progress: numCompleted + "/" + numTotal + " months"
                });
            },
        );

        months.forEach(yearAndMonth => {
            const [year, month] = yearAndMonth;
            const date = new Date(year, month, 1)
            // If we already have data for the 1st day of the month, assume we have everything.
            if (this.data[formatDate(date)] === undefined) {
                monthDataRequestPool.addRequest(() => this.fetchMonth(year, month));
            }
        });
        monthDataRequestPool.start();
        monthDataRequestPool.poll().then(results => {
            results.filter(result => result.results !== null).forEach(result => this.processMonthData(result));
            this.setState({
                progress: "puzzle data",
            });
            this.fetchPuzzles();
        });
    }

    fetchMonth(year, month) {
        const [monthStart, monthEnd] = monthStartAndEnd(year, month);
        return window.fetch(
            interpolate(DataLoader.ARCHIVE_URL, {
                uid: this.props.userId,
                start_date: formatDate(monthStart),
                end_date: formatDate(monthEnd),
            })
        )
            .then(response => response.json());
    }

    processMonthData(data) {
        console.log(data);
        data.results.forEach(puzzleData => {
            this.data[puzzleData.print_date] = puzzleData;
        });
    }

    fetchPuzzles() {
        console.log("fetching puzzles");
        const puzzleRequestPool = new RequestPool(
            20,
            (numCompleted, numTotal) => {
                this.setState({
                    progress: numCompleted + "/" + numTotal + " puzzles"
                });
            },
        )
        Object.keys(this.data).forEach(puzzleDate => { // Optimization: Skip fetching puzzles if they haven't been filled out at all.
            // Should work fine with the Puzzle class but may wrongly classify puzzles
            // as unattempted (if attempted but not filled out at all)
            //
            // Also skip loading if it looks like we've loaded puzzle-level data already
            //
            // Also handle a weird edge case for data where the puzzle is solved but 0% filled by always loading
            // data for solved puzzles.
            if (
                (this.data[puzzleDate].solved || this.data[puzzleDate].percent_filled !== 0) &&
                this.data[puzzleDate].calcs === undefined
            ) {
                puzzleRequestPool.addRequest(() => this.fetchPuzzle(puzzleDate));
            }
        });

        puzzleRequestPool.start();
        puzzleRequestPool.poll().then(results => {
            results.forEach(result => {
                const [puzzleDate, solveData] = result;
                this.data[puzzleDate].calcs = solveData.calcs;
                this.data[puzzleDate].firsts = solveData.firsts;
            });

            const processedData = Object.values(this.data).map(puzzleData => new Puzzle(puzzleData).blob());

            this.setState({
                loaded: true,
                data: processedData,
            });
        });
    }

    fetchPuzzle(puzzleDate) {
        const puzzleId = this.data[puzzleDate].puzzle_id;
        console.log(puzzleId);
        return window.fetch(
            interpolate(DataLoader.GAME_URL, {
                gid: puzzleId,
            }), {
                headers: {
                    "nyt-s": this.props.userCookie,
                }
            }
        )
            .then(response => response.json())
            .then(json => [puzzleDate, json]);

    }
}

export default DataLoader;


