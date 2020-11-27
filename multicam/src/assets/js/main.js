const USE_PLAYBACK_RATE = true;
const USE_TARGET_QUALITY = true;
// const QUERY_PRIMARY = null;
const QUERY_PRIMARY = "?rays=ebcdf";
// const QUERY_SECONDARY = null;
const QUERY_SECONDARY = "?rays=cbdef";
const FORCE_SYNC_MS = 200;
const USE_SEEK_NUDGE = true;
const MAX_LATENCY_LIVE = 0.05;
const MAX_LATENCY = 0.09;
const NO_SYNC_IF_MAIN_STUCK = true;
const NO_PLAY_IF_MAIN_STUCK = true;

let saveBandwidthUrlParam = findGetParameter("saveBandwidth");
saveBandwidthUrlParam =
    saveBandwidthUrlParam && saveBandwidthUrlParam == "0" ? false : true;
saveBandwidthUrlParam = saveBandwidthUrlParam || USE_TARGET_QUALITY;

// list at https://docs.google.com/spreadsheets/d/1ye7s3e73o2-iuDJ1iTu71qfHuN21BjNBqU4aY-Tmk6c/edit?usp=sharing
let config = {
    primary: "https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8" + (QUERY_PRIMARY ? QUERY_PRIMARY : ""),
    secondaries: [
        "https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8" + (QUERY_SECONDARY ? QUERY_SECONDARY : ""),
        "https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8" + (QUERY_SECONDARY ? QUERY_SECONDARY : ""),
        "https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8" + (QUERY_SECONDARY ? QUERY_SECONDARY : "")
    ],
    saveBandwidth: saveBandwidthUrlParam
};

console.log("Visit", window.location.href, "for fullscreen.\n");

function createPlayer(selector, muted, index) {
    var player = new THEOplayer.Player(document.querySelector(selector), {
        // libraryLocation: "./THEOplayer",
        libraryLocation: "//cdn.myth.theoplayer.com/f60c5481-e021-4f44-b9b1-1704802ff495/",
        ui: {
            width: "100%",
            height: "100%"
        },
        isEmbeddable: true
    });
    // player.abr.strategy = {type: 'performance'};
    player.muted = muted;
    createLogButton(player);
    createMultiButton(player);
    createGridButton(player);
    createFullscreenButton(player);
    registerEventsForPlayer(player, index);
    seekNudge(player, index);
    return player;
}
var thePlayers = [];
var configuration = {};

function createPlayers(primary, secondaries, config) {
    var number = 1 + secondaries.length;
    configuration = config;
    if (number > 0) {
        thePlayers.push(createPlayer("#player-1", false, 0));
        if (secondaries.length > 0) {
            createSecondaryPlayers(number);
        }

        multicamSetup();
        lowerQualities();
        setupSwitcher();
        syncControls();

        function showSecondary() {
            document.querySelector("#multiview").classList.remove("has-not-started");
            THEOplayer.players[0].removeEventListener("play", showSecondary);
        }
        THEOplayer.players[0].addEventListener("play", showSecondary);

        thePlayers[0].addEventListener("seeked", function(e) {
            for (var i = 1; i < thePlayers.length; i++) {
                forceSyncBetweenPlayers(thePlayers[i], thePlayers[0]);
            }
        });

        loadStreams(primary, secondaries);

        var container1 = document.querySelector("#container-1");
        document.addEventListener("mouseover", function(e) {
            var activeElement = e.target;
            if (
                container1.classList.contains("grid") &&
                activeElement.children.length > 0
            ) {
                if (!activeElement.classList.contains("bordered")) {
                    var vjsTechs = document.querySelectorAll(".vjs-tech");
                    for (var i = 0; i < vjsTechs.length; i++) {
                        if (
                            vjsTechs[i].parentNode.parentNode.dataset.camera !=
                            activeElement.children[0].dataset.camera
                        ) {
                            vjsTechs[i].parentNode.parentNode.classList.add("unfocus");
                            //TODO: POC for ramping feature - cancel ramping
                        } else {
                            vjsTechs[i].parentNode.parentNode.classList.add("focus");
                            //TODO: POC for ramping feature - begin ramping
                        }
                    }
                    if (e.path[1].id == "container-1") {
                        document
                            .querySelector("#container-1  > .theoplayer-container .vjs-tech")
                            .parentNode.parentNode.classList.remove("unfocus");
                        document
                            .querySelector("#container-1  > .theoplayer-container .vjs-tech")
                            .parentNode.parentNode.classList.add("focus");
                    }
                }
            }
        });
        document.addEventListener("mouseout", function(e) {
            var activeElement = e.target;
            if (container1.classList.contains("grid")) {
                if (!activeElement.classList.contains("bordered")) {
                    var vjsTechs = document.querySelectorAll(".vjs-tech");
                    for (var i = 0; i < vjsTechs.length; i++) {
                        vjsTechs[i].parentNode.parentNode.classList.remove("unfocus");
                        vjsTechs[i].parentNode.parentNode.classList.remove("focus");
                    }
                }
            }
        });
        document.addEventListener("mousemove", function(e) {
            var container = document.querySelector("#multiview");
            if (container) {
                if (!container.classList.contains("active")) {
                    container.classList.add("active");
                    setTimeout(function() {
                        container.classList.remove("active");
                    }, 3000);
                }
            }
        });
        document.addEventListener("click", function(e) {
            if (container1.classList.contains("grid") && e.target.id == "secondary") {
                container1.classList.remove("grid");
                container1.classList.add("no-grid");
            }
        });
    } else {
        console.error("No players were created.");
    }
}

