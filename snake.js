const board = document.querySelector(".board");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("High-score");
const timeEl = document.getElementById("time");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlay-message");
const restartButton = document.getElementById("restart");

// GAME SETTINGS
const blockSize = 50;      // has to match the .block size in snake.css
const tickRate = 300;      // ms between two snake moves
const scorePerFood = 10;
const minColumns = 6;      // the board has to be at least this big to be playable
const minRows = 6;

// GAME STATE
const blocks = {};         // grid cells stored by "row-column" (x is a row, y is a column)

let columns = 0;
let rows = 0;
let snake = [];            // snake[0] is the head
let food = null;
let direction = "right";
const directionQueue = []; // turns waiting to be applied
let score = 0;
let seconds = 0;
let isPlaying = false;
let gameLoop = null;
let timeLoop = null;
let highScore = loadHighScore();

const oppositeDirection = {
    right: "left",
    left: "right",
    up: "down",
    down: "up"
};

// HIGH SCORE
function loadHighScore() {
    try {
        return Number(localStorage.getItem("snakeHighScore")) || 0;
    } catch (error) {
        return 0; // storage can be blocked (private mode), the game still works
    }
}

function saveHighScore() {
    highScoreEl.innerText = highScore;

    try {
        localStorage.setItem("snakeHighScore", String(highScore));
    } catch (error) {
        // nothing to do, the high score then only lives for this session
    }
}

// CREATE GRID (the css grid is kept in sync with the js grid)
function buildGrid() {
    columns = Math.max(1, Math.floor(board.clientWidth / blockSize));
    rows = Math.max(1, Math.floor(board.clientHeight / blockSize));

    board.style.gridTemplateColumns = `repeat(${columns}, ${blockSize}px)`;
    board.style.gridTemplateRows = `repeat(${rows}, ${blockSize}px)`;

    board.querySelectorAll(".block").forEach(cell => cell.remove());
    Object.keys(blocks).forEach(key => delete blocks[key]);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const cell = document.createElement("div");
            cell.classList.add("block");
            board.appendChild(cell);
            blocks[`${r}-${c}`] = cell;
        }
    }
}

// RESET A ROUND (the high score is kept)
function resetRound() {
    const middleRow = Math.floor(rows / 2);
    const headColumn = Math.min(3, columns - 1);

    snake = [0, 1, 2].map(offset => ({
        x: middleRow,
        y: Math.max(0, headColumn - offset)
    }));

    direction = "right";
    directionQueue.length = 0;
    score = 0;
    seconds = 0;

    scoreEl.innerText = score;
    timeEl.innerText = formatTime(seconds);

    generateFood();
}

// FOOD GENERATION
function generateFood() {
    const freeCells = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const onSnake = snake.some(segment => segment.x === r && segment.y === c);
            if (!onSnake) freeCells.push({ x: r, y: c });
        }
    }

    if (freeCells.length === 0) {
        food = null; // the snake fills the whole board, there is no room left
        return false;
    }

    food = freeCells[Math.floor(Math.random() * freeCells.length)];
    return true;
}

// CLEAR BOARD
function clearBoard() {
    Object.values(blocks).forEach(cell => {
        cell.classList.remove("fill", "food");
    });
}

// RENDER GAME
function render() {
    clearBoard();

    // draw snake
    snake.forEach(seg => {
        const key = `${seg.x}-${seg.y}`;
        blocks[key]?.classList.add("fill");
    });

    // draw food
    if (food) {
        const foodKey = `${food.x}-${food.y}`;
        blocks[foodKey]?.classList.add("food");
    }
}

// QUEUE A TURN (a queued turn can never reverse the snake into itself)
function queueDirection(newDirection) {
    const lastDirection = directionQueue.length > 0
        ? directionQueue[directionQueue.length - 1]
        : direction;

    if (newDirection === lastDirection) return;
    if (newDirection === oppositeDirection[lastDirection]) return;

    if (directionQueue.length === 2) directionQueue.shift();
    directionQueue.push(newDirection);
}

// MOVE SNAKE
function moveSnake() {
    if (directionQueue.length > 0) {
        direction = directionQueue.shift();
    }

    const head = { ...snake[0] };

    if (direction === "right") head.y++;
    if (direction === "left") head.y--;
    if (direction === "up") head.x--;
    if (direction === "down") head.x++;

    // WALL COLLISION
    if (
        head.x < 0 || head.x >= rows ||
        head.y < 0 || head.y >= columns
    ) {
        gameOver("You ran into a wall!");
        return;
    }

    const isEating = food !== null && head.x === food.x && head.y === food.y;

    // SELF COLLISION (the tail moves away, so it is only in the way while eating)
    const body = isEating ? snake : snake.slice(0, -1);

    if (body.some(seg => seg.x === head.x && seg.y === head.y)) {
        gameOver("You bit yourself!");
        return;
    }

    snake.unshift(head);

    // EAT FOOD
    if (isEating) {
        score += scorePerFood;
        updateScore();

        if (!generateFood()) {
            gameOver("Incredible, you filled the whole board!");
        }
    } else {
        snake.pop();
    }
}

// SCORE
function updateScore() {
    scoreEl.innerText = score;

    if (score > highScore) {
        highScore = score;
        saveHighScore();
    }
}

// TIME
function formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");

    return `${mins}:${secs}`;
}

function updateTime() {
    seconds++;
    timeEl.innerText = formatTime(seconds);
}

// LOOPS
function startLoops() {
    stopLoops();

    isPlaying = true;

    gameLoop = setInterval(() => {
        moveSnake();
        render();
    }, tickRate);

    timeLoop = setInterval(updateTime, 1000);
}

function stopLoops() {
    isPlaying = false;

    clearInterval(gameLoop);
    clearInterval(timeLoop);

    gameLoop = null;
    timeLoop = null;
}

// OVERLAY
function showOverlay(message) {
    overlayMessage.innerText = message;
    overlay.classList.add("visible");
}

function hideOverlay() {
    overlay.classList.remove("visible");
}

// GAME OVER
function gameOver(reason) {
    stopLoops();
    showOverlay(`${reason} Score: ${score} - High score: ${highScore}`);
}

// START / RESTART GAME
function startGame() {
    hideOverlay();
    buildGrid();

    if (columns < minColumns || rows < minRows) {
        stopLoops();
        showOverlay("The window is too small to play in. Make it bigger, then press Enter.");
        return;
    }

    resetRound();
    render();
    startLoops();
}

// KEY CONTROLS
document.addEventListener("keydown", event => {
    const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

    // prevent the arrow keys from scrolling the page
    if (arrowKeys.includes(event.key)) event.preventDefault();

    if (!isPlaying) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            startGame();
        }
        return;
    }

    if (event.key === "ArrowRight") queueDirection("right");
    if (event.key === "ArrowLeft") queueDirection("left");
    if (event.key === "ArrowUp") queueDirection("up");
    if (event.key === "ArrowDown") queueDirection("down");
});

// RESTART BUTTON
restartButton.addEventListener("click", () => {
    restartButton.blur();
    startGame();
});

// START GAME
highScoreEl.innerText = highScore;
startGame();
