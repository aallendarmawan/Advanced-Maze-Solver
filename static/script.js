const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const cellSize = 25;
let rows = 20;
let cols = 20;
let drawingMode = 'start';
let maze = Array.from({ length: rows }, () => Array(cols).fill('UNEXPLORED'));
let start = null;
let goals = [];
let currentPath = [];
let drawPathTimeout = null;
let visitedCount = 0;
let mouseDown = false;
let touchHold = false;

const algorithmDescriptions = {
    'select': 'Please select an algorithm to see its description.',
    'dfs': 'Depth-First Search (DFS) explores as far as possible along each branch before backtracking, using a stack (i.e. First-In First-Out) to remember paths.',
    'bfs': 'Breadth-First Search (BFS) explores all nodes at the present depth level before moving on to nodes at the next depth level, using a queue (i.e. Last-In First-Out) to remember paths.',
    'astar': 'A* Search uses a combination of path cost and a heuristic (i.e. minimum distance between start and goal) to find the shortest path to the goal. It uses a priority queue to explore paths with the lowest cost first.',
    'random_walk': 'Random Walk explores the maze by randomly choosing the next position to move to, which may lead to revisiting the same position multiple times. I implemented this just for fun!'
};

window.onload = function() {
    displayAlgorithmInfo(); // Ensure the default description is set on page load
};

canvas.addEventListener('click', draw);
canvas.addEventListener('mousedown', () => mouseDown = true);
canvas.addEventListener('mouseup', () => mouseDown = false);
canvas.addEventListener('mousemove', (event) => {
    if (mouseDown && (drawingMode === 'obstacle' || drawingMode === 'erase')) {
        draw(event);
    }
});

canvas.addEventListener('touchstart', (event) => {
    touchHold = true;
    draw(event.touches[0]);
});
canvas.addEventListener('touchend', () => touchHold = false);
canvas.addEventListener('touchmove', (event) => {
    if (touchHold && (drawingMode === 'obstacle' || drawingMode === 'erase')) {
        draw(event.touches[0]);
    }
});

function draw(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    if (x < 0 || x >= cols || y < 0 || y >= rows) {
        return;
    }

    if (drawingMode === 'start') {
        if (maze[y][x] !== 'OBSTACLE') {
            if (start) {
                clearCell(start.x, start.y);
            }
            start = { x, y };
            maze[y][x] = 'START';
            drawCell(x, y, 'green');
        }
    } else if (drawingMode === 'goal') {
        if (maze[y][x] !== 'OBSTACLE') {
            goals.push({ x, y });
            maze[y][x] = 'GOAL';
            drawCell(x, y, 'red');
        }
    } else if (drawingMode === 'obstacle') {
        maze[y][x] = 'OBSTACLE';
        drawCell(x, y, 'black');
    } else if (drawingMode === 'erase') {
        maze[y][x] = 'UNEXPLORED';
        clearCell(x, y);
        if (start && start.x === x && start.y === y) {
            start = null;
        }
        goals = goals.filter(goal => goal.x !== x || goal.y !== y);
    }
}

function clearCell(x, y) {
    ctx.clearRect(x * cellSize, y * cellSize, cellSize, cellSize);
    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
}

function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
}

function setStart() {
    drawingMode = 'start';
    highlightButton('Set Start');
    console.log('Drawing mode set to start');
}

function setGoal() {
    drawingMode = 'goal';
    highlightButton('Set Goal');
    console.log('Drawing mode set to goal');
}

function setObstacle() {
    drawingMode = 'obstacle';
    highlightButton('Add Obstacle');
    console.log('Drawing mode set to obstacle');
}

function erase() {
    drawingMode = 'erase';
    highlightButton('Erase');
    console.log('Drawing mode set to erase');
}

function generateMaze() {
    clearPath();
    maze = Array.from({ length: rows }, () => Array(cols).fill('UNEXPLORED'));
    start = null;
    goals = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    console.log('Generating random maze');

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (Math.random() < 0.3) {
                maze[y][x] = 'OBSTACLE';
                drawCell(x, y, 'black');
            }
        }
    }

    start = getRandomEmptyCell();
    let numGoals = 1;
    const random = Math.random();
    if (random < 0.001) {
        numGoals = 4;
    } else if (random < 0.01) {
        numGoals = 3;
    } else if (random < 0.1) {
        numGoals = 2;
    }

    for (let i = 0; i < numGoals; i++) {
        goals.push(getRandomEmptyCell());
    }
    maze[start.y][start.x] = 'START';
    drawCell(start.x, start.y, 'green');

    goals.forEach(goal => {
        maze[goal.y][goal.x] = 'GOAL';
        drawCell(goal.x, goal.y, 'red');
    });
}

