import { annotations, blindspots, diffLines, leaderboard, quiz, radarData, tracks, warRoomMessages } from "./data";

const wait = (ms = 240) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDashboard() {
  await wait();
  return {
    user: { name: "Sourabh", irs: 82, streak: 7, rank: 3 },
    activeTrack: tracks[0],
    radarData,
    leaderboard,
    blindspots,
  };
}

export async function getTracks() {
  await wait();
  return tracks;
}

export async function getModule(trackId: string, moduleId: string) {
  await wait();
  const track = tracks.find((item) => item.id === trackId) ?? tracks[0];
  return {
    track,
    module: track.modules.find((item) => item.id === moduleId) ?? track.modules[0],
    annotations,
    quiz,
    diffLines,
  };
}

export async function getWarRoom() {
  await wait();
  return {
    room: { id: "room-1", name: "Frontend Systems live defend", members: 18, status: "live" },
    messages: warRoomMessages,
    leaderboard,
  };
}

export async function getProfile() {
  await wait();
  return {
    name: "Sourabh Patne",
    role: "Frontend builder",
    irs: 82,
    streak: 7,
    completedModules: 14,
    radarData,
    recent: ["Auth guard rebuild", "Query cache policy", "Diff score contract"],
  };
}

export async function getBlindspots() {
  await wait();
  return blindspots;
}
