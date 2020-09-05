import React from "react";
import DataLoader from "./DataLoader.js";
import DataVisualizer from "./DataVisualizer.js";

export default class MainContent extends React.Component {
    constructor() {
        super();
        this.renderVisualization = this.renderVisualization.bind(this);
    }

    render() {
        return (
            <DataLoader
                userId={this.props.userId}
                userCookie={this.props.userCookie}
                render={this.renderVisualization}
                startDate={this.props.startDate}
                endDate={this.props.endDate}
            />
        );
    }

    renderVisualization(data) {
        return <DataVisualizer data={data} startDate={this.props.startDate} endDate={this.props.endDate} />;
    }
}