const STATES = ["INACTIVE", "INACTIVE", "INACTIVE", "INACTIVE"];

function getStateForIndex(index) {
    return STATES[index];
    // return "PLAYER " + index + " state: " + STATES[index];
}

function registerEventsForPlayer(player, index) {
    console.log("Registering events for player", index);
    // https://docs.theoplayer.com/api-reference/web/theoplayer.playereventmap.md
    const EVENTS_LIST = [
        "play",
        "playing",
        "seeking",
        "seeked",
        "pause",
        "volumechange",
        "waiting",
        "canplay",
        "canplaythrough",
        "sourcechange",
        // "progress",
        "ratechange",
        "representationchange",
        "durationchange",
        "ended"
    ];
    player.addEventListener(EVENTS_LIST, function(event) {
        console.log("PLAYER", index, "--", event.type, "--", event);
    });
    player.addEventListener('waiting', function(e) {
        console.log("PLAYER", index, "went into [BUFFER] state.");
        STATES[index] = "BUFFERING";
        potentiallyHaltAllPlayers(index);
    });
    player.addEventListener('playing', function(e) {
        console.log("PLAYER", index, "went into [PLAYING] state.");
        STATES[index] = "PLAYING";
        potentiallyResumeAllPlayers(index);
    });
    player.addEventListener('pause', function(e) {
        console.log("PLAYER", index, "went into [PAUSED] state.");
        STATES[index] = "PAUSED";
    });
    player.videoTracks.addEventListener('addtrack', function(e0) {
        // detect quality changes of a track
        e0.track.addEventListener('activequalitychanged', function(e1) {
            console.log('PLAYER', index, "--", e1.type, "--", e1);
        });
    });
}

// createPlayers(config.primary, config.secondaries, {
//     saveBandwidth: config.saveBandwidth
// });


var MultiCamPlayers = (function() {
    return {
        createPlayers: function(input_config) {
            createPlayers(input_config.primary, input_config.secondaries, {
                saveBandwidth: config.saveBandwidth
            });
        }
    }
})(MultiCamPlayers || {});

function loadStreams(primary, secondaries) {
    thePlayers[0].src = primary;
    for (var i = 1; i < thePlayers.length; i++) {
        thePlayers[i].src = secondaries[i - 1];
    }
}

let firstSeek = [true, true, true, true];

function seekNudge(player, index) {
    if (USE_SEEK_NUDGE) {
        player.addEventListener('seeked', function(e) {
            firstSeek[index] = !firstSeek[index];
            if (firstSeek[index]) {
                console.log("Do nudge on player", index, "with", 0.01);
                player.currentTime = player.currentTime + 0.01;
            }
        })
    }
}

