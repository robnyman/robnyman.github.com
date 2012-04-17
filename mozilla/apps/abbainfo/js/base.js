(function () {
    var viewFullScreen = document.getElementById("view-fullscreen");
    if (viewFullScreen) {
        viewFullScreen.addEventListener("click", function () {
            var docElm = document.documentElement;
            if (docElm.mozRequestFullScreen) {
                docElm.mozRequestFullScreen();
            }
            else if (docElm.webkitRequestFullScreen) {
                docElm.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        }, false);
    }
    // Press the R key to reload the page
    window.addEventListener("keydown", function (evt) {
        if (evt.keyCode === 82) {
            location.reload();
        }
    }, false);
})();

