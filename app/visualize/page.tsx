"use client";
import "./page.css";

import * as dc from "dc";
import * as crossfilter from "crossfilter2";
import * as d3 from "d3";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { DatePicker, DateRangeOption } from "components/datePicker";
import { useDataLoader } from "utils/dataLoader";
import { range, formatTime, MovingWindow, monthStartAndEnd, addMonths } from "utils/utils";


function getDateRangeFromOption(dateRangeOption: DateRangeOption): [Date, Date] {
    const now = new Date();
    const [monthStart, monthEnd] = monthStartAndEnd(now.getFullYear(), now.getMonth());
    switch(dateRangeOption) {
        case "this_year":
            const yearStart = new Date(now.getFullYear(), 0, 1); return [yearStart, monthEnd];
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
}



export default function Visualize() {
    const queryParams = useSearchParams();
    const userId = queryParams.get("userId") as string;
    const userCookie = queryParams.get("userCookie") as string;
    const initialDateRangeOption = queryParams.get("initialDateRangeOption") as DateRangeOption;
    const [dateRangeOption, setDateRangeOption] = useState(initialDateRangeOption);
    const [startDate, endDate] = getDateRangeFromOption(dateRangeOption);

    const [result, loaded, progress] = useDataLoader(
        userId, userCookie, startDate, endDate);

    const [params, setParams] = useState<DrawParams>({
        maxDisplayedCompletionTime: 60,
        movingAverageWindowSize: 10,
        distributionBucketSize: 2,
        useSolveDate: false
    });

    useEffect(() => {
        if (loaded) {
            setTimeout(() => draw(result, startDate, endDate, params), 0);
        }
    });

    if (!loaded) {
        return (
            <div>
                {progress}
            </div>
        );
    }


    return (
        <div className="DataVisualizer">
            <DatePicker
                className="DataVisualizer-datePicker"
                value={dateRangeOption}
                onChange={setDateRangeOption}
            />
            <div className="DataVisualizer-charts">
                <div id="DataVisualizer-col1" className="DataVisualizer-col">
                    <ChartSection title="Average completion time over time (minutes, smoothed)" chartId="solveTimeOverTimeChart" />
                    <ChartSection title="Completion time distribution (minutes)" chartId="timeDistributionChart" />
                    <ChartSection title="Puzzles by week" chartId="dateChart" />
                </div>
                <div id="DataVisualizer-col2" className="DataVisualizer-col">
                    <ChartSection title="By day" chartId="dayChart" />
                    <ChartSection title="By status" chartId="statusChart" />
                    <ChartSection title="Completion rate" chartId="solveRateChart" />
                    <ChartSection title="Average completion time" chartId="solveTimeChart" />
                </div>
            </div>
            <table className="table table-hover" id="DataVisualizer-dataTable"></table>
        </div>
    );
}

type DrawParams = {
    maxDisplayedCompletionTime: number;
    movingAverageWindowSize: number;
    distributionBucketSize: number;
    useSolveDate: boolean;
}

function draw(data: any, startDate: Date, endDate: Date, params: DrawParams) {
    const ndx: any = (crossfilter as any)(data);

    function getStatus(d: any) {
        if (d.solved) {
            return "Solved";
        } else if (d.attempted) {
            return "In Progress";
        } else {
            return "Not Started";
        }
    }

    const weekDimension = ndx.dimension((d: any) => {
        const date = params.useSolveDate ? d.solveDate : d.date;
        return d3.timeWeek.floor(new Date(date))
    });

    const countByWeekAndStatusGroup = weekDimension.group().reduce(
        (group: any, puzzleData: any) => {
            if (puzzleData.solved) {
                group.solved += 1;
            } else if (puzzleData.attempted) {
                group.attempted += 1;
            } else {
                group.not_started += 1;
            }
            return group;
        },
        (group: any, puzzleData: any) => {
            if (puzzleData.solved) {
                group.solved -= 1;
            } else if (puzzleData.attempted) {
                group.attempted -= 1;
            } else {
                group.not_started -= 1;
            }
            return group;
        },
        () => ({
            attempted: 0,
            solved: 0,
            not_started: 0,
        })
    );
    const dateChart = dc.barChart("#DataVisualizer-dateChart");

    (dateChart
        .width(1000)
        .height(150)
        .margins({ left: 100, right: 50, top: 5, bottom: 30 })
        .dimension(weekDimension)
        .elasticY(true)
        .x(d3.scaleTime().domain([startDate.getTime(), endDate.getTime()]))
        .round(d3.timeWeek.floor) as any)
        .xUnits(d3.timeWeeks)
        .group(countByWeekAndStatusGroup, "Solved", (group: any) => group.value.solved)
        .stack(countByWeekAndStatusGroup, "In Progress", (group: any) => group.value.attempted)
        .stack(countByWeekAndStatusGroup, "Not Started", (group: any) => group.value.not_started);

    dateChart.legend(dc.legend());
    dateChart.render();


    // Shares a reducer with solveTimeByDayGroup
    const solveTimeByWeekGroup = weekDimension.group().reduce(
        (group: any, d: any) => {
            if (d.solved) {
                group.totalTime += d.solveTime;
                group.numSolved++;
                group.avgTime = group.numSolved ? group.totalTime / group.numSolved : 0;
            }
            return group;
        },
        (group: any, d: any) => {
            if (d.solved) {
                group.totalTime -= d.solveTime;
                group.numSolved--;
                group.avgTime = group.numSolved ? group.totalTime / group.numSolved : 0;
            }
            return group;
        },
        () => ({
            totalTime: 0,
            numSolved: 0,
            avgTime: 0,
        })
    );

    function averageSolveTimeOverTimeGrouper(sourceGroup: any) {
        return {
            all: () => {
                const movingWindow = new MovingWindow(params.movingAverageWindowSize);
                return sourceGroup.all().map((g: any) => {
                    // Skip weeks with no solve data
                    if (g.value.numSolved > 0) {
                        movingWindow.add(g.value);
                    }

                    const windowTotals: any = movingWindow.items().reduce(
                        (acc: any, groupValue: any) => {
                            acc.totalTime += groupValue.totalTime;
                            acc.numSolved += groupValue.numSolved;
                            return acc;
                        },
                        { totalTime: 0, numSolved: 0 }
                    );

                    const windowAverage = windowTotals.numSolved > 0
                        ? windowTotals.totalTime / windowTotals.numSolved
                        : 0;

                    return { key: g.key, value: windowAverage };
                });
            }
        }
    }
    const averageSolveTimeOverTimeGroup = averageSolveTimeOverTimeGrouper(solveTimeByWeekGroup);

    const solveTimeOverTimeChart = dc.lineChart("#DataVisualizer-solveTimeOverTimeChart");
    (solveTimeOverTimeChart
        .width(1000)
        .height(400)
        .margins({ left: 30, right: 50, top: 10, bottom: 30 })
        .dimension(weekDimension)
        .group(averageSolveTimeOverTimeGroup)
        .rangeChart(dateChart)
        .brushOn(false)
        .mouseZoomable(true)
        .x(d3.scaleTime().domain([startDate.getTime(), endDate.getTime()]))
        .round(d3.timeWeek.floor) as any)
        .xUnits(d3.timeWeeks)
        .elasticY(true)
        .yAxisPadding(60)
        .curve(d3.curveCatmullRom.alpha(0.5));

    (solveTimeOverTimeChart as any)
        .yAxis()
        .tickValues(range(0, 90, 5).map(m => m * 60))
        .tickFormat((v: any) => Math.floor(v / 60));

    solveTimeOverTimeChart.render();

    const solveTimeDimension = ndx.dimension((d: any) => {
        return d.solved ? Math.floor(d.solveTime / 60) : -1;
    });
    const solveTimeGroup = solveTimeDimension.group((value: any) => {
        return Math.floor(value / params.distributionBucketSize) * params.distributionBucketSize;
    });
    const solveTimeChart = dc.barChart("#DataVisualizer-timeDistributionChart");

    solveTimeChart
        .width(1000)
        .height(400)
        .margins({ left: 100, right: 50, top: 10, bottom: 30 })
        .dimension(solveTimeDimension)
        .group(solveTimeGroup)
        .round(v => Math.floor(v))
        .x(d3.scaleLinear().domain([0, params.maxDisplayedCompletionTime]))
        .xUnits(() => params.maxDisplayedCompletionTime / params.distributionBucketSize)
        .elasticY(true);

    solveTimeChart.render();



    // # Render Column 2
    const dayDimension = ndx.dimension((d: any) => d.day);
    const dayGroup = dayDimension.group();

    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    const daysOfWeekLabels = ["Su", "M", "Tu", "W", "Th", "Fr", "Sa"];
    const dayChart = dc.pieChart("#DataVisualizer-dayChart");
    dayChart
        .width(200)
        .height(200)
        .dimension(dayDimension)
        .group(dayGroup)
        .label((d: any) => `${daysOfWeekLabels[d.key]} (${d.value})`);

    dayChart.render();


    const statusDimension = ndx.dimension(getStatus);
    const statusGroup = statusDimension.group();

    const statusChart = dc.pieChart("#DataVisualizer-statusChart");
    statusChart
        .width(200)
        .height(200)
        .dimension(statusDimension)
        .group(statusGroup)
        .label((d: any) => `${d.key} (${d.value})`);

    statusChart.render();


    const dayDimension2 = ndx.dimension((d: any) => d.day);
    const solveRateByDayGroup = dayDimension2.group().reduce(
        (group: any, d: any) => {
            if (d.solved) {
                group.solved++;
            }
            group.total++;
            group.solvePct = Math.round(100 * group.solved / group.total);
            return group;
        },
        (group: any, d: any) => {
            if (d.solved) {
                group.solved--;
            }
            group.total--;
            group.solvePct = group.total === 0 ? 0 : Math.round(100 * group.solved / group.total);
            return group;
        },
        () => ({
            solved: 0,
            total: 0,
            solvePct: 0,
        })
    );

    const solveRateChart = dc.rowChart("#DataVisualizer-solveRateChart");
    solveRateChart
        .width(220)
        .height(230)
        .margins({ left: 10, top: 0, bottom: 30, right: 20 })
        .dimension(dayDimension2)
        .group(solveRateByDayGroup)
        .valueAccessor(g => g.value.solvePct)
        .label((d: any) => `${daysOfWeekLabels[d.key]} (${d.value.solvePct}%)`);
    solveRateChart.render();

    const solveTimeByDayGroup = dayDimension2.group().reduce(
        (group: any, d: any) => {
            if (d.solved) {
                group.totalTime += d.solveTime;
                group.numSolved++;
                group.avgTime = group.numSolved ? group.totalTime / group.numSolved : 0;
            }
            return group;
        },
        (group: any, d: any) => {
            if (d.solved) {
                group.totalTime -= d.solveTime;
                group.numSolved--;
                group.avgTime = group.numSolved ? group.totalTime / group.numSolved : 0;
            }
            return group;
        },
        () => ({
            totalTime: 0,
            numSolved: 0,
            avgTime: 0,
        })
    );
    const solveTimeByDayChart = dc.rowChart("#DataVisualizer-solveTimeChart");
    solveTimeByDayChart
        .width(220)
        .height(230)
        .margins({ left: 10, top: 0, bottom: 30, right: 20 })
        .elasticX(true)
        .dimension(dayDimension2)
        .group(solveTimeByDayGroup)
        .valueAccessor(g => g.value.avgTime)
        .label((d: any) => `${daysOfWeekLabels[d.key]} (${formatTime(d.value.avgTime)})`);

    (solveTimeByDayChart
        .xAxis()
        .ticks(4)
        .tickValues(range(0, params.maxDisplayedCompletionTime, 15).map(m => m * 60)) as any)
        .tickFormat((v: any) => Math.floor(v/60));
    solveTimeByDayChart.render();

    const dateDimension = ndx.dimension((d: any) => {
        const date = params.useSolveDate ? d.solveDate : d.date;
        return d3.timeDay.floor(new Date(date))
    });

    const table = dc.dataTable("#DataVisualizer-dataTable");
    table
        .dimension(dateDimension)
        .size(100)
        .columns([
            "date",
            "solveDate",
            { label: "Day", format: (d: any) => daysOfWeekLabels[d.day] },
            { label: "Status", format: (d: any) => getStatus(d) },
            "solveTime",
        ])
        .on("renderlet", table => {
          table.selectAll(".dc-table-group").classed("info", true);
        });
    table.render();
}

function ChartSection ({ title, chartId } : { title: string, chartId: string }) {
    return (
         <div className="DataVisualizer-chartSection">
            <div className="DataVisualizer-chartHeader">
                {title}
            </div>
            <div id={`DataVisualizer-${chartId}`} />
        </div>
    );
}