/**
 *
 * @param a: the new primary screen
 * @param b: the new secondary screen
 */
function switchPlayers(a, b) {
    var container1 = document.querySelector("#container-1");
    var playerA = getPlayerThroughContainerId(a);
    var playerB = getPlayerThroughContainerId(b);
    var container3 = playerA.element.parentNode.parentNode.parentNode;
    if (saveBandwidth()) {
        playerA.videoTracks[0].targetQuality = null; // allow full ABR range
        playerB.videoTracks[0].targetQuality = [
            playerB.videoTracks[0].qualities[0]
        ]; // only the lowest quality
    }
    var player1Element = container1.parentNode.querySelector(
        "#container-1 > .theoplayer-container"
    );
    var player3Element = container3.querySelector(".theoplayer-container");
    container1.appendChild(player3Element);
    container3.appendChild(player1Element);
    container1.classList.remove("grid");
    container1.classList.add("no-grid");
    var vjsTechs = document.querySelectorAll(".vjs-tech");
    // console.log("vjsTechs", vjsTechs.length);
    for (var i = 0; i < vjsTechs.length; i++) {
        // console.log(i, vjsTechs[i].className);
        vjsTechs[i].parentNode.parentNode.classList.remove("unfocus");
    }
}

function syncControls() {
    thePlayers[0].addEventListener("play", function(e) {
        for (var i = 1; i < thePlayers.length; i++) {
            thePlayers[i].play();
            thePlayers[i].muted = true;
        }
    });
    thePlayers[0].addEventListener("pause", function(e) {
        for (var i = 1; i < thePlayers.length; i++) {
            thePlayers[i].pause();
        }
    });
}

function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function(item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}

function forceSyncBetweenPlayers(a, b) {
    if (isLive(b) && a.currentProgramDateTime && b.currentProgramDateTime) {
        a.currentProgramDateTime = b.currentProgramDateTime;
        console.log("forceSyncBetweenPlayers - LIVE");
    } else {
        a.currentTime = b.currentTime;
        console.log("forceSyncBetweenPlayers - VOD");
    }
}

function lowerQualities() {
    if (saveBandwidth()) {
        for (var i = 1; i < thePlayers.length; i++) {
            thePlayers[i].videoTracks.addEventListener("addtrack", function(e) {
                e.track.targetQuality = [e.track.qualities[0]];
            });
        }
    }
}

function multicamSetup() {
    // let initialPrimary = THEOplayer.players.find((p) => p.muted == false);
    let initialPrimary = THEOplayer.players.find((p) => p.uid == 0);
    let listener = initialPrimary.addEventListener("playing", () => {
        init(initialPrimary);
    });

    function init(primary) {
        primary.removeEventListener(listener);
        if (primary.playbackRate != 1) {
            primary.playbackRate = 1;
        }
        // let secondary = THEOplayer.players.filter((p) => p.muted == true);
        let secondary = THEOplayer.players.filter((p) => p.uid > 0);
        secondary.forEach((secondaryCamera) => {
            if (
                isLive(secondaryCamera) &&
                secondaryCamera.currentProgramDateTime &&
                primary.currentProgramDateTime
            ) {
                secondaryCamera.currentProgramDateTime = primary.currentProgramDateTime;
            } else {
                secondaryCamera.currentTime = primary.currentTime;
            }
        });
        window.setInterval(forceSync, FORCE_SYNC_MS);
        window.setInterval(getSyncStatus, 750);
    }

    function getLatency(player) {
        if (isLive(player) && player.currentProgramDateTime) {
            return MAX_LATENCY_LIVE;
        } else {
            return MAX_LATENCY;
        }
    }

    function isMainStuck() {
        return (getStateForIndex(0) == "BUFFERING");
    }

    function forceSync() {
        // let primary = THEOplayer.players.find((p) => p.muted == false);
        // let secondary = THEOplayer.players.filter((p) => p.muted == true);

        if (NO_SYNC_IF_MAIN_STUCK && isMainStuck()) {
            // don't do sync if main player is buffering
            // could make sense to enable to volume for the first available secundary player and set the playbackRate of all available secundary players to 1
            return;
        }
        let primary = THEOplayer.players.find((p) => p.uid == 0);
        let secondary = THEOplayer.players.filter((p) => p.uid > 0);
        // force play on secondary if they are paused by any chance
        if (NO_PLAY_IF_MAIN_STUCK) {
            if (!primary.paused) {
                secondary.forEach((secondaryPlayer) => {
                    if (secondaryPlayer.paused) { secondaryPlayer.play(); }
                });
            }
        }



        secondary.forEach((secondaryCamera) => {
            const LATENCY = getLatency(secondaryCamera);
            let diff = getDrift(primary, secondaryCamera);
            if (Math.abs(diff) > 10) {
                console.warn(
                    "Difference between two players exceeds 10. Forcing a sync between them. (",
                    diff,
                    "s.)"
                );
                forceSyncBetweenPlayers(secondaryCamera, primary);
            }

            if (USE_PLAYBACK_RATE) {
                if (diff > LATENCY) {
                    let intDiff = Math.round(diff * 10);
                    let rate =
                        intDiff > 8 ?
                        1.64 :
                        intDiff > 4 ?
                        1.32 :
                        intDiff > 2 ?
                        1.24 :
                        intDiff > 1 ?
                        1.16 :
                        1.08;
                    if (secondaryCamera.playbackRate != rate) {
                        secondaryCamera.playbackRate = rate;
                    }
                    //secondaryCamera.playbackRate = 1.08;
                } else if (diff < -LATENCY && (secondaryCamera.playbackRate != 0.92)) {
                    secondaryCamera.playbackRate = 0.92;
                } else if (secondaryCamera.playbackRate != 1) {
                    secondaryCamera.playbackRate = 1;
                }
            }


        });
    }
}

