import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  GestureResponderEvent,
} from "react-native";
import Svg, {
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
  Polyline,
} from "react-native-svg";
import { useAudioPlayer } from "expo-audio";

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type GameMode = "INFINITE" | "WALL";

// 2:3 Aspect Ratio Grid
const GRID_W = 20;
const GRID_H = 30;
const CELL_SIZE = 20;

const VIRTUAL_WIDTH = GRID_W * CELL_SIZE;
const VIRTUAL_HEIGHT = GRID_H * CELL_SIZE;

// Dynamic Speed configuration
const INITIAL_SPEED_DELAY = 180;
const MIN_SPEED_DELAY = 60;

const generateFood = (snake: Point[]): Point => {
  while (true) {
    const newFood = {
      x: Math.floor(Math.random() * GRID_W),
      y: Math.floor(Math.random() * GRID_H),
    };
    let isOnSnake = false;
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === newFood.x && snake[i].y === newFood.y) {
        isOnSnake = true;
        break;
      }
    }
    if (!isOnSnake) return newFood;
  }
};

export default function App() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 15 }]);
  const [direction, setDirection] = useState<Direction>("UP");
  const [food, setFood] = useState<Point>({ x: 10, y: 10 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mode, setMode] = useState<GameMode>("INFINITE");
  const [activeKey, setActiveKey] = useState<Direction | null>(null);

  const currentDirectionRef = useRef<Direction>("UP");
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentDelay = Math.max(
    MIN_SPEED_DELAY,
    INITIAL_SPEED_DELAY - Math.floor(score / 10) * 4,
  );

  // --- Audio Setup (expo-audio) ---
  // NOTE: Make sure to place 'eat.mp3' and 'gameover.mp3' in your assets folder!
  // Uncomment the following lines once your audio files are in place:

  const eatSound = useAudioPlayer(require("./assets/sounds/eat.wav"));
  const gameOverSound = useAudioPlayer(require("./assets/sounds/gameover.wav"));

  const playEatSound = () => {
    if (eatSound) {
      eatSound.seekTo(0); // Reset to start in case it's replaying rapidly
      eatSound.play();
    }
  };

  const playGameOverSound = () => {
    if (gameOverSound) {
      gameOverSound.seekTo(0);
      gameOverSound.play();
    }
  };

  useEffect(() => {
    currentDirectionRef.current = direction;
  }, [direction]);

  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);

    const initialSnake = [
      { x: cx, y: cy },
      { x: cx, y: cy + 1 },
      { x: cx, y: cy + 2 },
    ];

    setSnake(initialSnake);
    setDirection("UP");
    currentDirectionRef.current = "UP";
    setFood(generateFood(initialSnake));
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
  };

  const resignGame = () => {
    setGameOver(true);
    setIsPlaying(false);
    playGameOverSound();
  };

  const changeDirection = useCallback(
    (newDir: Direction) => {
      if (gameOver || !isPlaying) return;
      const currentDir = currentDirectionRef.current;
      if (newDir === "UP" && currentDir !== "DOWN") setDirection("UP");
      if (newDir === "DOWN" && currentDir !== "UP") setDirection("DOWN");
      if (newDir === "LEFT" && currentDir !== "RIGHT") setDirection("LEFT");
      if (newDir === "RIGHT" && currentDir !== "LEFT") setDirection("RIGHT");
    },
    [gameOver, isPlaying],
  );

  const handleTouchStart = (e: GestureResponderEvent) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.nativeEvent.pageX - touchStartX.current;
    const deltaY = e.nativeEvent.pageY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > 25)
        deltaX > 0 ? changeDirection("RIGHT") : changeDirection("LEFT");
    } else {
      if (Math.abs(deltaY) > 25)
        deltaY > 0 ? changeDirection("DOWN") : changeDirection("UP");
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const gameLoop = useCallback(() => {
    if (gameOver || !isPlaying) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (currentDirectionRef.current) {
        case "UP":
          newHead.y -= 1;
          break;
        case "DOWN":
          newHead.y += 1;
          break;
        case "LEFT":
          newHead.x -= 1;
          break;
        case "RIGHT":
          newHead.x += 1;
          break;
      }

      if (mode === "WALL") {
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_W ||
          newHead.y < 0 ||
          newHead.y >= GRID_H
        ) {
          setGameOver(true);
          setIsPlaying(false);
          playGameOverSound();
          return prevSnake;
        }
      } else {
        if (newHead.x < 0) newHead.x = GRID_W - 1;
        if (newHead.x >= GRID_W) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_H - 1;
        if (newHead.y >= GRID_H) newHead.y = 0;
      }

      if (prevSnake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true);
        setIsPlaying(false);
        playGameOverSound();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        setFood(generateFood(newSnake));
        playEatSound();
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [food, gameOver, isPlaying, mode]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>; // <-- Changed this line
    if (isPlaying && !gameOver) {
      intervalId = setInterval(gameLoop, currentDelay);
    }
    return () => clearInterval(intervalId);
  }, [gameLoop, currentDelay, isPlaying, gameOver]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, !isPlaying && { justifyContent: "center" }]}>
        <Text style={[styles.logo, isPlaying && { fontSize: 24 }]}>
          SOFTY<Text style={styles.logoSpan}>SNAKE</Text>
        </Text>
        {isPlaying && (
          <Text style={styles.scoreReadout}>
            SCORE: {score.toString().padStart(4, "0")}
          </Text>
        )}
      </View>

      {/* Game Area */}
      <View style={styles.gameAreaWrapper}>
        <View
          style={[
            styles.gameArea,
            mode === "WALL" && isPlaying ? styles.wallMode : null,
          ]}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Svg
            viewBox={`0 0 ${VIRTUAL_WIDTH} ${VIRTUAL_HEIGHT}`}
            style={styles.svgBoard}
          >
            <Defs>
              <LinearGradient
                id="snake-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#00f2fe" />
                <Stop offset="100%" stopColor="#4facfe" />
              </LinearGradient>
            </Defs>

            <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" />

            <Circle
              cx={food.x * CELL_SIZE + 10}
              cy={food.y * CELL_SIZE + 10}
              r={8}
              fill="#ff4757"
            />

            {snake.map((s, i) => {
              const isHead = i === 0;
              return (
                <G key={i}>
                  <Rect
                    x={s.x * CELL_SIZE + 1}
                    y={s.y * CELL_SIZE + 1}
                    width={18}
                    height={18}
                    rx={isHead ? 6 : 4}
                    fill={isHead ? "#4facfe" : "url(#snake-gradient)"}
                    opacity={isHead ? 1 : 0.8}
                  />
                  {isHead && (
                    <>
                      <Circle
                        cx={s.x * CELL_SIZE + 6}
                        cy={s.y * CELL_SIZE + 7}
                        r={2}
                        fill="white"
                      />
                      <Circle
                        cx={s.x * CELL_SIZE + 14}
                        cy={s.y * CELL_SIZE + 7}
                        r={2}
                        fill="white"
                      />
                    </>
                  )}
                </G>
              );
            })}
          </Svg>

          {(!isPlaying || gameOver) && (
            <View style={styles.glassOverlay}>
              <Pressable
                style={[styles.btn, styles.neonBlueBtn]}
                onPress={() => startGame("INFINITE")}
              >
                <Text style={styles.btnText}>INFINITE MODE</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.neonRedBtn]}
                onPress={() => startGame("WALL")}
              >
                <Text style={styles.btnText}>WALL MODE</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* D-Pad Controls */}
      {isPlaying && (
        <View style={styles.controlsContainer}>
          <View style={styles.dPad}>
            <View style={styles.dPadEmpty} />
            <Pressable
              style={[
                styles.controlBtn,
                activeKey === "UP" && styles.activeBtn,
              ]}
              onPressIn={() => changeDirection("UP")}
            >
              <Svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4facfe"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Polyline points="18 15 12 9 6 15" />
              </Svg>
            </Pressable>
            <View style={styles.dPadEmpty} />

            <Pressable
              style={[
                styles.controlBtn,
                activeKey === "LEFT" && styles.activeBtn,
              ]}
              onPressIn={() => changeDirection("LEFT")}
            >
              <Svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4facfe"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Polyline points="15 18 9 12 15 6" />
              </Svg>
            </Pressable>
            <Pressable
              style={[
                styles.controlBtn,
                activeKey === "DOWN" && styles.activeBtn,
              ]}
              onPressIn={() => changeDirection("DOWN")}
            >
              <Svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4facfe"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Polyline points="6 9 12 15 18 9" />
              </Svg>
            </Pressable>
            <Pressable
              style={[
                styles.controlBtn,
                activeKey === "RIGHT" && styles.activeBtn,
              ]}
              onPressIn={() => changeDirection("RIGHT")}
            >
              <Svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4facfe"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Polyline points="9 18 15 12 9 6" />
              </Svg>
            </Pressable>
          </View>
        </View>
      )}

      {/* Footer */}
      {isPlaying && (
        <View style={styles.footer}>
          <Text style={styles.modeTag}>{mode} MODE</Text>
          <Pressable style={styles.resignBtn} onPress={resignGame}>
            <Text style={styles.resignBtnText}>RESIGN SESSION</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0b10",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: 500,
    height: 50,
  },
  logo: {
    fontWeight: "bold",
    fontSize: 32,
    color: "#4facfe",
    letterSpacing: 2,
  },
  logoSpan: {
    color: "#ffffff",
  },
  scoreReadout: {
    color: "#ffa502",
    fontSize: 18,
    fontWeight: "bold",
  },
  gameAreaWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  gameArea: {
    aspectRatio: 2 / 3,
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderColor: "rgba(79, 172, 254, 0.3)",
    borderWidth: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  wallMode: {
    borderColor: "#ff4757",
  },
  svgBoard: {
    width: "100%",
    height: "100%",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 11, 16, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 10,
  },
  neonBlueBtn: {
    borderColor: "#4facfe",
  },
  neonRedBtn: {
    borderColor: "#ff4757",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  controlsContainer: {
    height: 140,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dPad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 180,
    height: 120,
    justifyContent: "center",
    alignContent: "center",
  },
  dPadEmpty: {
    width: 60,
    height: 60,
  },
  controlBtn: {
    width: 55,
    height: 55,
    margin: 2,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(79, 172, 254, 0.3)",
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  activeBtn: {
    backgroundColor: "#4facfe",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: 500,
    height: 40,
  },
  modeTag: {
    fontSize: 14,
    color: "#777",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  resignBtn: {
    borderWidth: 1,
    borderColor: "#ff4757",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  resignBtnText: {
    color: "#ff4757",
    fontSize: 12,
    fontWeight: "bold",
  },
});
