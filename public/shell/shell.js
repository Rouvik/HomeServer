const shell = document.getElementById("shell");
const term = new Terminal();
const fitAddon = new window.FitAddon.FitAddon();
term.loadAddon(fitAddon);

term.open(shell);
fitAddon.fit();

const ws = new WebSocket(`wss://${window.location.host}/shell/${term.rows}/${term.cols}`);

ws.onmessage = (evt) => {
    term.write(evt.data);
};

term.onData(data => {
    ws.send(data);
});