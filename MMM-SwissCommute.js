/* global Module */

/* Magic Mirror
 * Module: MMM-SwissCommute
 *
 * By nixnuex
 * based on MMM-swisstransport (https://github.com/Bangee44/MMM-swisstransport)
 *
 * MIT Licensed.
 */

Module.register("MMM-SwissCommute",{
	// Define module defaults
	defaults: {
		updateInterval: 2 * 60 * 1000, // Update every 2 minutes. Note: search.ch API limit is 1000 requests per day
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25, // Start on 1/4th of the list.
        initialLoadDelay: 0, // start delay seconds.

        domRefresh: 1000 * 30, // Refresh Dom each 30 s
		
        apiBase: 'http://fahrplan.search.ch/api/route.json',
        from: '',
        to: '',
        maximumEntries: 5, // Total Maximum Entries
        departureTimeFromNow: 0, // departure time from now in minutes, set to 0 to show departures from now
        minWalkingTime: -1,
        hideTrackInfo: 0,
        showArrivalTime: false,
        showDurationOfTrip: false,
		departMinutesFromNow: 0, // search for connections x minutes from now
		width: "350px"
                
//		titleReplace: {
//			"Zeittabelle ": ""
//		}
	},
	
	requiresVersion: "2.1.0", // Required version of MagicMirror

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

        this.trains = [];
		this.loaded = false;
		this.scheduleUpdate(this.config.initialLoadDelay);

		// Update DOM seperatly and not only on schedule Update
		var self = this;
		setInterval(function() {
			self.updateDom(this.config.animationSpeed);
		}, this.config.domRefresh);

		this.updateTimer = null;

	},   
	
	// Define required scripts.
	getStyles: function() {
		return ["MMM-SwissCommute.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	}, 
    
	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		var currentTime = moment();
		
		if (!this.config.from) {
			wrapper.innerHTML = "Invalid starting point";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		if (!this.config.to) {
			wrapper.innerHTML = "Invalid destination";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		if (!this.loaded) {
			wrapper.innerHTML = "Loading connections ...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (this.message) {
			wrapper.innerHTML = this.message;
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		var table = document.createElement("table");
		table.className = "small";
		table.style.width = this.config.width;

		for (var t in this.trains) {
			var trains = this.trains[t];

			var row = document.createElement("tr");
			table.appendChild(row);

			// Number & Icon
            var icon = "";
            switch(trains.type) {
                case "train":
                    icon = "fa-train";
                    break;
                case "strain":
                    icon = "fa-train";
                    break;
                case "bus":
                    icon = "fa-bus";
                    break;
                case "tram":
                    icon = "fa-subway";
                    break;
                case "ship":
                    icon = "fa-ship";
                    break;
                case "cableway":
                    icon = "fa-tram";
                    break;
                default:
                icon = "fa-train";
            }

			var trainNumberCell = document.createElement("td");
			trainNumberCell.innerHTML = "<i class=\"fa " + icon + "\"></i> " + trains.number;
			trainNumberCell.className = "align-left";
			row.appendChild(trainNumberCell);

			// Direction
			var trainToCell = document.createElement("td");
			trainToCell.innerHTML = trains.to;
			trainToCell.className = "align-left trainto";
			row.appendChild(trainToCell);

			// Departure time
			var dTime = moment(trains.departureTimestampRaw);
			var diff = dTime.diff(currentTime, 'minutes');

			var depCell = document.createElement("td");
			depCell.className = "align-left departuretime";
			depCell.innerHTML = trains.departureTimestamp;
			// Departure delay
            if(trains.departureDelay > 0) {
				depCell.innerHTML += " +" + trains.departureDelay;
				depCell.className += " red";
			}

			if (diff <= this.config.minWalkingTime ){
				row.className = "red";
			}

			row.appendChild(depCell);

			// Departure delay
			/*
            var departureDelayCell = document.createElement("td");
            if(trains.departureDelay > 0) {
                departureDelayCell.className = "departureDelay red";
                departureDelayCell.innerHTML = "+" + trains.departureDelay + " min";
            } else {
                departureDelayCell.className = "departureDelay red";
                departureDelayCell.innerHTML = "";
            }
            row.appendChild(departureDelayCell);
			*/
            
			if (this.config.showArrivalTime) {
				// Arrival time
				var arrCell = document.createElement("td");
				arrCell.className = "align-left arrivaltime";
				arrCell.innerHTML = trains.arrivalTimestamp;
				// Arrival delay
				if(trains.arrivalDelay > 0) {
					arrCell.innerHTML += " +" + trains.arrivalDelay;
					arrCell.className += " red";
				}
				row.appendChild(arrCell);

				// Arrival delay
				/*
				var arrivalDelayCell = document.createElement("td");
				if(trains.arrivalDelay > 0) {
					arrivalDelayCell.className = "arrivalDelay red";
					arrivalDelayCell.innerHTML = "+" + trains.arrivalDelay + " min";
				} else {
					arrivalDelayCell.className = "arrivalDelay red";
					arrivalDelayCell.innerHTML = "";
				}
				row.appendChild(arrivalDelayCell);
				*/
			}

			if (this.config.showDurationOfTrip) {
				// Duration of trip
				var durationCell = document.createElement("td");
				durationCell.className = "align-left duration";
				if(trains.duration >= 3600) {
					var duration = moment.duration(trains.duration, 'seconds');
					durationCell.innerHTML = duration.hours() + " h " + duration.minutes() + " min";
				} else {
					durationCell.innerHTML = trains.duration / 60 + " min";
				}

				row.appendChild(durationCell);
			}

            // Track
            if (!this.config.hideTrackInfo) {
	            var trackCell = document.createElement("td");
    	        trackCell.innerHTML = trains.track;
        	    if(trains.trackChange) trackCell.className = "track red";
            	row.appendChild(trackCell);
            }

			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = this.trains.length * this.config.fadePoint;
				var steps = this.trains.length - startingPoint;
				if (t >= startingPoint) {
					var currentStep = t - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}
		}

		return table;
	},

	/* getData(compliments)
	 * Calls processData on succesfull response.
	 */
	getData: function() {
		var url = this.config.apiBase + this.getParams();
		var self = this;
		var retry = true;

		var trainRequest = new XMLHttpRequest();
		trainRequest.open("GET", url, true);
		trainRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processData(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.config.station = "";
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Incorrect what so ever...");
					retry = false;
				} else {
					Log.error(self.name + ": Could not load trains.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		trainRequest.send();
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams: function() {
		var params = "?show_delays=1&show_trackchanges=1&";
        params += "from=" + this.config.from;
        params += "&to=" + this.config.to;
		params += "&num=" + this.config.maximumEntries;

		if(this.config.departMinutesFromNow) {
			params += "&time=" + moment().add(this.config.departMinutesFromNow, 'minutes').format("HH:mm");
		}
                
		return params;
	},

	/* processData(data)
	 * Uses the received data to set the various values.
	 *
	 * argument data object - Weather information received form openweather.org.
	 */
	processData: function(data) {
		this.trains = [];
		this.message = "";
		
		if ('connections' in data) {
			for (var i = 0, count = data.connections.length; i < count; i++) {
				var trains = data.connections[i];

				if("departure" in trains.legs[0] && "terminal" in trains.legs[0] && "line" in trains.legs[0]) {
					var conn = {
						departureTimestampRaw: trains.departure,
						departureTimestamp: moment(trains.departure).format("HH:mm"),
						departureDelay: parseInt(trains.dep_delay),
						//arrivalTimestampRaw: trains.arrival,
						arrivalTimestamp: moment(trains.arrival).format("HH:mm"),
						arrivalDelay: parseInt(trains.arr_delay),
						duration: parseInt(trains.duration),
						to: trains.legs[0].terminal,
						type: trains.legs[0].type,
						number: trains.legs[0].line,
						track: trains.legs[0].track
					};
				
					if (typeof conn.track != 'undefined') {
						conn.trackChange = conn.track.indexOf("!") > 0;
					}
					else {
						conn.track = "";
						conn.trackChange = 0;
					}
								
					this.trains.push(conn);
				}
			}
		}
		else {
			this.message = data.messages[0];
		}	

		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},

	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function() {
			self.getData();
		}, nextLoad);
	},
});
