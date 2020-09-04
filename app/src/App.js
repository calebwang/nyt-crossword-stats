import React from "react";
import "./App.css";
import dc from "dc";


const UID = "77239038"
const ARCHIVE_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v3/{uid}/puzzles.json?publish_type=daily&sort_order=asc&sort_by=print_date&date_start={start_date}&date_end={end_date}"
const GAME_URL = "https://nyt-games-prd.appspot.com/svc/crosswords/v6/game/{gid}.json"

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
                        ?  <DataContent userId={this.state.userId} userCookie={this.state.userCookie} />
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
            userId: "",
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
                <form className="UserForm-form" onSubmit={this.handleSubmit}>
                    <div className="UserForm-fields">
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
        if (event.charCode == 13) {
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
            <DataLoader render={this.renderVisualization} />
        );
    }

    renderVisualization(data) {
        return "DATA";
    }
}

class DataLoader extends React.Component {
    constructor() {
        super();
        this.state = {
            loaded: false
        };
    }

    render() {
        if (this.state.loaded === false) {
            return "Loading foo";
        }

        return this.props.render({
            data: null,
        });
    }
}

class DataVisualizer extends React.Component {

}

export default App;
