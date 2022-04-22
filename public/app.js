const inputs = document.getElementById("inputs");
const joinGameButton =  document.getElementById("joinGame");
const userNameInput = document.getElementById("usernameInput");
const gameCodeInput = document.getElementById("gameCodeInput");
const room = document.getElementById("room");
const startGameButton = document.getElementById("startGame");
const game = document.getElementById("game");
const creatorDiv = document.getElementById("creator");
const createWordText = document.getElementById("createWord");
const clue = document.getElementById("clue");
const guesserDiv = document.getElementById("guesser");
const guessWordText = document.getElementById("guessWord");
const responseText = document.getElementById("responseText");
const responseDiv = document.getElementById("response");
const infoDisplay = document.getElementById("infoDisplay");
const gameId = document.getElementById("gameId");
const nameList = document.getElementById("names");
const socket = io();
let guesser = null;
let creator = null;
let secretWord = null
let gameCode = gameCodeInput.value;
let username = userNameInput.value;
let playerNumb = null;
let players = [];
let known = [];
let currentLetter = 0;

gameCodeInput.addEventListener("input", e => gameCode = e.target.value);
userNameInput.addEventListener("input", e => username = e.target.value);

socket.on('game-code', id => {
    gameId.textContent = id;
    gameCode = id;
});

socket.on('start-game', startGame);

function createGame() {
    socket.emit("newGame", username);
    creator = true;
    startGameButton.style.display = "block"
}

function joinGame() {
    socket.emit('joinGame', {roomName: gameCode, name: username});
    socket.on('unknownCode', () => console.log("%cError: Unknown Code", "background: black; color: red"));
    creator = false;
}

function startGame() {
    room.style.display = "none";
    game.style.display = "block";
    if (creator) {
        socket.emit("start-game");
        creatorDiv.style.display = "block";
        infoDisplay.textContent = "Create A Word";
    } else {
        infoDisplay.textContent = "Wait for creator to make a word"; 
        startGameButton.style.display = "none";
    }
}

function createWord() {
    if (creator) {
        if (words.indexOf(createWordText.value.toLowerCase()) == -1) return false;
        secretWord = createWordText.value;
        socket.emit("new-word", createWordText.value);
        creatorDiv.style.display = "none";
        infoDisplay.textContent = "Wait for a guess.";
    }
}

function guessWord() {
    if (words.indexOf(guessWordText.value.toLowerCase()) == -1 || !wordFits(guessWordText.value.toLowerCase(), known)) return false;
    if (words.indexOf(clue.value.toLowerCase()) == -1 || clue.value.includes(guessWordText.value)) return false;
    socket.emit("guess", {word: guessWordText.value, clue: clue.value});
    infoDisplay.textContent = "Wait for someone to guess your word";
    guesserDiv.style.display = "none";
}

function respond() {
    if (words.indexOf(responseText.value.toLowerCase()) == -1) return false;
    socket.emit("response", {response: responseText.value, guesser});
}

socket.on('init', init);
socket.on('get-players', playerNames => {
    players = playerNames;
    updateList(players);
});
socket.on('connection', () => {
    socket.emit("get-players");
});

socket.on('new-word', word => {
    infoDisplay.textContent = `The word starts with ${word.firstLetter} and is ${word.length} letters long.`;
    known = new Array(word.length).fill('');
    known[currentLetter] = word.firstLetter;
    guesserDiv.style.display = "block";
});

socket.on("updateWord", word => {
    currentLetter++;
    known[currentLetter] = word[currentLetter];
});

socket.on("win", data => {
    infoDisplay.textContent = `${data.name} got the word. It was ${data.guess}!`;
    responseDiv.style.display = "none";
    guesserDiv.style.display = "none";
});

socket.on("guess", data => {
    infoDisplay.textContent = `${data.name} has a word! The clue is: ${data.clue}`;
    guesser = data.name;
    if (!creator) guesserDiv.style.display = "none";
    responseDiv.style.display = "block";
});

socket.on("interception", data => {
    infoDisplay.textContent = `${data.name} intercepted the guess! The word was ${data.guess}.`;
    setTimeout(reset, 3000);
});

socket.on("correctGuess", data => {
    infoDisplay.textContent = `${data.name} got the guess! The word was ${data.guess}.`;
    setTimeout(reset, 3000);
});

socket.on("incorrectGuess", data => {
    infoDisplay.textContent = `${data.name} got the guess wrong. The word was ${data.guess}.`;
    setTimeout(reset, 3000);
});

function init(num) {
    inputs.style.display = "none";
    room.style.display = "block";
    playerNumb = num;
    console.log(num);
    socket.emit("get-players");
}

function reset() {
    responseDiv.style.display = "none";
    responseText.value = "";
    guessWordText.value = "";
    if (creator) {
        infoDisplay.textContent = "Wait for a guess.";
    } else {
        guesserDiv.style.display = "block";
        infoDisplay.textContent = `The word starts with ${known.join('')} and is ${known.length} letters long.`;
    }
}

function updateList(list) {
    nameList.innerHTML = "";

    for (let i = 0; i < list.length; i++) {
        let item = document.createElement("li");
        description = i == 0 ? " - creator" : " - guesser";
        item.innerHTML = list[i] + description;
        if (i == playerNumb) item.style.fontWeight = 'bold';
        nameList.appendChild(item);
    }
}

function wordFits(word, known) {
    if (word.length != known.length) return false;
    for (let i = 0; i < known.length; i++) {
        if (known[i] != '' && known[i] != word[i]) return false;
    }
    return true;
}