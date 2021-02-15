/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

export default class TestClient {

    /*
     * work
     */

    /*async*/ get(path) {
        return new Promise(((resolve, reject) => {
            let reqId = this.wsid++;
            let req = {
                id: reqId,
                cmd: 'get',
                once: true,
                path
            }
            this.reqQ[reqId] = { resolve, reject, ...req };
            this.ws.send(JSON.stringify(req));
        }));
    }

    /*async*/ read(path) {

    }

    /*
     * WS init
     */

    display(selector) {
        this._display = selector;
        return this;
    }

    /*async*/ connect() {
        return new Promise((resolve, reject) => {
            let ws = new WebSocket('ws://localhost:9393/');
            this.ws = ws;

            this.wsid = 1;      // just a counter to identify the requests
            this.reqQ = {};     // keep requests till they are processed (observe requests will be kept longer till observation ends)
            ws.onopen = () => {
                this.connected();
                resolve(this);
            };
            ws.onmessage = (data) => this.message(data);
            ws.onclose = (code, reason) => this.close(code, reason);
            ws.onerror = (err) => this.error(err);
        });
    }

    /*
     * WS handling
     */

    connected() {}
    message(message) {
        let res = JSON.parse(message.data);
        if (!res.id) return;
        let req = this.reqQ[res.id];
        if (!req) return;
        if (req.once) delete this.reqQ[res.id];
        req.resolve(res);   // todo [REFACTOR]: check for error and maintain req.reject
    }
    close(code, reason) {
        delete this.ws;
    }
    error(err) {
        console.log(err);
    }
}
