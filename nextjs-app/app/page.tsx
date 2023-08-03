"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";


const DateRangeOptions = {
    "this_year": "This year",
    "last_year": "Last year",
    "last_3": "Last 3 months",
    "last_24": "Last 2 years",
    "last_60": "Last 5 years",
}

type DateRangeOption = keyof DateRangeOptions;


export default function Home() {
  return (
    <main>
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
            `/visualize?userId=${userId}&userCookie=${userCookie}&defaultDateRangeOption=${dateRangeOption}`
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submit();
    };

    const handleFormKeyPress = (e) => {
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
                <ol>
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
                    <li>
                        [Optional] Use React Dev Tools to edit configuration settings for the charts.
                    </li>
                </ol>
            </div>
            <form className="UserForm-form" onSubmit={handleSubmit}> <div className="UserForm-fields">
                    <div id="UserForm-userId" className="UserForm-field">
                        <label className="UserForm-label">User ID</label>
                        <input
                            className="UserForm-fieldInput"
                            id="UserForm-userIdInput"
                            type="text"
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                        />
                    </div>
                    <div id="UserForm-dateRange" className="UserForm-field">
                        <label className="UserForm-label">Date Range</label>
                        <select name="dateRange"
                            id="UserForm-dateRangeInput"
                            className="UserForm-fieldInput"
                            value={dateRangeOption}
                            onChange={e => setDateRangeOption(e.target.value)}
                        >
                            {
                                Object.keys(DateRangeOptions).map(key =>
                                    <option value={key}>{DateRangeOptions[key]}</option>
                                )
                            }
                        </select>
                    </div>
                    <div id="UserForm-userCookie" className="UserForm-field">
                        <label className="UserForm-label">NYT-S Cookie</label>
                        <textarea
                            className="UserForm-fieldInput"
                            id="UserForm-userCookieInput"
                            type="text"
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
