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

function checkStart(room) {
    const r = rooms[room];
    if (!r) return;

    if (r.host && r.client) {
        console.log("Both players ready in room:", room);

        safeSend(r.host, { type: "start_game" });
        safeSend(r.client, { type: "start_game" });
    }
}

wss.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("message", (raw) => {
        let msg;

        try {
            msg = JSON.parse(raw.toString());
        } catch {
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

            if (msg.is_host) {
                rooms[room].host = socket;
                socket.role = "host";

                safeSend(socket, {
                    type: "join_ack",
                    room
                });

                console.log("Host joined:", room);
            } else {
                rooms[room].client = socket;
                socket.role = "client";

                safeSend(socket, {
                    type: "room_info",
                    room
                });

                console.log("Client joined:", room);
            }

            checkStart(room);
            return;
        }

        // -------------------------
        // SIGNAL RELAY
        // -------------------------
        if (msg.type === "signal") {
            const room = socket.room;
            if (!room || !rooms[room]) return;

            const target =
                socket.role === "host"
                    ? rooms[room].client
                    : rooms[room].host;

            safeSend(target, {
                type: "signal",
                data: msg.data
            });
        }
    });

    socket.on("close", () => {
        const room = socket.room;
        if (!room || !rooms[room]) return;

        if (rooms[room].host === socket) rooms[room].host = null;
        if (rooms[room].client === socket) rooms[room].client = null;

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