function getRandomEmptyCell() {
    let cell;
    do {
        cell = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (maze[cell.y][cell.x] !== 'UNEXPLORED');
    return cell;
}

function clearMaze() {
    if (drawPathTimeout) {
        clearTimeout(drawPathTimeout);
        drawPathTimeout = null;
    }
    maze = Array.from({ length: rows }, () => Array(cols).fill('UNEXPLORED'));
    start = null;
    goals = [];
    currentPath = [];
    visitedCount = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    console.log('Clearing maze');
    document.getElementById('visitedCount').innerText = 'Visited Squares: 0';
}

function clearPath() {
    if (drawPathTimeout) {
        clearTimeout(drawPathTimeout);
        drawPathTimeout = null;
    }
    if (currentPath.length > 0) {
        currentPath.forEach(([y, x]) => {
            if (maze[y][x] !== 'START' && maze[y][x] !== 'GOAL' && maze[y][x] !== 'OBSTACLE') {
                clearCell(x, y);
                maze[y][x] = 'UNEXPLORED';
            }
        });
        currentPath = [];
    }
}

function drawPath(path) {
    let i = 0;
    function drawNext() {
        if (i > 0) {
            const [prevY, prevX] = path[i - 1];
            if (!(prevY === start.y && prevX === start.x) && !goals.some(goal => goal.y === prevY && goal.x === prevX)) {
                drawCell(prevX, prevY, 'blue');
            }
        }
        if (i < path.length) {
            const [y, x] = path[i];
            if (!(y === start.y && x === start.x) && !goals.some(goal => goal.y === y && goal.x === x)) {
                drawCell(x, y, 'yellow');
            }
            visitedCount++;
            document.getElementById('visitedCount').innerText = `Visited Squares: ${visitedCount}`;
            i++;
            drawPathTimeout = setTimeout(drawNext, 50); // Faster speed: Draw next cell after 50ms
        } else {
            drawPathTimeout = null;
            // Redraw start and goal cells to ensure they remain visible
            drawCell(start.x, start.y, 'green');
            goals.forEach(goal => drawCell(goal.x, goal.y, 'red'));
        }
    }
    drawNext();
}

function solveMaze() {
    const algorithm = document.getElementById('algorithmSelect').value;
    if (algorithm === 'select') {
        alert('Please select a search algorithm before solving the maze.');
        return;
    }

    if (!start || goals.length === 0) {
        alert('Please set both start and goal positions');
        return;
    }
    clearPath();
    const data = {
        maze,
        start: { x: start.x, y: start.y },
        goals: goals.map(goal => ({ x: goal.x, y: goal.y })),
        algorithm
    };
    console.log('Solving maze using algorithm:', algorithm);
    console.log('Sending data:', JSON.stringify(data));
    fetch('/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Raw response:', response);
        return response.json();
    })
    .then(result => {
        const path = result.path;
        visitedCount = 0;
        console.log('Received path:', path);
        if (path.length === 0) {
            alert('No path found!');
        } else {
            currentPath = path;
            drawPath(path);
        }
        document.getElementById('visitedCount').innerText = `Visited Squares: ${visitedCount}`;
    })
    .catch(error => console.error('Error:', error));
}

function displayAlgorithmInfo() {
    const algorithm = document.getElementById('algorithmSelect').value;
    const info = algorithmDescriptions[algorithm];
    document.getElementById('algorithmInfo').innerText = info;
}

function clearAlgorithmInfo() {
    document.getElementById('algorithmInfo').innerText = '';
}

function highlightButton(buttonLabel) {
    const buttons = document.querySelectorAll('.controls button');
    buttons.forEach(btn => {
        if (btn.innerText === buttonLabel) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function changeGridSize() {
    const newRows = parseInt(document.getElementById('gridRows').value, 10);
    const newCols = parseInt(document.getElementById('gridCols').value, 10);

    rows = newRows;
    cols = newCols;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    clearMaze();
    drawGrid();
}

function drawGrid() {
    ctx.strokeStyle = 'grey';
    console.log('Drawing grid');
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            ctx.strokeRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
    }
}

drawGrid();
