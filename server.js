import http from "http";
import { WebSocketServer } from "ws";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = {};

console.log("WebRTC Signaling Server Running...");

wss.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("message", (raw) => {
        let msg;

        try {
            msg = JSON.parse(raw.toString());
        } catch (e) {
            console.log("Invalid JSON:", raw.toString());
            return;
        }

        if (msg.type === "join") {
            const room = msg.room;

            if (!rooms[room]) {
                rooms[room] = {
                    host: null,
                    client: null
                };
            }

            console.log("Join request:", msg);

            // -------------------------
            // HOST LOGIC
            // -------------------------
            if (msg.is_host) {
                rooms[room].host = socket;

                socket.room = room;
                socket.role = "host";

                socket.send(JSON.stringify({
                    type: "join_ack"
                }));

                console.log("Host joined room:", room);
            }

            // -------------------------
            // CLIENT LOGIC
            // -------------------------
            else {
                rooms[room].client = socket;

                socket.room = room;
                socket.role = "client";

                socket.send(JSON.stringify({
                    type: "room_info"
                }));

                console.log("Client joined room:", room);
            }

            return;
        }

        // -------------------------
        // SIGNAL RELAY (for WebRTC later)
        // -------------------------
        if (msg.type === "signal") {
            const room = socket.room;

            if (!room || !rooms[room]) return;

            const target =
                socket.role === "host"
                    ? rooms[room].client
                    : rooms[room].host;

            if (target && target.readyState === 1) {
                target.send(JSON.stringify({
                    type: "signal",
                    data: msg.data
                }));
            }
        }
    });

    socket.on("close", () => {
        console.log("Client disconnected");

        const room = socket.room;
        if (!room || !rooms[room]) return;

        if (rooms[room].host === socket) {
            rooms[room].host = null;
        }

        if (rooms[room].client === socket) {
            rooms[room].client = null;
        }

        if (!rooms[room].host && !rooms[room].client) {
            delete rooms[room];
            console.log("Room deleted:", room);
        }
    });
});

const PORT = process.env.PORT || 3000;


// basic http responce
//
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("WebSocket server is running");
});
server.listen(PORT, "0.0.0.0", () => {
    console.log("Server listening on port", PORT);
});
