import os
from flask import Flask, request, jsonify, send_from_directory
from typing import List, Tuple, Dict
from enum import Enum
import heapq
from collections import deque
import random

app = Flask(__name__, static_folder='static', static_url_path='')

class PositionState(Enum):
    UNEXPLORED = 0
    EXPLORED = 1
    START = 2
    GOAL = 3
    OBSTACLE = 4

def initialize_maze(dct: Dict) -> Tuple[List[List[PositionState]], Tuple[int, int], List[Tuple[int, int]], List[Tuple[int, int]]]:
    rows, columns = dct['rows'], dct['cols']
    maze_array = [[PositionState.UNEXPLORED] * columns for _ in range(rows)]
    start_position = tuple(dct['start'])
    goal_positions = [tuple(goal) for goal in dct['goals']]
    obstacles = [(int(obstacle[0]), int(obstacle[1])) for obstacle in dct['obstacles']]
    
    maze_array[int(start_position[0])][int(start_position[1])] = PositionState.START
    for goal in goal_positions:
        maze_array[int(goal[0])][int(goal[1])] = PositionState.GOAL
    for obstacle in obstacles:
        maze_array[int(obstacle[0])][int(obstacle[1])] = PositionState.OBSTACLE

    return maze_array, start_position, goal_positions, obstacles

def backtrack_path(parents: Dict[Tuple[int, int], Tuple[int, int]], start_position: Tuple[int, int], goal_position: Tuple[int, int]) -> List[Tuple[int, int]]:
    final_path = [goal_position]
    child = goal_position
    while child != start_position:
        final_path.append(parents[child])
        child = parents[child]
    return final_path[::-1]

def search(dct: Dict, search_algorithm: str) -> Tuple[List[Tuple[int, int]], int]:
    maze_array, start_position, goal_positions, _ = initialize_maze(dct)
    
    if maze_array[int(start_position[0])][int(start_position[1])] in (PositionState.OBSTACLE, PositionState.GOAL):
        return [start_position] if maze_array[int(start_position[0])][int(start_position[1])] == PositionState.GOAL else [], 0

    search_functions = {
        'dfs': dfs_search,
        'bfs': bfs_search,
        'astar': a_star_search,
        'random_walk': random_walk_search
    }

    if search_algorithm in search_functions:
        return search_functions[search_algorithm](maze_array, start_position, goal_positions)
    
    return [], 0

def dfs_search(maze_array: List[List[PositionState]], start_position: Tuple[int, int], goal_positions: List[Tuple[int, int]]) -> Tuple[List[Tuple[int, int]], int]:
    rows, columns = len(maze_array), len(maze_array[0])
    positions_stack = [start_position]
    possible_actions = [(0, 1), (-1, 0), (0, -1), (1, 0)]
    parents = {start_position: None}
    visited_count = 0

    while positions_stack:
        current_position = positions_stack.pop()
        visited_count += 1
        maze_array[int(current_position[0])][int(current_position[1])] = PositionState.EXPLORED
        
        for move in possible_actions:
            new_position = (int(current_position[0]) + move[0], int(current_position[1]) + move[1])
            
            if 0 <= new_position[0] < rows and 0 <= new_position[1] < columns and maze_array[new_position[0]][new_position[1]] != PositionState.OBSTACLE:
                if maze_array[new_position[0]][new_position[1]] == PositionState.GOAL:
                    parents[new_position] = current_position
                    return backtrack_path(parents, start_position, new_position), visited_count 
                elif maze_array[new_position[0]][new_position[1]] == PositionState.UNEXPLORED:
                    parents[new_position] = current_position
                    positions_stack.append(new_position)
                    
    return [], visited_count

