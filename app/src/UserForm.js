import React from "react";
import "./UserForm.css";
import { monthStartAndEnd, addMonths } from "./utils.js";

const UID = "77239038"
export default class UserForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            userId: UID,
            userCookie: "",
            dateRangeOption: "this_year",
        };

        this.setUserId = this.setUserId.bind(this);
        this.setUserCookie = this.setUserCookie.bind(this);
        this.setDateRangeOption = this.setDateRangeOption.bind(this);
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
                        <div id="UserForm-dateRange" className="UserForm-field">
                            <label className="UserForm-label">Date Range</label>
                            <select name="dateRange" id="UserForm-dateRangeInput" className="UserForm-fieldInput" value={this.state.dateRangeOption} onChange={this.setDateRangeOption}>
                                <option value="this_year">This year</option>
                                <option value="last_year">Last year</option>
                                <option value="last_12">Last 12 months</option>
                                <option value="last_24">Last 2 years</option>
                                <option value="last_60">Last 5 years</option>
                            </select>
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

    getDateRangeFromOption() {
        const now = new Date();
        const [monthStart, monthEnd] = monthStartAndEnd(now.getFullYear(), now.getMonth());
        switch(this.state.dateRangeOption) {
            case "this_year":
                const yearStart = new Date(now.getFullYear(), 0, 1);
                return [yearStart, monthEnd];
            case "last_year":
                const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
                const lastYearEnd = new Date(now.getFullYear(), 0, 0);
                return [lastYearStart, lastYearEnd];
            case "last_12":
                const [twelveMonthsAgoYear, twelveMonthsAgoMonth] = addMonths(monthStart.getFullYear(), monthStart.getMonth(), -11)
                const twelveMonthsAgo = new Date(twelveMonthsAgoYear, twelveMonthsAgoMonth);
                return [twelveMonthsAgo, monthEnd];
            case "last_24":
                const [twentyFourMonthsAgoYear, twentyFourMonthsAgoMonth] = addMonths(monthStart.getFullYear(), monthStart.getMonth(), -23)
                const twentyFourMonthsAgo = new Date(twentyFourMonthsAgoYear, twentyFourMonthsAgoMonth);
                return [twentyFourMonthsAgo, monthEnd];
            case "last_60":
                const [sixtyMonthsAgoYear, sixtyMonthsAgoMonth] = addMonths(monthStart.getFullYear(), monthStart.getMonth(), -59)
                const sixtyMonthsAgo = new Date(sixtyMonthsAgoYear, sixtyMonthsAgoMonth);
                return [sixtyMonthsAgo, monthEnd];
            default:
                throw new Error("Invalid selection");
        }
    }

    submit() {
        this.userCookieInputRef.current.blur();
        const [startDate, endDate] = this.getDateRangeFromOption();
        this.props.onSubmit({
            userId: this.state.userId,
            userCookie: this.state.userCookie,
            startDate: startDate,
            endDate: endDate,
        });
    }

    handleKeyPress(event) {
        // Suppress Enter
        if (event.charCode === 13) {
            this.submit();
            event.preventDefault();
        }
    }

    setDateRangeOption(event) {
        this.setState({
            dateRangeOption: event.target.value,
        });
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


