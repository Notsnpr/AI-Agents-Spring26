import { useEffect, useMemo, useReducer } from 'react'
import './App.css'

const ROWS = 20
const COLS = 20
const TICK_MS = 120

const Direction = {
  Up: 'UP',
  Down: 'DOWN',
  Left: 'LEFT',
  Right: 'RIGHT',
}

function directionDelta(direction) {
  switch (direction) {
    case Direction.Up:
      return { x: 0, y: -1 }
    case Direction.Down:
      return { x: 0, y: 1 }
    case Direction.Left:
      return { x: -1, y: 0 }
    case Direction.Right:
      return { x: 1, y: 0 }
    default:
      return { x: 0, y: 0 }
  }
}

function isOpposite(a, b) {
  return (
    (a === Direction.Up && b === Direction.Down) ||
    (a === Direction.Down && b === Direction.Up) ||
    (a === Direction.Left && b === Direction.Right) ||
    (a === Direction.Right && b === Direction.Left)
  )
}

function posKey(position) {
  return `${position.x},${position.y}`
}

function randomEmptyCell(rows, cols, snake) {
  const taken = new Set(snake.map(posKey))
  const empty = []

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x},${y}`
      if (!taken.has(key)) empty.push({ x, y })
    }
  }

  if (empty.length === 0) return null
  return empty[Math.floor(Math.random() * empty.length)]
}

function initialState() {
  const centerX = Math.floor(COLS / 2)
  const centerY = Math.floor(ROWS / 2)
  const snake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ]
  const food = randomEmptyCell(ROWS, COLS, snake)

  return {
    rows: ROWS,
    cols: COLS,
    snake,
    food,
    score: 0,
    status: 'idle',
    direction: Direction.Right,
    queuedDirection: null,
    outcome: null,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      if (state.status === 'running') return state
      return { ...state, status: 'running', outcome: null }
    case 'PAUSE':
      if (state.status !== 'running') return state
      return { ...state, status: 'paused' }
    case 'RESUME':
      if (state.status !== 'paused') return state
      return { ...state, status: 'running' }
    case 'RESET':
      return initialState()
    case 'QUEUE_DIRECTION': {
      if (state.status === 'gameover') return state
      const next = action.direction
      const base = state.queuedDirection ?? state.direction
      if (next === base) return state
      if (isOpposite(base, next)) return state
      return { ...state, queuedDirection: next }
    }
    case 'TICK': {
      if (state.status !== 'running') return state
      if (!state.food) return state

      const usedDirection = state.queuedDirection ?? state.direction
      const delta = directionDelta(usedDirection)
      const head = state.snake[0]
      const nextHead = { x: head.x + delta.x, y: head.y + delta.y }

      if (
        nextHead.x < 0 ||
        nextHead.x >= state.cols ||
        nextHead.y < 0 ||
        nextHead.y >= state.rows
      ) {
        return { ...state, status: 'gameover', outcome: 'lose' }
      }

      const eatsFood =
        state.food && nextHead.x === state.food.x && nextHead.y === state.food.y

      const bodyToCheck = eatsFood ? state.snake : state.snake.slice(0, -1)
      const bodySet = new Set(bodyToCheck.map(posKey))
      if (bodySet.has(posKey(nextHead))) {
        return { ...state, status: 'gameover', outcome: 'lose' }
      }

      const nextSnake = eatsFood
        ? [nextHead, ...state.snake]
        : [nextHead, ...state.snake.slice(0, -1)]

      if (!eatsFood) {
        return {
          ...state,
          snake: nextSnake,
          direction: usedDirection,
          queuedDirection: null,
        }
      }

      const nextFood = randomEmptyCell(state.rows, state.cols, nextSnake)
      if (!nextFood) {
        return {
          ...state,
          snake: nextSnake,
          direction: usedDirection,
          queuedDirection: null,
          score: state.score + 1,
          food: null,
          status: 'gameover',
          outcome: 'win',
        }
      }

      return {
        ...state,
        snake: nextSnake,
        direction: usedDirection,
        queuedDirection: null,
        score: state.score + 1,
        food: nextFood,
      }
    }
    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    if (state.status !== 'running') return
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), TICK_MS)
    return () => window.clearInterval(id)
  }, [state.status])

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase()
      const next =
        key === 'arrowup' || key === 'w'
          ? Direction.Up
          : key === 'arrowdown' || key === 's'
            ? Direction.Down
            : key === 'arrowleft' || key === 'a'
              ? Direction.Left
              : key === 'arrowright' || key === 'd'
                ? Direction.Right
                : null

      if (next) {
        event.preventDefault()
        dispatch({ type: 'QUEUE_DIRECTION', direction: next })
      }
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const snakeSet = useMemo(() => new Set(state.snake.map(posKey)), [state.snake])
  const headKey = posKey(state.snake[0])
  const foodKey = state.food ? posKey(state.food) : null

  const cells = useMemo(() => {
    const items = []
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const key = `${x},${y}`
        items.push(key)
      }
    }
    return items
  }, [state.rows, state.cols])

  const statusLabel =
    state.status === 'idle'
      ? 'Press Start'
      : state.status === 'paused'
        ? 'Paused'
        : state.status === 'gameover'
          ? state.outcome === 'win'
            ? 'You Win'
            : 'Game Over'
          : 'Running'

  return (
    <div className="app">
      <div className="shell">
        <div className="header">
          <h1 className="title">SNAKE</h1>
          <div className="score">SCORE {state.score}</div>
        </div>

        <div className="panel">
          <div className="boardWrap">
            <div
              className="board"
              style={{ gridTemplateColumns: `repeat(${state.cols}, 1fr)` }}
            >
              {cells.map((key) => {
                const isSnake = snakeSet.has(key)
                const isHead = key === headKey
                const isFood = foodKey === key
                const className =
                  'cell' +
                  (isSnake ? ' snake' : '') +
                  (isHead ? ' head' : '') +
                  (isFood ? ' food' : '')

                return <div key={key} className={className} />
              })}
            </div>

            {state.status !== 'running' && (
              <div className="overlay">
                <div>
                  <p className="overlayTitle">{statusLabel}</p>
                  <p className="overlayText">Use WASD / arrows or D-pad</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel controls">
          <div className="buttonsRow">
            {state.status !== 'running' ? (
              <button
                className="btn btnPrimary"
                onClick={() => dispatch({ type: 'START' })}
              >
                START
              </button>
            ) : (
              <button className="btn" onClick={() => dispatch({ type: 'PAUSE' })}>
                PAUSE
              </button>
            )}

            {state.status === 'paused' && (
              <button
                className="btn btnPrimary"
                onClick={() => dispatch({ type: 'RESUME' })}
              >
                RESUME
              </button>
            )}

            <button className="btn btnDanger" onClick={() => dispatch({ type: 'RESET' })}>
              RESTART
            </button>
          </div>

          <div className="dpad">
            <div className="btn dpadBtn dpadBtnEmpty" />
            <button
              className="btn dpadBtn"
              onPointerDown={() => dispatch({ type: 'QUEUE_DIRECTION', direction: Direction.Up })}
            >
              ▲
            </button>
            <div className="btn dpadBtn dpadBtnEmpty" />

            <button
              className="btn dpadBtn"
              onPointerDown={() =>
                dispatch({ type: 'QUEUE_DIRECTION', direction: Direction.Left })
              }
            >
              ◀
            </button>
            <div className="btn dpadBtn dpadBtnEmpty" />
            <button
              className="btn dpadBtn"
              onPointerDown={() =>
                dispatch({ type: 'QUEUE_DIRECTION', direction: Direction.Right })
              }
            >
              ▶
            </button>

            <div className="btn dpadBtn dpadBtnEmpty" />
            <button
              className="btn dpadBtn"
              onPointerDown={() =>
                dispatch({ type: 'QUEUE_DIRECTION', direction: Direction.Down })
              }
            >
              ▼
            </button>
            <div className="btn dpadBtn dpadBtnEmpty" />
          </div>

          <div className="hint">Hit a wall or yourself to lose.</div>
        </div>
      </div>
    </div>
  )
}

export default App