function saveBandwidth() {
    return configuration && configuration.saveBandwidth;
}

function createSecondaryPlayers(number) {
    var secondaryDiv = document.createElement("div");
    secondaryDiv.setAttribute("id", "secondary");
    document.querySelector("#container-1").appendChild(secondaryDiv);
    for (var i = 2; i < number + 1; i++) {
        var secondaryContainer = document.createElement("div");
        secondaryContainer.setAttribute("id", "container-" + i);
        var element = document.createElement("div");
        element.dataset.camera = i;
        element.setAttribute("id", "player-" + i);
        element.className =
            "theoplayer-container video-js theoplayer-skin secondary";

        // add camera
        var cameraElement = document.createElement("div");
        cameraElement.className = "camera";
        let innerText = "Alt 1";
        if (i == 3) {
            innerText = "Alt 2";
        } else if (i == 4) {
            innerText = "360";
        }
        // cameraElement.innerText = String.fromCharCode(96 + i).toUpperCase();
        cameraElement.innerText = innerText;
        element.appendChild(cameraElement);

        // add expand
        var expandIcon = document.createElement("div");
        expandIcon.className = "expand-icon";
        expandIcon.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M4.5 11H3v4h4v-1.5H4.5V11zM3 7h1.5V4.5H7V3H3v4zm10.5 6.5H11V15h4v-4h-1.5v2.5zM11 3v1.5h2.5V7H15V3h-4z"/></svg>';
        element.appendChild(expandIcon);

        secondaryContainer.appendChild(element);
        secondaryDiv.appendChild(secondaryContainer);
        thePlayers.push(createPlayer("#player-" + i, true, (i - 1)));
    }
}

function isLive(a) {
    return a.duration == Infinity;
}

function getDrift(a, b) {
    let drift;
    if (isLive(a) && a.currentProgramDateTime && b.currentProgramDateTime) {
        drift =
            (a.currentProgramDateTime.getTime() -
                b.currentProgramDateTime.getTime()) /
            1000;
    } else {
        drift = a.currentTime - b.currentTime;
    }
    return drift;
}

function getHHMMSS(date) {
    var d = new Date(date);
    var datetext = d.toTimeString();
    datetext = datetext.split(" ")[0] + "." + d.getMilliseconds();
    return datetext;
}

function getQuality(player) {
    if (player.videoTracks[0] && player.videoTracks[0].activeQuality) {
        return (
            player.videoTracks[0].activeQuality.width +
            "x" +
            player.videoTracks[0].activeQuality.width
        );
    } else {
        return "";
    }
}

