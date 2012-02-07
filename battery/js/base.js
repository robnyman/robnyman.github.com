(function () {
    var battery = navigator.mozBattery, 
        batterySupported = document.getElementById("battery-supported"),
        batteryLevel = document.getElementById("battery-level"),
        chargingStatus = document.getElementById("charging-status"),
        batteryCharged = document.getElementById("battery-charged"),
        batteryDischarged = document.getElementById("battery-discharged");

    console.log(battery);

    if (battery) {
        function setStatus () {
            console.log("Set status");
            batteryLevel.innerHTML = parseInt(battery.level, 10) * 100 + "%";
            chargingStatus.innerHTML = (battery.charging)? "" : "not ";
            batteryCharged.innerHTML = (battery.chargingTime === "Infinity")? "Infinity" : parseInt(battery.chargingTime / 60, 10);
            batteryDischarged.innerHTML = (battery.dischargingTime === "Infinity")? "Infinity" : parseInt(battery.dischargingTime / 60, 10);
        }
        // Set initial status
        setStatus();
    

        // Set events
        battery.addEventListener("chargingchange", setStatus, false);
        battery.addEventListener("levelchange", setStatus, false);
    }
    else {
        batterySupported.innerHTML = "Battery API not supported on your device/computer";
    } 
})();
