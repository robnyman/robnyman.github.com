(function () {
    document.querySelector("#vibrate-one-second").addEventListener("click", function () {
        navigator.mozVibrate(1000);
    }, false);

    document.querySelector("#vibrate-twice").addEventListener("click", function () {
        navigator.mozVibrate([200, 100, 200, 100]);
    }, false);


    document.querySelector("#vibrate-long-time").addEventListener("click", function () {
        navigator.mozVibrate(5000);
    }, false);

    document.querySelector("#vibrate-off").addEventListener("click", function () {
        navigator.mozVibrate(0);
    }, false);
})();

