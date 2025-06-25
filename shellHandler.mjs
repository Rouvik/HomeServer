import pty from "node-pty";
import os from "node:os";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });

export default class Shell {
    static registerWSServer(server) {
        server.on("upgrade", (req, socket, head) => {
            if (req.url.startsWith("/shell")) {
                wss.handleUpgrade(req, socket, head, (ws) => {
                    wss.emit("connection", ws, req);
                });
            }
            else {
                socket.destroy();
            }
        });
    }
}

wss.on("connection", (ws, req) => {
    try {
        const shellDims = req.url.split('/').slice(2);
        ws.session = {
            shell: pty.spawn("bash", [], {
                name: "xterm-color",
                rows: +shellDims[0] ?? 30,
                cols: +shellDims[1] ?? 80,
                cwd: os.homedir(),
                env: process.env
            })
        };

        ws.send(`Login successfull! Shell started with PID: ${ws.session.shell.pid}\r\n`);
    } catch (error) {
        ws.send(`Failed to start pty: ${error}\r\n`);
        return;
    }

    ws.session.shell.on("error", (error) => {
        ws.send(`Fatal error in shell:\r\n${error}\r\n`);
        ws.close();
    });

    ws.on("message", (message) => {
        ws.session.shell.write(message);
    });

    ws.session.shell.onData((data) => {
        ws.send(data);
    });

    ws.session.shell.onExit(({ exitCode, signal }) => {
        ws.send(`Shell exited with code ${exitCode}, signal: ${signal}\r\n`);
        ws.close();
        return;
    });

    ws.on("close", () => {
        ws.session.shell.kill();
    });
});