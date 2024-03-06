// Constants

const SQUARE_SIZE = 26;
const GAME_ROWS = 18;
const GAME_COLUMNS = 10;

const NEXT_ITEMS_ROWS = 6;
const NEXT_ITEMS_COLUMNS = 6;

const SCORE_X_ROW = 100;
const BONUS_X_ROW = 0.5;

const ITEM_POOL = [
    // RECT:
    {
        color: "blue",
        layout: [[1, 1, 1, 1]],
    },
    // L_1:
    {
        color: "yellow",
        layout: [
            [1, 0],
            [1, 0],
            [1, 1],
        ],
    },
    // L_2:
    {
        color: "yellow",
        layout: [
            [0, 1],
            [0, 1],
            [1, 1],
        ],
    },
    // SQUARE:
    {
        color: "red",
        layout: [
            [1, 1],
            [1, 1],
        ],
    },
    // Z_1:
    {
        color: "purple",
        layout: [
            [1, 1, 0],
            [0, 1, 1],
        ],
    },
    // Z_2:
    {
        color: "purple",
        layout: [
            [0, 1, 1],
            [1, 1, 0],
        ],
    },
    // TANK:
    {
        color: "green",
        layout: [
            [0, 1, 0],
            [1, 1, 1],
        ],
    },
];

const MOVEMENT = {
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
};

const STATUS = {
    INITIAL: "INITIAL",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    GAME_OVER: "GAME_OVER",
};

// Variables

let current_status = STATUS.INITIAL;

let score = 0;

let deleted_rows = 0;

let game_layout = [];

let current_item = null;

let next_item = null;

let current_ghost_y = null;

let render_interval = null;

const MUSIC = new Audio("./assets/music.mp3");
const MUSIC_VOLUME = 0.6;

const BREAK_SOUND = new Audio("./assets/break_sound.wav");
const DROP_SOUND = new Audio("./assets/drop_sound.wav");
const MOVE_SOUND = new Audio("./assets/move_sound.wav");
const GAME_OVER_SOUND = new Audio("./assets/game_over_sound.wav");
const SOUND_VOLUME = 0.4;

// Exec

document.addEventListener("keydown", key_pressed);
document.getElementById("sound_on_icon").addEventListener("click", toggle_sound);
document.getElementById("sound_off_icon").addEventListener("click", toggle_sound);

load();

// Functions

function key_pressed(event) {
    switch (event.key) {
        case "ArrowDown":
            if (current_status !== STATUS.PLAYING) return;
            drop_current_item();
            break;
        case "ArrowUp":
            if (current_status !== STATUS.PLAYING) return;
            if (can_rotate_current_item() === false) {
                return false;
            }
            rotate_current_item();
            break;
        case "ArrowLeft":
            if (current_status !== STATUS.PLAYING) return;
            if (can_move_current_item(MOVEMENT.LEFT) === false) {
                return false;
            }
            move_current_item(MOVEMENT.LEFT);
            break;
        case "ArrowRight":
            if (current_status !== STATUS.PLAYING) return;
            if (can_move_current_item(MOVEMENT.RIGHT) === false) {
                return false;
            }
            move_current_item(MOVEMENT.RIGHT);
            break;
        case "Enter":
            if (current_status === STATUS.PLAYING) {
                current_status = STATUS.PAUSED;
                add_class("pause", "visible");
                MUSIC.pause();
            } else if (current_status === STATUS.PAUSED) {
                current_status = STATUS.PLAYING;
                remove_class("pause", "visible");
                MUSIC.play();
            }
            break;
        case "R":
            init();
            break;
        case "r":
            init();
            break;
        case "M":
            toggle_sound();
            break;
        case "m":
            toggle_sound();
            break;
        default:
            return;
    }
}

function load() {
    for (let y = 0; y < GAME_ROWS; y++) {
        let array_row = Array(GAME_COLUMNS).fill(null);
        game_layout.push(array_row);
    }

    draw_background_game();

    const volume_config = localStorage.getItem("volume") ? localStorage.getItem("volume") : "true";
    const enable_volume = volume_config === "true" ? true : false;

    enable_disable_sound(enable_volume);

    MUSIC.loop = true;
}