function getSyncStatus() {
    var camera = "<tr><th>Camera</th>";
    var position = "<tr><td><b>Position</b></td>";
    var currentTime = "<tr><td><b>CurrTime</b></td>";
    var drift = "<tr><td><b>Drift</b> (from cam A)</td>";
    var playbackRate = "<tr><td><b>Playback rate</b></td>";
    var quality = "<tr><td><b>Quality</b></td>";
    for (var i = 0; i < THEOplayer.players.length; i++) {
        var pl = THEOplayer.players[i];
        camera =
            camera + "<th>" + String.fromCharCode(97 + i).toUpperCase() + "</th>";
        position = position + "<td>" + getHHMMSS(pl.currentTime) + "</td>";
        currentTime = currentTime + "<td>" + pl.currentTime + "</td>";
        drift = drift + "<td>" + getDrift(THEOplayer.players[0], pl) + "</td>";
        playbackRate = playbackRate + "<td>" + pl.playbackRate + "</td>";
        quality = quality + "<td>" + getQuality(pl) + "</td>";
    }
    camera = camera + "</tr>";
    position = position + "</tr>";
    currentTime = currentTime + "</tr>";
    drift = drift + "</tr>";
    playbackRate = playbackRate + "</tr>";
    quality = quality + "</tr>";
    let htmlVal =
        "<table>" +
        camera +
        position +
        currentTime +
        drift +
        playbackRate +
        quality +
        "</table>";
    document.querySelector("#sync-status-log").innerHTML = htmlVal;
}

function getPlayerThroughContainerId(containerId) {
    var playerId = document.querySelector(
        "#container-" + containerId + " > .theoplayer-container"
    ).dataset.camera;
    return THEOplayer.players[playerId - 1];
}

function setupSwitcher() {
    for (var i = 1; i < THEOplayer.players.length; i++) {
        var container = document.querySelector("#container-" + (i + 1));
        container.addEventListener(
            "click",
            function() {
                switchPlayers(this + 1, 1);
            }.bind(i)
        );
    }
}

function createLogButton(player) {
    // setting up the custom icon by setting up a video-js component
    var Button = THEOplayer.videojs.getComponent("Button");
    var MyButton = THEOplayer.videojs.extend(Button, {
        constructor: function() {
            Button.apply(this, arguments); // required

            /* Extra after initializing your button */

            // add tooltip
            var tooltipSpan = document.createElement("span");
            tooltipSpan.className = "theo-button-tooltip vjs-hidden";
            tooltipSpan.innerText = "Info";

            function toggleTooltip() {
                tooltipSpan.classList.toggle("vjs-hidden");
            }
            this.el().addEventListener("mouseover", toggleTooltip);
            this.el().addEventListener("mouseout", toggleTooltip);
            this.el().appendChild(tooltipSpan);
        },
        handleClick: function() {
            getSyncStatus();
            // elementContainer.classList.toggle('hidden');
            document.querySelector("#container-1").classList.toggle("status-off");
        },
        buildCSSClass: function() {
            return "fa fa-info custom-info-icon vjs-control vjs-button"; // insert all class names here
        }
    });

    THEOplayer.videojs.registerComponent("MyButton", MyButton);
    player.ui.getChild("controlBar").addChild("myButton", {});
}

function createMultiButton(player) {
    player.element.parentNode.parentNode.querySelectorAll(
        ".vjs-fullscreen-control"
    )[0].style.display = "none";
    // setting up the custom icon by setting up a video-js component
    var Button = THEOplayer.videojs.getComponent("Button");
    var MyButton = THEOplayer.videojs.extend(Button, {
        constructor: function() {
            Button.apply(this, arguments); // required

            /* Extra after initializing your button */

            // add tooltip
            var tooltipSpan = document.createElement("span");
            tooltipSpan.className = "theo-button-tooltip vjs-hidden";
            tooltipSpan.innerText = "Multicam";

            function toggleTooltip() {
                tooltipSpan.classList.toggle("vjs-hidden");
            }
            this.el().addEventListener("mouseover", toggleTooltip);
            this.el().addEventListener("mouseout", toggleTooltip);
            this.el().appendChild(tooltipSpan);
        },
        handleClick: function() {
            if (!document.querySelector(".grid")) {
                document.querySelector("#container-1").classList.toggle("multicam-off");
            }
        },
        buildCSSClass: function() {
            return "fa fa-window-restore custom-info-icon vjs-control vjs-button"; // insert all class names here
        }
    });

    THEOplayer.videojs.registerComponent("MyButton", MyButton);
    player.ui.getChild("controlBar").addChild("myButton", {});
}

