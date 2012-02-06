(function () {
    var battery = navigator.mozBattery, 
        batterySupported = document.getElementById("battery-supported"),
        batteryLevel = document.getElementById("battery-level"),
        chargingStatus = document.getElementById("charging-status"),
        batteryCharged = document.getElementById("battery-charged"),
        batteryDischarged = document.getElementById("battery-discharged");

alert(battery)

    if (battery) {
        function setStatus () {
            // alert("set status");
            batteryLevel.innerHTML = battery.level * 100 + "%";
            chargingStatus.innerHTML = (battery.charging)? "" : "not ";
            batteryCharged.innerHTML = battery.chargingTime;
            batteryDischarged.innerHTML = battery.dischargingTime;
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

/*    b.addEventListener("chargingchange", function() {
        if (b.charging) {
            alert("Charging!" + "\nLevel: " + b.level * 100 + "%");
            window.location.reload(true);
        } else {
            alert("Unplugged!" + "\nLevel: " + b.level * 100 + "%");
            window.location.reload(true);
        }
    });

    b.addEventListener("levelchange", function() {
        window.location.reload(true);			
    });

    if (b.charging) {
        document.write("<h2>Shows charging state, charge level, and charging time for device battery.</h2>" + "Charging! <p>Level: " + b.level * 100 + "%</p>" + "<p>Charging Time: " + b.chargingTime + " seconds until the battery is fully charged.</p>");
    } else {
        document.write("<h2>Shows discharging state, charge level and discharging time for device battery.</h2>" + "Discharging! <p>Level: " + b.level * 100 + "%</p>" + "<p>Discharging Time: " + b.dischargingTime + " seconds until the battery is fully discharged.</p>")
};*/