function init() {
    clearInterval(render_interval);

    current_status = STATUS.PLAYING;

    set_content("game", "");
    game_layout = [];

    for (let y = 0; y < GAME_ROWS; y++) {
        let array_row = Array(GAME_COLUMNS).fill(null);
        game_layout.push(array_row);
    }

    current_item = get_new_item();
    current_item.position = {
        x: Math.round(GAME_COLUMNS / 2),
        y: -current_item.layout.length,
    };
    draw_current_item();

    next_item = get_new_item();
    draw_next_item();

    remove_class("game_message", "visible");
    remove_class("pause", "visible");

    score = 0;
    set_content("score_value", score.toString());

    deleted_rows = 0;
    set_content("deleted_rows_value", deleted_rows.toString());

    draw_ghost();

    MUSIC.currentTime = 0;
    MUSIC.play();

    render_interval = setInterval(update, 300);
}

function update() {
    if (current_status !== STATUS.PLAYING) return;

    if (can_move_current_item(MOVEMENT.DOWN) === true) {
        move_current_item(MOVEMENT.DOWN);
        return;
    }

    if (current_item.position.y < 0) {
        clearInterval(render_interval);
        add_class("game_message", "visible");
        current_status = STATUS.GAME_OVER;
        MUSIC.pause();
        GAME_OVER_SOUND.play();
        return;
    }

    solidify_current_item();
    delete_full_rows();

    current_item = next_item;
    current_item.position = {
        x: Math.round(GAME_COLUMNS / 2),
        y: -current_item.layout.length,
    };

    next_item = get_new_item();
    draw_next_item();

    draw_ghost();
}

function draw_background_game() {
    for (let x = 0; x < game_layout.length * game_layout[0].length; x++) {
        const div = document.createElement("div");
        div.setAttribute("data-color", "default");
        append_child("game_background", div);
    }
}

function draw_next_item() {
    set_content("next_item", "");
    document.getElementById("next_item").style.width = `${next_item.layout[0].length * SQUARE_SIZE}px`;
    document.getElementById("next_item").style.height = `${next_item.layout.length * SQUARE_SIZE}px`;

    for (let y = 0; y < next_item.layout.length; y++) {
        for (let x = 0; x < next_item.layout[y].length; x++) {
            if (next_item.layout[y][x] === 1) {
                const div = document.createElement("div");
                div.setAttribute("data-color", next_item.color);
                div.style.top = `${SQUARE_SIZE * y}px`;
                div.style.left = `${SQUARE_SIZE * x}px`;
                append_child("next_item", div);
            }
        }
    }
}

function draw_current_item() {
    const current_y = current_item.position.y;
    const current_x = current_item.position.x;

    for (let y = 0; y < current_item.layout.length; y++) {
        for (let x = 0; x < current_item.layout[y].length; x++) {
            if (current_item.layout[y][x] === 1 && y + current_y >= 0) {
                const div = document.createElement("div");
                div.setAttribute("data-color", current_item.color);
                div.setAttribute("id", `${x + current_x}_${y + current_y}`);
                div.style.top = `${SQUARE_SIZE * (y + current_y)}px`;
                div.style.left = `${SQUARE_SIZE * (x + current_x)}px`;
                append_child("game", div);
            }
        }
    }
}

function draw_game() {
    set_content("game", "");

    for (let y = 0; y < game_layout.length; y++) {
        for (let x = 0; x < game_layout[y].length; x++) {
            if (game_layout[y][x] !== null) {
                const div = document.createElement("div");
                div.setAttribute("data-color", game_layout[y][x]);
                div.style.top = `${SQUARE_SIZE * y}px`;
                div.style.left = `${SQUARE_SIZE * x}px`;
                document.getElementById("game").appendChild(div);
            }
        }
    }
}

