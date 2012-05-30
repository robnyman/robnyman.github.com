(function () {
    var matchMediaSupported = document.querySelector("#matchmedia-supported"),
        width600 = document.querySelector("#width-600"),
        height500 = document.querySelector("#height-500"),
        portraitOrientation = document.querySelector("#portrait-orientation");
    if (window.matchMedia) {
        matchMediaSupported.innerHTML = "supported";
    }

    function setValues () {
        width600.innerHTML = (window.matchMedia("(min-width: 600px)")).matches;
        height500.innerHTML = (window.matchMedia("(min-height: 600px)")).matches;
        portraitOrientation.innerHTML = (window.matchMedia("(orientation: portrait)")).matches;
    }
    window.addEventListener("resize", setValues, false);
    window.addEventListener("DOMContentLoaded", setValues, false);
})();

