import React from "react";
import "./App.css";
import { addMonths } from "./utils.js";
import UserForm from "./UserForm.js";
import MainContent from "./MainContent.js";

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
                        ?  <MainContent
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

export default App;
