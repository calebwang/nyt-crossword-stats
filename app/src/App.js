import React from "react";
import "./App.css";
import { interpolate, monthsRange, addMonths, monthStartAndEnd, formatDate, RequestPool } from "./utils.js";
import dc from "dc";


const UID = "77239038"

class App extends React.Component {
    constructor() {
        super();
        this.state = {
            userId: null,
            userCookie: null,
        };
        this.onInputUserDetails = this.onInputUserDetails.bind(this);
    }

    render() {
        return (
            <div className="App">
                <UserForm onSubmit={this.onInputUserDetails}/>
                {
                    this.state.userId
                        ?  <DataContent userId={this.state.userId} userCookie={this.state.userCookie} key={this.state.userId} />
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
        this.handleSubmit = this.handleSubmit.bind(this);
        this.submit = this.submit.bind(this);
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
            <DataLoader userId={this.props.userId} userCookie={this.props.userCookie} render={this.renderVisualization} />
        );
    }

    renderVisualization(data) {
        return <DataVisualizer data={data} />;
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
        const now = new Date();
        const [currentYear, currentMonth] = [now.getFullYear(), now.getMonth()];
        const [startYear, startMonth] = addMonths(currentYear, currentMonth, -1);
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
            results.forEach(result => this.processMonthData(result));
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
    render() {
        return JSON.stringify(this.props.data, null, 4);
    }
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
