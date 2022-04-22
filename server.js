const express = require('express');
const path = require('path');
const http = require('http');
const PORT = process.env.PORT || 3000;
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const roomNames = [];
const clientRooms = {};
const secretWords = {};

app.use(express.static(path.join(__dirname, "public")));

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

io.on("connection", socket => {
    console.log("Connection");

    socket.on("newGame", handleNewGame);
    socket.on("joinGame", handleJoinGame);
    socket.on("get-players", () => {
        let sockets = socketsInRoom(clientRooms[socket.id]);
        let playerNames = [];
        for (let socket of sockets) {
            playerNames.push(socket.name);
        }
        socket.emit("get-players", playerNames);
    });
    socket.on('start-game', () => {
        socket.to(clientRooms[socket.id]).emit('start-game');
    });
    socket.on("new-word", word => {
        let sockets = socketsInRoom(clientRooms[socket.id]);
        for (let socket of sockets) {
            socket.secretWord = word;
        }
        socket.to(clientRooms[socket.id]).emit("new-word", {firstLetter: word[0], length: word.length});
    });
    socket.on("guess", data => {
        if (socket.secretWord == data.word) {
            io.to(clientRooms[socket.id]).emit("win", {name: socket.name, guess: data.word});
            return;
        }
        socket.guess = data.word;
        socket.to(clientRooms[socket.id]).emit("guess", {name: socket.name, clue: data.clue});
    });
    socket.on("response", data => {
        let sockets = socketsInRoom(clientRooms[socket.id]);
        let s;
        for (s of sockets) {
            if (s.name == data.guesser) break;
        }
        let d = {name: socket.name, guess: s.guess};
        if (data.response == s.guess) {
            if (socket.creator) io.to(clientRooms[socket.id]).emit("interception", d);
            else {
                io.to(clientRooms[socket.id]).emit('updateWord', socket.secretWord)
                io.to(clientRooms[socket.id]).emit("correctGuess", d);
            }
        } else {
            io.to(clientRooms[socket.id]).emit("incorrectGuess", d);
            s.guess = null;
        }
    });

    function handleNewGame(name) {
        let roomName = newID(5);
        while (roomNames.includes(roomName)) {
            roomName = newID(5);
        }
        roomNames.push(roomName);
        socket.emit('game-code', roomName);

        clientRooms[socket.id] = roomName;
        socket.join(roomName);
        socket.number = 1;
        socket.name = name;
        socket.creator = true;
        socket.guess = null;
        socket.emit('init', 0);
    }

    function handleJoinGame(data) {
        if (io.sockets.adapter.rooms.has(data.roomName)) {
            socket.emit('game-code', data.roomName);

            clientRooms[socket.id] = data.roomName;
            socket.join(data.roomName);
            socket.number = io.sockets.adapter.rooms.get(data.roomName).size-1;
            socket.name = data.name;
            socket.creator = false;
            socket.guess = null;
            socket.emit('init', socket.number);
            socket.to(data.roomName).emit("connection");
        } else {
            socket.emit('unknownCode');
        }
    }
});

function newID(length) {
    var result = "";
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function socketsInRoom(room) {
    let sockets = [];
    try {
        let socketObj = io.sockets.adapter.rooms.get(room);
        for (let id of socketObj) {
            sockets.push(io.sockets.sockets.get(id));
        }
    } catch(e) {
        console.log(`Attempted to access non-existent room: ${room}`);
    }
    return sockets;
}