function draw_ghost() {
    current_ghost_y = current_item.position.y;

    for (let i = current_item.position.y; i < GAME_ROWS; i++) {
        if (can_move_current_item({ x: 0, y: i - current_item.position.y }) === true) {
            current_ghost_y = i;
        } else {
            break;
        }
    }

    for (let y = 0; y < current_item.layout.length; y++) {
        for (let x = 0; x < current_item.layout[y].length; x++) {
            if (current_item.layout[y][x] === 1 && y + current_ghost_y >= 0) {
                const div = document.createElement("div");
                div.setAttribute("id", `${x + current_item.position.x}_${y + current_ghost_y}_ghost`);
                div.classList.add("ghost");
                div.style.top = `${SQUARE_SIZE * (y + current_ghost_y)}px`;
                div.style.left = `${SQUARE_SIZE * (x + current_item.position.x)}px`;
                document.getElementById("game").appendChild(div);
            }
        }
    }
}

function erase_current_item() {
    for (let y = 0; y < current_item.layout.length; y++) {
        for (let x = 0; x < current_item.layout[y].length; x++) {
            if (current_item.layout[y][x] === 1) {
                const div = document.getElementById(`${x + current_item.position.x}_${y + current_item.position.y}`);
                if (div) {
                    document.getElementById("game").removeChild(div);
                }
            }
        }
    }
}

function erase_ghost() {
    for (let y = 0; y < current_item.layout.length; y++) {
        for (let x = 0; x < current_item.layout[y].length; x++) {
            if (current_item.layout[y][x] === 1) {
                const div = document.getElementById(`${x + current_item.position.x}_${y + current_ghost_y}_ghost`);
                if (div) {
                    document.getElementById("game").removeChild(div);
                }
            }
        }
    }
}

function can_move_current_item(movement) {
    const new_y = current_item.position.y + movement.y;
    const new_x = current_item.position.x + movement.x;

    let can_move = true;

    for (let y = 0; y < current_item.layout.length; y++) {
        for (let x = 0; x < current_item.layout[y].length; x++) {
            if (current_item.layout[y][x] === 0) {
                continue;
            }

            if (
                new_x + x < 0 ||
                new_x + x >= GAME_COLUMNS ||
                new_y + y >= GAME_ROWS ||
                !!game_layout[new_y + y]?.[new_x + x] !== false
            ) {
                can_move = false;
                break;
            }
        }
    }

    return can_move;
}

function move_current_item(movement) {
    erase_current_item();

    if (movement !== MOVEMENT.DOWN) {
        erase_ghost();
    }

    current_item.position = {
        x: current_item.position.x + movement.x,
        y: current_item.position.y + movement.y,
    };

    draw_current_item();

    if (movement !== MOVEMENT.DOWN) {
        draw_ghost();
        MOVE_SOUND.play();
    }
}

function can_rotate_current_item() {
    const current_y = current_item.position.y;
    const current_x = current_item.position.x;

    let new_layout = rotate_array(current_item.layout);

    let can_rotate = true;

    for (let y = 0; y < new_layout.length; y++) {
        for (let x = 0; x < new_layout[y].length; x++) {
            if (new_layout[y][x] === 0) {
                continue;
            }

            if (
                current_x + x < 0 ||
                current_x + x >= GAME_COLUMNS ||
                current_y + y >= GAME_ROWS ||
                !!game_layout[current_y + y]?.[current_x + x] !== false
            ) {
                can_rotate = false;
                break;
            }
        }
    }

    return can_rotate;
}

function rotate_current_item() {
    erase_current_item();
    erase_ghost();

    current_item.layout = rotate_array(current_item.layout);

    draw_current_item();
    draw_ghost();

    MOVE_SOUND.play();
}

