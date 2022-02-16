import {
  HMSLogLevel,
  HMSNotificationTypes,
  HMSReactiveStore,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectPeers,
  selectTrackByID,
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
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2Nlc3Nfa2V5IjoiNjEwY2Q5Y2JmMzBlNzczZjQ3NTc3YjBkIiwicm9vbV9pZCI6IjYyMGM3ZGFiNmYyYjg3NmQ1OGVmNDE0ZCIsInVzZXJfaWQiOiI2MTBjZDljYmYzMGU3NzNmNDc1NzdiMDkiLCJyb2xlIjoiMzYwcCIsImp0aSI6ImJjMmE2MzE1LTQ1ZmItNGY2OC1hYjQxLTVmNjU3OWEwNjM3MCIsInR5cGUiOiJhcHAiLCJ2ZXJzaW9uIjoyLCJleHAiOjE2NDUwNzIxNzZ9.m5l7uPMCdwEcuyu552dVbf4nQF_GZUYWjRhflBuk_FY";
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
    if (!videoElements[peer.id] && peer.videoTrack) {
      const video = document.createElement("video");
      video.muted = true;
      video.autoplay = true;
      hmsActions.attachVideo(peer.videoTrack, video).catch(console.error);
      video.play();
      videoElements[peer.id] = video;
      console.log("attached peer video, created new - ", peer);
      hmsStore.subscribe(() => {
        const track = hmsStore.getState(selectTrackByID(peer.videoTrack));
        console.log("track changed", track);
        if (!track || track.enabled !== track.displayEnabled) {
          return;
        }
        if (track.enabled) {
          console.log("attaching");
          hmsActions
            .attachVideo(track.id, videoElements[peer.id])
            .then(() => videoElements[peer.id].play())
            .catch(console.error);
        } else {
          console.log("detaching video");
          hmsActions
            .detachVideo(track.id, videoElements[peer.id])
            .catch(console.error);
        }
      }, selectTrackByID(peer.videoTrack));
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
        if (audioTrack?.audioElement) {
          audioTrack.audioElement.volume = 0;
        }
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

export const toggleAudio = async () => {
  let state = hmsStore.getState(selectIsLocalAudioEnabled);
  await hmsActions
    .setLocalAudioEnabled(!state)
    .then(() => {
      state = !state;
    })
    .catch(console.error);
  return state;
};

export const toggleVideo = async () => {
  let state = hmsStore.getState(selectIsLocalVideoEnabled);
  await hmsActions
    .setLocalVideoEnabled(!state)
    .then(() => {
      state = !state;
    })
    .catch(console.error);
  return state;
};

window.addEventListener("beforeunload", () => hmsActions.leave());
window.addEventListener("onunload", () => hmsActions.leave());
