import React from "react";
import "./App.css";
import { interpolate, monthsRange, addMonths, monthStartAndEnd, formatDate, RequestPool } from "./utils.js";
import * as dc from "dc";
import * as crossfilter from "crossfilter2";
import * as d3 from "d3";


const UID = "77239038"

class App extends React.Component {
    constructor() {
        super();
        this.state = {
            userId: null,
            userCookie: null,
            startDate: new Date(2020, 0, 1),
            endDate: new Date(2020, 9, 1),
        };
        this.onInputUserDetails = this.onInputUserDetails.bind(this);
    }

    render() {
        return (
            <div className="App">
                <UserForm onSubmit={this.onInputUserDetails}/>
                {
                    this.state.userId
                        ?  <DataContent
                                userId={this.state.userId}
                                userCookie={this.state.userCookie}
                                startDate={this.state.startDate}
                                endDate={this.state.endDate}
                                key={this.state.userId}
                           />
                        : null
                }
            </div>
        );
    }

    onInputUserDetails(attr) {
        this.setState(attr);
    }
}

class UserForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            userId: UID,
            userCookie: "",
        };

        this.setUserId = this.setUserId.bind(this);
        this.setUserCookie = this.setUserCookie.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this); this.submit = this.submit.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        this.userCookieInputRef = React.createRef();
    }

    render() {
        return (
            <div className="UserForm">
                <div className="UserForm-header">
                    User Information
                </div>
                <form className="UserForm-form" onSubmit={this.handleSubmit}> <div className="UserForm-fields">
                        <div id="UserForm-userId" className="UserForm-field">
                            <label className="UserForm-label">User ID</label>
                            <input className="UserForm-fieldInput" id="UserForm-userIdInput" type="text" value={this.state.userId} onChange={this.setUserId} />
                        </div>
                        <div id="UserForm-userCookie" className="UserForm-field">
                            <label className="UserForm-label">NYT-S Cookie</label>
                            <textarea className="UserForm-fieldInput" id="UserForm-userCookieInput" type="text" value={this.state.userCookie} onChange={this.setUserCookie} onKeyPress={this.handleKeyPress} ref={this.userCookieInputRef}/>
                        </div>
                    </div>
                    <input className="UserForm-submitButton" type="submit"/>
                </form>
            </div>
        );
    }

    handleSubmit(event) {
        event.preventDefault();
        this.submit();
    }

    submit() {
        this.userCookieInputRef.current.blur();
        this.props.onSubmit({
            userId: this.state.userId,
            userCookie: this.state.userCookie,
        });
    }

    handleKeyPress(event) {
        // Suppress Enter
        if (event.charCode === 13) {
            this.submit();
            event.preventDefault();
        }
    }

    setUserId(event) {
        this.setState({
            userId: event.target.value
        });
    }

    setUserCookie(event) {
        this.setState({
            userCookie: event.target.value
        });
    }
}

class DataContent extends React.Component {
    constructor() {
        super();
        this.renderVisualization = this.renderVisualization.bind(this);
    }

    render() {
        return (
            <DataLoader
                userId={this.props.userId}
                userCookie={this.props.userCookie}
                render={this.renderVisualization}
                startDate={this.props.startDate}
                endDate={this.props.endDate}
            />
        );
    }

