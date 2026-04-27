import { WebSocketServer } from "ws";
// core modules
const express = require("express");
const http = require("http");

const app = express();

// create ONE HTTP server for both Express and WS
const server = http.createServer(app);

// attach WebSocket to that server
const wss = new WebSocketServer({ server });

// store rooms
let rooms = {};

// WebSocket logic
wss.on("connection", (ws) => {

    ws.on("message", (msg) => {
        let data;

        try {
            data = JSON.parse(msg);
        } catch {
            return;
        }

        // join room
        if (data.type === "join") {
            ws.room = data.room;

            if (!rooms[data.room]) {
                rooms[data.room] = [];
            }

            if (!rooms[data.room].includes(ws)) {
                rooms[data.room].push(ws);
            }
        }

        // send signal to others
        if (data.type === "signal") {
            const room = rooms[ws.room] || [];

            room.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    });

    ws.on("close", () => {
        if (ws.room && rooms[ws.room]) {
            rooms[ws.room] = rooms[ws.room].filter(c => c !== ws);

            if (rooms[ws.room].length === 0) {
                delete rooms[ws.room];
            }
        }
    });
});

// normal Express route
app.get("/", (req, res) => {
    res.send("Express is working");
});

// start server (both HTTP + WS)
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
