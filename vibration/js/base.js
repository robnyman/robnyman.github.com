(function () {
    document.querySelector("#vibrate-one-second").addEventListener("click", function () {
        navigator.vibrate(1000);
    }, false);

    document.querySelector("#vibrate-twice").addEventListener("click", function () {
        navigator.vibrate([200, 100, 200, 100]);
    }, false);


    document.querySelector("#vibrate-long-time").addEventListener("click", function () {
        navigator.vibrate(5000);
    }, false);

    document.querySelector("#vibrate-off").addEventListener("click", function () {
        navigator.vibrate(0);
    }, false);
})();