    renderVisualization(data) {
        return <DataVisualizer data={data} startDate={this.props.startDate} endDate={this.props.endDate} />;
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
        const [startYear, startMonth] = [this.props.startDate.getUTCFullYear(), this.props.startDate.getUTCMonth()];
        const [currentYear, currentMonth] = [this.props.endDate.getUTCFullYear(), this.props.endDate.getUTCMonth()];
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
            monthDataRequestPool.addRequest(() => this.fetchMonth(year, month));
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
            if (this.data[puzzleDate].percent_filled !== 0) {
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

class DataVisualizer extends React.Component {
    componentDidMount() {
        this.ndx = crossfilter(this.props.data);

        function getStatus(d) {
            if (d.solved) {
                return "Solved";
            } else if (d.attempted) {
                return "Attempted";
            } else {
                return "Not Started";
            }
        }

        const weekDimension = this.ndx.dimension(d => d3.timeWeek.floor(new Date(d.date)));
        const countByWeekAndStatusGroup = weekDimension.group().reduce(
            (group, puzzleData) => {
                if (puzzleData.solved) {
                    group.solved += 1;
                } else if (puzzleData.attempted) {
                    group.attempted += 1;
                } else {
                    group.not_started += 1;
                }
                return group;
            },
            (group, puzzleData) => {
                if (puzzleData.solved) {
                    group.solved -= 1;
                } else if (puzzleData.attempted) {
                    group.attempted -= 1;
                } else {
                    group.not_started -= 1;
                }
                return group;
            },
            () => ({
                attempted: 0,
                solved: 0,
                not_started: 0,
            })
        );
        const dateChart = dc.barChart("#DataVisualizer-dateChart");

        dateChart
            .width(1000)
            .height(500)
            .margins({ left: 100, right: 50, top: 0, bottom: 30 })
            .dimension(weekDimension)
            .group(countByWeekAndStatusGroup, "Solved", group => group.value.solved)
            .stack(countByWeekAndStatusGroup, "Attempted", group => group.value.attempted)
            .stack(countByWeekAndStatusGroup, "Not Started", group => group.value.not_started)
            .x(d3.scaleTime().domain([this.props.startDate.getTime(), this.props.endDate.getTime()]))
            .round(d3.timeWeek.floor)
            .xUnits(d3.timeWeeks);

        dateChart.legend(dc.legend());
        dateChart.render();

        const dayDimension = this.ndx.dimension(d => d.day);
        const dayGroup = dayDimension.group();

        const daysOfWeek = ["Su", "M", "Tu", "W", "Th", "Fr", "Sa"];
        const dayChart = new dc.PieChart("#DataVisualizer-dayChart");
        dayChart
            .width(200)
            .height(200)
            .dimension(dayDimension)
            .group(dayGroup)
            .label(d => daysOfWeek[d.key] + " (" + d.value + ")");

        dayChart.render();


        const statusDimension = this.ndx.dimension(getStatus);
        const statusGroup = statusDimension.group();

        const statusChart = new dc.PieChart("#DataVisualizer-statusChart");
        statusChart
            .width(200)
            .height(200)
            .dimension(statusDimension)
            .group(statusGroup)
            .label(d => d.key + "(" + d.value + ")");

        statusChart.render();

        const solveTimeDimension = this.ndx.dimension(d => {
            return d.solveTime / 60;
        });
        const solveTimeGroup = solveTimeDimension.group(value => {
            return Math.floor(value/2) * 2;
        }).reduceCount();
        const solveTimeChart = new dc.BarChart("#DataVisualizer-timeDistributionChart");

        solveTimeChart
            .width(1200)
            .height(500)
            .margins({ left: 100, right: 50, top: 0, bottom: 30 })
            .dimension(solveTimeDimension)
            .group(solveTimeGroup)
            .x(d3.scaleLinear().domain([0, 60]))
            .xUnits(() => 30);

        solveTimeChart.render();

        const table = new dc.DataTable("#DataVisualizer-dataTable");
        table
            .dimension(weekDimension)
            .size(100)
            .columns([
                "date",
                "day",
                { label: "Status", format: d => getStatus(d) },
                "solveTime",
            ])
            .on("renderlet", table => {
              table.selectAll(".dc-table-group").classed("info", true);
            });
        table.render();


    }

    render() {
        return (
            <div className="DataVisualizer">
                <div className="DataVisualizer-row1">
                    <div id="DataVisualizer-dateChart"></div>
                    <div className="DataVisualizer-row1-section2">
                        <div id="DataVisualizer-dayChart"></div>
                        <div id="DataVisualizer-statusChart"></div>
                    </div>
                </div>
                <div id="DataVisualizer-solveRateChart"> </div>
                <div id="DataVisualizer-timeDistributionChart"> </div>
                <table className="table table-hover" id="DataVisualizer-dataTable"></table>
            </div>
        );

    }

    comp
}

class Puzzle {
    constructor(data) {
        this.data = data;
    }

    blob() {
        return {
            id: this.id(),
            date: this.date(),
            day: this.day(),
            attempted: this.attempted(),
            solved: this.solved(),
            cleanlySolved: this.cleanlySolved(),
            solveTime: this.solveTime(),
        };
    }

    id() {
        return this.data.puzzle_id;
    }

    date() {
        return this.data.print_date;
    }

    day() {
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
}

export default App;
