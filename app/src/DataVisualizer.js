import React from "react";
import * as dc from "dc";
import * as crossfilter from "crossfilter2";
import * as d3 from "d3";
import "./DataVisualizer.css";
import { formatTime, range, MovingWindow } from "./utils.js";

export default class DataVisualizer extends React.Component {
    state = {
        timeWindow: 60,
        windowSize: 10,
        useSolveDate: false,
    };

    componentDidMount() {
        setTimeout(() => this.draw(), 0);
    }

    componentDidUpdate() {
        setTimeout(() => this.draw(), 0);
    }

    draw() {
        const component = this;
        this.ndx = crossfilter(this.props.data);

        function getStatus(d) {
            if (d.solved) {
                return "Solved";
            } else if (d.attempted) {
                return "In Progress";
            } else {
                return "Not Started";
            }
        }

        const weekDimension = this.ndx.dimension(d => {
            const date = this.state.useSolveDate ? d.solveDate : d.date;
            return d3.timeWeek.floor(new Date(date))
        });

        const countByWeekAndStatusGroup = weekDimension.group().reduce(
            (group, puzzleData) => {
                if (puzzleData.solved) {
                    group.solved += 1;
                } else if (puzzleData.attempted) {
                    group.attempted += 1;
                } else {
                    group.not_started += 1;
                }
                return group;
            },
            (group, puzzleData) => {
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

        dateChart
            .width(1000)
            .height(150)
            .margins({ left: 100, right: 50, top: 5, bottom: 30 })
            .dimension(weekDimension)
            .group(countByWeekAndStatusGroup, "Solved", group => group.value.solved)
            .stack(countByWeekAndStatusGroup, "In Progress", group => group.value.attempted)
            .stack(countByWeekAndStatusGroup, "Not Started", group => group.value.not_started)
            .elasticY(true)
            .x(d3.scaleTime().domain([this.props.startDate.getTime(), this.props.endDate.getTime()]))
            .round(d3.timeWeek.floor)
            .xUnits(d3.timeWeeks);

        dateChart.legend(dc.legend());
        dateChart.render();


        // Shares a reducer with solveTimeByDayGroup
        const solveTimeByWeekGroup = weekDimension.group().reduce(
            (group, d) => {
                if (d.solved) {
                    group.totalTime += d.solveTime;
                    group.numSolved++;
                    group.avgTime = group.numSolved ? group.totalTime / group.numSolved : 0;
                }
                return group;
            },
            (group, d) => {
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

        function averageSolveTimeOverTimeGrouper(sourceGroup) {
            return {
                all: () => {
                    const movingWindow = new MovingWindow(component.state.windowSize);
                    return sourceGroup.all().map(g => {
                        movingWindow.add(g.value);
                        const windowTotals = movingWindow.items().reduce(
                            (acc, groupValue) => {
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

        const solveTimeOverTimeChart = new dc.LineChart("#DataVisualizer-solveTimeOverTimeChart");
        solveTimeOverTimeChart
            .width(1000)
            .height(400)
            .margins({ left: 30, right: 50, top: 10, bottom: 30 })
            .dimension(weekDimension)
            .group(averageSolveTimeOverTimeGroup)
            .rangeChart(dateChart)
            .brushOn(false)
            .mouseZoomable(true)
            .curve(d3.curveCatmullRom.alpha(0.5))
            .x(d3.scaleTime().domain([this.props.startDate.getTime(), this.props.endDate.getTime()]))
            .round(d3.timeWeek.floor)
            .xUnits(d3.timeWeeks)
            .elasticY(true)
            .yAxisPadding(60);

        solveTimeOverTimeChart
            .yAxis()
            .tickValues(range(0, 90, 5).map(m => m * 60))
            .tickFormat(v => Math.floor(v/60));

        solveTimeOverTimeChart.render();

        const solveTimeDimension = this.ndx.dimension(d => {
            return Math.floor(d.solveTime / 60);
        });
        const solveTimeGroup = solveTimeDimension.group(value => {
            return Math.floor(value/2) * 2;
        });
        const solveTimeChart = new dc.BarChart("#DataVisualizer-timeDistributionChart");

        solveTimeChart
            .width(1000)
            .height(400)
            .margins({ left: 100, right: 50, top: 10, bottom: 30 })
            .dimension(solveTimeDimension)
            .group(solveTimeGroup)
            .round(v => Math.floor(v))
            .x(d3.scaleLinear().domain([0, this.state.timeWindow]))
            .xUnits(() => this.state.timeWindow / 2)
            .elasticY(true);

        solveTimeChart.render();



        // # Render Column 2
        const dayDimension = this.ndx.dimension(d => d.day);
        const dayGroup = dayDimension.group();

        const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
        const daysOfWeekLabels = ["Su", "M", "Tu", "W", "Th", "Fr", "Sa"];
        const dayChart = new dc.PieChart("#DataVisualizer-dayChart");
        dayChart
            .width(200)
            .height(200)
            .dimension(dayDimension)
            .group(dayGroup)
            .label(d => `${daysOfWeekLabels[d.key]} (${d.value})`);

        dayChart.render();


        const statusDimension = this.ndx.dimension(getStatus);
        const statusGroup = statusDimension.group();

        const statusChart = new dc.PieChart("#DataVisualizer-statusChart");
        statusChart
            .width(200)
            .height(200)
            .dimension(statusDimension)
            .group(statusGroup)
            .label(d => `${d.key} (${d.value})`);

        statusChart.render();


        const dayDimension2 = this.ndx.dimension(d => d.day);
        const solveRateByDayGroup = dayDimension2.group().reduce(
            (group, d) => {
                if (d.solved) {
                    group.solved++;
                }
                group.total++;
                group.solvePct = Math.round(100 * group.solved / group.total);
                return group;
            },
            (group, d) => {
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

        const solveRateChart = new dc.RowChart("#DataVisualizer-solveRateChart");
        solveRateChart
            .width(220)
            .height(230)
            .margins({ left: 10, top: 0, bottom: 30, right: 20 })
            .dimension(dayDimension2)
            .group(solveRateByDayGroup)
            .valueAccessor(g => g.value.solvePct)
            .label(d => `${daysOfWeekLabels[d.key]} (${d.value.solvePct}%)`);
        solveRateChart.render();

        const solveTimeByDayGroup = dayDimension2.group().reduce(
            (group, d) => {
                if (d.solved) {
                    group.totalTime += d.solveTime;
                    group.numSolved++;
                    group.avgTime = group.numSolved ? group.totalTime / group.numSolved : 0;
                }
                return group;
            },
            (group, d) => {
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
        const solveTimeByDayChart = new dc.RowChart("#DataVisualizer-solveTimeChart");
        solveTimeByDayChart
            .width(220)
            .height(230)
            .margins({ left: 10, top: 0, bottom: 30, right: 20 })
            .elasticX(true)
            .dimension(dayDimension2)
            .group(solveTimeByDayGroup)
            .valueAccessor(g => g.value.avgTime)
            .label(d => `${daysOfWeekLabels[d.key]} (${formatTime(d.value.avgTime)})`);

        solveTimeByDayChart
            .xAxis()
            .ticks(4)
            .tickValues(range(0, this.state.timeWindow, 15).map(m => m * 60))
            .tickFormat(v => Math.floor(v/60));
        solveTimeByDayChart.render();

        const dateDimension = this.ndx.dimension(d => {
            const date = this.state.useSolveDate ? d.solveDate : d.date;
            return d3.timeDay.floor(new Date(date))
        });

        const table = new dc.DataTable("#DataVisualizer-dataTable");
        table
            .dimension(dateDimension)
            .size(100)
            .columns([
                "date",
                "solveDate",
                { label: "Day", format: d => daysOfWeekLabels[d.day] },
                { label: "Status", format: d => getStatus(d) },
                "solveTime",
            ])
            .on("renderlet", table => {
              table.selectAll(".dc-table-group").classed("info", true);
            });
        table.render();


    }

    render() {
        return (
            <div className="DataVisualizer">
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
}

class ChartSection extends React.Component {
    render() {
        return (
             <div className="DataVisualizer-chartSection">
                <div className="DataVisualizer-chartHeader">
                    {this.props.title}
                </div>
                <div id={`DataVisualizer-${this.props.chartId}`}></div>
            </div>
        );

    }
}