function createGridButton(player) {
    // setting up the custom icon by setting up a video-js component
    var Button = THEOplayer.videojs.getComponent("Button");
    var MyButton = THEOplayer.videojs.extend(Button, {
        constructor: function() {
            Button.apply(this, arguments); // required

            /* Extra after initializing your button */

            // add tooltip
            var tooltipSpan = document.createElement("span");
            tooltipSpan.className = "theo-button-tooltip vjs-hidden";
            tooltipSpan.innerText = "Grid";

            function toggleTooltip() {
                tooltipSpan.classList.toggle("vjs-hidden");
            }
            this.el().addEventListener("mouseover", toggleTooltip);
            this.el().addEventListener("mouseout", toggleTooltip);
            this.el().appendChild(tooltipSpan);
        },
        handleClick: function() {
            if (!document.querySelector(".multicam-off")) {
                document.querySelector("#container-1").classList.toggle("grid");
                document.querySelector("#container-1").classList.toggle("no-grid");
            }
        },
        buildCSSClass: function() {
            return "fa fa-th-large custom-info-icon vjs-control vjs-button"; // insert all class names here
        }
    });

    THEOplayer.videojs.registerComponent("MyButton", MyButton);
    player.ui.getChild("controlBar").addChild("myButton", {});
}

function createFullscreenButton(player) {
    // setting up the custom icon by setting up a video-js component
    var Button = THEOplayer.videojs.getComponent("Button");
    var MyButton = THEOplayer.videojs.extend(Button, {
        constructor: function() {
            Button.apply(this, arguments); // required
        },
        handleClick: function() {
            document
                .querySelector(".vjs-fullscreen-2")
                .classList.toggle("fullscreen");
            if (document.fullscreen) {
                document.exitFullscreen();
            } else {
                document
                    .querySelector("#multiview")
                    .requestFullscreen({ navigationUI: "hide" });
            }
        },
        buildCSSClass: function() {
            return "vjs-fullscreen-control vjs-fullscreen-2 vjs-control vjs-button"; // insert all class names here
        }
    });
    THEOplayer.videojs.registerComponent("MyButton", MyButton);
    player.ui.getChild("controlBar").addChild("myButton", {});
}

const interceptor = function(request) {
    if (request.type == 'segment') {
        request.respondWith({
            status: 404
        });
    }
};

function start404SegmentsForIndex(index) {
    console.log("Start redirecting segments of stream for player", index, "to 404s...");
    const player = THEOplayer.players[index];
    player.network.addRequestInterceptor(interceptor);
}

function stop404SegmentsForIndex(index) {
    console.log("Stop redirecting segments of stream for player", index, "...");
    const player = THEOplayer.players[index];
    player.network.removeRequestInterceptor(interceptor);
}

function potentiallyHaltAllPlayers(index) {
    if (NO_PLAY_IF_MAIN_STUCK && (index == 0)) {
        const primary = THEOplayer.players[0];
        if (getStateForIndex(index) == "BUFFERING") {
            const secondaries = THEOplayer.players.filter((p) => p.uid > 0);
            console.log("Should pause all...");
            secondaries.forEach((player) => {
                if (!player.paused) {
                    player.pause();
                }
            });
        }
    }

}

function potentiallyResumeAllPlayers(index) {
    if (NO_PLAY_IF_MAIN_STUCK && (index == 0)) {
        const primary = THEOplayer.players[0];
        if (getStateForIndex(index) == "PLAYING") {
            const secondaries = THEOplayer.players.filter((p) => p.uid > 0);
            console.log("Should resume all...");
            secondaries.forEach((player) => {
                if (player.paused) {
                    player.play();
                }
            });
        }
    }
}