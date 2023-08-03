import Image from 'next/image'
import { useRouter } from 'next/router'

export default function Home() {
  return (
    <main>
        <UserForm/>
    </main>
  )
}

function UserForm() {
    const router = useRouter();
    const [userId, setUserId] = useState(null);
    const [userCookie, setUserCookie] = useState(null);
    const [dateRangeOption, setDateRangeOption] = useState(null);

    const submit = () => {
        router.push({
            pathname: '/visualize',
            query: {q: `userId=${userId}&userCookie=${userCookie}&defaultDateRange=${dateRangeOption}`},
       });
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
                        <input className="UserForm-fieldInput" id="UserForm-userIdInput" type="text" value={userId} onChange={setUserId} />
                    </div>
                    <div id="UserForm-dateRange" className="UserForm-field">
                        <label className="UserForm-label">Date Range</label>
                        <select name="dateRange" id="UserForm-dateRangeInput" className="UserForm-fieldInput" value={dateRangeOption} onChange={setDateRangeOption}>
                            <option value="this_year">This year</option>
                            <option value="last_year">Last year</option>
                            <option value="last_3">Last 3 months</option>
                            <option value="last_12">Last 12 months</option> <option value="last_24">Last 2 years</option>
                            <option value="last_60">Last 5 years</option>
                        </select>
                    </div>
                    <div id="UserForm-userCookie" className="UserForm-field">
                        <label className="UserForm-label">NYT-S Cookie</label>
                        <textarea className="UserForm-fieldInput" id="UserForm-userCookieInput" type="text" value={userCookie} onChange={setUserCookie} onKeyPress={handleKeyPress} ref={userCookieInputRef}/>
                    </div>
                </div>
                <input className="UserForm-submitButton" type="submit"/>
            </form>
        </div>
    );

}
