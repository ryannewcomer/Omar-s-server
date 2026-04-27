import http from "http";
import { WebSocketServer } from "ws";

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("WebRTC Signaling Server Running");
});

const wss = new WebSocketServer({ server });

const rooms = {};

console.log("WebRTC Signaling Server Running...");

function safeSend(socket, data) {
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(data));
    }
}

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

        // -------------------------
        // JOIN ROOM
        // -------------------------
        if (msg.type === "join") {
            const room = msg.room;

            if (!rooms[room]) {
                rooms[room] = {
                    host: null,
                    client: null
                };
            }

            socket.room = room;

            console.log("Join request:", msg);

            // -------------------------
            // HOST
            // -------------------------
            if (msg.is_host) {
                rooms[room].host = socket;
                socket.role = "host";

                safeSend(socket, {
                    type: "join_ack",
                    room
                });

                console.log("Host joined:", room);
            }

            // -------------------------
            // CLIENT
            // -------------------------
            else {
                rooms[room].client = socket;
                socket.role = "client";

                safeSend(socket, {
                    type: "room_info",
                    room
                });

                console.log("Client joined:", room);

                // OPTIONAL: notify host client is ready
                if (rooms[room].host) {
                    safeSend(rooms[room].host, {
                        type: "peer_joined"
                    });
                }
            }

            return;
        }

        // -------------------------
        // SIGNAL RELAY (WebRTC)
        // -------------------------
        if (msg.type === "signal") {
            const room = socket.room;

            if (!room || !rooms[room]) return;

            const roomData = rooms[room];

            const target =
                socket.role === "host"
                    ? roomData.client
                    : roomData.host;

            if (target) {
                safeSend(target, {
                    type: "signal",
                    data: msg.data
                });
            }
        }
    });

    socket.on("close", () => {
        const room = socket.room;

        if (!room || !rooms[room]) return;

        console.log("Client disconnected");

        if (rooms[room].host === socket) {
            rooms[room].host = null;
        }

        if (rooms[room].client === socket) {
            rooms[room].client = null;
        }

        // cleanup empty rooms
        if (!rooms[room].host && !rooms[room].client) {
            delete rooms[room];
            console.log("Room deleted:", room);
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server listening on port", PORT);
});
