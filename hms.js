import {
  HMSLogLevel,
  HMSNotificationTypes,
  HMSReactiveStore,
  selectPeers,
} from "@100mslive/hms-video-store";

const hms = new HMSReactiveStore();
hms.triggerOnSubscribe();
const hmsStore = hms.getStore();
const hmsActions = hms.getActions();
const notifications = hms.getNotifications();
hmsActions.setLogLevel(HMSLogLevel.WARN);

window.addEventListener("beforeunload", hmsActions.leave);

export const join = () => {
  const token =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2Nlc3Nfa2V5IjoiNjEwY2Q5Y2JmMzBlNzczZjQ3NTc3YjBkIiwicm9vbV9pZCI6IjYxOGU5NGY1YWYzMTg4ZGYzM2U2N2Q0NiIsInVzZXJfaWQiOiI2MTBjZDljYmYzMGU3NzNmNDc1NzdiMDkiLCJyb2xlIjoiaG9zdCIsImp0aSI6ImZkMWIzYjJhLWQwZjMtNDM0My1iMzU1LWVhYmYxNjhlNjYwYiIsInR5cGUiOiJhcHAiLCJ2ZXJzaW9uIjoyLCJleHAiOjE2NDQ5ODU0ODV9.05Sjwnw8j27Siu59NLqOC_tYvrQ1ZzDMHsrSTFfXzLc";
  hmsActions.join({
    authToken: token,
    userName: "threejsuser",
    settings: {
      isAudioMuted: false,
      isVideoMuted: false,
    },
    rememberDeviceSelection: true,
  });
};

const videoElements = {};
const attachPeerVideos = (peers) => {
  // console.log("attaching peer videos for - ", peers);
  for (let peer of peers) {
    // console.log("attaching peer video - ", peer);
    if (videoElements[peer.id] && peer.videoTrack) {
      hmsActions.attachVideo(peer.videoTrack, videoElements[peer.id]);
      console.log("attached peer video, updated older - ", peer);
    } else if (peer.videoTrack) {
      const video = document.createElement("video");
      video.muted = true;
      video.autoplay = true;
      hmsActions.attachVideo(peer.videoTrack, video);
      video.play();
      videoElements[peer.id] = video;
      console.log("attached peer video, created new - ", peer);
    }
  }
  for (let peerId of Object.keys(videoElements)) {
    if (!peers.find((p) => p.id === peerId)) {
      // console.log("delete peer video - ", peerId);
      delete videoElements[peerId];
      console.log("deleted peer video - ", peerId);
    }
  }
};

const makePeers = () => {
  let peers = hmsStore.getState(selectPeers);
  const threePeers = [];
  console.log("going to attach peers videos");
  attachPeerVideos(peers);
  console.log("peer videos attached");
  for (let peer of peers) {
    const threePeer = { peer, video: videoElements[peer.id], audioTracks: [] };
    threePeer.audioTracks = [];
    if (!peer.isLocal && peer.audioTrack) {
      threePeer.audioTracks = [hmsActions.hmsSDKTracks[peer.audioTrack]];
    }
    for (let trackId of peer.auxiliaryTracks) {
      const sdkTrack = hmsActions.hmsSDKTracks[trackId];
      if (!peer.isLocal && sdkTrack?.type === "audio") {
        threePeer.audioTracks.push(sdkTrack);
      }
    }
    for (let audioTrack of threePeer.audioTracks) {
      try {
        audioTrack.setVolume(0);
      } catch (err) {
        console.error("setting volume - ", err);
      }
    }
    threePeers.push(threePeer);
  }
  console.log("threepeers", threePeers);
  return threePeers;
};

export const onPeers = (callback) => {
  console.log("subscribing to peers");
  hmsStore.subscribe((peers) => {
    try {
      callback(makePeers());
    } catch (err) {
      console.log("handling peers", err);
    }
  }, selectPeers);
};

export const onPeerLeave = (callback) => {
  notifications.onNotification((msg) => {
    if (msg.type === HMSNotificationTypes.PEER_LEFT) {
      callback(msg.data);
    }
  });
};

window.addEventListener("beforeunload", () => hmsActions.leave());
window.addEventListener("onunload", () => hmsActions.leave());
