export function interpolate(str, params) {
    return str.replace(/\{(\w+?)\}/g, (match, key) => {
        return params[key];
    })
}

export function monthStartAndEnd(year, month) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month+1, 0);
    return [start, end];
}

export function addMonths(year, month, numMonths) {
    const resultDate = new Date(year, month + numMonths, 1);
    return [resultDate.getFullYear(), resultDate.getMonth()];
}

export function monthsRange(startYear, startMonth, endYear, endMonth) {
    const result = [];
    const endDate = new Date(endYear, endMonth);
    let currentDate = new Date(startYear, startMonth);
    while (currentDate.getTime() <= endDate.getTime()) {
        result.push([currentDate.getFullYear(), currentDate.getMonth()]);
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    }
    return result;
}

export function formatDate(d) {
    return d.toISOString().split("T")[0];
}

export class RequestPool {
    constructor(size, onRequestComplete) {
        this.size = size;
        this.runningCount = 0;
        this.queue = [];
        this.results = [];
        this.onRequestComplete = onRequestComplete;
        // Initiate onRequestsComplete with no-op, until a listener polls.
        this.onRequestsComplete = () => {};
        this.started = false;
        this.numRequests = 0;
    }

    addRequest(requestFn) {
        if (this.started) {
            throw new Error("Pool already started");
        }

        this.queue.push(requestFn);
        this.numRequests++;
    }

    start() {
        if (this.started) {
            throw new Error("Pool already started");
        }

        this.started = true;
        // JS is single threaded
        for (let i = 0; i < this.size && i < this.numRequests; i++) {
            const request = this.queue.pop(0);
            this.executeRequest(request);
        }
    }

    poll() {
        if (!this.started) {
            throw new Error("Not started");
        }
        // Already done
        if (this.runningCount === 0 && this.queue.length === 0) {
            return Promise.resolve(this.results);
        }

        // Wait
        return new Promise((resolve, reject) => {
            this.onRequestsComplete = resolve;
        });
    }

    executeRequest(requestFn) {
        this.runningCount++;
        requestFn().then(result => {
            this.results.push(result);
            this.runningCount--;
            this.onRequestComplete(this.results.length, this.numRequests);
            this.maybeProcessNextRequest();
        });
    }

    maybeProcessNextRequest() {
        if (this.runningCount === 0 && this.queue.length === 0) {
            this.onRequestsComplete(this.results);
        }

        if (this.runningCount < this.size && this.queue.length > 0) {
            const nextRequest = this.queue.pop(0);
            this.executeRequest(nextRequest);
        }
    }


}
