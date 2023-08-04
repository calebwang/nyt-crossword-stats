"use client";
import { useSearchParams } from "next/navigation";
import { useDataLoader } from "../utils/dataLoader";
import { DateRangeOption } from "../page";
import { monthStartAndEnd, addMonths } from "app/utils/utils";

function getDateRangeFromOption(dateRangeOption: DateRangeOption): [Date, Date] {
    const now = new Date();
    const [monthStart, monthEnd] = monthStartAndEnd(now.getFullYear(), now.getMonth());
    switch(dateRangeOption) {
        case "this_year":
            const yearStart = new Date(now.getFullYear(), 0, 1);
            return [yearStart, monthEnd];
        case "last_year":
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(now.getFullYear(), 0, 0);
            return [lastYearStart, lastYearEnd];
        case "last_3":
            const [threeMonthsAgoYear, threeMonthsAgoMonth] = addMonths(monthStart.getFullYear(), monthStart.getMonth(), -2)
            const threeMonthsAgo = new Date(threeMonthsAgoYear, threeMonthsAgoMonth);
            return [threeMonthsAgo, monthEnd];
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
    }

    return [null, null];
}



export default function Visualize() {
    const queryParams = useSearchParams();
    const userId = queryParams.get("userId");
    const userCookie = queryParams.get("userCookie");
    const dateRangeOption = queryParams.get("initialDateRangeOption");
    const [initialStartDate, initialEndDate] = getDateRangeFromOption(dateRangeOption);

    const [result, loaded, progress, setStartDate, setEndDate] = useDataLoader(
        userId, userCookie, initialStartDate, initialEndDate);
    return <div>
        {JSON.stringify(result)}
        {loaded}
        {progress}
    </div>
}