function drop_current_item() {
    const previous_current_y = current_item.position.y;

    for (let i = current_item.position.y; i < GAME_ROWS; i++) {
        if (can_move_current_item(MOVEMENT.DOWN) === true) {
            move_current_item(MOVEMENT.DOWN);
        } else {
            break;
        }
    }

    const shadow_drop = document.getElementById("shadow_drop");

    if (shadow_drop) {
        document.getElementById("game").removeChild(shadow_drop);
    }

    const difference_blocks = current_ghost_y - previous_current_y;

    const div = document.createElement("div");
    div.setAttribute("id", "shadow_drop");
    div.style.top = `${SQUARE_SIZE * (previous_current_y + current_item.layout.length)}px`;
    div.style.left = `${SQUARE_SIZE * current_item.position.x}px`;
    div.style.width = `${SQUARE_SIZE * current_item.layout[0].length}px`;
    div.style.height = `${SQUARE_SIZE * difference_blocks}px`;
    document.getElementById("game").appendChild(div);

    DROP_SOUND.pause();
    DROP_SOUND.currentTime = 0;
    DROP_SOUND.play();
}

function solidify_current_item() {
    const current_x = current_item.position.x;
    const current_y = current_item.position.y;

    for (let y = 0; y < current_item.layout.length; y++) {
        for (let x = 0; x < current_item.layout[y].length; x++) {
            if (current_item.layout[y][x] === 1) {
                game_layout[y + current_y][x + current_x] = current_item.color;
            }
        }
    }
}

function delete_full_rows() {
    let new_dashboard = [];
    let full_rows_counter = 0;

    for (let y = 0; y < game_layout.length; y++) {
        if (game_layout[y].filter((x) => x === null).length === 0) {
            full_rows_counter++;
        } else {
            new_dashboard.push(game_layout[y]);
        }
    }

    if (full_rows_counter === 0) {
        return;
    }

    for (let y = 0; y < full_rows_counter; y++) {
        new_dashboard.unshift(Array(GAME_COLUMNS).fill(null));
    }

    game_layout = new_dashboard;

    draw_game();

    score += Math.round((full_rows_counter + (full_rows_counter - 1) * BONUS_X_ROW) * SCORE_X_ROW);
    set_content("score_value", score.toString());

    deleted_rows += full_rows_counter;
    set_content("deleted_rows_value", deleted_rows.toString());

    BREAK_SOUND.play();
}

function enable_disable_sound(enable_sound) {
    const new_music_volume = enable_sound === true ? MUSIC_VOLUME : 0;
    const new_sound_volume = enable_sound === true ? SOUND_VOLUME : 0;

    if (enable_sound === false) {
        add_class("sound_off_icon", "visible");
        remove_class("sound_on_icon", "visible");
        localStorage.setItem("volume", "false");
    } else {
        add_class("sound_on_icon", "visible");
        remove_class("sound_off_icon", "visible");
        localStorage.setItem("volume", "true");
    }

    MUSIC.volume = new_music_volume;
    BREAK_SOUND.volume = new_sound_volume;
    DROP_SOUND.volume = new_sound_volume;
    MOVE_SOUND.volume = new_sound_volume;
    GAME_OVER_SOUND.volume = new_sound_volume;
}

function toggle_sound() {
    const enable_volume = MUSIC.volume === 0 ? true : false;
    enable_disable_sound(enable_volume);
}

// UTILS

function get_new_item() {
    const new_item = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];

    let new_layout = new_item.layout;

    for (let index = 0; index < Math.floor(Math.random() * 5); index++) {
        new_layout = rotate_array(new_layout);
    }

    return {
        ...new_item,
        layout: new_layout,
    };
}

function add_class(id, class_name) {
    document.getElementById(id).classList.add(class_name);
}

function remove_class(id, class_name) {
    document.getElementById(id).classList.remove(class_name);
}

function set_content(id, content) {
    document.getElementById(id).textContent = content;
}

function append_child(id, child) {
    document.getElementById(id).appendChild(child);
}

function remove_child(id, child) {
    document.getElementById(id).removeChild(child);
}

function rotate_array(array) {
    let new_layout = [];
    let new_row = [];

    for (let x = 0; x < array[0].length; x++) {
        new_row = [];

        for (let y = array.length - 1; y >= 0; y--) {
            new_row.push(array[y][x]);
        }

        new_layout.push(new_row);
    }

    return new_layout;
}
