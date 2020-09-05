import React from "react";
import "./UserForm.css";

const UID = "77239038"
export default class UserForm extends React.Component {
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


