import React from "react";
import "./App.css";
import { interpolate, monthsRange, addMonths, monthStartAndEnd, formatDate } from "./utils.js";
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
            <DataLoader userId={this.props.userId} render={this.renderVisualization} />
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
            numPendingRequests: 0,
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
            return "Loading foo";
        }

        return this.props.render(this.data);
    }

    fetch() {
        const now = new Date();
        const [currentYear, currentMonth] = [now.getFullYear(), now.getMonth()];
        const [startYear, startMonth] = addMonths(currentYear, currentMonth, -12);
        const months = monthsRange(startYear, startMonth, currentYear, currentMonth);
        console.log(months);
        months.forEach(yearAndMonth => {
            const [year, month] = yearAndMonth;
            this.fetchMonth(year, month);
        });
        this.setState({
            numPendingRequests: months.length,
        });
    }

    fetchMonth(year, month) {
        const [monthStart, monthEnd] = monthStartAndEnd(year, month);
        window.fetch(
            interpolate(DataLoader.ARCHIVE_URL, {
                uid: this.props.userId,
                start_date: formatDate(monthStart),
                end_date: formatDate(monthEnd),
            })
        )
        .then(response => response.json())
        .then(data => {
            console.log(data);
            data.results.forEach(puzzleData => {
                this.data[puzzleData.print_date] = puzzleData;
            });
            this.setState(state => {
                return {
                    numPendingRequests: state.numPendingRequests - 1,
                };
            });
        });
    }

}

class DataVisualizer extends React.Component {
    render() {
        return JSON.stringify(this.props.data, null, 4);
    }
}

export default App;
