"use client";
import "./page.css";

import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";

import { DatePicker, DateRangeOption } from "components/datePicker";


export default function Home() {
  return (
    <main className="Home">
        <UserForm/>
    </main>
  )
}

function UserForm() {
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [userCookie, setUserCookie] = useState("");
    const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("this_year");

    const submit = () => {
        router.push(
            `/visualize?userId=${userId}&userCookie=${userCookie}&initialDateRangeOption=${dateRangeOption}`
        );
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        submit();
    };

    const handleFormKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.charCode === 13) {
            submit();
            e.preventDefault();
        }
    };


    return (
        <div className="UserForm">
            <div className="UserForm-header">
                User Information
            </div>
            <div className="UserForm-instructions">
                <div className="UserForm-instructionsHeader">
                    Instructions
                </div>
                <ol className="UserForm-instructionList">
                    <li>
                        Log into&nbsp;
                        <a href={`https://myaccount.nytimes.com/seg`}>
                            https://myaccount.nytimes.com/seg
                        </a>
                        &nbsp;and copy your account number. This is your user id.
                    </li>
                    <li>
                        Go to any NYTimes page while logged in and copy the value for the NYT-S cookie.
                    </li>
                    <li>
                        Pick a time range and hit Submit!
                    </li>
                </ol>
            </div>
            <form className="UserForm-form" onSubmit={handleSubmit}> <div className="UserForm-fields">
                    <div id="UserForm-userId" className="UserForm-field">
                        <label className="UserForm-label">User ID</label>
                        <input
                            className="UserForm-fieldInput"
                            id="UserForm-userIdInput"
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                        />
                    </div>
                    <div id="UserForm-dateRange" className="UserForm-field">
                        <label className="UserForm-label">Date Range</label>
                        <DatePicker
                            id="UserForm-dateRangeInput"
                            className="UserForm-fieldInput"
                            value={dateRangeOption}
                            onChange={setDateRangeOption}
                        />
                    </div>
                    <div id="UserForm-userCookie" className="UserForm-field">
                        <label className="UserForm-label">NYT-S Cookie</label>
                        <textarea
                            className="UserForm-fieldInput"
                            id="UserForm-userCookieInput"
                            value={userCookie}
                            onChange={e => setUserCookie(e.target.value)}
                            onKeyPress={handleFormKeyPress}
                        />
                    </div>
                </div>
                <input className="UserForm-submitButton" type="submit"/>
            </form>
        </div>
    );

}
