const express = require("express");
const app = express();

app.use(express.json());

// roomCode → { ip, port }
const rooms = {};

// HOST registers room
app.post("/host", (req, res) => {
  const { room, ip, port } = req.body;

  if (!room || !ip || !port) {
    return res.json({ ok: false });
  }

  rooms[room] = { ip, port };

  console.log("HOST:", room, ip + ":" + port);

  res.json({ ok: true });
});

// JOIN fetches host info
app.get("/join/:room", (req, res) => {
  const room = req.params.room;

  const data = rooms[room];

  if (!data) {
    return res.json({ ok: false });
  }

  res.json({
    ok: true,
    ip: data.ip,
    port: data.port
  });
});

// optional cleanup
app.post("/remove", (req, res) => {
  const { room } = req.body;
  delete rooms[room];
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log("Lobby server running on port 3000");
});
