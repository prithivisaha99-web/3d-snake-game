const board = document.querySelector('.board');
const scoreEl = document.getElementById("score");

const blockSize = 50;
const columns = Math.floor(board.clientWidth / blockSize);
const rows = Math.floor(board.clientHeight / blockSize);

// store grid cells
const blocks = {};

// snake body
let snake = [
    { x: 1, y: 5 },
    { x: 1, y: 4 },
    { x: 1, y: 3 }
];

let direction = 'right';
let score = 0;
let food = {};

// CREATE GRID
for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
        const cell = document.createElement('div');
        cell.classList.add('block');
        board.appendChild(cell);
        blocks[`${r}-${c}`] = cell;
    }
}

// FOOD GENERATION
function generateFood() {
    let x, y;
    do {
        x = Math.floor(Math.random() * rows);
        y = Math.floor(Math.random() * columns);
    } while (snake.some(seg => seg.x === x && seg.y === y));

    food = { x, y };
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
    const foodKey = `${food.x}-${food.y}`;
    blocks[foodKey]?.classList.add("food");
}

// MOVE SNAKE
function moveSnake() {
    const head = { ...snake[0] };

    if (direction === 'right') head.y++;
    if (direction === 'left') head.y--;
    if (direction === 'up') head.x--;
    if (direction === 'down') head.x++;

    // WALL COLLISION
    if (
        head.x < 0 || head.x >= rows ||
        head.y < 0 || head.y >= columns
    ) {
        gameOver();
        return;
    }

    // SELF COLLISION
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // EAT FOOD
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        generateFood();
    } else {
        snake.pop();
    }
}

const timeEl = document.getElementById("time"); // The element showing time
let seconds = 0;

function updateTime() {
    seconds++;
    let mins = Math.floor(seconds / 60);
    let secs = seconds % 60;

    // Format as 2 digits
    const formattedTime = `${String(mins).padStart(2, "0")}-${String(secs).padStart(2, "0")}`;
    timeEl.innerText = `Time: ${formattedTime}`;
}

// Update every second
setInterval(updateTime, 1000);



// GAME OVER
function gameOver() {
    alert("Game Over!");
    clearInterval(gameLoop);
}

// KEY CONTROLS
document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" && direction !== "left") direction = "right";
    if (e.key === "ArrowLeft" && direction !== "right") direction = "left";
    if (e.key === "ArrowUp" && direction !== "down") direction = "up";
    if (e.key === "ArrowDown" && direction !== "up") direction = "down";
});



// START GAME
generateFood();
render();

const gameLoop = setInterval(() => {
    moveSnake();
    render();
}, 300);
