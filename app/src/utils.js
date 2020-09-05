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

// Sigh: When creating Dates from a string like "2020-01-01", the result is UTC midnight
// but this may be a different day in the local timezone.
export function localMidnightDateFromString(str) {
    const d = new Date(str);
    return new Date(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
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

export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secondsLeft = Math.floor(seconds - minutes * 60);
    const secondsString = secondsLeft < 10 ? "0" + secondsLeft : secondsLeft;
    return `${minutes}:${secondsString}`;
}

export function range(start, end, incr) {
    const result = [];
    let curr = start;
    while (curr <= end) {
        result.push(curr);
        curr += incr;
    }
    return result;
}

export class MovingWindow {
    constructor(size) {
        this._items = [];
        this.size = size;
        this.nextIndex = 0;
    }

    add(item) {
        if (this._items.length < this.size) {
            this._items.push(item);
        } else {
            this._items[this.nextIndex] = item;
        }
        this.nextIndex = (this.nextIndex + 1) % this.size;
    }

    items() {
        return this._items;
    }
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