def bfs_search(maze_array: List[List[PositionState]], start_position: Tuple[int, int], goal_positions: List[Tuple[int, int]]) -> Tuple[List[Tuple[int, int]], int]:
    rows, columns = len(maze_array), len(maze_array[0])
    positions_queue = deque([start_position])
    possible_actions = [(0, 1), (-1, 0), (0, -1), (1, 0)]
    parents = {start_position: None}
    visited_count = 0

    while positions_queue:
        current_position = positions_queue.popleft()
        visited_count += 1
        current_row, current_column = int(current_position[0]), int(current_position[1])

        if current_position in goal_positions:
            return backtrack_path(parents, start_position, current_position), visited_count

        if maze_array[current_row][current_column] == PositionState.UNEXPLORED or maze_array[current_row][current_column] == PositionState.START:
            maze_array[current_row][current_column] = PositionState.EXPLORED

            for move in possible_actions:
                new_position = (current_row + move[0], current_column + move[1])
                if 0 <= new_position[0] < rows and 0 <= new_position[1] < columns:
                    if maze_array[new_position[0]][new_position[1]] != PositionState.OBSTACLE:
                        if maze_array[new_position[0]][new_position[1]] in (PositionState.UNEXPLORED, PositionState.GOAL):
                            if new_position not in parents:
                                parents[new_position] = current_position
                                positions_queue.append(new_position)

    return [], visited_count

def a_star_search(maze_array: List[List[PositionState]], start_position: Tuple[int, int], goal_positions: List[Tuple[int, int]]) -> Tuple[List[Tuple[int, int]], int]:
    def heuristic(a, goals):
        # Calculate the minimum distance to any goal
        return min(abs(a[0] - goal[0]) + abs(a[1] - goal[1]) for goal in goals)

    rows, columns = len(maze_array), len(maze_array[0])
    open_set = []
    heapq.heappush(open_set, (0 + heuristic(start_position, goal_positions), 0, start_position))
    parents = {start_position: None}
    g_score = {start_position: 0}
    possible_actions = [(0, 1), (-1, 0), (0, -1), (1, 0)]
    visited_count = 0

    while open_set:
        _, current_cost, current_position = heapq.heappop(open_set)
        visited_count += 1
        
        if current_position in goal_positions:
            return backtrack_path(parents, start_position, current_position), visited_count
        
        maze_array[int(current_position[0])][int(current_position[1])] = PositionState.EXPLORED
        
        for move in possible_actions:
            new_position = (int(current_position[0]) + move[0], int(current_position[1]) + move[1])
            if 0 <= new_position[0] < rows and 0 <= new_position[1] < columns and maze_array[new_position[0]][new_position[1]] != PositionState.OBSTACLE:
                tentative_g_score = current_cost + 1
                if new_position not in g_score or tentative_g_score < g_score[new_position]:
                    g_score[new_position] = tentative_g_score
                    f_score = tentative_g_score + heuristic(new_position, goal_positions)
                    heapq.heappush(open_set, (f_score, tentative_g_score, new_position))
                    parents[new_position] = current_position

    return [], visited_count


def random_walk_search(maze_array: List[List[PositionState]], start_position: Tuple[int, int], goal_positions: List[Tuple[int, int]]) -> Tuple[List[Tuple[int, int]], int]:
    rows, columns = len(maze_array), len(maze_array[0])
    visited_count = 0

    if maze_array[int(start_position[0])][int(start_position[1])] in (PositionState.OBSTACLE, PositionState.GOAL):
        return [start_position] if maze_array[int(start_position[0])][int(start_position[1])] == PositionState.GOAL else [], visited_count

    current_position = start_position
    path = [current_position]
    possible_actions = [(0, 1), (-1, 0), (0, -1), (1, 0)]

    while current_position not in goal_positions:
        visited_count += 1
        random.shuffle(possible_actions)
        for move in possible_actions:
            new_position = (int(current_position[0]) + move[0], int(current_position[1]) + move[1])
            if 0 <= new_position[0] < rows and 0 <= new_position[1] < columns and maze_array[new_position[0]][new_position[1]] != PositionState.OBSTACLE:
                current_position = new_position
                path.append(current_position)
                break

    return path, visited_count

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/solve', methods=['POST'])
def solve_maze():
    data = request.json
    try:
        maze_data = {
            'rows': len(data['maze']),
            'cols': len(data['maze'][0]),
            'start': (int(data['start']['y']), int(data['start']['x'])),
            'goals': [(int(goal['y']), int(goal['x'])) for goal in data['goals']],
            'obstacles': [(int(i), int(j)) for i, row in enumerate(data['maze']) for j, cell in enumerate(row) if cell == 'OBSTACLE']
        }
        algorithm = data['algorithm']

        path, visited_count = search(maze_data, algorithm)
        return jsonify({'path': path, 'visited_count': visited_count})
    except Exception as e:
        print("Error:", e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
