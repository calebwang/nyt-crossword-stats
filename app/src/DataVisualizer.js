import React from "react";
import * as dc from "dc";
import * as crossfilter from "crossfilter2";
import * as d3 from "d3";
import "./DataVisualizer.css";

export default class DataVisualizer extends React.Component {
    state = {
        timeWindow: 60,
        useSolveDate: false,
    };

    componentDidMount() {
        this.draw();
    }

    componentDidUpdate() {
        this.draw();
    }

    draw() {
        this.ndx = crossfilter(this.props.data);

        function getStatus(d) {
            if (d.solved) {
                return "Solved";
            } else if (d.attempted) {
                return "Attempted";
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
            .height(500)
            .margins({ left: 100, right: 50, top: 5, bottom: 30 })
            .dimension(weekDimension)
            .group(countByWeekAndStatusGroup, "Solved", group => group.value.solved)
            .stack(countByWeekAndStatusGroup, "Attempted", group => group.value.attempted)
            .stack(countByWeekAndStatusGroup, "Not Started", group => group.value.not_started)
            .x(d3.scaleTime().domain([this.props.startDate.getTime(), this.props.endDate.getTime()]))
            .round(d3.timeWeek.floor)
            .xUnits(d3.timeWeeks);

        dateChart.legend(dc.legend());
        dateChart.render();

        const dayDimension = this.ndx.dimension(d => d.day);
        const dayGroup = dayDimension.group();

        const daysOfWeek = ["Su", "M", "Tu", "W", "Th", "Fr", "Sa"];
        const dayChart = new dc.PieChart("#DataVisualizer-dayChart");
        dayChart
            .width(200)
            .height(200)
            .dimension(dayDimension)
            .group(dayGroup)
            .label(d => daysOfWeek[d.key] + " (" + d.value + ")");

        dayChart.render();


        const statusDimension = this.ndx.dimension(getStatus);
        const statusGroup = statusDimension.group();

        const statusChart = new dc.PieChart("#DataVisualizer-statusChart");
        statusChart
            .width(200)
            .height(200)
            .dimension(statusDimension)
            .group(statusGroup)
            .label(d => d.key + "(" + d.value + ")");

        statusChart.render();

        const solveTimeDimension = this.ndx.dimension(d => {
            return d.solveTime / 60;
        });
        const solveTimeGroup = solveTimeDimension.group(value => {
            return Math.floor(value/2) * 2;
        }).reduceCount();
        const solveTimeChart = new dc.BarChart("#DataVisualizer-timeDistributionChart");

        solveTimeChart
            .width(1200)
            .height(500)
            .margins({ left: 100, right: 50, top: 5, bottom: 30 })
            .dimension(solveTimeDimension)
            .group(solveTimeGroup)
            .x(d3.scaleLinear().domain([0, this.state.timeWindow]))
            .xUnits(() => this.state.timeWindow / 2);

        solveTimeChart.render();

        const table = new dc.DataTable("#DataVisualizer-dataTable");
        table
            .dimension(weekDimension)
            .size(100)
            .columns([
                "date",
                "solveDate",
                { label: "Day", format: d => daysOfWeek[d.day] },
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
                <div className="DataVisualizer-row1">
                    <div id="DataVisualizer-dateChart"></div>
                    <div className="DataVisualizer-row1-section2">
                        <div id="DataVisualizer-dayChart"></div>
                        <div id="DataVisualizer-statusChart"></div>
                    </div>
                </div>
                <div id="DataVisualizer-solveRateChart"> </div>
                <div id="DataVisualizer-timeDistributionChart"> </div>
                <table className="table table-hover" id="DataVisualizer-dataTable"></table>
            </div>
        );

    }
}


