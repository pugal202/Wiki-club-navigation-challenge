import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";

import { database } from "./firebase";
import "./HostDashboard.css";

function HostDashboard() {
  const [hostPin, setHostPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const HOST_PIN = "2007";

  /* =====================================================
     HOST LOGIN
  ===================================================== */

  const handleHostLogin = () => {
    if (hostPin === HOST_PIN) {
      setAuthenticated(true);
      setHostPin("");
    } else {
      alert("Incorrect Host PIN.");
      setHostPin("");
    }
  };

  /* =====================================================
     FIREBASE LIVE PARTICIPANTS
  ===================================================== */

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const playersRef = ref(database, "players");

    const unsubscribe = onValue(
      playersRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setPlayers([]);
          setLoading(false);
          return;
        }

        const playerList = Object.entries(data).map(
          ([id, player]) => ({
            id,
            ...player,
          })
        );

        setPlayers(playerList);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Host dashboard Firebase error:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authenticated]);

  /* =====================================================
     SORT ALL PARTICIPANTS
     
     Everyone is shown:
     COMPLETED → PLAYING → FAILED

     Within each status:
     Higher score first
     If score is equal → faster time first
  ===================================================== */

  const leaderboard = useMemo(() => {
    const statusOrder = {
      completed: 1,
      playing: 2,
      failed: 3,
    };

    return [...players].sort((a, b) => {
      const statusA =
        statusOrder[a.status] || 4;

      const statusB =
        statusOrder[b.status] || 4;

      // Completed first, then playing, then failed
      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // Higher score first
      const scoreDifference =
        (b.score || 0) - (a.score || 0);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      // Faster time first
      return (
        (a.time || 999999) -
        (b.time || 999999)
      );
    });
  }, [players]);

  /* =====================================================
     FINAL WINNERS
     
     Only COMPLETED participants can become winners.
  ===================================================== */

  const winners = useMemo(() => {
    return players
      .filter(
        (player) =>
          player.status === "completed"
      )
      .sort((a, b) => {
        const scoreDifference =
          (b.score || 0) - (a.score || 0);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return (
          (a.time || 999999) -
          (b.time || 999999)
        );
      })
      .slice(0, 3);
  }, [players]);

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalPlayers = players.length;

  const completedPlayers = players.filter(
    (player) =>
      player.status === "completed"
  ).length;

  const playingPlayers = players.filter(
    (player) =>
      player.status === "playing"
  ).length;

  const failedPlayers = players.filter(
    (player) =>
      player.status === "failed"
  ).length;

  /* =====================================================
     FORMAT TIME
  ===================================================== */

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) {
      return "-";
    }

    const minutes = Math.floor(
      seconds / 60
    );

    const secs = seconds % 60;

    return `${minutes}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  /* =====================================================
     HOST LOGIN SCREEN
  ===================================================== */

  if (!authenticated) {
    return (
      <div className="host-page">

        <div
          className="host-login-card"
          style={{
            maxWidth: "450px",
            margin: "100px auto",
            background: "#ffffff",
            border: "3px solid #202020",
            borderRadius: "18px",
            padding: "35px",
            boxShadow: "6px 6px 0 #202020",
            textAlign: "center",
          }}
        >

          <img
            src="/wiki-game-logo.png"
            alt="The Wiki Game"
            style={{
              width: "190px",
              maxWidth: "100%",
              marginBottom: "25px",
            }}
          />

          <h1
            style={{
              color: "#202020",
              margin: "0 0 8px",
              fontSize: "28px",
            }}
          >
            HOST ACCESS
          </h1>

          <p
            style={{
              color: "#555555",
              marginBottom: "25px",
              fontWeight: "600",
            }}
          >
            Enter the Host PIN to continue
          </p>

          <input
            type="password"
            value={hostPin}
            placeholder="Enter Host PIN"
            maxLength={10}
            onChange={(e) =>
              setHostPin(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleHostLogin();
              }
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              fontSize: "18px",
              border: "2px solid #202020",
              borderRadius: "10px",
              marginBottom: "15px",
              color: "#202020",
              background: "#ffffff",
              textAlign: "center",
            }}
          />

          <button
            onClick={handleHostLogin}
            style={{
              width: "100%",
              padding: "14px",
              border: "3px solid #202020",
              borderRadius: "10px",
              background: "#202020",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            ENTER DASHBOARD
          </button>

        </div>

      </div>
    );
  }

  /* =====================================================
     HOST DASHBOARD
  ===================================================== */

  return (
    <div className="host-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="host-header">

        <div className="host-logo">
          <img
            src="/wiki-game-logo.png"
            alt="The Wiki Game"
          />
        </div>

        <div className="host-title">
          <h1>WIKITECH HOST DASHBOARD</h1>

          <p>
            Live Participant Monitoring
          </p>
        </div>

      </header>

      {/* =================================================
          STATS
      ================================================= */}

      <section className="host-stats">

        <div className="host-stat-card">
          <span>👥</span>

          <strong>
            {totalPlayers}
          </strong>

          <small>
            Total Participants
          </small>
        </div>

        <div className="host-stat-card">
          <span>🏆</span>

          <strong>
            {completedPlayers}
          </strong>

          <small>
            Completed
          </small>
        </div>

        <div className="host-stat-card">
          <span>🎮</span>

          <strong>
            {playingPlayers}
          </strong>

          <small>
            Playing
          </small>
        </div>

        <div className="host-stat-card">
          <span>⏰</span>

          <strong>
            {failedPlayers}
          </strong>

          <small>
            Failed
          </small>
        </div>

      </section>

      {/* =================================================
          LIVE PARTICIPANT TABLE
      ================================================= */}

      <section className="host-table-card">

        <div className="table-header">

          <div>

            <h2>
              LIVE PARTICIPANTS
            </h2>

            <p>
              Automatically updated from Firebase
            </p>

          </div>

          <div className="live-indicator">
            <span>●</span> LIVE
          </div>

        </div>

        {loading ? (

          <div className="host-loading">
            Loading participants...
          </div>

        ) : leaderboard.length === 0 ? (

          <div className="host-loading">
            No participants yet.
          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>RANK</th>
                  <th>PARTICIPANT</th>
                  <th>CHALLENGE</th>
                  <th>START</th>
                  <th>TARGET</th>
                  <th>POINTS</th>
                  <th>MOVES</th>
                  <th>TIME</th>
                  <th>STATUS</th>
                </tr>

              </thead>

              <tbody>

                {leaderboard.map(
                  (player, index) => (

                    <tr key={player.id}>

                      {/* RANK */}

                      <td>

                        <strong>

                          {player.status ===
                          "failed"
                            ? `#${index + 1}`
                            : index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : `#${index + 1}`}

                        </strong>

                      </td>

                      {/* NAME */}

                      <td>

                        <strong>
                          {player.name ||
                            "Unknown"}
                        </strong>

                      </td>

                      {/* CHALLENGE */}

                      <td>
                        #
                        {player.challengeId ||
                          "-"}
                      </td>

                      {/* START */}

                      <td>
                        {player.start || "-"}
                      </td>

                      {/* TARGET */}

                      <td>
                        {player.target || "-"}
                      </td>

                      {/* POINTS */}

                      <td className="points">
                        {player.score || 0}
                      </td>

                      {/* MOVES */}

                      <td>
                        {player.moves || 0}
                      </td>

                      {/* TIME */}

                      <td>
                        {formatTime(
                          player.time
                        )}
                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={`status ${
                            player.status ===
                            "completed"
                              ? "completed"
                              : player.status ===
                                "playing"
                              ? "playing"
                              : "failed"
                          }`}
                        >

                          {player.status ===
                          "completed"
                            ? "COMPLETED"
                            : player.status ===
                              "playing"
                            ? "PLAYING"
                            : "FAILED"}

                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* =================================================
          FINAL TOP 3 WINNERS
      ================================================= */}

      {winners.length > 0 && (

        <section className="winners-section">

          <div className="winners-title">

            <h2>
              🏆 FINAL WINNERS
            </h2>

            <p>
              Top completed participants
            </p>

          </div>

          <div className="winners-podium">

            {/* SECOND PLACE */}

            {winners[1] && (

              <div className="winner-card second-place">

                <div className="winner-medal">
                  🥈
                </div>

                <span className="winner-place">
                  2ND PLACE
                </span>

                <strong>
                  {winners[1].name ||
                    "Unknown"}
                </strong>

                <span className="winner-points">
                  {winners[1].score || 0} pts
                </span>

              </div>

            )}

            {/* FIRST PLACE */}

            {winners[0] && (

              <div className="winner-card first-place">

                <div className="winner-medal">
                  🥇
                </div>

                <span className="winner-place">
                  1ST PLACE
                </span>

                <strong>
                  {winners[0].name ||
                    "Unknown"}
                </strong>

                <span className="winner-points">
                  {winners[0].score || 0} pts
                </span>

              </div>

            )}

            {/* THIRD PLACE */}

            {winners[2] && (

              <div className="winner-card third-place">

                <div className="winner-medal">
                  🥉
                </div>

                <span className="winner-place">
                  3RD PLACE
                </span>

                <strong>
                  {winners[2].name ||
                    "Unknown"}
                </strong>

                <span className="winner-points">
                  {winners[2].score || 0} pts
                </span>

              </div>

            )}

          </div>

        </section>

      )}

    </div>
  );
}

export default HostDashboard;