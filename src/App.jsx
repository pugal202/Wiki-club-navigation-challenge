import { useEffect, useMemo, useState } from "react";
import HostDashboard from "./HostDashboard";
import DOMPurify from "dompurify";
import {
  onDisconnect,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";

import {
  auth,
  database,
  signInGuest,
} from "./firebase";

import "./App.css";

/* =====================================================
   10 WIKITECH CHALLENGES
===================================================== */
const CHALLENGES = [
  {
    id: 1,
    start: "Pizza",
    target: "Italy",
  },
  {
    id: 2,
    start: "Albert Einstein",
    target: "Physics",
  },
  {
    id: 3,
    start: "Artificial intelligence",
    target: "Machine learning",
  },
  {
    id: 4,
    start: "Smartphone",
    target: "Android (operating system)",
    displayTarget: "Android",
  },
  {
    id: 5,
    start: "Amazon rainforest",
    target: "Brazil",
  },
  {
    id: 6,
    start: "Apple Inc.",
    target: "IPhone",
  },
  {
    id: 7,
    start: "Internet",
    target: "World Wide Web",
  },
  {
    id: 8,
    start: "Leonardo da Vinci",
    target: "Mona Lisa",
  },
  {
    id: 9,
    start: "Football",
    target: "Association football",
  },
  {
    id: 10,
    start: "Moon",
    target: "NASA",
  },
];
/* =====================================================
   CREATE UNIQUE PLAYER ID
===================================================== */

const getPlayerId = () => {
  let id = sessionStorage.getItem(
    "wikitech_player_id"
  );

  if (!id) {
    id =
      "player_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 10);

    sessionStorage.setItem(
      "wikitech_player_id",
      id
    );
  }

  return id;
};

/* =====================================================
   APP
===================================================== */

function App() {
    if (window.location.pathname === "/host") {
    return <HostDashboard />;
  }
  const [name, setName] = useState("");

  const [started, setStarted] =
    useState(false);

  const [selectedChallenge, setSelectedChallenge] =
    useState(null);

  const [playerId] =
    useState(getPlayerId);

  const [currentArticle, setCurrentArticle] =
    useState("");

  const [articleHtml, setArticleHtml] =
    useState("");

  const [loadingArticle, setLoadingArticle] =
    useState(false);

  const [timeLeft, setTimeLeft] =
    useState(180);

  const [moves, setMoves] =
    useState(0);

  const [finished, setFinished] =
    useState(false);

  const [resultMessage, setResultMessage] =
    useState("");

  const [score, setScore] =
    useState(0);

  const [completionTime, setCompletionTime] =
    useState(0);

  const [players, setPlayers] =
    useState([]);

  const [databaseLoading, setDatabaseLoading] =
    useState(true);

  const [authReady, setAuthReady] =
    useState(false);

  /* =====================================================
     FIREBASE ANONYMOUS LOGIN
  ===================================================== */

  useEffect(() => {
    signInGuest()
      .then(() => {
        console.log(
          "Firebase anonymous authentication successful"
        );
      })
      .catch((error) => {
        console.error(
          "Firebase anonymous authentication failed:",
          error
        );
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  /* =====================================================
     FIREBASE LIVE LEADERBOARD
  ===================================================== */

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const playersRef =
      ref(database, "players");

    const unsubscribe =
      onValue(
        playersRef,
        (snapshot) => {
          const data =
            snapshot.val();

          if (!data) {
            setPlayers([]);
            setDatabaseLoading(false);
            return;
          }

          const playerList =
            Object.entries(data).map(
              ([id, player]) => ({
                id,
                ...player,
              })
            );

          setPlayers(playerList);
          setDatabaseLoading(false);
        },
        (error) => {
          console.error(
            "Firebase leaderboard error:",
            error
          );

          setDatabaseLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [authReady]);

  /* =====================================================
     SORT LEADERBOARD
  ===================================================== */

  const leaderboard = useMemo(() => {
    const activePlayers = players.filter(
  (player) =>
    player.status !== "failed" &&
    (
      player.status === "completed" ||
      player.presence !== "offline"
    )
);

    return [...activePlayers].sort(
      (a, b) => {
        const scoreDifference =
          (b.score || 0) -
          (a.score || 0);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        /*
          If scores are equal, the player
          who joined earlier gets priority.
        */

        return (
          (a.joinedAt || 0) -
          (b.joinedAt || 0)
        );
      }
    );
  }, [players]);

  /* =====================================================
     CURRENT PLAYER POSITION
  ===================================================== */

  const myPosition = useMemo(() => {
    const index =
      leaderboard.findIndex(
        (player) =>
          player.id === playerId
      );

    if (index === -1) {
      return null;
    }

    return index + 1;
  }, [
    leaderboard,
    playerId,
  ]);

  /* =====================================================
     LOAD WIKIPEDIA ARTICLE
  ===================================================== */

  const loadArticle = async (
    articleTitle
  ) => {
    setLoadingArticle(true);

    try {
      const url =
        "https://en.wikipedia.org/w/api.php" +
        "?action=parse" +
        `&page=${encodeURIComponent(
          articleTitle
        )}` +
        "&prop=text" +
        "&format=json" +
        "&origin=*";

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Wikipedia request failed"
        );
      }

      const data =
        await response.json();

      if (data.error) {
        throw new Error(
          data.error.info
        );
      }

      const rawHtml =
        data.parse.text["*"];

      const cleanHtml =
        DOMPurify.sanitize(
          rawHtml
        );

      setArticleHtml(
        cleanHtml
      );

      setCurrentArticle(
        articleTitle
      );
    } catch (error) {
      console.error(
        "Wikipedia error:",
        error
      );

      setArticleHtml(`
        <div class="wiki-error">
          <h3>
            Unable to load this article
          </h3>
          <p>
            Please try again.
          </p>
        </div>
      `);
    } finally {
      setLoadingArticle(false);
    }
  };

  /* =====================================================
     RANDOM CHALLENGE
  ===================================================== */

  const getRandomChallenge =
    () => {
      const randomIndex =
        Math.floor(
          Math.random() *
            CHALLENGES.length
        );

      return CHALLENGES[
        randomIndex
      ];
    };

  /* =====================================================
     ADD PLAYER TO FIREBASE
  ===================================================== */

  const createPlayer = async (challenge) => {
  if (!playerId || !auth.currentUser) {
    throw new Error("Firebase authentication is not ready.");
  }

  const playerRef = ref(
    database,
    `players/${playerId}`
  );

  const playerData = {
    authUid: auth.currentUser.uid,
    name: name.trim(),
    score: 0,
    moves: 0,
    time: 0,
    status: "playing",
    challengeId: challenge.id,
    start: challenge.start,
    target: challenge.target,
    joinedAt: serverTimestamp(),
    presence: "online",
  };

  // First create the player.
  await set(playerRef, playerData);

  // Presence should NOT prevent the player from joining.
  try {
    const presenceRef = ref(
      database,
      `players/${playerId}/presence`
    );

    await onDisconnect(presenceRef).set("offline");
  } catch (presenceError) {
    console.warn(
      "Presence setup failed, but player can continue:",
      presenceError
    );
  }
};
  /* =====================================================
     JOIN CHALLENGE
  ===================================================== */

  const handleJoin = async () => {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      alert(
        "Please enter your name."
      );
      return;
    }

    const participantCount = players.filter(
      (player) => player.status !== "failed"
    ).length;

    if (participantCount >= 200) {
      alert(
        "The game is full. Maximum 200 participants are allowed."
      );
      return;
    }

    try {
      const randomChallenge =
        getRandomChallenge();

      setSelectedChallenge(
        randomChallenge
      );

      setStarted(true);
      setFinished(false);

      setResultMessage("");

      setTimeLeft(180);
      setMoves(0);

      setScore(0);
      setCompletionTime(0);

      setCurrentArticle(
        randomChallenge.start
      );

      setArticleHtml("");

      await createPlayer(
        randomChallenge
      );

      loadArticle(
        randomChallenge.start
      );
    } catch (error) {
      console.error(
        "Unable to join:",
        error
      );

      alert(
        "Unable to join the challenge. Please try again."
      );

      setStarted(false);
      setSelectedChallenge(null);
    }
  };

  /* =====================================================
     TIMER
  ===================================================== */

  useEffect(() => {
    if (
      !started ||
      finished ||
      timeLeft <= 0
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        setTimeLeft(
          (time) => time - 1
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    started,
    finished,
    timeLeft,
  ]);

  /* =====================================================
     TIME UP
  ===================================================== */

  useEffect(() => {
    if (
      started &&
      !finished &&
      timeLeft === 0
    ) {
      finishAsFailed();
    }
  }, [
    timeLeft,
    started,
    finished,
  ]);

  /* =====================================================
     SCORE CALCULATION
  ===================================================== */

  const calculateScore = (
    finalMoves,
    remainingTime
  ) => {
    const baseScore = 1000;

    const timeBonus =
      Math.floor(
        (remainingTime / 180) *
          500
      );

    const moveBonus =
      Math.max(
        0,
        500 -
          finalMoves * 40
      );

    return Math.max(
      100,
      baseScore +
        timeBonus +
        moveBonus
    );
  };

  /* =====================================================
     SAVE RESULT TO FIREBASE
  ===================================================== */

  const saveResult = async ({
    finalScore,
    finalMoves,
    finalTime,
    status,
  }) => {
    try {
      const playerRef =
        ref(
          database,
          `players/${playerId}`
        );

      await update(
        playerRef,
        {
          name: name.trim(),
          score: finalScore,
          moves: finalMoves,
          time: finalTime,
          status,
          finishedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(
        "Unable to save result:",
        error
      );
    }
  };

  /* =====================================================
     FINISH AS FAILED
  ===================================================== */

  const finishAsFailed =
    async () => {
      if (finished) {
        return;
      }

      const usedTime =
        180 - timeLeft;

      setCompletionTime(
        usedTime
      );

      setScore(0);

      setFinished(true);

      setResultMessage(
        "⏰ Time's up! You did not reach the target."
      );

      await saveResult({
        finalScore: 0,
        finalMoves: moves,
        finalTime: usedTime,
        status: "failed",
      });
    };

  /* =====================================================
     HANDLE WIKIPEDIA LINKS
  ===================================================== */

  const handleArticleClick =
    (event) => {
      const link =
        event.target.closest(
          "a"
        );

      if (
        !link ||
        finished
      ) {
        return;
      }

      const href =
        link.getAttribute(
          "href"
        );

      if (!href) {
        return;
      }

      /*
        Only allow Wikipedia
        article links.
      */

      if (
        !href.startsWith(
          "/wiki/"
        )
      ) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      let title =
        href.replace(
          "/wiki/",
          ""
        );

      title =
        title.split("#")[0];

      title =
        title.split("?")[0];

      title =
        decodeURIComponent(
          title
        ).replace(
          /_/g,
          " "
        );

      /*
        Block special Wikipedia pages.
      */

      const blockedPrefixes =
        [
          "File:",
          "Category:",
          "Help:",
          "Portal:",
          "Template:",
          "Wikipedia:",
          "Special:",
          "Talk:",
        ];

      const isBlocked =
        blockedPrefixes.some(
          (prefix) =>
            title.startsWith(
              prefix
            )
        );

      if (isBlocked) {
        return;
      }

      const normalizedTitle =
        title.trim();

      if (!normalizedTitle) {
        return;
      }

      const newMoves =
        moves + 1;

      setMoves(newMoves);

      /* =================================================
         TARGET REACHED
      ================================================= */

      if (
        normalizedTitle.toLowerCase() ===
        selectedChallenge.target.toLowerCase()
      ) {
        const usedTime =
          180 - timeLeft;

        const finalScore =
          calculateScore(
            newMoves,
            timeLeft
          );

        setScore(
          finalScore
        );

        setCompletionTime(
          usedTime
        );

        setCurrentArticle(
          selectedChallenge.target
        );

        setFinished(true);

        setResultMessage(
          `🎉 Congratulations! You reached ${selectedChallenge.target}!`
        );

        /*
          Save the final score
          to Firebase.
        */

        saveResult({
          finalScore,
          finalMoves:
            newMoves,
          finalTime:
            usedTime,
          status:
            "completed",
        });

        loadArticle(
          selectedChallenge.target
        );

        return;
      }

      /* =================================================
         NORMAL ARTICLE
      ================================================= */

      loadArticle(
        normalizedTitle
      );
    };

  /* =====================================================
     FORMAT TIME
  ===================================================== */

  const formatTime =
    (seconds) => {
      const minutes =
        Math.floor(
          seconds / 60
        );

      const secs =
        seconds % 60;

      return `${minutes}:${secs
        .toString()
        .padStart(2, "0")}`;
    };

  /* =====================================================
     MANUAL FINISH
  ===================================================== */

  const finishChallenge =
    async () => {
      if (finished) {
        return;
      }

      const usedTime =
        180 - timeLeft;

      setCompletionTime(
        usedTime
      );

      setScore(0);

      setFinished(true);

      setResultMessage(
        "Challenge finished. You did not reach the target."
      );

      await saveResult({
        finalScore: 0,
        finalMoves: moves,
        finalTime: usedTime,
        status: "failed",
      });
    };

  /* =====================================================
     BACK TO HOME
  ===================================================== */

  const backToHome = () => {
    setStarted(false);

    setFinished(false);

    setSelectedChallenge(
      null
    );

    setCurrentArticle("");

    setArticleHtml("");

    setTimeLeft(180);

    setMoves(0);

    setScore(0);

    setCompletionTime(0);

    setResultMessage("");
  };

  /* =====================================================
     DISPLAYED LEADERBOARD
  ===================================================== */

  const topPlayers =
    leaderboard.slice(0, 8);

  const currentPlayerInTop =
    topPlayers.some(
      (player) =>
        player.id === playerId
    );

  /* =====================================================
     GAME SCREEN
  ===================================================== */

  if (
    started &&
    selectedChallenge
  ) {
    return (
      <div className="game-page">

        {/* =============================================
            HEADER
        ============================================= */}

        <header className="game-header">

          <div className="header-logo">

            <img
              src="/wiki-game-logo.png"
              alt="The Wiki Game"
            />

          </div>

          <div className="player-info">

            <span>
              Player
            </span>

            <strong>
              {name}
            </strong>

          </div>

        </header>

        {/* =============================================
            MAIN
        ============================================= */}

        <main className="game-container">

          {/* ===========================================
              GAME CARD
          =========================================== */}

          <section className="game-card">

            <div className="game-top">

              <div>

                <span className="game-label">

                  RANDOM CHALLENGE #
                  {selectedChallenge.id}

                </span>

                <h1>
                  Wikipedia Navigation Challenge
                </h1>

              </div>

              <div
                className={`timer ${
                  timeLeft <= 30
                    ? "timer-danger"
                    : ""
                }`}
              >

                <span>
                  ⏱️
                </span>

                <strong>
                  {formatTime(
                    timeLeft
                  )}
                </strong>

              </div>

            </div>

            {/* =========================================
                ROUTE
            ========================================= */}

            <div className="route-box">

              <div className="article start-article">

                <span>
                  START
                </span>

                <strong>
                  {selectedChallenge.start}
                </strong>

              </div>

              <div className="arrow">
                →
              </div>

              <div className="article target-article">

                <span>
                  TARGET
                </span>

                <strong>
                  {selectedChallenge.target}
                </strong>

              </div>

            </div>

            {/* =========================================
                CURRENT ARTICLE
            ========================================= */}

            <div className="current-article-bar">

              <span>
                CURRENT ARTICLE
              </span>

              <strong>
                {currentArticle}
              </strong>

            </div>

            {/* =========================================
                WIKIPEDIA
            ========================================= */}

            <div
              className="wikipedia-area"
              onClick={
                handleArticleClick
              }
            >

              {loadingArticle ? (

                <div className="wiki-loading">

                  <div className="loading-spinner">
                  </div>

                  <p>
                    Loading Wikipedia article...
                  </p>

                </div>

              ) : (

                <article
                  className="wikipedia-content"
                  dangerouslySetInnerHTML={{
                    __html:
                      articleHtml,
                  }}
                />

              )}

            </div>

            {/* =========================================
                RESULT
            ========================================= */}

            {finished && (

              <div className="result-box">

                <div className="result-icon">

                  {score > 0
                    ? "🏆"
                    : "⏰"}

                </div>

                <h2>
                  {resultMessage}
                </h2>

                <div className="result-stats">

                  <div>

                    <span>
                      PLAYER
                    </span>

                    <strong>
                      {name}
                    </strong>

                  </div>

                  <div>

                    <span>
                      SCORE
                    </span>

                    <strong className="score-value">
                      {score}
                    </strong>

                  </div>

                  <div>

                    <span>
                      MOVES
                    </span>

                    <strong>
                      {moves}
                    </strong>

                  </div>

                  <div>

                    <span>
                      TIME
                    </span>

                    <strong>
                      {formatTime(
                        completionTime
                      )}
                    </strong>

                  </div>

                </div>

                {score > 0 && (

                  <div className="result-message">

                    🎯 Target reached successfully!

                  </div>

                )}

                {/* FINAL POSITION */}

                <div className="final-position-box">

                  <span>
                    YOUR FINAL POSITION
                  </span>

                  <strong>
                    {myPosition
                      ? `#${myPosition}`
                      : "Calculating..."}
                  </strong>

                  <p>
                    {myPosition
                      ? `You finished ${myPosition}${myPosition === 1 ? "st" : myPosition === 2 ? "nd" : myPosition === 3 ? "rd" : "th"} on the leaderboard!`
                      : "Updating leaderboard..."}
                  </p>

                </div>

                <button
                  className="back-home-button"
                  onClick={
                    backToHome
                  }
                >
                  BACK TO HOME
                </button>

              </div>

            )}

            {/* =========================================
                GAME STATS
            ========================================= */}

            {!finished && (

              <div className="game-stats">

                <div>

                  <span>
                    MOVES
                  </span>

                  <strong>
                    {moves}
                  </strong>

                </div>

                <div>

                  <span>
                    TIME LEFT
                  </span>

                  <strong>
                    {formatTime(
                      timeLeft
                    )}
                  </strong>

                </div>

                <button
                  className="finish-button"
                  onClick={
                    finishChallenge
                  }
                >
                  FINISH CHALLENGE
                </button>

              </div>

            )}

          </section>

          {/* =========================================
              LIVE LEADERBOARD
          ========================================= */}

          <aside className="leaderboard-card">

            <div className="leaderboard-title">

              <span>
                🏆
              </span>

              <div>

                <h2>
                  WIKITECH
                </h2>

                <p>
                  LEADERBOARDS
                </p>

              </div>

            </div>

            <div className="leaderboard-tabs">

              <button className="active-tab">
                CURRENT
              </button>

              <button
                disabled
                title="Coming soon"
              >
                ALL TIME
              </button>

            </div>

            {/* PLAYER COUNT */}

            <div className="live-player-count">

              <span>
                🟢
              </span>

              <strong>
                {leaderboard.length}
              </strong>

              <small>
                players joined
              </small>

            </div>

            {/* LEADERBOARD */}

            <div className="leaderboard-list">

              {databaseLoading ? (

                <div className="leaderboard-loading">
                  Loading leaderboard...
                </div>

              ) : leaderboard.length === 0 ? (

                <div className="leaderboard-loading">
                  No players yet
                </div>

              ) : (

                topPlayers.map(
                  (player, index) => (

                    <div
                      key={player.id}
                      className={`leader-row ${
                        player.id ===
                        playerId
                          ? "your-leader-row"
                          : ""
                      }`}
                    >

                      <span>
                        {index + 1}
                      </span>

                      <div className="leader-player">

                        <strong>
                          {player.name}
                          {player.id ===
                            playerId &&
                            " (YOU)"}
                        </strong>

                        <small>
                          {player.status ===
                          "completed"
                            ? "Completed"
                            : player.status ===
                              "failed"
                            ? "Finished"
                            : "Playing..."}
                        </small>

                      </div>

                      <small className="leader-score">
                        {player.score || 0}
                        {" "}pts
                      </small>

                    </div>

                  )
                )

              )}

              {/* SHOW CURRENT PLAYER IF
                  OUTSIDE TOP 8 */}

              {!currentPlayerInTop &&
                myPosition && (
                  <>
                    <div className="leaderboard-dots">
                      •••
                    </div>

                    <div className="leader-row your-leader-row">

                      <span>
                        {myPosition}
                      </span>

                      <div className="leader-player">

                        <strong>
                          {name} (YOU)
                        </strong>

                        <small>
                          {finished
                            ? "Completed"
                            : "Playing..."}
                        </small>

                      </div>

                      <small className="leader-score">
                        {score} pts
                      </small>

                    </div>

                  </>
                )}

            </div>

            {/* =========================================
                YOUR POSITION
            ========================================= */}

            <div className="your-position">

              <span>
                YOUR POSITION
              </span>

              <strong>
                {myPosition
                  ? `#${myPosition}`
                  : "—"}
              </strong>

              <p>
                {name}
              </p>

              <small>
                {finished
                  ? `${score} pts`
                  : "Playing..."}
              </small>

            </div>

          </aside>

        </main>

      </div>
    );
  }

  /* =====================================================
     HOME SCREEN
  ===================================================== */

  return (
    <div className="home">

      <div className="home-card">

        {/* LOGO */}

        <div className="wiki-game-logo">

          <img
            src="/wiki-game-logo.png"
            alt="The Wiki Game"
          />

        </div>

        {/* TITLE */}

        <h2>
          Wikipedia Navigation Challenge
        </h2>

        <p>
          Race through Wikipedia articles and
          reach the target article using only
          Wikipedia links.
        </p>

        {/* =============================================
            INFO CARDS
        ============================================= */}

        <div className="info-cards">

          <div>

            <span>
              ⏱️
            </span>

            <strong>
              3 Minutes
            </strong>

            <small>
              Time Limit
            </small>

          </div>

          <div>

            <span>
              👥
            </span>

            <strong>
              200
            </strong>

            <small>
              Maximum Players
            </small>

          </div>

          <div>

            <span>
              🏆
            </span>

            <strong>
              Live
            </strong>

            <small>
              Leaderboard
            </small>

          </div>

        </div>

        {/* =============================================
            NAME
        ============================================= */}

        <label>
          Participant Name
        </label>

        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          maxLength={30}
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              handleJoin();
            }
          }}
        />

        {/* =============================================
            JOIN
        ============================================= */}

        <button
          onClick={
            handleJoin
          }
        >
          JOIN CHALLENGE →
        </button>

        <div className="joined-count">
          🎲 Your challenge will be
          randomly assigned
        </div>

        <div className="joined-count">
          🟢 Live leaderboard enabled
        </div>

      </div>

    </div>
  );
}

export default App;